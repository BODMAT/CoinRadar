import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../prisma.js";
import {
  JWT_REFRESH_SECRET,
  REFRESH_EXPIRES_DAYS,
  userInclude,
} from "./authConfig.js";
import {
  parseCookieHeader,
  hashToken,
  signRefreshToken,
  signAccessToken,
  setAuthCookies,
  clearAuthCookies,
  toSafeUserResponse,
} from "./authHelpers.js";

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const cookies = parseCookieHeader(req.headers.cookie);
    const refreshToken = cookies["refresh_token"];

    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token is missing." });
    }

    if (!JWT_REFRESH_SECRET) {
      return res.status(500).json({ error: "Server configuration error." });
    }

    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid refresh token." });
    }

    const refreshHash = hashToken(refreshToken);
    const existingToken = await prisma.refreshToken.findFirst({
      where: { tokenHash: refreshHash, revokedAt: null },
      include: { user: { include: userInclude } },
    });

    if (!existingToken) {
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ error: "Refresh token is revoked or invalid." });
    }

    if (existingToken.expiresAt.getTime() <= Date.now()) {
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
      });
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token has expired." });
    }

    const nextRefreshToken = signRefreshToken(existingToken.userId);
    const nextRefreshHash = hashToken(nextRefreshToken);
    const nextAccessToken = signAccessToken(
      existingToken.user.id,
      existingToken.user.login,
    );

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date(), replacedByTokenHash: nextRefreshHash },
      }),
      prisma.refreshToken.create({
        data: {
          userId: existingToken.userId,
          tokenHash: nextRefreshHash,
          expiresAt: new Date(
            Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
          ),
          userAgent: req.headers["user-agent"] || null,
          ip: req.ip || null,
        },
      }),
    ]);

    setAuthCookies(res, nextAccessToken, nextRefreshToken);

    return res.status(200).json({
      message: "Session refreshed",
      user: toSafeUserResponse(existingToken.user),
    });
  } catch (error) {
    console.error("Refresh session error:", error);
    clearAuthCookies(res);
    return res.status(500).json({ error: "Server error during refresh." });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const cookies = parseCookieHeader(req.headers.cookie);
    const refreshToken = cookies["refresh_token"];

    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: refreshHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    console.error("Logout error:", error);
    clearAuthCookies(res);
    return res.status(500).json({ error: "Server error during logout." });
  }
};

export const logoutAllUserSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Unauthorized." });
    }

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    clearAuthCookies(res);
    return res.status(200).json({ message: "All sessions logged out." });
  } catch (error) {
    console.error("Logout all sessions error:", error);
    clearAuthCookies(res);
    return res.status(500).json({ error: "Server error during logout-all." });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });

    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: userInclude,
    });

    if (!user) return res.status(404).json({ error: "User not found." });

    return res.status(200).json({
      message: "Current user loaded.",
      user: toSafeUserResponse(user),
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res
      .status(500)
      .json({ error: "Server error during current user fetch." });
  }
};
