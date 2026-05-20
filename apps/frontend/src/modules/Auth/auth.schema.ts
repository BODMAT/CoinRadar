import { z } from "zod";
import { WalletListItemResponseSchema } from "../Wallet/wallet.schema";

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

  token: z.string().optional(),
  wallets: z.array(WalletListItemResponseSchema).optional(),
});

export type UserSafe = z.infer<typeof UserSchema>;

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

export type Register = z.infer<typeof RegisterSchema>;
export type Login = z.infer<typeof LoginSchema>;

export const AuthResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
});

export const RegisterResponseSchema = z.object({
  message: z.string(),
  requiresVerification: z.literal(true),
  email: z.string().email(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
