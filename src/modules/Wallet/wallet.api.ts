import { createApi, fakeBaseQuery, } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import type { Coin } from "../AllCrypto/all-crypto.api";
import { db } from "../../firebase.config";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

export interface Transaction {
    coinInfo: Omit<Coin, "sparkline_in_7d" | "other" | "ath">;

    quantity: number;
    buying_price: number;
    date: string;
}

export const TransactionScheme = z.object({
    coinInfo: z.object({
        id: z.string(),
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
    })
});

export const walletApi = createApi({
    reducerPath: "walletApi",
    baseQuery: fakeBaseQuery(),
    tagTypes: ["Wallet"],
    endpoints: (builder) => ({
        getWallet: builder.query<Transaction[], string>({
            query: async (walletId: string) => {
                try {
                    const snapshot = await getDocs(collection(db, "walletItems", walletId, "items"));
                    const data = snapshot.docs.map(doc => ({ ...doc.data() }));
                    return data;
                } catch (error) {
                    return { error };
                }
            },
            providesTags: (_, __, walletId) => walletId ? [{ type: "Wallet", id: walletId }] : [],
            transformResponse: (response: unknown) => z.array(TransactionScheme).parse(response)
        }),
        setWalletItem: builder.mutation<void, { item: Transaction, walletId: string }>({
            query: async ({ item, walletId }: { item: Transaction, walletId: string }) => {
                try {
                    await setDoc(doc(db, "walletItems", walletId, "items", item.coinInfo.id), item);
                    return { data: null };
                } catch (error) {
                    console.error(error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId }) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),
        deleteWalletItem: builder.mutation<void, { item: Transaction, walletId: string }>({
            query: async ({ item, walletId }: { item: Transaction, walletId: string }) => {
                try {
                    await deleteDoc(doc(db, "walletItems", walletId, "items", item.coinInfo.id));
                    return { data: null };
                } catch (error) {
                    console.error(error);
                    return { error };
                }
            },
            invalidatesTags: (_, __, { walletId }) => walletId ? [{ type: "Wallet", id: walletId }] : [],
        }),
    }),
});

export const { useGetWalletQuery, useSetWalletItemMutation, useDeleteWalletItemMutation } = walletApi;