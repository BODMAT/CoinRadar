import { z } from "zod";

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

    date: z.coerce.date()
        .refine((date: Date) => {
            const now = new Date();
            const buffer = 5 * 60 * 1000;
            return date.getTime() <= now.getTime() + buffer;
        }, {
            message: "Transaction date cannot be in the future"
        })
        .optional(),
});

const TransactionResponseArraySchema = z.array(TransactionResponseSchema);


type Transaction = z.infer<typeof TransactionResponseSchema>;
type PaginatedTransactions = z.infer<typeof PaginatedTransactionsSchema>;
type CreateTransaction = z.infer<typeof CreateTransactionDto>;

export type { Transaction, PaginatedTransactions, CreateTransaction };
export { TransactionResponseSchema, PaginatedTransactionsSchema, CreateTransactionDto, TransactionResponseArraySchema };