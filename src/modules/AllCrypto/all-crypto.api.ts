import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
export interface Coin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    ath: number;
    price_change_percentage_24h: number;
    sparkline_in_7d: {
        price: number[];
    };
    other: any;
}

export const coinSchema = z.object({
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

export const allCryptoApi = createApi({
    reducerPath: 'allCryptoApi',
    tagTypes: ["Coin"],
    baseQuery: fetchBaseQuery({ baseUrl: 'https://api.coingecko.com/api/v3/' }),
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    endpoints: (builder) => ({
        getAllCoins: builder.query<Coin[], void>({
            query: () =>
                `coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true`,
            transformResponse: (response: unknown) =>
                z.array(coinSchema).parse(response),

            providesTags: [{ type: "Coin", id: "LIST" }],
            extraOptions: {
                retry: (failureCount: number) => {
                    return failureCount < 3;
                }
            },
        }),
    }),

});

export const { useGetAllCoinsQuery } = allCryptoApi;
