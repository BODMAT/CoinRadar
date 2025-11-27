import { useState, useMemo } from "react";
import Select, { type SingleValue } from "react-select";
import { useAppDispatch, useAppSelector } from "../../store";
import type { Theme } from "../FixedFooter/theme.slice";
import { useGetAllTransactionsGroupByCoinSymbolQuery } from "./transaction.api";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";
import { SortOptions, styles } from "../../utils/sorting.options";
import { openPopup } from "../../portals/popup.slice";
import { WatchTransactionsPopup } from "./WatchTransactionsPopup";
import type { CoinInfo } from "./coinInfo.schema";
import { formatPrice, formatQuantity } from "../../utils/functions";

export function MyCoins() {
    const dispatch = useAppDispatch();
    const selectedWalletId = useAppSelector((state) => state.selectedWallet.selectedWalletId);
    const theme: Theme = useAppSelector((state) => state.theme.theme);

    const { data: userCoins } = useGetAllTransactionsGroupByCoinSymbolQuery(selectedWalletId || "", { skip: !selectedWalletId });
    const { data: allCoins } = useGetAllCoinsQuery();

    const [selectedSort, setSelectedSort] = useState<{ value: string; label: string } | null>(null);

    const userCoinWithAPIData = useMemo(() => {
        if (!userCoins || !allCoins) return [];

        return userCoins.map((userCoin) => {
            const apiCoin = allCoins.find((coin) =>
                coin.symbol.toLowerCase() === userCoin.coinSymbol.toLowerCase()
            );

            const currentPrice = apiCoin?.current_price || 0;
            const pnlValue = (currentPrice - userCoin.avgBuyingPrice) * userCoin.totalQuantity;

            return {
                ...userCoin,
                currentPrice,
                image: apiCoin?.image,
                PNL: Number(pnlValue.toFixed(2)),
            } as CoinInfo;
        });
    }, [userCoins, allCoins]);

    const sortedCoins = useMemo(() => {
        if (!selectedSort || selectedSort.value === "sort") {
            return userCoinWithAPIData;
        }
        const sorted = [...userCoinWithAPIData].sort((a, b) => {
            const aPrice = a.currentPrice || 0;
            const bPrice = b.currentPrice || 0;
            const aPnl = a.PNL || 0;
            const bPnl = b.PNL || 0;

            if (selectedSort.value === "total_price") {
                return (b.totalQuantity * bPrice) - (a.totalQuantity * aPrice);
            }
            if (selectedSort.value === "quantity") {
                return b.totalQuantity - a.totalQuantity;
            }
            if (selectedSort.value === "profit") {
                return bPnl - aPnl;
            }
            return 0;
        });

        return sorted;
    }, [userCoinWithAPIData, selectedSort]);


    const handleSort = (option: SingleValue<{ value: string; label: string }>) => {
        setSelectedSort(option);
    };

    const handleOpenCoinPopup = (symbol: string) => () => {
        dispatch(openPopup({ title: "Coin info", children: <WatchTransactionsPopup coinSymbol={symbol} /> }));
    };

    if (!selectedWalletId) return <div className="text-center p-4">Select a wallet</div>;
    if (!userCoins || !allCoins) return <div className="text-center p-4">Loading assets...</div>;

    return (
        <div className="p-4">
            <div className="w-full flex justify-between gap-10 mb-5 items-center">
                <h1 className="fontTitle text-2xl font-bold text-white">My coins:</h1>
                <div className="w-48">
                    <Select
                        options={SortOptions}
                        value={selectedSort}
                        onChange={handleSort}
                        placeholder="Sort by"
                        styles={styles(theme)}
                    />
                </div>
            </div>

            <div className="rounded overflow-hidden borde">
                <div className="grid items-center grid-cols-5 max-[460px]:grid-cols-4 font-semibold border-b border-gray-700/20 pb-3 pt-3 px-2 text-sm text-gray-400 uppercase tracking-wider">
                    <div>Asset</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Price</div>
                    <div className="text-right max-[460px]:hidden">Avg Buy</div>
                    <div className="text-right">PnL</div>
                </div>

                {sortedCoins.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No coins found. Add a transaction!</div>
                ) : (
                    sortedCoins.map((coin) => (
                        <button
                            key={coin.coinSymbol}
                            onClick={handleOpenCoinPopup(coin.coinSymbol)}
                            className="w-full cursor-pointer grid grid-cols-5 max-[460px]:grid-cols-4 items-center border-b border-gray-700/10 py-3 px-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left text-white"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={coin.image}
                                    alt={coin.coinSymbol}
                                    className="w-8 h-8 rounded-full bg-gray-600 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://placehold.co/32x32/1f2937/fff?text=?';
                                    }}
                                />
                                <span className="font-bold uppercase max-[400px]:hidden">{coin.coinSymbol}</span>
                            </div>
                            <div className="text-right font-mono">{formatQuantity(coin.totalQuantity)}</div>
                            <div className="text-right font-mono text-green-400">{formatPrice(coin.currentPrice!)}</div>
                            <div className="text-right font-mono max-[460px]:hidden text-gray-400">${coin.avgBuyingPrice.toFixed(4)}</div>
                            <div className={`text-right font-mono font-bold ${(coin.PNL || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                {(coin.PNL || 0) >= 0 ? '+' : ''}{coin.PNL}$
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}