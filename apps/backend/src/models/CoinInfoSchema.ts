import { z } from "zod";

export const CoinInfoSchema = z.object({
  coinSymbol: z.string(),
  totalQuantity: z.number().nonnegative(),
  avgBuyingPrice: z.number().nonnegative(),
  //! oth in frontend
  // currentPrice: z.number().optional().nonnegative(),
  // PNL: z.number().optional(),
});

export const CoinForChartSchema = z.object({
  coinSymbol: z.string(),
  agregatedData: z.array(
    z.object({
      createdAt: z.coerce.date(),
      quantity: z.number().nonnegative(),
      buyOrSell: z.enum(["buy", "sell"]),
    }),
  ),
  initialQuantity: z.number().nonnegative(),
});
