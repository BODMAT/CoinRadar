import React, { useState } from "react";
import type { Coin } from "../AllCrypto/all-crypto.schema";
import { useAppDispatch, useAppSelector } from "../../store";
import { closePopup, openPopup } from "../../portals/popup.slice";
import {
  useCreateTransactionMutation,
  useGetCoinStatsQuery,
} from "./transaction.api";
import { useCreateSwapMutation, useGetSwapSettingsQuery } from "./swap.api";
import {
  extractApiErrorMessage,
  getLocalDatetime,
} from "../../utils/functions";
import { TransactionFormFields } from "./TransactionFormFields";

export function AddTransactionPopup({ coin }: { coin: Coin }) {
  const dispatch = useAppDispatch();
  const selectedWalletId = useAppSelector(
    (state) => state.selectedWallet.selectedWalletId,
  );

  const { data: coinStats } = useGetCoinStatsQuery(
    { walletId: selectedWalletId || "", coinSymbol: coin.symbol },
    { skip: !selectedWalletId },
  );

  const [createTransaction, { isLoading: isCreateTransactionLoading }] =
    useCreateTransactionMutation();
  const [createSwap, { isLoading: isCreateSwapLoading }] =
    useCreateSwapMutation();
  const { data: swapSettings } = useGetSwapSettingsQuery(
    selectedWalletId || "",
    { skip: !selectedWalletId },
  );

  const [form, setForm] = useState({
    quantity: "",
    price: coin.current_price.toString(),
    total_price: "",
    createdAt: getLocalDatetime(),
    buyOrSell: "buy" as "buy" | "sell",
  });

  const [alert, setAlert] = useState<string | null>(null);
  const [payWithSwap, setPayWithSwap] = useState(false);

  if (!selectedWalletId) return null;

  const currentCoinInWallet = coinStats?.totalQuantity || 0;
  const averageBuyingPrice = coinStats?.avgBuyingPrice || 0;
  const swapEnabled = swapSettings?.swapEnabled ?? false;
  const activeStableCoin = (swapSettings?.stableCoin || "usdt").toUpperCase();
  const isLoading = isCreateTransactionLoading || isCreateSwapLoading;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (
      (name === "quantity" || name === "price" || name === "total_price") &&
      !/^\d*\.?\d*$/.test(value)
    )
      return;

    setAlert(null);

    const newForm = { ...form, [name]: value };

    if (name === "quantity") {
      newForm.total_price = (Number(value) * Number(form.price)).toString();
    } else if (name === "price") {
      newForm.total_price = (Number(form.quantity) * Number(value)).toString();
    } else if (name === "total_price") {
      if (Number(form.price) > 0) {
        newForm.quantity = (Number(value) / Number(form.price)).toString();
      }
    }

    setForm(newForm);
  };

  const handleSubmit = async () => {
    if (
      form.buyOrSell === "sell" &&
      Number(form.quantity) > currentCoinInWallet
    ) {
      setAlert("You don't have enough coins in your wallet.");
      return;
    }

    try {
      if (form.buyOrSell === "buy" && swapEnabled && payWithSwap) {
        const stableCoin = (swapSettings?.stableCoin || "usdt").toLowerCase();
        const totalToSpend = Number(
          form.total_price ||
            (Number(form.quantity) * Number(form.price)).toString(),
        );

        await createSwap({
          walletId: selectedWalletId,
          data: {
            fromCoin: stableCoin,
            fromQuantity: totalToSpend,
            fromPrice: 1,
            toCoin: coin.symbol.toLowerCase(),
            toQuantity: Number(form.quantity),
            toPrice: Number(form.price),
            createdAt: new Date(form.createdAt),
          },
        }).unwrap();
      } else if (form.buyOrSell === "sell" && swapEnabled && payWithSwap) {
        const stableCoin = (swapSettings?.stableCoin || "usdt").toLowerCase();
        const stableQuantity = Number(
          form.total_price ||
            (Number(form.quantity) * Number(form.price)).toString(),
        );

        await createSwap({
          walletId: selectedWalletId,
          data: {
            fromCoin: coin.symbol.toLowerCase(),
            fromQuantity: Number(form.quantity),
            fromPrice: Number(form.price),
            toCoin: stableCoin,
            toQuantity: stableQuantity,
            toPrice: 1,
            createdAt: new Date(form.createdAt),
          },
        }).unwrap();
      } else {
        await createTransaction({
          walletId: selectedWalletId,
          data: {
            coinSymbol: coin.symbol,
            quantity: Number(form.quantity),
            price: Number(form.price),
            buyOrSell: form.buyOrSell,
            createdAt: new Date(form.createdAt),
          },
        }).unwrap();
      }

      dispatch(closePopup());
      setTimeout(() => {
        dispatch(
          openPopup({ title: "Success", children: "Transaction added!" }),
        );
      }, 300);
    } catch (error: unknown) {
      setAlert(extractApiErrorMessage(error, "Failed to process transaction"));
    }
  };

  const maxDateTime = getLocalDatetime();

  return (
    <div className="flex flex-col gap-5 p-2">
      <div className="flex justify-between gap-5 items-center mx-auto max-md:flex-col w-full border-b pb-4">
        <div className="flex items-center gap-3">
          <img
            className="w-12 h-12 rounded-full"
            src={coin.image}
            alt={coin.name}
          />
          <div>
            <h2 className="font-bold text-xl">{coin.name}</h2>
            <p className="text-xs text-gray-500">
              Current Price: ${coin.current_price}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p>
            Wallet Balance: <b>{currentCoinInWallet}</b>
          </p>
          <p>
            Avg Buy: <b>${averageBuyingPrice}</b>
          </p>
        </div>
      </div>

      {alert && (
        <div className="bg-red-100 text-red-700 p-2 rounded border border-red-200 text-sm text-center">
          {alert}
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <TransactionFormFields
          form={form}
          onChange={handleChange}
          maxDateTime={maxDateTime}
          isLoading={isLoading}
          submitLabel="Add Transaction"
          loadingLabel="Adding..."
          swapSlot={
            swapEnabled &&
            (form.buyOrSell === "buy" || form.buyOrSell === "sell") ? (
              <div className="flex items-center justify-between gap-3 p-2 border-2 border-gray-300 rounded">
                <label className="text-sm font-bold">
                  {form.buyOrSell === "buy"
                    ? `Pay with ${activeStableCoin} (Swap)`
                    : `Receive ${activeStableCoin} (Swap)`}
                </label>
                <input
                  type="checkbox"
                  checked={payWithSwap}
                  onChange={(e) => {
                    setAlert(null);
                    setPayWithSwap(e.target.checked);
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
            ) : null
          }
        />
      </form>
    </div>
  );
}
