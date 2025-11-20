import { createApi, fetchBaseQuery, } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import type { Coin } from "../AllCrypto/all-crypto.api";

export interface Transaction {
    id: string;
    coinInfo: Omit<Coin, "sparkline_in_7d" | "other" | "ath" | "id">;

    quantity: number;
    price: number;
    date: string;

    buyOrSell: "buy" | "sell";
}

export interface TransactionWithCoinId extends Transaction {
    coinId: string;
}

export interface CoinTransactions {
    id: string;
    transactions: Transaction[];
}

export interface MyCoinComponent {
    id: string,
    name: string,
    image: string,
    quantity: number,
    currentPrise: number,
    avverageByingPrice: number,
    profit: number,
    lastDate: string
}

export interface Wallet {
    id: string;
    coins: CoinTransactions[];
}

export const TransactionScheme = z.object({
    id: z.string(),
    coinInfo: z.object({
        symbol: z.string(),
        name: z.string(),
        image: z.string(),
        current_price: z.number().nonnegative(),
        price_change_percentage_24h: z.number(),
    }),

    quantity: z.number().nonnegative(),
    price: z.number().nonnegative(),
    date: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
    buyOrSell: z.enum(["buy", "sell"]),
});

export const CoinTransactionsScheme = z.object({
    id: z.string(),
    transactions: z.array(TransactionScheme),
})

export const WalletScheme = z.object({
    id: z.string(),
    coins: z.array(CoinTransactionsScheme),
})

const BASE_URL = "http://localhost:4000/api/v1/";

