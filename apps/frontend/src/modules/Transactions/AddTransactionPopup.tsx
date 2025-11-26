import React, { useState } from "react";
import type { Coin } from "../AllCrypto/all-crypto.api";
import { useAppDispatch, useAppSelector } from "../../store";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useCreateTransactionMutation, useGetCoinStatsQuery } from "./transaction.api";

export function AddTransactionPopup({ coin }: { coin: Coin }) {
    const dispatch = useAppDispatch();
    const selectedWalletId = useAppSelector(state => state.selectedWallet.selectedWalletId);

    const { data: coinStats } = useGetCoinStatsQuery(
        { walletId: selectedWalletId || "", coinSymbol: coin.symbol },
        { skip: !selectedWalletId }
    );

    const [createTransaction, { isLoading }] = useCreateTransactionMutation();

    const [form, setForm] = useState({
        quantity: "",
        price: coin.current_price.toString(),
        total_price: "",
        date: new Date().toISOString().split('T')[0],
        buyOrSell: "buy" as "buy" | "sell"
    });

    const [alert, setAlert] = useState<string | null>(null);

    if (!selectedWalletId) return null;

    const currentCoinInWallet = coinStats?.totalQuantity || 0;
    const averageBuyingPrice = coinStats?.avgBuyingPrice || 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if ((name === 'quantity' || name === 'price' || name === 'total_price') && !/^\d*\.?\d*$/.test(value)) return;

        setAlert(null);

        let newForm = { ...form, [name]: value };

        if (name === 'quantity') {
            newForm.total_price = (Number(value) * Number(form.price)).toString();
        } else if (name === 'price') {
            newForm.total_price = (Number(form.quantity) * Number(value)).toString();
        } else if (name === 'total_price') {
            if (Number(form.price) > 0) {
                newForm.quantity = (Number(value) / Number(form.price)).toString();
            }
        }

        setForm(newForm);
    };

    const handleSubmit = async () => {
        if (form.buyOrSell === 'sell' && Number(form.quantity) > currentCoinInWallet) {
            setAlert("You don't have enough coins in your wallet.");
            return;
        }

        try {
            await createTransaction({
                walletId: selectedWalletId,
                data: {
                    coinSymbol: coin.symbol,
                    quantity: Number(form.quantity),
                    price: Number(form.price),
                    buyOrSell: form.buyOrSell,
                    date: new Date(form.date)
                }
            }).unwrap();

            dispatch(closePopup());
            setTimeout(() => {
                dispatch(openPopup({ title: "Success", children: "Transaction added!" }));
            }, 300);

        } catch (error: any) {
            setAlert(error.data?.error || "Failed to add transaction");
        }
    };

    return (
        <div className="flex flex-col gap-5 p-2">
            <div className="flex justify-between gap-5 items-center mx-auto max-md:flex-col w-full border-b pb-4">
                <div className="flex items-center gap-3">
                    <img className="w-12 h-12 rounded-full" src={coin.image} alt={coin.name} />
                    <div>
                        <h2 className="font-bold text-xl">{coin.name}</h2>
                        <p className="text-xs text-gray-500">Current Price: ${coin.current_price}</p>
                    </div>
                </div>
                <div className="text-right text-sm">
                    <p>Wallet Balance: <b>{currentCoinInWallet}</b></p>
                    <p>Avg Buy: <b>${averageBuyingPrice}</b></p>
                </div>
            </div>

            {alert && (
                <div className="bg-red-100 text-red-700 p-2 rounded border border-red-200 text-sm text-center">
                    {alert}
                </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold">Type</label>
                    <select
                        name="buyOrSell"
                        value={form.buyOrSell}
                        onChange={handleChange}
                        className={`p-2 border-2 rounded font-bold ${form.buyOrSell === "buy" ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}`}
                    >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold">Price</label>
                        <input
                            className="p-2 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
                            type="text" name="price"
                            value={form.price} onChange={handleChange}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold">Quantity</label>
                        <input
                            className="p-2 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
                            type="text" name="quantity"
                            value={form.quantity} onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold">Total</label>
                    <input
                        className="p-2 border-2 border-gray-200 rounded"
                        type="text" name="total_price"
                        value={form.total_price} onChange={handleChange}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold">Date</label>
                    <input
                        className="p-2 border-2 border-gray-300 rounded"
                        type="date" name="date"
                        value={form.date} onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>

                <button
                    type="submit"
                    disabled={!form.quantity || isLoading}
                    className="mt-2 p-3 bg-black text-white rounded-lg font-bold hover:opacity-80 disabled:opacity-50 transition-all"
                >
                    {isLoading ? "Adding..." : "Add Transaction"}
                </button>
            </form>
        </div>
    );
}