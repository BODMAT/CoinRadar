import { Graph } from "./Graph";
import { CryptoMenu } from "./CryptoMenu";
import { useAppDispatch, useAppSelector } from "../../store";
import type { Coin } from "./all-crypto.schema";
import { openPopup } from "../../portals/popup.slice";
import { CoinPopup } from "./Coin.popup";
import { useGetAllCoinsQuery } from "./all-crypto.api";
import { useEffect, useMemo } from "react";
import { resetLastUpdate } from "./all-crypto.slice";

const POLLING_INTERVAL = 60000;

export function AllCrypto() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.auth.user);
    const { page, perPage, searchQuery } = useAppSelector(state => state.allCrypto);

    const {
        data: allCoins,
        error,
        isLoading,
        isFetching,
        isSuccess
    } = useGetAllCoinsQuery(
        undefined,
        {
            pollingInterval: POLLING_INTERVAL,
        }
    );

    const filteredCoins = useMemo(() => {
        if (!allCoins) return [];

        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        return allCoins.filter((coin) =>
            coin.name.toLowerCase().includes(lowerCaseQuery) ||
            coin.symbol.toLowerCase().includes(lowerCaseQuery)
        );
    }, [allCoins, searchQuery]);

    const coinsToDisplayPaged = useMemo(() => {
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredCoins.slice(startIndex, endIndex);
    }, [filteredCoins, page, perPage]);

    useEffect(() => {
        if (isSuccess && !isFetching) {
            dispatch(resetLastUpdate());
        }
    }, [isSuccess, isFetching, dispatch]);

    const skeletonArray: (Coin | undefined)[] = useMemo(
        () => Array.from({ length: perPage }).fill(undefined) as (Coin | undefined)[],
        [perPage]
    );

    const coinsToDisplay = (isLoading || isFetching) && !allCoins
        ? skeletonArray
        : coinsToDisplayPaged;

    const isInitialLoading = isLoading && !allCoins;
    const hasCoins = allCoins && allCoins.length > 0;
    const isNotFound = hasCoins && !isFetching && filteredCoins.length === 0;

    const handleOpenPopup = (coin: Coin) => {
        if (!user) {
            dispatch(openPopup({ title: "Failure", children: "You need to be logged in to add a transaction" }));
            return;
        }
        dispatch(openPopup({ title: `${coin.name} about`, children: <CoinPopup coin={coin} /> }));
    }

    if (error) {
        return (
            <div className="py-5">
                <CryptoMenu totalFilteredCount={0} />
                <div className="font-bold fontTitle text-2xl text-center mt-3 bg-(image:--color-background) rounded-2xl py-2 text-red-500">
                    Error loading data. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="py-5">
            <CryptoMenu totalFilteredCount={filteredCoins.length} />

            {(isInitialLoading || hasCoins) && !isNotFound && (
                <div className="mt-3 bg-(image:--color-background) rounded-2xl py-2">
                    <div className="grid grid-cols-7 max-md:grid-cols-6 max-[600px]:grid-cols-5! max-[450px]:grid-cols-4! max-[370px]:grid-cols-3! gap-5 px-4 my-3 items-center">
                        <h3 className="text-xl font-black text-left max-[450px]:hidden">#</h3>
                        <h3 className="text-xl font-black text-left">Name</h3>
                        <h3 className="text-xl font-black text-left max-[600px]:hidden">Image</h3>
                        <h3 className="text-xl font-black text-left">Price</h3>
                        <h3 className="text-xl font-black text-left max-[370px]:hidden">24h</h3>
                        <h3 className="text-xl font-black text-left col-span-2 max-md:col-span-1">Last 7 days</h3>
                    </div>

                    <div className="flex flex-col px-4 font-mono">
                        {coinsToDisplay.map((coin: Coin | undefined, index: number) => {
                            const isSkeleton = !coin || isFetching;
                            const rank = (page - 1) * perPage + index + 1;

                            return (
                                <div
                                    key={coin?.id ?? index}
                                    className="grid grid-cols-7 max-md:grid-cols-6 max-[600px]:grid-cols-5! max-[450px]:grid-cols-4! max-[370px]:grid-cols-3! gap-5 items-center py-3 border-b border-white/10 text-sm"
                                >
                                    <h3 className="max-[450px]:hidden">
                                        {isSkeleton
                                            ? <div className="h-4 bg-white/20 rounded w-6 animate-pulse"></div>
                                            : rank
                                        }
                                    </h3>

                                    <button
                                        onClick={coin ? () => handleOpenPopup(coin) : undefined}
                                        className="text-left hover:underline cursor-pointer"
                                        disabled={isSkeleton}
                                    >
                                        {isSkeleton
                                            ? <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                                            : coin.name
                                        }
                                    </button>

                                    <div className="max-[600px]:hidden">
                                        {isSkeleton
                                            ? <div className="h-8 w-8 bg-white/20 rounded-full animate-pulse"></div>
                                            : <img src={coin.image} alt={`${coin.name} img`} className="w-8" />
                                        }
                                    </div>

                                    <h3>
                                        {isSkeleton
                                            ? <div className="h-4 bg-white/20 rounded w-16 animate-pulse"></div>
                                            : `$${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                                        }
                                    </h3>

                                    <h3 className={`max-[370px]:hidden ${!isSkeleton ? (coin.price_change_percentage_24h > 0 ? "text-green-500" : "text-red-500") : ""}`}>
                                        {isSkeleton
                                            ? <div className="h-4 bg-white/20 rounded w-10 animate-pulse"></div>
                                            : `${coin.price_change_percentage_24h.toFixed(2)}%`
                                        }
                                    </h3>

                                    <div className="col-span-2 max-md:col-span-1">
                                        {isSkeleton
                                            ? <div className="h-10 bg-white/20 rounded animate-pulse"></div>
                                            : <Graph sparkline_in_7d={coin.sparkline_in_7d} />
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isInitialLoading && (
                <div className="font-bold fontTitle text-2xl text-center mt-3 bg-(image:--color-background) rounded-2xl py-2">Loading...</div>
            )}

            {hasCoins && isNotFound && (
                <div className="font-bold fontTitle text-2xl text-center mt-3 bg-(image:--color-background) rounded-2xl py-2">No coins found with this name</div>
            )}

            {!hasCoins && !isInitialLoading && (
                <div className="font-bold fontTitle text-2xl text-center mt-3 bg-(image:--color-background) rounded-2xl py-2">
                    Please wait a minute to load data. CoinGecko API is limited.
                </div>
            )}
        </div>
    );
}