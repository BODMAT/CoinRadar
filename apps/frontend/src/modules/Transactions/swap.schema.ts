import { z } from "zod";
import { TransactionResponseSchema } from "./transaction.schema";

const SwapSettingsSchema = z.object({
    walletId: z.string(),
    swapEnabled: z.boolean(),
    stableCoins: z.array(z.string()),
});

const CreateSwapDtoSchema = z.object({
    fromCoin: z.string(),
    fromQuantity: z.number(),
    fromPrice: z.number(),
    toCoin: z.string(),
    toQuantity: z.number(),
    toPrice: z.number(),
    createdAt: z.coerce.date().optional(),
});

const SwapResponseSchema = z.object({
    sell: TransactionResponseSchema,
    buy: TransactionResponseSchema,
    swapGroupId: z.string(),
});

type SwapSettings = z.infer<typeof SwapSettingsSchema>;
type CreateSwapDto = z.infer<typeof CreateSwapDtoSchema>;
type SwapResponse = z.infer<typeof SwapResponseSchema>;

export {
    type SwapSettings,
    type CreateSwapDto,
    type SwapResponse,
    SwapSettingsSchema,
    CreateSwapDtoSchema,
    SwapResponseSchema,
};
