import { useGetUserQuery } from "../Auth/auth.api";
import { Header } from "./Header";
import { MyCoins } from "./MyCoins";
import { WalletGraph } from "./WalletGraph";

export function Wallet() {
    const { data: user } = useGetUserQuery();
    return (
        <div className="py-5">
            <Header />
            {user && (
                <div className="mt-2 bg-[image:var(--color-background)] rounded-2xl p-3 flex justify-between gap-10 max-lg:flex-col-reverse">
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