import { createApi, fakeBaseQuery, } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import type { Coin } from "../AllCrypto/all-crypto.api";
import { db } from "../../firebase.config";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

export interface Transaction {
    id: string;
    coinInfo: Omit<Coin, "sparkline_in_7d" | "other" | "ath" | "id">;

    quantity: number;
    buying_price: number;
    date: string;

    buyOrSell: "buy" | "sell";
}

export interface CoinTransactions {
    id: string;
    transactions: Transaction[];
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
    buying_price: z.number().nonnegative(),
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

export const walletApi = createApi({
    reducerPath: "walletApi",
    baseQuery: fakeBaseQuery(),
    tagTypes: ["Wallet", "WalletCoin", "WalletTransaction"],
    endpoints: (builder) => ({
        getWallet: builder.query<Wallet, string>({
            query: async (walletId: string) => {
                try {
                    const coinsSnapshot = await getDocs(collection(db, "Wallets", walletId, "Coins"));
                    const coins: CoinTransactions[] = [];

                    for (const coinDoc of coinsSnapshot.docs) {
                        const coinId = coinDoc.id;
                        const transactionsSnap = await getDocs(collection(db, "Wallets", walletId, "Coins", coinId, "Transactions"));
                        const transactions: Transaction[] = transactionsSnap.docs.map(txDoc => ({
                            id: txDoc.id,
                            ...txDoc.data(),
                        } as Transaction));
                        coins.push({ id: coinId, transactions });
                    }
                    const wallet: Wallet = { id: walletId, coins };
                    return wallet;
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            },
            providesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
            transformResponse: (response: Wallet) => {
                const coins = response.coins.map(coin =>
                    CoinTransactionsScheme.parse({
                        id: coin.id,
                        transactions: coin.transactions.map(tx => TransactionScheme.parse(tx))
                    })
                );
                return WalletScheme.parse({ id: response.id, coins });
            }

        }),
        deleteWallet: builder.mutation<void, string>({
            query: async (walletId) => {
                try {
                    const itemsRef = collection(db, "Wallets", walletId, "Coins");
                    const itemsSnap = await getDocs(itemsRef);

                    for (const itemDoc of itemsSnap.docs) {
                        const coinId = itemDoc.id;
                        const transactionsRef = collection(db, "Wallets", walletId, "Coins", coinId, "Transactions");
                        const transactionsSnap = await getDocs(transactionsRef);

                        for (const txDoc of transactionsSnap.docs) {
                            await deleteDoc(doc(transactionsRef, txDoc.id));
                        }
                        await deleteDoc(doc(itemsRef, coinId));
                    }

                    const walletDocRef = doc(db, "Wallets", walletId);
                    await deleteDoc(walletDocRef);

                    return { data: null };
                } catch (error) {
                    console.error("Error deleting wallet:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),
        getWalletCoin: builder.query<CoinTransactions, { coinId: string; walletId: string }>({
            query: async ({ coinId, walletId }) => {
                try {
                    const coinDocRef = doc(db, "Wallets", walletId, "Coins", coinId);
                    const coinSnap = await getDoc(coinDocRef);

                    if (!coinSnap.exists()) {
                        return { error: { status: 404, data: "Coin not found" } };
                    }

                    const transactionsRef = collection(db, "Wallets", walletId, "Coins", coinId, "Transactions");
                    const transactionsSnap = await getDocs(transactionsRef);

                    const transactions: Transaction[] = transactionsSnap.docs.map(tx => tx.data() as Transaction);

                    return { data: { id: coinId, transactions } };
                } catch (error) {
                    console.error("Error getting wallet coin:", error);
                    return { error };
                }
            },
            providesTags: (_, __, { coinId, walletId }) => walletId ? [{ type: "Wallet", id: walletId, coinId }] : [],
        }),
        deleteWalletCoin: builder.mutation<void, { coinId: string, walletId: string }>({
            query: async ({ coinId, walletId }: { coinId: string, walletId: string }) => {
                try {
                    const transactionsRef = collection(db, "Wallets", walletId, "Coins", coinId, "Transactions");
                    const transactionsSnap = await getDocs(transactionsRef);

                    for (const txDoc of transactionsSnap.docs) {
                        await deleteDoc(doc(transactionsRef, txDoc.id));
                    }

                    const coinDocRef = doc(db, "Wallets", walletId, "Coins", coinId);
                    await deleteDoc(coinDocRef);

                    console.log(`Coin ${coinId} deleted from wallet ${walletId}`);
                } catch (error) {
                    console.error("Error deleting wallet coin:", error);
                }
            },
            invalidatesTags: (_, __, { walletId }) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),
        getWalletCoinTransaction: builder.query<Transaction, { transactionId: string, coinId: string, walletId: string }>({
            query: async ({ transactionId, coinId, walletId }) => {
                try {
                    const transactionDocRef = doc(db, "Wallets", walletId, "Coins", coinId, "Transactions", transactionId);
                    const transactionSnap = await getDoc(transactionDocRef);

                    if (!transactionSnap.exists()) {
                        return { error: { status: 404, data: "Transaction not found" } };
                    }
                    return { data: transactionSnap.data() as Transaction };
                } catch (error) {
                    console.error("Error getting wallet coin transaction:", error);
                    return { error };
                }
            },
            providesTags: (_, __, { transactionId, coinId, walletId }) => walletId ? [{ type: "Wallet", id: walletId, coinId, transactionId }] : [],
            transformResponse: (response: unknown) => TransactionScheme.parse(response),
        }),
        addWalletCoinTransaction: builder.mutation<Transaction, { transaction: Transaction, coinId: string, walletId: string }>({
            query: async ({ transaction, coinId, walletId }) => {
                try {
                    const transactionsRef = collection(db, "Wallets", walletId, "Coins", coinId, "Transactions");
                    const transactionDocRef = doc(transactionsRef);
                    const transactionWithId = { ...transaction, id: transactionDocRef.id };
                    await setDoc(transactionDocRef, transactionWithId);
                    return transactionWithId;
                } catch (error) {
                    console.error("Error adding wallet coin transaction:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId, coinId, transaction }) =>
                walletId ? [{ type: "Wallet", id: walletId, coinId, transaction: transaction.id }] : [],
            transformResponse: (response: unknown) => TransactionScheme.parse(response),
        }),
        updateWalletCoinTransaction: builder.mutation<Transaction, { transaction: Transaction, coinId: string, walletId: string }>({
            query: async ({ transaction, coinId, walletId }) => {
                try {
                    const transactionDocRef = doc(db, "Wallets", walletId, "Coins", coinId, "Transactions", transaction.id);
                    await setDoc(transactionDocRef, transaction);
                    return transaction;
                } catch (error) {
                    console.error("Error updating wallet coin transaction:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId, coinId, transaction }) =>
                walletId ? [{ type: "Wallet", id: walletId, coinId, transaction: transaction.id }] : [],
            transformResponse: (response: unknown) => TransactionScheme.parse(response),
        }),
        deleteWalletCoinTransaction: builder.mutation<void, { transactionId: string, coinId: string, walletId: string }>({
            query: async ({ transactionId, coinId, walletId }) => {
                try {
                    const transactionDocRef = doc(db, "Wallets", walletId, "Coins", coinId, "Transactions", transactionId);
                    await deleteDoc(transactionDocRef);
                } catch (error) {
                    console.error("Error deleting wallet coin transaction:", error);
                }
            },
            invalidatesTags: (_, __, { walletId, coinId, transactionId }) =>
                walletId ? [{ type: "Wallet", id: walletId, coinId, transaction: transactionId }] : [],
        }),
    }),
});

export const { useGetWalletQuery, useDeleteWalletMutation, useGetWalletCoinQuery, useDeleteWalletCoinMutation, useGetWalletCoinTransactionQuery, useAddWalletCoinTransactionMutation, useUpdateWalletCoinTransactionMutation, useDeleteWalletCoinTransactionMutation } = walletApi;