import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../../prisma.js";
import {
  RegisterSchema,
  ResendVerificationSchema,
} from "../../models/AuthSchema.js";
import { handleZodError } from "../../utils/helpers.js";
import { sendVerificationEmail } from "../../services/emailService.js";
import { saltRounds, FRONTEND_URL } from "./authConfig.js";
import {
  createEmailToken,
  consumeEmailToken,
  EMAIL_VERIFY_TTL_MS,
} from "./emailTokens.js";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { login, password, email } = RegisterSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({
        where: { emailVerified: false, OR: [{ login }, { email }] },
      });

      const user = await tx.user.create({
        data: { login, password: hashedPassword, email, emailVerified: false },
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
        error:
          "Account with this login or email already exists. Try signing in or pick different credentials.",
      });
    }
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Server error during registration." });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.redirect(`${FRONTEND_URL}?auth=verify_error`);

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

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { login } = ResendVerificationSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { login } });

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
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Resend verification error:", error);
    return res
      .status(500)
      .json({ error: "Server error during verification resend." });
  }
};
