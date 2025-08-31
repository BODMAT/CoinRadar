import { createApi, fakeBaseQuery, } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import type { Coin } from "../AllCrypto/all-crypto.api";
import { db } from "../../firebase.config";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

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

export const walletApi = createApi({
    reducerPath: "walletApi",
    baseQuery: fakeBaseQuery(),
    tagTypes: ["Wallet", "WalletCoin", "WalletTransaction"],
    endpoints: (builder) => ({
        getWallet: builder.query<Wallet, string>({
            queryFn: async (walletId: string) => {
                try {
                    const coinsSnapshot = await getDocs(collection(db, "Wallets", walletId, "Coins"));
                    if (coinsSnapshot.empty) return { data: { id: walletId, coins: [] } };
                    const coinsPromises = coinsSnapshot.docs.map(async coinDoc => {
                        const coinId = coinDoc.id;
                        const transactionsSnap = await getDocs(collection(db, "Wallets", walletId, "Coins", coinId, "Transactions"));
                        const transactions: Transaction[] = transactionsSnap.docs.map(txDoc => ({
                            id: txDoc.id,
                            ...txDoc.data(),
                        } as Transaction));

                        const parsedTransactions = transactions.map(tx => TransactionScheme.parse(tx));

                        return { id: coinId, transactions: parsedTransactions };
                    });
                    const coins = await Promise.all(coinsPromises);

                    const wallet: Wallet = { id: walletId, coins };
                    const parsedWallet = WalletScheme.parse(wallet);

                    return { data: parsedWallet };
                } catch (error) {
                    console.error(error);
                    return { error };
                }
            },
            providesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),

        deleteWallet: builder.mutation<void, string>({
            queryFn: async (walletId, _api, _extraOptions, _baseQuery) => {
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

                    return { data: undefined };
                } catch (error) {
                    console.error("Error deleting wallet:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),

        getWalletCoin: builder.query<CoinTransactions, { coinId: string; walletId: string }>({
            queryFn: async ({ coinId, walletId }, _api, _extraOptions, _baseQuery) => {
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
            providesTags: (_, __, { coinId, walletId }) => walletId && coinId ? [{ type: "WalletCoin", id: `${walletId}-${coinId}` }] : [],


        }),

        deleteWalletCoin: builder.mutation<void, { coinId: string, walletId: string }>({
            queryFn: async ({ coinId, walletId }, _api, _extraOptions, _baseQuery) => {
                try {
                    const transactionsRef = collection(db, "Wallets", walletId, "Coins", coinId, "Transactions");
                    const transactionsSnap = await getDocs(transactionsRef);

                    for (const txDoc of transactionsSnap.docs) {
                        await deleteDoc(doc(transactionsRef, txDoc.id));
                    }

                    const coinDocRef = doc(db, "Wallets", walletId, "Coins", coinId);
                    await deleteDoc(coinDocRef);

                    console.log(`Coin ${coinId} deleted from wallet ${walletId}`);
                    return { data: undefined };
                } catch (error) {
                    console.error("Error deleting wallet coin:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId }) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),

        getWalletCoinTransaction: builder.query<Transaction, { transactionId: string, coinId: string, walletId: string }>({
            queryFn: async ({ transactionId, coinId, walletId }, _api, _extraOptions, _baseQuery) => {
                try {
                    const transactionDocRef = doc(db, "Wallets", walletId, "Coins", coinId, "Transactions", transactionId);
                    const transactionSnap = await getDoc(transactionDocRef);

                    if (!transactionSnap.exists()) {
                        return { error: { status: 404, data: "Transaction not found" } };
                    }

                    const transaction = TransactionScheme.parse(transactionSnap.data());
                    return { data: transaction };
                } catch (error) {
                    console.error("Error getting wallet coin transaction:", error);
                    return { error };
                }
            },
            providesTags: (_, __, { transactionId, coinId, walletId }) =>
                walletId ? [{ type: "Wallet", id: walletId, coinId, transactionId }] : [],
        }),

        addWalletCoinTransaction: builder.mutation<Transaction, { transaction: Transaction, coinId: string, walletId: string }>(
            {
                queryFn: async ({ transaction, coinId, walletId }, _api, _extraOptions, _baseQuery) => {
                    try {
                        const coinDocRef = doc(db, "Wallets", walletId, "Coins", coinId);
                        const coinSnap = await getDoc(coinDocRef);
                        if (!coinSnap.exists()) {
                            //! if coin doesn't exist, create it with createdAt date (need cause Firebase doesn't allow empty documents)
                            await setDoc(coinDocRef, { createdAt: new Date() });
                        }
                        const transactionsRef = collection(db, "Wallets", walletId, "Coins", coinId, "Transactions");

                        const transactionDocRef = doc(transactionsRef);
                        const transactionWithId = { ...transaction, id: transactionDocRef.id };
                        await setDoc(transactionDocRef, transactionWithId);

                        const validatedTransaction = TransactionScheme.parse(transactionWithId);
                        return { data: validatedTransaction };
                    } catch (error) {
                        console.error("Error adding wallet coin transaction:", error);
                        return { error };
                    }
                },
                invalidatesTags: (_, __, { walletId, coinId, transaction }) => [
                    { type: "Wallet", id: walletId },
                    { type: "WalletCoin", id: `${walletId}-${coinId}` },
                    { type: "WalletTransaction", id: `${walletId}-${coinId}-${transaction.id}` },
                ],
            }),


        updateWalletCoinTransaction: builder.mutation<Transaction, { transaction: Transaction, coinId: string, walletId: string }>({
            queryFn: async ({ transaction, coinId, walletId }, _api, _extraOptions, _baseQuery) => {
                try {
                    const transactionDocRef = doc(db, "Wallets", walletId, "Coins", coinId, "Transactions", transaction.id);
                    await setDoc(transactionDocRef, transaction);

                    const validatedTransaction = TransactionScheme.parse(transaction);
                    return { data: validatedTransaction };
                } catch (error) {
                    console.error("Error updating wallet coin transaction:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId, coinId, transaction }) => [
                { type: "Wallet", id: walletId },
                { type: "WalletCoin", id: `${walletId}-${coinId}` },
                { type: "WalletTransaction", id: `${walletId}-${coinId}-${transaction.id}` },
            ],

        }),

        deleteWalletCoinTransaction: builder.mutation<void, { transactionId: string, coinId: string, walletId: string }>({
            queryFn: async ({ transactionId, coinId, walletId }, _api, _extraOptions, _baseQuery) => {
                try {
                    const transactionDocRef = doc(db, "Wallets", walletId, "Coins", coinId, "Transactions", transactionId);
                    await deleteDoc(transactionDocRef);
                    return { data: undefined };
                } catch (error) {
                    console.error("Error deleting wallet coin transaction:", error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId, coinId, transactionId }) => [
                { type: "Wallet", id: walletId },
                { type: "WalletCoin", id: `${walletId}-${coinId}` },
                { type: "WalletTransaction", id: `${walletId}-${coinId}-${transactionId}` },
            ],
        }),

    }),
});

export const { useGetWalletQuery, useDeleteWalletMutation, useGetWalletCoinQuery, useDeleteWalletCoinMutation, useGetWalletCoinTransactionQuery, useAddWalletCoinTransactionMutation, useUpdateWalletCoinTransactionMutation, useDeleteWalletCoinTransactionMutation } = walletApi;