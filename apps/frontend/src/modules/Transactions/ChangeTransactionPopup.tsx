import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { useGetTransactionQuery, useUpdateTransactionMutation, useGetCoinStatsQuery } from "./transaction.api";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";
import { getLocalDatetime } from "../../utils/functions";

export function ChangeTransactionPopup({ transactionId }: { transactionId: string }) {
    const selectedWalletId = useAppSelector((state) => state.selectedWallet.selectedWalletId);
    const dispatch = useAppDispatch();

    const { data: transaction, isLoading } = useGetTransactionQuery(
        { walletId: selectedWalletId || "", transactionId },
        { skip: !selectedWalletId }
    );

    const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();

    const { data: coinStats } = useGetCoinStatsQuery(
        { walletId: selectedWalletId || "", coinSymbol: transaction?.coinSymbol || "" },
        { skip: !transaction || !selectedWalletId }
    );

    const { data: allCoins } = useGetAllCoinsQuery();
    const coinApiData = allCoins?.find((c) => c.symbol.toLowerCase() === transaction?.coinSymbol.toLowerCase());

    const [form, setForm] = useState({
        quantity: "",
        price: "",
        total_price: "",
        createdAt: "",
        buyOrSell: "buy" as "buy" | "sell"
    });

    const [alert, setAlert] = useState<string | null>(null);

    useEffect(() => {
        if (transaction) {
            setForm({
                quantity: transaction.quantity.toString(),
                price: transaction.price.toString(),
                total_price: (transaction.price * transaction.quantity).toString(),
                createdAt: getLocalDatetime(transaction.createdAt),
                buyOrSell: transaction.buyOrSell
            });
        }
    }, [transaction]);

    if (!selectedWalletId || isLoading || !transaction) return <div className="p-4 text-center">Loading...</div>;

    const currentCoinInWallet = coinStats?.totalQuantity || 0;
    const availableToSell = currentCoinInWallet + (transaction.buyOrSell === 'sell' ? transaction.quantity : 0);

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
        if (form.buyOrSell === 'sell' && Number(form.quantity) > availableToSell) {
            setAlert("You don't have enough coins in your wallet.");
            return;
        }

        try {
            await updateTransaction({
                walletId: selectedWalletId,
                transactionId: transaction.id,
                data: {
                    quantity: Number(form.quantity),
                    price: Number(form.price),
                    createdAt: new Date(form.createdAt),
                    buyOrSell: form.buyOrSell,
                }
            }).unwrap();

            dispatch(closePopup());
            setTimeout(() => {
                dispatch(openPopup({ title: "Success", children: "Transaction updated!" }));
            }, 300);

        } catch (error: any) {
            setAlert(error.data?.error || "Failed to update transaction");
        }
    };

    const maxDateTime = getLocalDatetime(new Date().toISOString());

    return (
        <div className="flex flex-col gap-5 p-2">
            <div className="flex justify-between gap-5 items-center mx-auto max-md:flex-col border-b pb-4 w-full">
                <div className="flex items-center gap-3">
                    <img
                        className="w-12 h-12 rounded-full"
                        src={coinApiData?.image || "https://via.placeholder.com/50"}
                        alt={transaction.coinSymbol}
                    />
                    <div>
                        <h2 className="font-bold text-xl uppercase">{transaction.coinSymbol}</h2>
                        {coinApiData && <p className="text-xs text-gray-500">Current: ${coinApiData.current_price}</p>}
                    </div>
                </div>
                <div className="text-right text-sm">
                    <p>Wallet Balance: <b>{currentCoinInWallet}</b></p>
                    <p>Avg Buy: <b>${coinStats?.avgBuyingPrice}</b></p>
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
                        required
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
                            required
                            className="p-2 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
                            type="text" name="price"
                            value={form.price} onChange={handleChange}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold">Quantity</label>
                        <input
                            required
                            className="p-2 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
                            type="text" name="quantity"
                            value={form.quantity} onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold">Total</label>
                    <input
                        required
                        className="p-2 border-2 border-gray-200 rounded"
                        type="text" name="total_price"
                        value={form.total_price} onChange={handleChange}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold">Date</label>
                    <input
                        required
                        className="p-2 border-2 border-gray-300 rounded text-white [&::-webkit-calendar-picker-indicator]:invert
    [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        type="datetime-local" name="createdAt"
                        value={form.createdAt} onChange={handleChange}
                        max={maxDateTime}
                    />
                </div>

                <button
                    type="submit"
                    disabled={!form.quantity || isUpdating}
                    className="mt-2 p-3 bg-black text-white rounded-lg font-bold hover:opacity-80 disabled:opacity-50 transition-all"
                >
                    {isUpdating ? "Saving..." : "Update Transaction"}
                </button>
            </form>
        </div>
    )
}