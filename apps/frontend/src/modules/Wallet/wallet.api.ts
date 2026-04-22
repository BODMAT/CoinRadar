import { createApi } from "@reduxjs/toolkit/query/react";
import type { Wallet, WalletCreate, WalletPatch } from "./wallet.schema";
import { WalletSchema } from "./wallet.schema";
import {
  addWallet,
  removeWallet,
  setWalletsList,
  updateWalletInList,
} from "./selectedWallet.slice";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";

export const walletApi = createApi({
  reducerPath: "walletApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Wallet"],

  endpoints: (builder) => ({
    getWallets: builder.query<Wallet[], void>({
      query: () => "wallets",
      providesTags: (result) =>
        result
          ? [
              { type: "Wallet" as const, id: "LIST" },
              ...result.map(({ id }) => ({ type: "Wallet" as const, id })),
            ]
          : [{ type: "Wallet" as const, id: "LIST" }],
      transformResponse: (response: Wallet[]) => {
        const parsedWallets = WalletSchema.array().parse(response);
        return parsedWallets;
      },
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(setWalletsList(data));
        } catch (error) {
          console.error("Failed to sync wallets list from getWallets", error);
        }
      },
    }),
    createWallet: builder.mutation<Wallet, WalletCreate>({
      query: (data) => ({
        url: "wallets",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Wallet" as const, id: "LIST" }],
      transformResponse: (response: Wallet) => {
        const parsedWallet = WalletSchema.parse(response);
        return parsedWallet;
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data: newWallet } = await queryFulfilled;
          dispatch(addWallet(newWallet));
        } catch (error) {
          console.error("Failed to create wallet:", error);
        }
      },
    }),
    getWallet: builder.query<Wallet, string>({
      query: (walletId: string) => `wallets/${walletId}`,
      providesTags: (_, __, walletId) =>
        walletId ? [{ type: "Wallet" as const, id: walletId }] : [],
      transformResponse: (response: unknown) => {
        const parsedWallet = WalletSchema.parse(response);
        return parsedWallet;
      },
    }),
    updateWallet: builder.mutation<Wallet, { id: string; patch: WalletPatch }>({
      query: ({ id, patch }) => ({
        url: `wallets/${id}`,
        method: "PATCH",
        body: patch,
      }),

      transformResponse: (response: unknown) => {
        const parsedWallet = WalletSchema.parse(response);
        return parsedWallet;
      },

      invalidatesTags: (_, __, { id }) => [
        { type: "Wallet" as const, id },
        { type: "Wallet" as const, id: "LIST" },
      ],

      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(updateWalletInList(updated));
        } catch (error) {
          console.error("Failed to update wallet:", error);
        }
      },
    }),
    deleteWallet: builder.mutation<void, string>({
      query: (walletId) => ({
        url: `wallets/${walletId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, walletId) => [
        { type: "Wallet" as const, id: walletId },
        { type: "Wallet" as const, id: "LIST" },
      ],
      async onQueryStarted(walletId, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(removeWallet(walletId));
        } catch (error) {
          console.error(`Failed to delete wallet ${walletId}:`, error);
        }
      },
    }),
  }),
});

export const {
  useGetWalletsQuery,
  useCreateWalletMutation,
  useGetWalletQuery,
  useUpdateWalletMutation,
  useDeleteWalletMutation,
} = walletApi;
