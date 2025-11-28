import z from "zod";

export const CoinSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    image: z.string(),
    current_price: z.number(),
    ath: z.number(),
    price_change_percentage_24h: z.preprocess(
        (val) => (typeof val === "number" ? val : 0),
        z.number()
    ),
    sparkline_in_7d: z.object({
        price: z.array(z.number()),
    }),
    other: z.any(),
})

export type Coin = z.infer<typeof CoinSchema>;