export const transactionApi = createApi({
    reducerPath: "transactionApi",
    // 3. Використовуємо fetchBaseQuery для REST API
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
        // Тут можна додати заголовок авторизації, коли він буде готовий
        // prepareHeaders: (headers, { getState }) => {
        //     const token = (getState() as RootState).auth.token; // Приклад
        //     if (token) {
        //         headers.set('authorization', `Bearer ${token}`);
        //     }
        //     return headers;
        // },
    }),
    tagTypes: ["Wallet", "WalletCoin", "WalletTransaction"],
    endpoints: (builder) => ({
        // -----------------------------------------------------------
        // 1. GET WALLET (Отримання усіх монет та транзакцій)
        // GET /wallets/{walletId}
        // -----------------------------------------------------------
        getWallet: builder.query<Wallet, string>({
            query: (walletId: string) => `wallets/${walletId}`,
            // ВАЛІДАЦІЯ ДАНИХ (використовуємо transformResponse)
            transformResponse: (response: unknown) => {
                const parsedWallet = WalletScheme.parse(response);
                return parsedWallet;
            },
            providesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),

        // -----------------------------------------------------------
        // 2. DELETE WALLET (Видалення всього гаманця)
        // DELETE /wallets/{walletId}
        // -----------------------------------------------------------
        deleteWallet: builder.mutation<void, string>({
            query: (walletId) => ({
                url: `wallets/${walletId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),

        // -----------------------------------------------------------
        // 3. GET WALLET COIN (Отримання транзакцій для конкретної монети)
        // GET /wallets/{walletId}/coins/{coinId}
        // -----------------------------------------------------------
        getWalletCoin: builder.query<CoinTransactions, { coinId: string; walletId: string }>({
            query: ({ coinId, walletId }) => `wallets/${walletId}/coins/${coinId}`,
            providesTags: (_, __, { coinId, walletId }) => [
                { type: "WalletCoin", id: `${walletId}-${coinId}` }
            ],
        }),

        // -----------------------------------------------------------
        // 4. DELETE WALLET COIN (Видалення монети та всіх її транзакцій)
        // DELETE /wallets/{walletId}/coins/{coinId}
        // -----------------------------------------------------------
        deleteWalletCoin: builder.mutation<void, { coinId: string, walletId: string }>({
            query: ({ coinId, walletId }) => ({
                url: `wallets/${walletId}/coins/${coinId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_, __, { coinId, walletId }) => walletId ? [
                { type: "Wallet", id: walletId },
                { type: "WalletCoin", id: `${walletId}-${coinId}` }
            ] : [],
        }),

        // -----------------------------------------------------------
        // 5. GET TRANSACTION (Отримання конкретної транзакції)
        // GET /wallets/{walletId}/coins/{coinId}/transactions/{transactionId}
        // -----------------------------------------------------------
        getWalletCoinTransaction: builder.query<Transaction, { transactionId: string, coinId: string, walletId: string }>({
            query: ({ transactionId, coinId, walletId }) =>
                `wallets/${walletId}/coins/${coinId}/transactions/${transactionId}`,
            providesTags: (_, __, { transactionId, coinId, walletId }) =>
                walletId ? [
                    { type: "Wallet", id: walletId },
                    { type: "WalletTransaction", id: `${walletId}-${coinId}-${transactionId}` },
                    { type: "WalletCoin", id: `${walletId}-${coinId}` }
                ] : [],
        }),

        // -----------------------------------------------------------
        // 6. ADD TRANSACTION (Додавання нової транзакції)
        // POST /wallets/{walletId}/coins/{coinId}/transactions
        // -----------------------------------------------------------
        addWalletCoinTransaction: builder.mutation<Transaction, { transaction: Transaction, coinId: string, walletId: string }>(
            {
                query: ({ transaction, coinId, walletId }) => ({
                    url: `wallets/${walletId}/coins/${coinId}/transactions`,
                    method: "POST",
                    body: transaction,
                }),
                invalidatesTags: (_, __, { walletId, coinId }) => [ // Ігноруємо тег для конкретної транзакції, оскільки бекенд поверне ID
                    { type: "Wallet", id: walletId },
                    { type: "WalletCoin", id: `${walletId}-${coinId}` },
                ],
            }),

        // -----------------------------------------------------------
        // 7. UPDATE TRANSACTION (Оновлення існуючої транзакції)
        // PUT /wallets/{walletId}/coins/{coinId}/transactions/{transactionId}
        // -----------------------------------------------------------
        updateWalletCoinTransaction: builder.mutation<Transaction, { transaction: Transaction, coinId: string, walletId: string }>({
            query: ({ transaction, coinId, walletId }) => ({
                url: `wallets/${walletId}/coins/${coinId}/transactions/${transaction.id}`,
                method: "PUT",
                body: transaction,
            }),
            invalidatesTags: (_, __, { walletId, coinId, transaction }) => [
                { type: "Wallet", id: walletId },
                { type: "WalletCoin", id: `${walletId}-${coinId}` },
                { type: "WalletTransaction", id: `${walletId}-${coinId}-${transaction.id}` },
            ],
        }),

        // -----------------------------------------------------------
        // 8. DELETE TRANSACTION (Видалення транзакції)
        // DELETE /wallets/{walletId}/coins/{coinId}/transactions/{transactionId}
        // -----------------------------------------------------------
        deleteWalletCoinTransaction: builder.mutation<void, { transactionId: string, coinId: string, walletId: string }>({
            query: ({ transactionId, coinId, walletId }) => ({
                url: `wallets/${walletId}/coins/${coinId}/transactions/${transactionId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_, __, { walletId, coinId, transactionId }) => [
                { type: "Wallet", id: walletId },
                { type: "WalletCoin", id: `${walletId}-${coinId}` },
                { type: "WalletTransaction", id: `${walletId}-${coinId}-${transactionId}` },
            ],
        }),

    }),
});

export const { useGetWalletQuery, useDeleteWalletMutation, useGetWalletCoinQuery, useDeleteWalletCoinMutation, useGetWalletCoinTransactionQuery, useAddWalletCoinTransactionMutation, useUpdateWalletCoinTransactionMutation, useDeleteWalletCoinTransactionMutation } = transactionApi;