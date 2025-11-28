import { createApi, fetchBaseQuery, } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../../store";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://coinradar-wmzg.onrender.com/api/";
import type { Transaction, PaginatedTransactions, CreateTransaction } from "./transaction.schema";
import { PaginatedTransactionsSchema, TransactionResponseSchema, TransactionResponseArraySchema } from "./transaction.schema";
import type { CoinForChart, CoinInfo } from "./coinInfo.schema";
import { CoinForChartArraySchema, CoinInfoArraySchema, CoinInfoSchema } from "./coinInfo.schema";
import { walletApi } from "../Wallet/wallet.api";

export const transactionApi = createApi({
    reducerPath: "transactionApi",
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
    tagTypes: ["Transaction"],
    endpoints: (builder) => ({
        getTransactions: builder.query<Transaction[], string>({
            query: (walletId) => `wallets/${walletId}/transactions`,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Transaction' as const, id })),
                        { type: 'Transaction', id: 'LIST' },
                    ]
                    : [{ type: 'Transaction', id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return TransactionResponseSchema.array().parse(response);
            },
        }),

        createTransaction: builder.mutation<Transaction, { walletId: string; data: CreateTransaction }>({
            query: ({ walletId, data }) => ({
                url: `wallets/${walletId}/transactions`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: [{ type: 'Transaction', id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return TransactionResponseSchema.parse(response);
            },
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(walletApi.util.invalidateTags(['Wallet']));
                } catch { }
            }
        }),

        getPaginatedTransactions: builder.query<
            PaginatedTransactions,
            { walletId: string; page?: number; limit?: number }
        >({
            query: ({ walletId, page = 1, limit = 10 }) => ({
                url: `wallets/${walletId}/transactions/paginated`,
                params: { page, limit },
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Transaction' as const, id })),
                        { type: 'Transaction', id: 'LIST' },
                    ]
                    : [{ type: 'Transaction', id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return PaginatedTransactionsSchema.parse(response);
            },
        }),

        getTransaction: builder.query<Transaction, { walletId: string; transactionId: string }>({
            query: ({ walletId, transactionId }) => `wallets/${walletId}/transactions/${transactionId}`,

            providesTags: (result) =>
                result
                    ? [
                        { type: 'Transaction' as const, id: result.id },
                        { type: 'Transaction' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Transaction' as const, id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return TransactionResponseSchema.parse(response);
            },
        }),

        deleteTransaction: builder.mutation<{ message: string; id: string }, { walletId: string; transactionId: string }>({
            query: ({ walletId, transactionId }) => ({
                url: `wallets/${walletId}/transactions/${transactionId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_, __, { transactionId }) => [
                { type: 'Transaction', id: transactionId },
                { type: 'Transaction', id: 'LIST' }
            ],
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(walletApi.util.invalidateTags(['Wallet']));
                } catch { }
            }
        }),

        updateTransaction: builder.mutation<
            Transaction,
            { walletId: string; transactionId: string; data: Partial<CreateTransaction> }
        >({
            query: ({ walletId, transactionId, data }) => ({
                url: `wallets/${walletId}/transactions/${transactionId}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: (_, __, { transactionId }) => [
                { type: 'Transaction', id: transactionId },
                { type: 'Transaction', id: 'LIST' }
            ],
            transformResponse: (response: unknown) => {
                return TransactionResponseSchema.parse(response);
            },
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(walletApi.util.invalidateTags(['Wallet']));
                } catch { }
            }
        }),

        getTransactionsByCoin: builder.query<Transaction[], { walletId: string; coinSymbol: string }>({
            query: ({ walletId, coinSymbol }) => `wallets/${walletId}/transactions/coins/${coinSymbol}`,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Transaction' as const, id })),
                        { type: 'Transaction', id: 'LIST' }
                    ]
                    : [{ type: 'Transaction', id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return TransactionResponseArraySchema.parse(response);
            },
        }),

        getAllTransactionsGroupByCoinSymbol: builder.query<CoinInfo[], string>({
            query: (walletId) => `wallets/${walletId}/transactions/grouped`,
            providesTags: [{ type: 'Transaction', id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return CoinInfoArraySchema.parse(response);
            },
        }),

        getCoinStats: builder.query<CoinInfo, { walletId: string; coinSymbol: string }>({
            query: ({ walletId, coinSymbol }) => `wallets/${walletId}/transactions/coins/${coinSymbol}/stats`,
            providesTags: [{ type: 'Transaction', id: 'LIST' }],
            transformResponse: (response: unknown) => {
                return CoinInfoSchema.parse(response);
            },
        }),

        getGroupedTransactionsForChart: builder.query<CoinForChart[], { walletId: string; range?: string }>({
            query: ({ walletId, range = '7d' }) => {
                return {
                    url: `wallets/${walletId}/transactions/chart-data`,
                    params: { range } // ?range=7d or ?range=30d
                };
            },
            providesTags: (_, __, { walletId }) => [
                { type: 'Transaction', id: 'LIST' },
                { type: 'Transaction', id: `CHART-${walletId}` } // Специфічний тег
            ],
            transformResponse: (response: unknown) => {
                return CoinForChartArraySchema.parse(response);
            },
        }),
    }),
});

export const {
    useGetTransactionsQuery,
    useCreateTransactionMutation,
    useGetPaginatedTransactionsQuery,
    useGetTransactionQuery,
    useDeleteTransactionMutation,
    useUpdateTransactionMutation,
    useGetTransactionsByCoinQuery,
    useGetAllTransactionsGroupByCoinSymbolQuery,
    useGetCoinStatsQuery,
    useGetGroupedTransactionsForChartQuery
} = transactionApi;