import { Header as TransactionHeader } from "../Transactions/Header";
import { Header as WalletHeader } from "./Header";
import { MyCoins } from "../Transactions/MyCoins";
import { WalletGraph } from "../Transactions/WalletGraph";
import { useAppSelector } from "../../store";

export function Wallet() {
    const user = useAppSelector(state => state.auth.user);
    return (
        <div className="py-5">
            <div className="flex flex-col gap-2">
                <WalletHeader />
                <TransactionHeader />
            </div>
            {user && (
                <div className="mt-2 bg-(image:--color-background) rounded-2xl p-3 flex justify-between gap-10 max-lg:flex-col-reverse">
                    <div className="flex-1/2">
                        <WalletGraph />
                    </div>
                    <div className="flex-1/2">
                        <MyCoins />
                    </div>
                </div>
            )}
        </div>
    )
}