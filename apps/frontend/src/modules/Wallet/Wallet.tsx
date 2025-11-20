import { Header } from "./Header";
import { MyCoins } from "../Transactions/MyCoins";
import { WalletGraph } from "./WalletGraph";
import { useAppSelector } from "../../store";

export function Wallet() {
    const user = useAppSelector(state => state.auth.user);
    return (
        <div className="py-5">
            <Header />
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