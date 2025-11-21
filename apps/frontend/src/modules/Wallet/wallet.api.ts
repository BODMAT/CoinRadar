import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../../store";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/";
import type { Wallet, WalletCreate, WalletPatch } from "./wallet.schema";
import { WalletSchema } from "./wallet.schema";
import { setWalletsList } from "./selectedWallet.slice";

export const walletApi = createApi({
    reducerPath: "walletApi",
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            const state = getState() as RootState;
            const token = state.auth.user?.token;

            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }

            return headers;
        },
    }),
    tagTypes: ["Wallet"],

    endpoints: (builder) => ({
        getWallets: builder.query<Wallet[], void>({
            query: () => "wallets",
            providesTags: (result) =>
                result
                    ? [
                        { type: 'Wallet' as const, id: 'LIST' },
                        ...result.map(({ id }) => ({ type: 'Wallet' as const, id })),
                    ]
                    : [{ type: 'Wallet' as const, id: 'LIST' }],
            transformResponse: (response: Wallet[]) => {
                const parsedWallets = WalletSchema.array().parse(response);
                return parsedWallets;
            },
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setWalletsList(data));
                } catch { }
            },
        }),
        createWallet: builder.mutation<Wallet, WalletCreate>({
            query: (data) => ({
                url: "wallets",
                method: "POST",
                body: data,
            }),
            invalidatesTags: [{ type: 'Wallet' as const, id: 'LIST' }],
            transformResponse: (response: Wallet) => {
                const parsedWallet = WalletSchema.parse(response);
                return parsedWallet;
            },

        }),
        getWallet: builder.query<Wallet, string>({
            query: (walletId: string) => `wallets/${walletId}`,
            providesTags: (_, __, walletId) => walletId ? [{ type: "Wallet" as const, id: walletId }] : [],
            transformResponse: (response: unknown) => {
                const parsedWallet = WalletSchema.parse(response);
                return parsedWallet;
            }
        }),
        updateWallet: builder.mutation<Wallet, { id: string; patch: WalletPatch }>({
            query: ({ id, patch }) => ({
                url: `wallets/${id}`,
                method: 'PATCH',
                body: patch,
            }),

            transformResponse: (response: unknown) => {
                const parsedWallet = WalletSchema.parse(response);
                return parsedWallet;
            },

            invalidatesTags: (result, error, { id }) => [
                { type: 'Wallet' as const, id },
                { type: 'Wallet' as const, id: 'LIST' },
            ],
        }),
        deleteWallet: builder.mutation<void, string>({
            query: (walletId) => ({
                url: `wallets/${walletId}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, walletId) => [
                { type: "Wallet" as const, id: walletId },
                { type: "Wallet" as const, id: 'LIST' },
            ],
        }),
    })
});

export const {
    useGetWalletsQuery,
    useCreateWalletMutation,
    useGetWalletQuery,
    useUpdateWalletMutation,
    useDeleteWalletMutation,
} = walletApi;