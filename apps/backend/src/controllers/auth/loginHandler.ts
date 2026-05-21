import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../../prisma.js";
import { LoginSchema } from "../../models/AuthSchema.js";
import { handleZodError } from "../../utils/helpers.js";
import { userInclude } from "./authConfig.js";
import { createSession, toSafeUserResponse } from "./authHelpers.js";

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { login: identifier, password } = LoginSchema.parse(req.body);

    const isEmail = identifier.includes("@");
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { login: identifier },
      include: userInclude,
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
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login." });
  }
};
