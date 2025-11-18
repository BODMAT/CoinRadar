import { z } from "zod";

export const UserSchema = z.object({
    uid: z.string().uuid("UID має бути UUID").optional(),
    login: z.string().trim().min(3, 'Логін має бути не менше 3 символів').max(30),
    email: z.string().email().nullable().optional(),

    token: z.string().optional(), // Токен (Access Token)
    //! wallets: z.array(z.string()).optional(), in future
});

export type UserSafe = z.infer<typeof UserSchema>;

export const RegisterSchema = z.object({
    login: z.string().trim().min(3, 'Логін має бути не менше 3 символів').max(30),
    password: z.string().min(6, 'Пароль має бути не менше 6 символів'),
    email: z.string().email('Невірний формат email').optional().or(z.literal('')),
});

export const LoginSchema = z.object({
    login: z.string().trim().min(3, 'Логін обов\'язковий'),
    password: z.string().min(1, 'Пароль обов\'язковий'),
});

export type Register = z.infer<typeof RegisterSchema>;
export type Login = z.infer<typeof LoginSchema>;

export const AuthResponseSchema = z.object({
    message: z.string(),
    user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;