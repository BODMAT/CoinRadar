import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store"
import type { Coin } from "../AllCrypto/all-crypto.api";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { AddTransactionPopup } from "./AddTransactionPopup";

export function ChooseCoinPopup() {
    const [inputValue, setInputValue] = useState('');
    const { allCoins } = useAppSelector((state) => state.allCrypto);
    const [localFilteredCoins, setLocalFilteredCoins] = useState<Coin[]>(allCoins);
    const dispach = useAppDispatch();

    useEffect(() => {
        const newFiltered = allCoins.filter((coin) => coin.name.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 5);
        setLocalFilteredCoins(newFiltered);
    }, [inputValue, allCoins]);

    const handleOpenAddTransaction = async (coin: Coin) => {
        dispach(closePopup());
        await new Promise((resolve) => setTimeout(resolve, 300));
        dispach(
            openPopup({
                title: "Add transaction",
                children: <AddTransactionPopup coin={coin} />,
            })
        );
    };

    return (
        <div>
            <div className="w-full rounded transitioned bg-(--color-card) mb-3">
                <input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    type="text"
                    placeholder="Find coin..."
                    className="w-full bg-transparent px-2 py-4 outline-none text-white border rounded border-white placeholder-white/50"
                />
            </div>
            <div className="flex flex-col gap-3">
                {allCoins && localFilteredCoins.map((coin: Coin) => (
                    <button key={coin.id} onClick={() => handleOpenAddTransaction(coin)} className="grid grid-cols-3 gap-2 justify-between items-center transitioned hover:scale-101 hover:shadow-md hover:bg-(--color-card) p-2 cursor-pointer hover:text-(--color-text)">
                        <img className="w-8 h-8" src={coin.image} alt={coin.name} />
                        <div className="">{coin.name}</div>
                        <div className="">{coin.current_price}</div>
                    </button>
                ))}
                {localFilteredCoins.length === 0 && <div>Not found</div>}
            </div>
        </div>
    )
}