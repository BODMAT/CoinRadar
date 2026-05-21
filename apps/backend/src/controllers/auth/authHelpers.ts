import type { Request, Response } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "../../prisma.js";
import { UserSchema } from "../../models/AuthSchema.js";
import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_EXPIRES_DAYS,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  normalizedSameSite,
  cookieSecure,
  type WalletListItem,
  type UserWithWallets,
} from "./authConfig.js";

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const signAccessToken = (userId: string, userLogin: string): string => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.");
  return jwt.sign({ userId, userLogin }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES!,
  });
};

export const signRefreshToken = (userId: string): string => {
  if (!JWT_REFRESH_SECRET)
    throw new Error("JWT_REFRESH_SECRET is not defined.");
  return jwt.sign(
    { userId, type: "refresh", jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES! },
  );
};

export const setAuthCookies = (
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

export const clearAuthCookies = (res: Response): void => {
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

export const setOAuthStateCookie = (res: Response, state: string): void => {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    maxAge: 10 * 60 * 1000,
    path: "/api/auth",
  });
};

export const clearOAuthStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: normalizedSameSite,
    path: "/api/auth",
  });
};

export const parseCookieHeader = (
  cookieHeader?: string,
): Record<string, string> => {
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
      if (key) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

export const toSafeUserResponse = (user: UserWithWallets) =>
  UserSchema.parse({
    uid: user.id,
    login: user.login,
    email: user.email,
    emailVerified: user.emailVerified,
    hasPassword: user.password !== null,
    photoUrl: user.photoUrl,
    wallets: user.wallets.map((w: WalletListItem) => ({
      id: w.id,
      name: w.name,
    })),
  });

export const saveRefreshToken = async (
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

export const createSession = async (
  user: UserWithWallets,
  req: Request,
  res: Response,
): Promise<void> => {
  const accessToken = signAccessToken(user.id, user.login);
  const refreshToken = signRefreshToken(user.id);
  await saveRefreshToken(user.id, refreshToken, req);
  setAuthCookies(res, accessToken, refreshToken);
};
