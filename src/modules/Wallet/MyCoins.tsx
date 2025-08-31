import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { useAppDispatch, useAppSelector } from "../../store";
import type { Theme } from "../FixedFooter/theme.slice";
import { useGetWalletQuery, type MyCoinComponent } from "./wallet.api";
import { useGetUserQuery } from "../Auth/auth.api";
import { calcTransactionsProfitLoss, calculateAverageBuyingPrice } from "../../utils/functions";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";
import { handleChangeSort, SortOptions, styles } from "../../utils/sorting.options";
import { openPopup } from "../../portals/popup.slice";
import { WatchTransactionsPopup } from "./WatchTransactionsPopup";



export function MyCoins() {
    const dispatch = useAppDispatch();
    const { data: user } = useGetUserQuery();
    const { data: wallet } = useGetWalletQuery(user?.uid || "", { skip: !user });
    const { data: allCoins } = useGetAllCoinsQuery();
    const theme: Theme = useAppSelector((state) => state.theme.theme);

    const coinInfo: MyCoinComponent[] = useMemo(() => {
        if (!wallet || !allCoins) return [];

        return wallet.coins
            .filter(coin => coin.transactions.length > 0)
            .map(coin => {
                const firstTx = coin.transactions[0];
                const marketCoin = allCoins.find(c => c.id === coin.id);
                if (!marketCoin) return null;

                return {
                    id: coin.id,
                    name: firstTx.coinInfo.name,
                    image: firstTx.coinInfo.image,
                    quantity: coin.transactions.reduce((acc, curr) => {
                        if (curr.buyOrSell === "buy") return acc + curr.quantity;
                        if (curr.buyOrSell === "sell") return acc - curr.quantity;
                        return acc;
                    }, 0),
                    currentPrise: marketCoin.current_price,
                    avverageByingPrice: calculateAverageBuyingPrice(coin.transactions),
                    profit: calcTransactionsProfitLoss(coin.transactions, marketCoin),
                    lastDate: coin.transactions.reduce(
                        (acc, curr) => acc > curr.date ? acc : curr.date,
                        firstTx.date
                    ),
                };
            })
            .filter((c): c is MyCoinComponent => c !== null);
    }, [wallet, allCoins]);

    const [sortedCoins, setSortedCoins] = useState<MyCoinComponent[] | null>(null);
    const [selected, setSelected] = useState<{ value: string; label: string } | null>(null);
    useEffect(() => {
        if (coinInfo.length) {
            setSortedCoins(coinInfo);
        }
    }, [coinInfo]);

    const handleOpenCoinPopup = (id: string) => () => {
        dispatch(openPopup({ title: "Coin info", children: <WatchTransactionsPopup coinId={id} /> }));
    };

    return (
        <div>
            <div className="w-full flex justify-between gap-10 mb-5">
                <h1 className="fontTitle text-2xl">My coins:</h1>
                <Select
                    options={SortOptions}
                    value={selected}
                    onChange={(value) => {
                        setSelected(value);
                        handleChangeSort({ sortOption: value, sortedCoins, setSortedCoins });
                    }}
                    placeholder="Sort by"
                    className=""
                    styles={styles(theme)}
                />
            </div>
            <div className="">
                <div className="grid items-center grid-cols-6 max-[420px]:grid-cols-4 font-semibold border-b pb-2 text-sm text-gray-700 dark:text-gray-200 max-[420px]:text-[13px]">
                    <div>Name</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-center">Current Price</div>
                    <div className="text-center">Average Buying Price</div>
                    <div className="text-center">Profit</div>
                    <div className="text-center max-[420px]:hidden">Date</div>
                </div>

                {sortedCoins && sortedCoins.map((coin) => {
                    return (
                        <button
                            onClick={handleOpenCoinPopup(coin.id)}
                            key={coin.id}
                            className="cursor-pointer grid grid-cols-6 max-[420px]:grid-cols-4 items-center border-b py-2 text-sm hover:bg-gray-100/10 w-full max-[420px]:text-[13px]"
                        >
                            <div className="flex items-center gap-2">
                                <img src={coin.image} alt={coin.name} className="w-5 h-5" />
                                <span>{coin.name}</span>
                            </div>
                            <div>{coin.quantity}</div>
                            <div>${coin.currentPrise}</div>
                            <div>${coin.avverageByingPrice}</div>
                            <div>{coin.profit}$</div>
                            <div className="max-[420px]:hidden">{coin.lastDate}</div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}