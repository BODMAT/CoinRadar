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

  token: z.string().optional(), // Access token

  wallets: z.array(WalletListItemResponseSchema).optional(), // Optional (without - from auth service)
});

export const RegisterSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, "Login must be at least 3 characters")
    .max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

export const LoginSchema = z.object({
  login: z.string().trim().min(3, "Login is required"),
  password: z.string().min(1, "Password is required"),
});
