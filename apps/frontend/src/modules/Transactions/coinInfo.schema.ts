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

const CoinForChartSchema = z.object({
    coinSymbol: z.string(),
    agregatedData: z.array(z.object({
        createdAt: z.coerce.date(),
        quantity: z.number().nonnegative(),
        buyOrSell: z.enum(["buy", "sell"]),
    })),
    initialQuantity: z.number().nonnegative(),
    //! only in frontend 
    sparkline_in_7d: z.object({
        price: z.array(z.number()),
    }).optional(),
});

const CoinInfoArraySchema = z.array(CoinInfoSchema);
const CoinForChartArraySchema = z.array(CoinForChartSchema);

type CoinInfo = z.infer<typeof CoinInfoSchema>;
type CoinForChart = z.infer<typeof CoinForChartSchema>;

export { type CoinInfo, type CoinForChart, CoinForChartArraySchema, CoinForChartSchema, CoinInfoSchema, CoinInfoArraySchema };