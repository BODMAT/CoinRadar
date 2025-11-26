import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
} from "chart.js";
import 'chartjs-adapter-date-fns';
import type { ChartOptions } from "chart.js";
import { useAppSelector } from "../../store";
import type { Theme } from "../FixedFooter/theme.slice";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, TimeScale, Filler);

type Point = { x: number; y: number };

export function WalletGraph() {
    return null

    const theme: Theme = useAppSelector((state) => state.theme.theme);
    const user = useAppSelector(state => state.auth.user);
    // const { data: wallet } = useGetWalletQuery(user?.uid || "", { skip: !user });
    const { data: allCoins } = useGetAllCoinsQuery();

    //! this algorithm is not optimal, cause luck of CoinGecko API or its limits for free users
    const chartData: Point[] = useMemo(() => {
        // if (!wallet || !allCoins) return [];

        const result: Point[] = [];

        const today = new Date();
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (6 - i));
            return d;
        });

        for (const day of last7Days) {
            let totalValue = 0;

            for (const coinData of wallet.coins) {
                let quantity = 0;

                for (const tx of coinData.transactions) {
                    const txDate = new Date(tx.date);
                    if (txDate <= day) {
                        if (tx.buyOrSell === "buy") quantity += tx.quantity;
                        else if (tx.buyOrSell === "sell") quantity -= tx.quantity;
                    }
                }

                const marketCoin = allCoins.find(c => c.id === coinData.id);
                const price = marketCoin ? marketCoin.current_price : 0;

                totalValue += quantity * price;
            }

            result.push({ x: day.getTime(), y: Number(totalValue.toFixed(2)) });
        }

        return result;
    }, [wallet, allCoins]);

    const isGrowing = chartData.length > 1 && chartData.at(-1)!.y > chartData[0]!.y;
    const lineColor = isGrowing ? "#4caf50" : "#f44336";
    const fillColor = isGrowing ? "rgba(76, 175, 80, 0.2)" : "rgba(244, 67, 54, 0.2)";

    const data = {
        datasets: [{
            data: chartData,
            borderColor: lineColor,
            backgroundColor: fillColor,
            tension: 0.3,
            pointRadius: 0,
            fill: true
        }]
    };

    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: "time",
                time: { unit: "day" },
                ticks: { color: theme === "dark" ? "#fff" : "#000" },
                grid: { display: false },
            },
            y: {
                ticks: { color: theme === "dark" ? "#fff" : "#000" },
                grid: { color: theme === "dark" ? "#555" : "#ccc" },
            },
        },
        plugins: { legend: { display: false } },
    };

    return (
        <div className="w-full h-[300px]">
            {chartData.length === 0 ? (
                <div className="text-center pt-20">No data</div>
            ) : (
                <Line data={data} options={options} />
            )}
        </div>
    );
}
