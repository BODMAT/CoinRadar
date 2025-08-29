import type { Coin } from "./all-crypto.api";
import { Graph } from "./Graph";

export function CoinPopup({ coin }: { coin: Coin }) {
    return (
        <div className="flex gap-5 flex-col">
            <div className="flex max-md:flex-col justify-between items-center p-2 rounded bg-[var(--color-card)] transitioned text-[var(--color-text)]">
                <div className="flex gap-3 items-center">
                    <img src={coin.image} alt={coin.name} className="w-12 h-12" />
                    <span className="font-bold text-xl">{coin.name}</span>
                </div>

                <div className="">Prise: {coin.current_price}</div>
                <div className="">ATH: {coin.ath}</div>
                <div className="">Percentage 24h: {coin.price_change_percentage_24h.toFixed(2)}%</div>
            </div>
            <h3 className="font-bold text-lg">Last 7 days:</h3>
            <Graph sparkline_in_7d={coin.sparkline_in_7d} height={200} />
        </div>
    )
}