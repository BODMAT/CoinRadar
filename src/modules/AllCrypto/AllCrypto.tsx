import { useEffect, useState } from "react";
import { Graph } from "./Graph";
import { CryptoMenu } from "./CryptoMenu";

const ALL_CRYPTO_API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true'; //only test

interface Coin {
    id: string;
    name: string;
    image: string;
    current_price: number;
    price_change_percentage_24h: number;
    sparkline_in_7d: {
        price: number[];
    };
}

export function AllCrypto() {
    const [coins, setCoins] = useState<Coin[]>([]);

    useEffect(() => {
        const fetchCoins = async () => {
            const res = await fetch(ALL_CRYPTO_API_URL);
            const data = await res.json();
            console.log(data);
            setCoins(data);
        };

        fetchCoins();
        const interval = setInterval(fetchCoins, 60000);
        return () => clearInterval(interval);
    }, []);

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
                    {coins.length > 0 ? (
                        coins.map((coin: Coin, index: number) => (
                            <div
                                key={coin.id}
                                className="grid grid-cols-7 max-md:grid-cols-6 max-[600px]:!grid-cols-5 max-[450px]:!grid-cols-4 max-[370px]:!grid-cols-3 gap-5 items-center py-3 border-b border-white/10 text-sm"
                            >
                                <h3 className="max-[450px]:hidden">{index + 1}</h3>
                                <button onClick={() => console.log("add modal")} className="text-left hover:underline cursor-pointer">
                                    {coin.name}
                                </button>
                                <img src={coin.image} alt="img" className="w-8 max-[600px]:hidden" />
                                <h3>${coin.current_price.toLocaleString()}</h3>
                                <h3 className={`max-[370px]:hidden ${coin.price_change_percentage_24h > 0 ? "text-green-500" : "text-red-500"}`}>
                                    {coin.price_change_percentage_24h.toFixed(2)}%
                                </h3>
                                <div className="col-span-2 max-md:col-span-1">
                                    <Graph sparkline_in_7d={coin.sparkline_in_7d} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-5">Loading...</p>
                    )}
                </div>
            </div>
        </div>
    )
}
