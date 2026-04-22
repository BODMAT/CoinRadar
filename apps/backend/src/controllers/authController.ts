import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import {
  RegisterSchema,
  LoginSchema,
  UserSchema,
} from "../models/AuthSchema.js";
import { handleZodError } from "../utils/helpers.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = (process.env.JWT_ACCESS_EXPIRES ||
  "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30);
const REFRESH_TOKEN_EXPIRES =
  `${REFRESH_EXPIRES_DAYS}d` as SignOptions["expiresIn"];
const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const saltRounds = 10;

type WalletListItem = Prisma.WalletGetPayload<{
  select: {
    id: true;
    name: true;
  };
}>;

type UserWithWallets = Prisma.UserGetPayload<{
  include: {
    wallets: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

const isProduction = process.env.NODE_ENV === "production";
const cookieSameSite = (
  process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax")
).toLowerCase();
const normalizedSameSite: "lax" | "strict" | "none" =
  cookieSameSite === "strict"
    ? "strict"
    : cookieSameSite === "none"
      ? "none"
      : "lax";
const cookieSecure = normalizedSameSite === "none" ? true : isProduction;

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(";")
    .map((item: string) => item.trim())
    .filter(Boolean)
    .reduce((acc: Record<string, string>, pair: string) => {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) return acc;

      const key = pair.slice(0, eqIndex).trim();
      const value = pair.slice(eqIndex + 1).trim();

      if (key) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});
};

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const signAccessToken = (userId: string, userLogin: string): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  return jwt.sign({ userId, userLogin }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES!,
  });
};

const signRefreshToken = (userId: string): string => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET/JWT_SECRET is not defined in environment variables.",
    );
  }

  return jwt.sign(
    {
      userId,
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES! },
  );
};

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
): void => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    maxAge: 15 * 60 * 1000,
    path: "/",
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    path: "/",
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    path: "/api/auth",
  });
};

const setOAuthStateCookie = (res: Response, state: string): void => {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    maxAge: 10 * 60 * 1000,
    path: "/api/auth",
  });
};

const clearOAuthStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    path: "/api/auth",
  });
};

const toSafeUserResponse = (user: UserWithWallets) => {
  return UserSchema.parse({
    uid: user.id,
    login: user.login,
    email: user.email,
    wallets: user.wallets.map((wallet: WalletListItem) => ({
      id: wallet.id,
      name: wallet.name,
    })),
  });
};

const saveRefreshToken = async (
  userId: string,
  rawRefreshToken: string,
  req: Request,
  replacedByTokenHash?: string,
): Promise<void> => {
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      replacedByTokenHash: replacedByTokenHash || null,
      userAgent: req.headers["user-agent"] || null,
      ip: req.ip || null,
    },
  });
};

const createSession = async (
  user: UserWithWallets,
  req: Request,
  res: Response,
): Promise<void> => {
  const accessToken = signAccessToken(user.id, user.login);
  const refreshToken = signRefreshToken(user.id);

  await saveRefreshToken(user.id, refreshToken, req);
  setAuthCookies(res, accessToken, refreshToken);
};

const normalizeLogin = (raw: string): string => {
  return (
    raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "user"
  );
};

const generateUniqueLogin = async (seed: string): Promise<string> => {
  const base = normalizeLogin(seed).slice(0, 24);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: { login: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${base}_${suffix}`.slice(0, 30);
  }
};

const getGoogleProfileFromCode = async (code: string) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are missing.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange Google auth code.");
  }

  const tokenData = (await tokenResponse.json()) as { id_token?: string };

  if (!tokenData.id_token) {
    throw new Error("Google did not return id_token.");
  }

  const infoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`,
  );
  if (!infoResponse.ok) {
    throw new Error("Failed to verify Google id_token.");
  }

  const info = (await infoResponse.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: string;
    name?: string;
  };

  if (info.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google token audience mismatch.");
  }

  if (!info.sub || !info.email) {
    throw new Error("Google profile is incomplete.");
  }

  return {
    sub: info.sub,
    email: info.email,
    emailVerified: info.email_verified === "true",
    name: info.name || info.email,
  };
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);
    const { login, password, email } = validatedData;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        email: email || null,
        provider: "local",
      },
      include: {
        wallets: {
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await createSession(newUser, req, res);

    return res.status(201).json({
      message: "User successfully registered.",
      user: toSafeUserResponse(newUser),
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Login or email is already taken. Please choose a different.",
      });
    }

    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }

    console.error("Registration error:", error);
    return res.status(500).json({ error: "Server error during registration." });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const { login, password } = validatedData;

    const user = await prisma.user.findFirst({
      where: { login },
      include: {
        wallets: {
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    await createSession(user, req, res);

    return res.status(200).json({
      message: "Login successful",
      user: toSafeUserResponse(user),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }

    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login." });
  }
};

export const startGoogleAuth = async (_req: Request, res: Response) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: "Google OAuth is not configured." });
    }

    const state = crypto.randomBytes(32).toString("hex");
    setOAuthStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  } catch (error) {
    console.error("Google OAuth start error:", error);
    return res.status(500).json({ error: "Unable to start Google OAuth." });
  }
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const incomingState = req.query.state as string | undefined;
    const cookies = parseCookieHeader(req.headers.cookie);
    const storedState = cookies[OAUTH_STATE_COOKIE_NAME];
    clearOAuthStateCookie(res);

    if (
      !code ||
      !incomingState ||
      !storedState ||
      incomingState !== storedState
    ) {
      return res.redirect(`${FRONTEND_URL}?auth=google_error`);
    }

    const profile = await getGoogleProfileFromCode(code);

    let user = await prisma.user.findFirst({
      where: {
        provider: "google",
        providerId: profile.sub,
      },
      include: {
        wallets: {
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findFirst({
        where: { email: profile.email },
        include: {
          wallets: {
            select: { id: true, name: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (existingByEmail) {
        if (!profile.emailVerified) {
          return res.redirect(`${FRONTEND_URL}?auth=google_error`);
        }

        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            provider: "google",
            providerId: profile.sub,
            email: profile.email,
          },
          include: {
            wallets: {
              select: { id: true, name: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      } else {
        const seed = profile.email.split("@")[0] || profile.name;
        const login = await generateUniqueLogin(seed);

        user = await prisma.user.create({
          data: {
            login,
            email: profile.email,
            password: null,
            provider: "google",
            providerId: profile.sub,
          },
          include: {
            wallets: {
              select: { id: true, name: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }
    }

    await createSession(user, req, res);

    return res.redirect(`${FRONTEND_URL}?auth=google_success`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return res.redirect(`${FRONTEND_URL}?auth=google_error`);
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const cookies = parseCookieHeader(req.headers.cookie);
    const refreshToken = cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token is missing." });
    }

    if (!JWT_REFRESH_SECRET) {
      return res.status(500).json({ error: "Server configuration error." });
    }

    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid refresh token." });
    }

    const refreshHash = hashToken(refreshToken);
    const existingToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: refreshHash,
        revokedAt: null,
      },
      include: {
        user: {
          include: {
            wallets: {
              select: { id: true, name: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
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
        data: {
          revokedAt: new Date(),
          replacedByTokenHash: nextRefreshHash,
        },
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
    const refreshToken = cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash: refreshHash,
          revokedAt: null,
        },
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
      where: {
        userId,
        revokedAt: null,
      },
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
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        wallets: {
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

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
