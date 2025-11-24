const z = require('zod');

const decimalSchema = z.union([z.string(), z.number(), z.any()])
    .transform((value: string | number | any) => Number(value));

const TransactionResponseSchema = z.object({
    id: z.string().uuid(),
    buyOrSell: z.enum(["buy", "sell"]),

    coinSymbol: z.string(),

    date: z.coerce.date(),
    price: decimalSchema,
    quantity: decimalSchema,
    total: z.number().optional(),
    walletId: z.string(),
});

const PaginatedTransactionsSchema = z.object({
    data: z.array(TransactionResponseSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        last_page: z.number(),
        per_page: z.number()
    })
});

const CreateTransactionDto = z.object({
    buyOrSell: z.enum(["buy", "sell"]),

    coinSymbol: z.string().toLowerCase(),

    price: z.number().positive(),
    quantity: z.number().positive(),
    walletId: z.string().uuid().optional(),
});

module.exports = {
    CreateTransactionDto,
    TransactionResponseSchema,
    PaginatedTransactionsSchema
};