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
  ResendVerificationSchema,
  SetPasswordSchema,
  DeleteAccountSchema,
  UserSchema,
} from "../models/AuthSchema.js";
import { handleZodError } from "../utils/helpers.js";
import {
  sendVerificationEmail,
  sendGoogleMergeConfirmationEmail,
  sendOneTimePasswordEmail,
  sendAccountDeletionEmail,
} from "../services/emailService.js";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const MERGE_TOKEN_TTL_MS = 60 * 60 * 1000;
const DELETE_TOKEN_TTL_MS = 60 * 60 * 1000;
const OTP_BYTES = 12; // ~16 base64url chars

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
    emailVerified: user.emailVerified,
    wallets: user.wallets.map((wallet: WalletListItem) => ({
      id: wallet.id,
      name: wallet.name,
    })),
  });
};

type EmailTokenPurpose = "verify_email" | "merge_google" | "delete_account";

const createEmailToken = async (
  userId: string,
  purpose: EmailTokenPurpose,
  ttlMs: number,
  metadata?: Prisma.InputJsonValue,
): Promise<{ rawToken: string; expiresAt: Date }> => {
  // Invalidate any prior un-consumed tokens of the same purpose for this user
  // so each new email link supersedes the previous one.
  await prisma.emailToken.deleteMany({
    where: { userId, purpose, consumedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.emailToken.create({
    data: {
      userId,
      tokenHash,
      purpose,
      expiresAt,
      ...(metadata !== undefined && { metadata }),
    },
  });

  return { rawToken, expiresAt };
};

const consumeEmailToken = async (
  rawToken: string,
  expectedPurpose: EmailTokenPurpose,
) => {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailToken.findUnique({
    where: { tokenHash },
  });

  if (!token) return { ok: false as const, reason: "not_found" as const };
  if (token.purpose !== expectedPurpose)
    return { ok: false as const, reason: "wrong_purpose" as const };
  if (token.consumedAt)
    return { ok: false as const, reason: "already_used" as const };
  if (token.expiresAt.getTime() <= Date.now())
    return { ok: false as const, reason: "expired" as const };

  await prisma.emailToken.update({
    where: { id: token.id },
    data: { consumedAt: new Date() },
  });

  return {
    ok: true as const,
    userId: token.userId,
    metadata: token.metadata,
  };
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

    const newUser = await prisma.$transaction(async (tx) => {
      // Drop any prior unverified records holding the same login or email so
      // (a) the legit owner can recover from a typo and (b) attackers cannot
      // squat someone else's login by registering and never confirming.
      await tx.user.deleteMany({
        where: {
          emailVerified: false,
          OR: [{ login }, { email }],
        },
      });

      const user = await tx.user.create({
        data: {
          login,
          password: hashedPassword,
          email,
          emailVerified: false,
        },
      });

      await tx.authIdentity.create({
        data: { userId: user.id, provider: "local" },
      });

      return user;
    });

    const { rawToken } = await createEmailToken(
      newUser.id,
      "verify_email",
      EMAIL_VERIFY_TTL_MS,
    );

    try {
      await sendVerificationEmail(email, rawToken);
    } catch (mailError) {
      console.error("Failed to send verification email:", mailError);
      // Account is created but email failed — user can use /resend-verification.
    }

    return res.status(201).json({
      message:
        "Account created. Check your inbox to confirm your email before signing in.",
      requiresVerification: true,
      email,
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

    if (!user.emailVerified) {
      return res.status(403).json({
        error:
          "Email not confirmed. Check your inbox or request a new verification link.",
        requiresVerification: true,
        email: user.email,
      });
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

export const verifyEmail = async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return res.redirect(`${FRONTEND_URL}?auth=verify_error`);
  }

  const result = await consumeEmailToken(token, "verify_email");
  if (!result.ok) {
    const param =
      result.reason === "already_used" ? "already_verified" : "verify_error";
    return res.redirect(`${FRONTEND_URL}?auth=${param}`);
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerified: true },
  });

  return res.redirect(`${FRONTEND_URL}?auth=verified`);
};

export const verifyGoogleMerge = async (req: Request, res: Response) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return res.redirect(`${FRONTEND_URL}?auth=merge_error`);
    }

    const result = await consumeEmailToken(token, "merge_google");
    if (!result.ok) {
      const param =
        result.reason === "already_used" ? "merge_already_done" : "merge_error";
      return res.redirect(`${FRONTEND_URL}?auth=${param}`);
    }

    const metadata = result.metadata as { sub?: string; email?: string } | null;
    if (!metadata?.sub) {
      return res.redirect(`${FRONTEND_URL}?auth=merge_error`);
    }

    // Refuse if this google identity is already attached to a different user.
    const conflicting = await prisma.authIdentity.findUnique({
      where: {
        provider_providerId: { provider: "google", providerId: metadata.sub },
      },
    });
    if (conflicting && conflicting.userId !== result.userId) {
      return res.redirect(`${FRONTEND_URL}?auth=merge_error`);
    }

    if (!conflicting) {
      await prisma.authIdentity.create({
        data: {
          userId: result.userId,
          provider: "google",
          providerId: metadata.sub,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      include: {
        wallets: {
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) {
      return res.redirect(`${FRONTEND_URL}?auth=merge_error`);
    }

    await createSession(user, req, res);
    return res.redirect(`${FRONTEND_URL}?auth=merge_confirmed`);
  } catch (error) {
    console.error("Google merge confirmation error:", error);
    return res.redirect(`${FRONTEND_URL}?auth=merge_error`);
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { login } = ResendVerificationSchema.parse(req.body);

    const user = await prisma.user.findFirst({ where: { login } });

    // Always answer generically — do not leak whether the login exists.
    const genericResponse = {
      message:
        "If an account exists for that login and is unverified, a new verification email is on the way.",
    };

    if (!user || !user.email || user.emailVerified) {
      return res.status(200).json(genericResponse);
    }

    const { rawToken } = await createEmailToken(
      user.id,
      "verify_email",
      EMAIL_VERIFY_TTL_MS,
    );

    try {
      await sendVerificationEmail(user.email, rawToken);
    } catch (mailError) {
      console.error("Failed to resend verification email:", mailError);
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    console.error("Resend verification error:", error);
    return res
      .status(500)
      .json({ error: "Server error during verification resend." });
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

    const userInclude = {
      wallets: {
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" as const },
      },
    };

    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerId: { provider: "google", providerId: profile.sub },
      },
      include: { user: { include: userInclude } },
    });

    let user: UserWithWallets | null = existingIdentity?.user ?? null;

    if (!user) {
      const existingByEmail = await prisma.user.findFirst({
        where: { email: profile.email },
        include: userInclude,
      });

      if (existingByEmail) {
        // Never auto-link a Google identity into an existing account, even if
        // both sides are verified — proof-of-control over the email right now
        // is required. Issue a short-lived merge token and email it to the
        // address on file; the user attaches Google only by clicking it.
        if (!profile.emailVerified || !existingByEmail.email) {
          return res.redirect(`${FRONTEND_URL}?auth=google_error`);
        }

        const { rawToken } = await createEmailToken(
          existingByEmail.id,
          "merge_google",
          MERGE_TOKEN_TTL_MS,
          { sub: profile.sub, email: profile.email },
        );

        try {
          await sendGoogleMergeConfirmationEmail(
            existingByEmail.email,
            rawToken,
          );
        } catch (mailError) {
          console.error(
            "Failed to send Google merge confirmation email:",
            mailError,
          );
          return res.redirect(`${FRONTEND_URL}?auth=google_error`);
        }

        return res.redirect(`${FRONTEND_URL}?auth=google_pending_merge`);
      } else {
        const seed = profile.email.split("@")[0] || profile.name;
        const login = await generateUniqueLogin(seed);

        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              login,
              email: profile.email,
              password: null,
              emailVerified: profile.emailVerified,
            },
            include: userInclude,
          });

          await tx.authIdentity.create({
            data: {
              userId: created.id,
              provider: "google",
              providerId: profile.sub,
            },
          });

          return created;
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

export const setPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const { password, oldPassword } = SetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

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
        where: {
          userId_provider: { userId, provider: "local" },
        },
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
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    console.error("Set password error:", error);
    return res
      .status(500)
      .json({ error: "Server error during password change." });
  }
};

export const sendOneTimePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (!user.email) {
      return res
        .status(400)
        .json({ error: "Account has no email to deliver the password to." });
    }

    const otp = crypto.randomBytes(OTP_BYTES).toString("base64url");
    const hashed = await bcrypt.hash(otp, saltRounds);

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

    try {
      await sendOneTimePasswordEmail(user.email, otp);
    } catch (mailError) {
      console.error("Failed to send one-time password email:", mailError);
      return res
        .status(502)
        .json({ error: "Failed to deliver the one-time password email." });
    }

    return res.status(200).json({
      message:
        "A one-time password has been sent to your email. Use it to sign in and change it from your account settings.",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ error: "Server error during OTP send." });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const { password } = DeleteAccountSchema.parse(req.body ?? {});

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

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
    } else {
      return res.status(409).json({
        error:
          "This account has no password. Request an email confirmation via /auth/account/request-delete.",
        requiresEmailConfirmation: true,
      });
    }

    await prisma.user.delete({ where: { id: userId } });
    clearAuthCookies(res);
    return res.status(200).json({ message: "Account deleted." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    console.error("Delete account error:", error);
    return res
      .status(500)
      .json({ error: "Server error during account deletion." });
  }
};

export const requestDeleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (!user.email) {
      return res
        .status(400)
        .json({ error: "Account has no email to send confirmation to." });
    }

    const { rawToken } = await createEmailToken(
      user.id,
      "delete_account",
      DELETE_TOKEN_TTL_MS,
    );

    try {
      await sendAccountDeletionEmail(user.email, rawToken);
    } catch (mailError) {
      console.error("Failed to send delete confirmation email:", mailError);
      return res
        .status(502)
        .json({ error: "Failed to deliver the confirmation email." });
    }

    return res.status(200).json({
      message:
        "Account deletion confirmation has been sent to your email. The link expires in 1 hour.",
    });
  } catch (error) {
    console.error("Request delete error:", error);
    return res
      .status(500)
      .json({ error: "Server error during delete request." });
  }
};

export const confirmDeleteAccount = async (req: Request, res: Response) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return res.redirect(`${FRONTEND_URL}?auth=delete_error`);
    }

    const result = await consumeEmailToken(token, "delete_account");
    if (!result.ok) {
      const param =
        result.reason === "already_used" ? "already_deleted" : "delete_error";
      return res.redirect(`${FRONTEND_URL}?auth=${param}`);
    }

    await prisma.user.delete({ where: { id: result.userId } });
    clearAuthCookies(res);
    return res.redirect(`${FRONTEND_URL}?auth=account_deleted`);
  } catch (error) {
    console.error("Confirm delete error:", error);
    return res.redirect(`${FRONTEND_URL}?auth=delete_error`);
  }
};
