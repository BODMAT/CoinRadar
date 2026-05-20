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
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
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

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
