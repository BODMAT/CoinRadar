import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../../prisma.js";
import {
  SetPasswordSchema,
  DeleteAccountSchema,
  UpdateProfileSchema,
} from "../../models/AuthSchema.js";
import { handleZodError } from "../../utils/helpers.js";
import {
  saltRounds,
  ACCESS_COOKIE_NAME,
  normalizedSameSite,
  cookieSecure,
} from "./authConfig.js";
import {
  signAccessToken,
  clearAuthCookies,
  toSafeUserResponse,
} from "./authHelpers.js";

export const setPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });

    const { password, oldPassword } = SetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.password) {
      if (!oldPassword) {
        return res
          .status(400)
          .json({ error: "Current password is required to change it." });
      }
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(401).json({ error: "Current password is wrong." });
      }
    }

    const hashed = await bcrypt.hash(password, saltRounds);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashed },
      });
      await tx.authIdentity.upsert({
        where: { userId_provider: { userId, provider: "local" } },
        create: { userId, provider: "local" },
        update: {},
      });
    });

    return res.status(200).json({
      message: user.password
        ? "Password updated."
        : "Password set. You can now sign in with login and password.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Set password error:", error);
    return res
      .status(500)
      .json({ error: "Server error during password change." });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });

    const { password } = DeleteAccountSchema.parse(req.body ?? {});

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found." });

    // Password users confirm via password; Google-only accounts rely on session.
    if (user.password) {
      if (!password) {
        return res
          .status(400)
          .json({ error: "Password is required to delete the account." });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Password is wrong." });
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    clearAuthCookies(res);
    return res.status(200).json({ message: "Account deleted." });
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Delete account error:", error);
    return res
      .status(500)
      .json({ error: "Server error during account deletion." });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });

    const parsed = UpdateProfileSchema.parse(req.body ?? {});
    if (parsed.login === undefined && parsed.photoUrl === undefined) {
      return res.status(400).json({ error: "Nothing to update." });
    }

    const data: Prisma.UserUpdateInput = {};
    if (parsed.login !== undefined) data.login = parsed.login;
    if (parsed.photoUrl !== undefined) {
      const normalized =
        parsed.photoUrl === null ? null : parsed.photoUrl.trim();
      data.photoUrl = normalized === "" ? null : normalized;
    }

    let updated;
    try {
      updated = await prisma.user.update({
        where: { id: userId },
        data,
        include: {
          wallets: {
            select: { id: true, name: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code: string }).code === "P2002"
      ) {
        return res.status(409).json({ error: "Login is already taken." });
      }
      throw e;
    }

    if (parsed.login !== undefined) {
      const newAccess = signAccessToken(updated.id, updated.login);
      res.cookie(ACCESS_COOKIE_NAME, newAccess, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: normalizedSameSite,
        maxAge: 15 * 60 * 1000,
        path: "/",
      });
    }

    return res.status(200).json({
      message: "Profile updated.",
      user: toSafeUserResponse(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Update profile error:", error);
    return res
      .status(500)
      .json({ error: "Server error during profile update." });
  }
};
