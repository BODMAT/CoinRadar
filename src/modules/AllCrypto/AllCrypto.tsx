import { Graph } from "./Graph";
import { CryptoMenu } from "./CryptoMenu";
import { useAppDispatch, useAppSelector } from "../../store";
import { getAllCoins } from "./all-crypto.thunks";
import { useEffect } from "react";
import type { Coin } from "../../api/crypto";

export function AllCrypto() {
    const dispatch = useAppDispatch();
    const { coinsPerPage, loading, error, page, perPage } = useAppSelector(state => state.allCrypto);

    useEffect(() => {
        dispatch(getAllCoins());
    }, []);

    const skeletonArray: (Coin | undefined)[] = Array.from({ length: perPage });

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    return (
        <div className="py-5 min-h-screen">
            <CryptoMenu />
            <div className="mt-3 bg-[image:var(--color-background)] rounded-2xl py-2">
                <div className="grid grid-cols-7 max-md:grid-cols-6 max-[600px]:!grid-cols-5 max-[450px]:!grid-cols-4 max-[370px]:!grid-cols-3 gap-5 px-4 my-3 items-center">
                    <h3 className="text-xl font-black text-left max-[450px]:hidden">#</h3>
                    <h3 className="text-xl font-black text-left">Name</h3>
                    <h3 className="text-xl font-black text-left max-[600px]:hidden">Image</h3>
                    <h3 className="text-xl font-black text-left">Price</h3>
                    <h3 className="text-xl font-black text-left max-[370px]:hidden">24h</h3>
                    <h3 className="text-xl font-black text-left col-span-2 max-md:col-span-1">Last 7 days</h3>
                </div>

                <div className="flex flex-col px-4">
                    {(coinsPerPage && coinsPerPage.length > 0 ? coinsPerPage : skeletonArray).map((coin: Coin | undefined, index: number) => {
                        const isSkeleton = !coin;

                        return (
                            <div
                                key={coin?.id ?? index}
                                className="grid grid-cols-7 max-md:grid-cols-6 max-[600px]:!grid-cols-5 max-[450px]:!grid-cols-4 max-[370px]:!grid-cols-3 gap-5 items-center py-3 border-b border-white/10 text-sm"
                            >
                                <h3 className="max-[450px]:hidden">
                                    {isSkeleton
                                        ? <div className="h-4 bg-white/20 rounded w-6 animate-pulse"></div>
                                        : page === 1
                                            ? index + 1
                                            : (page - 1) * perPage + index + 1
                                    }
                                </h3>

                                <button className="text-left hover:underline cursor-pointer">
                                    {isSkeleton
                                        ? <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                                        : coin.name
                                    }
                                </button>

                                <div className="max-[600px]:hidden">
                                    {isSkeleton
                                        ? <div className="h-8 w-8 bg-white/20 rounded-full animate-pulse"></div>
                                        : <img src={coin.image} alt="img" className="w-8" />
                                    }
                                </div>

                                <h3>
                                    {isSkeleton
                                        ? <div className="h-4 bg-white/20 rounded w-16 animate-pulse"></div>
                                        : `$${coin.current_price.toLocaleString()}`
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
        </div>
    );
}
