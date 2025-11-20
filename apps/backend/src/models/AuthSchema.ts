const { WalletListItemResponseSchema } = require('../models/WalletSchema');
const z = require('zod');

const UserSchema = z.object({
    uid: z.string().uuid("UID має бути UUID").optional(),
    login: z.string().trim().min(3, 'Логін має бути не менше 3 символів').max(30),
    email: z.string().email().nullable().optional(),

    token: z.string().optional(), // Токен (Access Token)

    wallets: z.array(WalletListItemResponseSchema).optional(), // Optional (without - from auth service)
});

const RegisterSchema = z.object({
    login: z.string().trim().min(3, 'Логін має бути не менше 3 символів').max(30),
    password: z.string().min(6, 'Пароль має бути не менше 6 символів'),
    email: z.string().email('Невірний формат email').optional().or(z.literal('')),
});

const LoginSchema = z.object({
    login: z.string().trim().min(3, 'Логін обов\'язковий'),
    password: z.string().min(1, 'Пароль обов\'язковий'),
});

module.exports = {
    RegisterSchema,
    LoginSchema,
    UserSchema
};