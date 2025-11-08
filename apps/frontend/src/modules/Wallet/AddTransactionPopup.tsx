import type { Coin } from "../AllCrypto/all-crypto.api";
import { useAddWalletCoinTransactionMutation, useGetWalletCoinQuery, type Transaction } from "./wallet.api";
import { calculateAverageBuyingPrice, generateUID } from "../../utils/functions";
import { useEffect, useState } from "react";
import { useGetUserQuery } from "../Auth/auth.api";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useAppDispatch } from "../../store";
export function AddTransactionPopup({ coin }: { coin: Coin }) {
    const dispach = useAppDispatch();
    const { data: user } = useGetUserQuery();

    const { data: transaction } = useGetWalletCoinQuery(
        { walletId: user?.uid!, coinId: coin.id },
        { skip: !user?.uid }
    );

    const [addTransaction] = useAddWalletCoinTransactionMutation();

    const [stringifiedValues, setStringifiedValues] = useState({
        quantity: "0",
        price: coin.current_price.toString(),
        total_price: "0",
    });
    const [form, setForm] = useState<Transaction>({
        id: generateUID(coin.name),
        coinInfo: {
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            current_price: coin.current_price,
            price_change_percentage_24h: coin.price_change_percentage_24h,

        },
        quantity: Number(stringifiedValues.quantity),
        price: Number(stringifiedValues.price),
        date: new Date().toISOString().split('T')[0],
        buyOrSell: "buy"
    });

    useEffect(() => {
        setForm({
            ...form,
            quantity: Number(stringifiedValues.quantity),
            price: Number(stringifiedValues.price),
        })
    }, [stringifiedValues]);

    const [alert, setAlert] = useState({
        quantity: "",
        date: "",
        buyOrSell: "",
    });
    useEffect(() => {
        if (alert.quantity !== "") {
            setTimeout(() => {
                setAlert({ ...alert, quantity: "" });
            }, 2000);
        }
        if (alert.date !== "") {
            setTimeout(() => {
                setAlert({ ...alert, date: "" });
            }, 2000);
        }
        if (alert.buyOrSell !== "") {
            setTimeout(() => {
                setAlert({ ...alert, buyOrSell: "" });
            }, 2000);
        }
    }, [alert]);

    const regex = /^\d*\.?\d*$/;
    const handleSubmit = async () => {
        if (!user?.uid) return;
        try {
            await addTransaction({
                walletId: user?.uid ?? "",
                transaction: form,
                coinId: coin.id
            });
            dispach(closePopup());
            await new Promise((resolve) => setTimeout(resolve, 300));
            dispach(openPopup({ title: "Success", children: "Transaction added!" }));
        } catch (error: any) {
            dispach(openPopup({ title: "Failure", children: error.toString() }));
        }
    }

    const handleChangeDate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = e.target.value; // "YYYY-MM-DD"
        const today = new Date().toISOString().split('T')[0];
        const isCorrectDate = selectedDate <= today;
        if (!isCorrectDate) {
            setAlert({ ...alert, date: "Date must be less than or equal to today's date." });
        } else {
            setAlert({ ...alert, date: "" });
        }
        setForm({
            ...form,
            date: selectedDate <= today ? selectedDate : form.date
        });
    };

    const currentCoinInWallet = transaction?.transactions.reduce((acc, transaction) => {
        if (transaction.buyOrSell === "buy") {
            return acc + transaction.quantity;
        } else {
            return acc - transaction.quantity;
        }
    }, 0) || 0;

    const handleChangeQuantity = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (form.buyOrSell === "sell") {
            if (Number(value) > currentCoinInWallet) {
                setAlert({ ...alert, quantity: "You don't have enough coins in your wallet." });
                return
            } else {
                setAlert({ ...alert, quantity: "" });
            }
        }
        if (regex.test(value)) {
            setStringifiedValues({ ...stringifiedValues, quantity: value, total_price: (Number(value) * Number(stringifiedValues.price)).toString() });
        }
    }

    const handleChangeBuyOrSell = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const isAbletoSetSell = currentCoinInWallet >= form.quantity;
        const value = e.target.value as "buy" | "sell";
        if (value === "sell" && !isAbletoSetSell) {
            setAlert({ ...alert, buyOrSell: "You don't have enough coins in your wallet." });
            return
        } else {
            setAlert({ ...alert, buyOrSell: "" });
        }
        setForm({ ...form, buyOrSell: value });
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex justify-between gap-5 items-center mx-auto max-md:flex-col">
                <img className="w-12 h-12" src={coin.image} alt={coin.name} />
                <h2 className="font-bold text-xl">{coin.name}</h2>
                <div className="">
                    <h3>Already in your wallet: {currentCoinInWallet}</h3>
                    <h3>Quantity: {transaction ? transaction?.transactions.reduce((acc, transaction) => {
                        if (transaction.buyOrSell === "buy") {
                            return acc + transaction.quantity;
                        } else {
                            return acc - transaction.quantity;
                        }
                    }, 0) : 0}</h3>
                    <h3>Current price: {coin.current_price}</h3>
                    <h3>Your average buying price: {transaction ? calculateAverageBuyingPrice(transaction.transactions) : 0}</h3>
                </div>
            </div>
            <form className="flex flex-col gap-5 " onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
                <div className="px-2 border-2 border-black rounded fontTitle">
                    <label htmlFor="quantity">Quantity: </label>
                    <input className="p-2 focus:outline-none focus:ring-0" type="string" placeholder="quantity..." name="quantity" id="quantity" value={stringifiedValues.quantity} onChange={(e) => {
                        handleChangeQuantity(e);
                    }} />
                    {alert.quantity && <p className="text-red-500">{alert.quantity}</p>}
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
                        handleChangeDate(e);
                    }} />
                    {alert.date && <p className="text-red-500">{alert.date}</p>}
                </div>
                <select value={form.buyOrSell} onChange={(e) => handleChangeBuyOrSell(e)} className={`px-2 border-2 border-black rounded fontTitle p-2 ${form.buyOrSell === "buy" ? "bg-green-500" : "bg-red-500"}`}>
                    <option value="buy" className="bg-green-500">Buy</option>
                    <option value="sell" className="bg-red-500">Sell</option>
                </select>
                {alert.buyOrSell && <p className="text-red-500">{alert.buyOrSell}</p>}
                <button type="submit" disabled={!form.quantity} className="px-2 border-2 border-black rounded fontTitle p-2 bg-[var(--color-card)] cursor-pointer transitioned hover:scale-101 text-[var:--color-text]">{form.quantity ? "Add transaction" : "To add transaction you need to enter quantity"}</button>
            </form>
        </div>
    )
}