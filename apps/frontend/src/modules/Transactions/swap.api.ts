import { createApi } from "@reduxjs/toolkit/query/react";
import { walletApi } from "../Wallet/wallet.api";
import { transactionApi } from "./transaction.api";
import {
    type CreateSwapDto,
    type SwapResponse,
    type SwapSettings,
    SwapResponseSchema,
    SwapSettingsSchema,
} from "./swap.schema";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";

export const swapApi = createApi({
    reducerPath: "swapApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["SwapSettings"],
    endpoints: (builder) => ({
        createSwap: builder.mutation<SwapResponse, { walletId: string; data: CreateSwapDto }>({
            query: ({ walletId, data }) => ({
                url: `wallets/${walletId}/swap`,
                method: "POST",
                body: data,
            }),
            transformResponse: (response: unknown) => {
                return SwapResponseSchema.parse(response);
            },
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(transactionApi.util.invalidateTags([{ type: "Transaction", id: "LIST" }]));
                    dispatch(walletApi.util.invalidateTags(["Wallet"]));
                } catch (error) {
                    console.error("Failed to invalidate tags after createSwap", error);
                }
            }
        }),

        getSwapSettings: builder.query<SwapSettings, string>({
            query: (walletId) => `wallets/${walletId}/swap-settings`,
            providesTags: ["SwapSettings"],
            transformResponse: (response: unknown) => {
                return SwapSettingsSchema.parse(response);
            },
        }),

        updateSwapSettings: builder.mutation<SwapSettings, { walletId: string; data: Partial<SwapSettings> }>({
            query: ({ walletId, data }) => ({
                url: `wallets/${walletId}/swap-settings`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["SwapSettings"],
            transformResponse: (response: unknown) => {
                return SwapSettingsSchema.parse(response);
            },
        }),
    }),
});

export type { SwapSettings, CreateSwapDto, SwapResponse };

export const {
    useCreateSwapMutation,
    useGetSwapSettingsQuery,
    useUpdateSwapSettingsMutation,
} = swapApi;
