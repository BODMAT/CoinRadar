const z = require('zod');

const WalletSchema = z.object({
    id: z.string().uuid("ID має бути UUID"),
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів'),
    createdAt: z.date(),
    userId: z.string().uuid("ID має бути UUID"),

    // transactions in future
    transactions: z.array(z.any()).optional(),
})

const WalletCreateSchema = z.object({
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів'),

})

const WalletPatchSchema = z.object({
    name: z.string().trim().min(1, 'Назва не може бути пустою').max(20, 'Назва має бути не більше 20 символів').optional(),
})

module.exports = {
    WalletSchema,
    WalletCreateSchema,
    WalletPatchSchema
}