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
import { useGetWalletQuery } from "./wallet.api";
import { useGetUserQuery } from "../Auth/auth.api";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, TimeScale, Filler);

type Point = { x: number; y: number };

export function WalletGraph() {
    const theme: Theme = useAppSelector((state) => state.theme.theme);
    const { data: user } = useGetUserQuery();
    const { data: wallet } = useGetWalletQuery(user?.uid || "", { skip: !user });
    const { data: allCoins } = useGetAllCoinsQuery();

    //! this algorithm is not good cause luck of real data from Gecko
    const chartData: Point[] = useMemo(() => {
        if (!wallet || !allCoins) return [];

        const days = 7;
        const now = Date.now();
        const startTime = now - days * 24 * 60 * 60 * 1000;

        const portfolioValues = Array(days).fill(0);

        wallet.coins.forEach(coinWallet => {
            const coinMarket = allCoins.find(c => c.id === coinWallet.id);
            if (!coinMarket?.sparkline_in_7d?.price || !coinMarket.sparkline_in_7d.price.length) return;

            const sparkline = coinMarket.sparkline_in_7d.price;
            const step = sparkline.length / days;

            const dailyQuantities = Array(days).fill(0);

            coinWallet.transactions.forEach(tx => {
                const txTime = new Date(tx.date).getTime();
                let dayIndex = Math.floor((txTime - startTime) / (24 * 60 * 60 * 1000));
                dayIndex = Math.max(0, Math.min(dayIndex, days - 1));

                for (let i = dayIndex; i < days; i++) {
                    dailyQuantities[i] += tx.buyOrSell === "buy" ? tx.quantity : -tx.quantity;
                }
            });

            const firstTx = coinWallet.transactions[0];
            if (!firstTx) return;

            const firstTxTime = new Date(firstTx.date).getTime();
            let firstIndex = Math.floor((firstTxTime - startTime) / (24 * 60 * 60 * 1000));
            firstIndex = Math.max(0, Math.min(firstIndex, days - 1));

            const firstTxPrice = firstTx.price;
            const firstSparklinePrice = sparkline[Math.floor(firstIndex * step)] || firstTxPrice;

            for (let i = 0; i < days; i++) {
                const sparkValue = sparkline[Math.floor(i * step)] || firstSparklinePrice;
                const relativePrice = firstTxPrice * (sparkValue / firstSparklinePrice);
                portfolioValues[i] += relativePrice * dailyQuantities[i];
            }
        });

        return portfolioValues.map((value, i) => ({
            x: startTime + i * 24 * 60 * 60 * 1000,
            y: value,
        }));
    }, [wallet, allCoins]);


    const isGrowing = chartData.length > 1 && chartData.at(-1)!.y > chartData[0].y;
    const lineColor = isGrowing ? "#4caf50" : "#f44336";
    const fillColor = isGrowing ? "rgba(76, 175, 80, 0.2)" : "rgba(244, 67, 54, 0.2)";

    const data = { datasets: [{ data: chartData, borderColor: lineColor, backgroundColor: fillColor, tension: 0.3, pointRadius: 0, fill: true }] };

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
