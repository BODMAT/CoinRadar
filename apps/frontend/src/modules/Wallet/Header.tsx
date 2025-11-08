import { useGetUserQuery } from "../Auth/auth.api";
import { useGetWalletQuery } from "./wallet.api";
import { calcWalletBalanceWithCurrentPrice, calcWalletProfitLoss } from "../../utils/functions";
import { useAppDispatch, useAppSelector } from "../../store";
import { openPopup } from "../../portals/popup.slice";
import { ChooseCoinPopup } from "./ChooseCoinPopup";
import { WatchTransactionsPopup } from "./WatchTransactionsPopup";
export function Header() {
    const { data: user } = useGetUserQuery();
    const { data: wallet } = useGetWalletQuery(user?.uid || "", { skip: !user });
    const { allCoins } = useAppSelector(state => state.allCrypto);

    const dispach = useAppDispatch();
    const handleOpenChooseCoinPopup = () => {
        if (!user) {
            dispach(openPopup({ title: "Failure", children: "You need to be logged in to add a transaction" }));
            return
        }
        dispach(openPopup({ title: "Choose coin", children: <ChooseCoinPopup /> }));
    }

    const handleOpenWatchTransactionsPopup = () => {
        if (!user) {
            dispach(openPopup({ title: "Failure", children: "You need to be logged in to watch transactions" }));
            return
        }
        dispach(openPopup({ title: "Transactions", children: <WatchTransactionsPopup /> }));
    }

    const PL = wallet ? Number(calcWalletProfitLoss(wallet, allCoins).toFixed(2)) : 0

    return (
        <div className="flex justify-between max-md:flex-col items-center gap-7 bg-[image:var(--color-background)] rounded-2xl p-3">
            <div className="flex gap-7 items-center">
                <div className="flex gap-3 items-center max-[1000px]:flex-col">
                    <h1 className="fontTitle text-2xl">Wallet:</h1>
                    <h2 className="fontTitle text-2xl">${wallet ? calcWalletBalanceWithCurrentPrice(wallet, allCoins) : 0}</h2>
                </div>
                <div className="flex gap-3 items-center max-[1000px]:flex-col">
                    <h1 className="fontTitle text-2xl">P&L (all time):</h1>
                    <h2 className={`fontTitle text-2xl ${PL > 0 ? "text-green-500" : "text-red-500"}`}>${PL}</h2>
                </div>
            </div>
            <div className="flex gap-5 max-[420px]:flex-col">
                <button onClick={handleOpenChooseCoinPopup} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[var:--color-text] border-[var:--color-text] border-2">Add transaction</button>
                <button onClick={handleOpenWatchTransactionsPopup} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[var:--color-text] border-[var:--color-text] border-2">View transactions</button>
            </div>
        </div>
    )
}