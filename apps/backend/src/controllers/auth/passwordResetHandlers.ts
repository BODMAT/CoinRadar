import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../../prisma.js";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../../models/AuthSchema.js";
import { handleZodError } from "../../utils/helpers.js";
import { sendPasswordResetEmail } from "../../services/emailService.js";
import { saltRounds } from "./authConfig.js";
import {
  createEmailToken,
  consumeEmailToken,
  PASSWORD_RESET_TTL_MS,
} from "./emailTokens.js";

// Generic response to prevent email enumeration.
const GENERIC_OK = {
  message:
    "If an account with that email exists, a password reset link is on its way.",
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always 200 — never reveal whether email is registered.
    if (!user || !user.emailVerified) {
      return res.status(200).json(GENERIC_OK);
    }

    // Google-only accounts have no local identity — they cannot reset a password.
    const localIdentity = await prisma.authIdentity.findFirst({
      where: { userId: user.id, provider: "local" },
    });
    if (!localIdentity) {
      return res.status(200).json(GENERIC_OK);
    }

    const { rawToken } = await createEmailToken(
      user.id,
      "reset_password",
      PASSWORD_RESET_TTL_MS,
    );

    try {
      await sendPasswordResetEmail(email, rawToken);
    } catch (mailError) {
      console.error("Failed to send password reset email:", mailError);
    }

    return res.status(200).json(GENERIC_OK);
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Server error." });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = ResetPasswordSchema.parse(req.body);

    const result = await consumeEmailToken(token, "reset_password");

    if (!result.ok) {
      const message =
        result.reason === "already_used"
          ? "This reset link has already been used."
          : "Reset link is invalid or expired. Request a new one.";
      return res.status(400).json({ error: message });
    }

    const hashed = await bcrypt.hash(password, saltRounds);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: result.userId },
        data: { password: hashed },
      });
      // Ensure local identity exists (handles Google-only -> adds password case).
      await tx.authIdentity.upsert({
        where: {
          userId_provider: { userId: result.userId, provider: "local" },
        },
        create: { userId: result.userId, provider: "local" },
        update: {},
      });
    });

    return res
      .status(200)
      .json({ message: "Password has been reset. You can now sign in." });
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Server error." });
  }
};
