import type { Prisma } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";

export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
export const ACCESS_TOKEN_EXPIRES = (process.env.JWT_ACCESS_EXPIRES ||
  "15m") as SignOptions["expiresIn"];
export const REFRESH_EXPIRES_DAYS = Number(
  process.env.JWT_REFRESH_EXPIRES_DAYS || 30,
);
export const REFRESH_TOKEN_EXPIRES =
  `${REFRESH_EXPIRES_DAYS}d` as SignOptions["expiresIn"];

export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";
export const OAUTH_STATE_COOKIE_NAME = "oauth_state";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const saltRounds = 10;

const isProduction = process.env.NODE_ENV === "production";
const cookieSameSite = (
  process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax")
).toLowerCase();
export const normalizedSameSite: "lax" | "strict" | "none" =
  cookieSameSite === "strict"
    ? "strict"
    : cookieSameSite === "none"
      ? "none"
      : "lax";
export const cookieSecure = normalizedSameSite === "none" ? true : isProduction;

export type WalletListItem = Prisma.WalletGetPayload<{
  select: { id: true; name: true };
}>;

export type UserWithWallets = Prisma.UserGetPayload<{
  include: {
    wallets: { select: { id: true; name: true } };
  };
}>;

export const userInclude = {
  wallets: {
    select: { id: true, name: true } as const,
    orderBy: { createdAt: "asc" as const },
  },
};
