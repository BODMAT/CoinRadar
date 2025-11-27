import { z } from "zod";

export const WalletSchema = z.object({
    id: z.string().uuid("ID має бути UUID"),
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів'),
    createdAt: z.coerce.date(),
    userId: z.string().uuid("ID має бути UUID"),

    totalInvested: z.number().optional().default(0),
    totalRealizedPnL: z.number().optional().default(0),
})

export const WalletCreateSchema = z.object({
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів'),

})

export const WalletPatchSchema = z.object({
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів').optional(),
})

export const WalletListItemResponseSchema = z.object({
    id: z.string().uuid("ID має бути UUID"),
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів'),

    totalInvested: z.number().optional().default(0),
    totalRealizedPnL: z.number().optional().default(0),
})

export type WalletListItem = z.infer<typeof WalletListItemResponseSchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type WalletCreate = z.infer<typeof WalletCreateSchema>;
export type WalletPatch = z.infer<typeof WalletPatchSchema>;
