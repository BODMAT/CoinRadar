import { useEffect, useState } from "react";
import { useAppDispatch } from "../../store";
import { useGetUserQuery } from "../Auth/auth.api";
import { useGetWalletCoinQuery, useUpdateWalletCoinTransactionMutation, type Transaction, type TransactionWithCoinId } from "./wallet.api";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { calculateAverageBuyingPrice } from "../../utils/functions";

export function ChangeTransactionPopup({ transaction }: { transaction: TransactionWithCoinId }) {
    const dispach = useAppDispatch();
    const { data: user } = useGetUserQuery();
    const { data: transactionFromQuery } = useGetWalletCoinQuery(
        { walletId: user?.uid!, coinId: transaction.coinId },
        { skip: !user?.uid }
    );
    const [changeTransaction] = useUpdateWalletCoinTransactionMutation();
    const [stringifiedValues, setStringifiedValues] = useState({
        quantity: transaction.quantity.toString(),
        price: transaction.price.toString(),
        total_price: (transaction.price * transaction.quantity).toString(),
    });
    const [form, setForm] = useState<Transaction>({
        id: transaction.id,
        coinInfo: {
            symbol: transaction.coinInfo.symbol,
            name: transaction.coinInfo.name,
            image: transaction.coinInfo.image,
            current_price: transaction.coinInfo.current_price,
            price_change_percentage_24h: transaction.coinInfo.price_change_percentage_24h,

        },
        quantity: Number(stringifiedValues.quantity),
        price: Number(stringifiedValues.price),
        date: new Date().toISOString().split('T')[0],
        buyOrSell: transaction.buyOrSell
    });

    useEffect(() => {
        setForm({
            ...form,
            quantity: Number(stringifiedValues.quantity),
            price: Number(stringifiedValues.price),
        })
    }, [stringifiedValues]);

    const regex = /^\d*\.?\d*$/;
    const handleSubmit = async () => {
        if (!user?.uid) return;
        try {
            await changeTransaction({
                walletId: user?.uid ?? "",
                transaction: form,
                coinId: transaction.coinId
            });
            dispach(closePopup());
            await new Promise((resolve) => setTimeout(resolve, 300));
            dispach(openPopup({ title: "Success", children: "Transaction changed!" }));
        } catch (error: any) {
            dispach(openPopup({ title: "Failure", children: error.toString() }));
        }
    }
    return (
        <div className="flex flex-col gap-5">
            <div className="flex justify-between gap-5 items-center mx-auto max-md:flex-col">
                <img className="w-12 h-12" src={transaction.coinInfo.image} alt={transaction.coinInfo.name} />
                <h2 className="font-bold text-xl">{transaction.coinInfo.name}</h2>
                <div className="">
                    <h3>Already in your wallet</h3>
                    <h3>Quantity: {transactionFromQuery ? transactionFromQuery?.transactions.reduce((acc, transaction) => {
                        if (transaction.buyOrSell === "buy") {
                            return acc + transaction.quantity;
                        } else {
                            return acc - transaction.quantity;
                        }
                    }, 0) : 0}</h3>
                    <h3>Your average buying price: {transactionFromQuery ? calculateAverageBuyingPrice(transactionFromQuery.transactions) : 0}</h3>
                </div>
            </div>
            <form className="flex flex-col gap-5 " onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="quantity">Quantity: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="quantity..." name="quantity" id="quantity" value={stringifiedValues.quantity} onChange={(e) => {
                        const value = e.target.value;
                        if (regex.test(value)) {
                            setStringifiedValues({ ...stringifiedValues, quantity: value, total_price: (Number(value) * Number(stringifiedValues.price)).toString() });
                        }
                    }} />
                </div>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="buying_price">{form.buyOrSell.slice(0, 1).toUpperCase() + form.buyOrSell.slice(1)} price: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="buying price..." name="buying_price" id="buying_price" value={stringifiedValues.price} onChange={(e) => {
                        const value = e.target.value;
                        if (regex.test(value)) {
                            setStringifiedValues({ ...stringifiedValues, price: value, total_price: (Number(value) * Number(stringifiedValues.quantity)).toString() });
                        }
                    }} />
                </div>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="total_price">Total price: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="total price..." name="total_price" id="total_price" value={stringifiedValues.total_price} onChange={(e) => {
                        const value = e.target.value;
                        if (regex.test(value)) {
                            setStringifiedValues({ ...stringifiedValues, total_price: value, quantity: (Number(value) / Number(stringifiedValues.price)).toString() });
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
                <button type="submit" disabled={!form.quantity} className="px-2 border-2 border-black rounded fontTitle p-2 bg-[var(--color-card)] cursor-pointer transitioned hover:scale-101 text-[var:--color-text]">{form.quantity ? "Change transaction" : "To change transaction you need to enter quantity"}</button>
            </form>
        </div>
    )
}