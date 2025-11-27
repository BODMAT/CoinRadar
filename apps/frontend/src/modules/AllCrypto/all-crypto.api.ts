import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";

import type { Coin } from "./all-crypto.schema";
import { CoinSchema } from "./all-crypto.schema";

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
                z.array(CoinSchema).parse(response),

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
