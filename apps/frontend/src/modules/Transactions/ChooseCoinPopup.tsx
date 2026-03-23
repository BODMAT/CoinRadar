import { useMemo, useState } from "react";
import { useAppDispatch } from "../../store";
import type { Coin } from "../AllCrypto/all-crypto.schema";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { AddTransactionPopup } from "./AddTransactionPopup";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";

export function ChooseCoinPopup() {
    const dispatch = useAppDispatch();
    const [inputValue, setInputValue] = useState("");

    const {
        data: allCoins,
        isLoading,
        isError,
    } = useGetAllCoinsQuery();

    const filteredCoins = useMemo(() => {
        if (!allCoins) return [];

        const query = inputValue.trim().toLowerCase();
        if (!query) return allCoins.slice(0, 5);

        return allCoins
            .filter((coin) => {
                const byName = coin.name.toLowerCase().includes(query);
                const bySymbol = coin.symbol.toLowerCase().includes(query);
                return byName || bySymbol;
            })
            .slice(0, 5);
    }, [allCoins, inputValue]);

    const handleOpenAddTransaction = async (coin: Coin) => {
        dispatch(closePopup());
        await new Promise((resolve) => setTimeout(resolve, 300));
        dispatch(
            openPopup({
                title: "Add transaction",
                children: <AddTransactionPopup coin={coin} />,
            })
        );
    };

    if (isLoading) {
        return <div className="text-sm text-white/70">Loading coins...</div>;
    }

    if (isError) {
        return <div className="text-sm text-red-300">Failed to load coins</div>;
    }

    return (
        <div>
            <div className="w-full rounded transitioned bg-(--color-card) mb-3">
                <input
                    id="coin-search-input"
                    autoComplete="off"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    type="text"
                    placeholder="Find coin by name or symbol..."
                    className="w-full bg-transparent px-2 py-4 outline-none text-white border rounded border-white placeholder-white/50"
                />
            </div>
            <div className="flex flex-col gap-3">
                {filteredCoins.map((coin: Coin) => (
                    <button key={coin.id} onClick={() => handleOpenAddTransaction(coin)} className="grid grid-cols-3 gap-2 justify-between items-center transitioned hover:scale-101 hover:shadow-md hover:bg-(--color-card) p-2 cursor-pointer hover:text-(--color-text)">
                        <img className="w-8 h-8" src={coin.image} alt={coin.name} />
                        <div className="">{coin.name}</div>
                        <div className="">{coin.current_price}</div>
                    </button>
                ))}
                {filteredCoins.length === 0 && <div>Not found</div>}
            </div>
        </div>
    );
}
