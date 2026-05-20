import { z } from "zod";
import { WalletListItemResponseSchema } from "../models/WalletSchema.js";

export const UserSchema = z.object({
  uid: z.string().uuid("UID must be UUID").optional(),
  login: z
    .string()
    .trim()
    .min(3, "Login must be at least 3 characters")
    .max(30),
  email: z.string().email().nullable().optional(),
  emailVerified: z.boolean().optional(),
  hasPassword: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),

  token: z.string().optional(),
  wallets: z.array(WalletListItemResponseSchema).optional(),
});

export const RegisterSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, "Login must be at least 3 characters")
    .max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
});

export const LoginSchema = z.object({
  login: z.string().trim().min(3, "Login is required"),
  password: z.string().min(1, "Password is required"),
});

export const ResendVerificationSchema = z.object({
  login: z.string().trim().min(3, "Login is required").max(30),
});

export const SetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  oldPassword: z.string().min(1).optional(),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1).optional(),
});

export const UpdateProfileSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, "Login must be at least 3 characters")
    .max(30)
    .optional(),
  photoUrl: z
    .string()
    .max(800_000, "Image is too large (max ~600 KB).")
    .nullable()
    .optional(),
});
