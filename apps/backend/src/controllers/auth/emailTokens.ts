import crypto from "node:crypto";
import prisma from "../../prisma.js";
import { hashToken } from "./authHelpers.js";
import { EMAIL_VERIFY_TTL_MS, PASSWORD_RESET_TTL_MS } from "./authConfig.js";

export type EmailTokenPurpose = "verify_email" | "reset_password";

export { EMAIL_VERIFY_TTL_MS, PASSWORD_RESET_TTL_MS };

export const createEmailToken = async (
  userId: string,
  purpose: EmailTokenPurpose,
  ttlMs: number,
): Promise<{ rawToken: string; expiresAt: Date }> => {
  await prisma.emailToken.deleteMany({
    where: { userId, purpose, consumedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.emailToken.create({
    data: { userId, tokenHash, purpose, expiresAt },
  });

  return { rawToken, expiresAt };
};

export const consumeEmailToken = async (
  rawToken: string,
  expectedPurpose: EmailTokenPurpose,
) => {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailToken.findUnique({ where: { tokenHash } });

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

  return { ok: true as const, userId: token.userId };
};
