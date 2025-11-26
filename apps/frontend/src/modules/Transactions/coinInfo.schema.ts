import { z } from "zod";

const CoinInfoSchema = z.object({
    coinSymbol: z.string(),
    totalQuantity: z.number().nonnegative(),
    avgBuyingPrice: z.number().nonnegative(),
    //! only in frontend 
    currentPrice: z.number().nonnegative().optional(),
    PNL: z.number().optional(),
    image: z.string().url().optional(),
});

const CoinInfoArraySchema = z.array(CoinInfoSchema);

type CoinInfo = z.infer<typeof CoinInfoSchema>;

export { type CoinInfo, CoinInfoSchema, CoinInfoArraySchema };