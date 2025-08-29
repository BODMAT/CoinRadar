import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import { setIsAPILoading, sincronizeAllCoins } from "./all-crypto.slice";
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
    price_change_percentage_24h: z.number(),
    sparkline_in_7d: z.object({
        price: z.array(z.number()),
    }),
    other: z.any(),
})

export const allCryptoApi = createApi({
    reducerPath: 'allCryptoApi',
    tagTypes: ["Coin"],
    baseQuery: fetchBaseQuery({ baseUrl: 'https://api.coingecko.com/api/v3/' }),
    endpoints: (builder) => ({
        getAllCoins: builder.query<Coin[], void>({
            query: () =>
                `coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true`,
            transformResponse: (response: unknown) => z.array(coinSchema).parse(response),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setIsAPILoading(true));
                    dispatch(sincronizeAllCoins(data));
                } catch {
                    console.error("error fetching coins");
                } finally {
                    dispatch(setIsAPILoading(false));
                }
            },
            providesTags: [{ type: "Coin", id: "LIST" }],
            extraOptions: {
                retry: (failureCount: number) => {
                    return failureCount < 3;
                }
            }
        }),
        getCoin: builder.query<Coin, string>({
            query: (id) => `coins/${id}?sparkline=true`,
            transformResponse: (response: unknown) => {
                const coin: Coin = coinSchema.parse(response);
                return coin;
            },
            providesTags: (_, __, id) => [{ type: "Coin", id }],
        })
    }),

});

export const { useGetAllCoinsQuery } = allCryptoApi;
