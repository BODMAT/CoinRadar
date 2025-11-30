import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { openPopup } from "../../portals/popup.slice";
import { ChooseCoinPopup } from "./ChooseCoinPopup";
import { WatchTransactionsPopup } from "./WatchTransactionsPopup";

import { useGetWalletQuery } from "../Wallet/wallet.api";
import { useGetAllTransactionsGroupByCoinSymbolQuery } from "./transaction.api";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";
import { formatPrice } from "../../utils/functions";

export function Header() {
    const user = useAppSelector(state => state.auth.user);
    const selectedWalletId = useAppSelector(state => state.selectedWallet.selectedWalletId);
    const dispatch = useAppDispatch();

    const { data: wallet } = useGetWalletQuery(
        selectedWalletId || "",
        { skip: !selectedWalletId }
    );

    const { data: portfolio } = useGetAllTransactionsGroupByCoinSymbolQuery(
        selectedWalletId || "",
        { skip: !selectedWalletId }
    );

    const { data: allCoins } = useGetAllCoinsQuery();

    const stats = useMemo(() => {
        const defaultStats = { invested: 0, current: 0, pnl: 0, realizedPnL: 0, totalPnL: 0 };

        if (!selectedWalletId || !portfolio || !allCoins || !wallet) return defaultStats;

        const currentBalance = portfolio.reduce((acc, item) => {
            const apiCoin = allCoins.find(c => c.symbol.toLowerCase() === item.coinSymbol.toLowerCase());
            const price = apiCoin?.current_price || 0;
            return acc + (item.totalQuantity * price);
        }, 0);

        const invested = wallet.totalInvested || 0;
        const realizedPnL = wallet.totalRealizedPnL || 0;

        const pnl = currentBalance - invested;

        const totalPnL = realizedPnL + pnl;
        return {
            invested,
            current: currentBalance,
            pnl,
            realizedPnL,
            totalPnL
        };
    }, [wallet, portfolio, allCoins, selectedWalletId]);


    const handleOpenChooseCoinPopup = () => {
        if (!user) {
            dispatch(openPopup({ title: "Failure", children: "You need to be logged in to add a transaction" }));
            return;
        }
        dispatch(openPopup({ title: "Choose coin", children: <ChooseCoinPopup /> }));
    }

    const handleOpenWatchTransactionsPopup = () => {
        if (!user) {
            dispatch(openPopup({ title: "Failure", children: "You need to be logged in to watch transactions" }));
            return;
        }
        dispatch(openPopup({ title: "Transactions", children: <WatchTransactionsPopup /> }));
    }

    return (
        <div className="flex justify-between max-md:flex-col items-center gap-7 bg-(image:--color-background) rounded-2xl p-3">
            <div className="flex gap-7 items-center max-[420px]:flex-col">

                <div className="flex flex-col gap-2">
                    <div className="flex gap-3 items-center max-[1000px]:flex-col">
                        <h1 className="fontTitle text-2xl">Invested:</h1>
                        <h2 className="font-mono text-2xl font-bold">
                            {formatPrice(stats.invested)}
                        </h2>
                    </div>
                    <div className="flex gap-3 items-center max-[1000px]:flex-col">
                        <h1 className="fontTitle text-2xl">Current:</h1>
                        <h2 className="font-mono text-2xl font-bold">
                            {formatPrice(stats.current)}
                        </h2>
                    </div>
                </div>

                <div className="flex flex-col">
                    <div className="flex gap-3 items-center max-[1000px]:flex-col">
                        <h1 className="fontTitle text-xl">Unrealized P&L (all time):</h1>
                        <h2 className={`font-mono text-xl font-bold ${stats.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {stats.pnl >= 0 ? "+" : ""}{formatPrice(stats.pnl)}
                        </h2>
                    </div>

                    <div className="flex gap-3 items-center max-[1000px]:flex-col">
                        <h1 className="fontTitle text-xl">Realized P&L (all time):</h1>
                        <h2 className={`font-mono text-xl font-bold ${stats.realizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {stats.realizedPnL >= 0 ? "+" : ""}{formatPrice(stats.realizedPnL)}
                        </h2>
                    </div>

                    <div className="flex gap-3 items-center max-[1000px]:flex-col">
                        <h1 className="fontTitle text-xl">Total P&L (all time):</h1>
                        <h2 className={`font-mono text-xl font-bold ${stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {stats.totalPnL >= 0 ? "+" : ""}{formatPrice(stats.totalPnL)}
                        </h2>
                    </div>
                </div>

            </div>

            <div className="flex gap-5 max-[420px]:flex-col">
                <button disabled={!selectedWalletId} onClick={handleOpenChooseCoinPopup} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[--color-text] border-[--color-text] border-2 disabled:cursor-not-allowed">
                    Add transaction
                </button>
                <button disabled={!selectedWalletId} onClick={handleOpenWatchTransactionsPopup} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[--color-text] border-[--color-text] border-2 disabled:cursor-not-allowed">
                    View transactions
                </button>
            </div>
        </div>
    )
}