import type { Coin } from "../AllCrypto/all-crypto.api";
import { useAddWalletCoinTransactionMutation, useGetWalletCoinQuery, type Transaction } from "./wallet.api";
import { generateUID } from "../../utils/functions";
import { use, useEffect, useState } from "react";
import { useGetUserQuery } from "../Auth/auth.api";
export function AddTransactionPopup({ coin }: { coin: Coin }) {
    const { data: user } = useGetUserQuery();
    const { data: transaction } = useGetWalletCoinQuery({ walletId: user?.uid ?? "", coinId: coin.id });
    const [addTransaction] = useAddWalletCoinTransactionMutation();

    const [stringifiedValues, setStringifiedValues] = useState({
        quantity: "0",
        buying_price: coin.current_price.toString(),
        total_price: "0",
    });
    const [form, setForm] = useState<Transaction>({
        id: generateUID(coin.name),
        coinInfo: coin,
        quantity: Number(stringifiedValues.quantity),
        buying_price: Number(stringifiedValues.buying_price),
        date: new Date().toISOString().split('T')[0],
        buyOrSell: "buy"
    });

    useEffect(() => {
        setForm({
            ...form,
            quantity: Number(stringifiedValues.quantity),
            buying_price: Number(stringifiedValues.buying_price),
        })
    }, [stringifiedValues]);

    const regex = /^\d*\.?\d*$/;
    console.log(form.quantity);
    const handleSubmit = () => {
        addTransaction({
            walletId: user?.uid ?? "",
            transaction: form,
            coinId: coin.id
        });
    }
    return (
        <div className="flex flex-col gap-5">
            <div className="flex justify-between gap-5 items-center mx-auto max-md:flex-col">
                <img className="w-12 h-12" src={coin.image} alt={coin.name} />
                <h2 className="font-bold text-xl">{coin.name}</h2>
                <div className="">
                    <h3>Already in your wallet</h3>
                    <h3>Quantity: {transaction ? transaction?.transactions.reduce((acc, transaction) => {
                        if (transaction.buyOrSell === "buy") {
                            return acc + transaction.quantity;
                        } else {
                            return acc - transaction.quantity;
                        }
                    }, 0) : 0}</h3>
                    <h3>Current price: {coin.current_price}</h3>
                    <h3>Your avarage buying price: {transaction ? transaction?.transactions.reduce((acc, transaction) => {
                        if (transaction.buyOrSell === "buy") {
                            return acc + transaction.quantity * transaction.buying_price;
                        } else {
                            return acc;
                        }
                    }, 0) / transaction?.transactions.length : 0}</h3>
                </div>
            </div>
            <form className="flex flex-col gap-5 " onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="quantity">Quantity: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="quantity..." name="quantity" id="quantity" value={stringifiedValues.quantity} onChange={(e) => {
                        const value = e.target.value;
                        if (regex.test(value)) {
                            setStringifiedValues({ ...stringifiedValues, quantity: value, total_price: (Number(value) * Number(stringifiedValues.buying_price)).toString() });
                        }
                    }} />
                </div>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="buying_price">Buying price: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="buying price..." name="buying_price" id="buying_price" value={stringifiedValues.buying_price} onChange={(e) => {
                        const value = e.target.value;
                        if (regex.test(value)) {
                            setStringifiedValues({ ...stringifiedValues, buying_price: value, total_price: (Number(value) * Number(stringifiedValues.quantity)).toString() });
                        }
                    }} />
                </div>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="total_price">Total price: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="total price..." name="total_price" id="total_price" value={stringifiedValues.total_price} onChange={(e) => {
                        const value = e.target.value;
                        if (regex.test(value)) {
                            setStringifiedValues({ ...stringifiedValues, total_price: value, quantity: (Number(value) / Number(stringifiedValues.buying_price)).toString() });
                        }
                    }} />
                </div>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="date">Date: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="date" placeholder="date..." name="date" id="date" value={form.date} onChange={(e) => {
                        const value = e.target.value;
                        setForm({ ...form, date: value });
                    }} />
                </div>
                <select value={form.buyOrSell} onChange={(e) => setForm({ ...form, buyOrSell: e.target.value as "buy" | "sell" })} className={`px-2 border-2 border-black rounded fontTitle p-2 ${form.buyOrSell === "buy" ? "bg-green-500" : "bg-red-500"}`}>
                    <option value="buy" className="bg-green-500">Buy</option>
                    <option value="sell" className="bg-red-500">Sell</option>
                </select>
                <button type="submit" disabled={!form.quantity} className="px-2 border-2 border-black rounded fontTitle p-2 bg-[var(--color-card)] cursor-pointer transitioned hover:scale-101 text-[var:--color-text]">{form.quantity ? "Add transaction" : "To add transaction you need to enter quantity"}</button>
            </form>
        </div>
    )
}