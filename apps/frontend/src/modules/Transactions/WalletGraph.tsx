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
import { useGetAllTransactionsGroupByCoinSymbolQuery, useGetGroupedTransactionsForChartQuery } from "./transaction.api";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, TimeScale, Filler);
type Point = { x: number; y: number };
const MS_PER_HOUR = 3600000; // 1 hour in milliseconds
const NUM_POINTS = 168; // 24 hours * 7 days

export function WalletGraph() {
    const theme: Theme = useAppSelector((state) => state.theme.theme);
    const selectedWalletId = useAppSelector(state => state.selectedWallet.selectedWalletId);
    const { data: allCoins } = useGetAllCoinsQuery();
    const { data: agregatedTransactions } = useGetGroupedTransactionsForChartQuery(
        { walletId: selectedWalletId || "" },
        { skip: !selectedWalletId }
    );

    const { data: userCoins } = useGetAllTransactionsGroupByCoinSymbolQuery(selectedWalletId || "", { skip: !selectedWalletId });

    const chartData: Point[] = useMemo(() => {
        if (!agregatedTransactions || !allCoins || agregatedTransactions.length === 0) {
            return [];
        }

        const now = Date.now();
        const startTime = now - 7 * 24 * MS_PER_HOUR;
        const timeScale: number[] = Array.from({ length: NUM_POINTS }, (_, i) => startTime + i * MS_PER_HOUR);

        const currentNetQuantity: Record<string, number> = {};
        const txPointers: Record<string, number> = {};
        const marketDataMap: Record<string, typeof allCoins[0]> = allCoins.reduce((acc, coin) => {
            acc[coin.symbol.toLowerCase()] = coin;
            return acc;
        }, {} as Record<string, typeof allCoins[0]>);

        agregatedTransactions.forEach(coinGroup => {
            const symbol = coinGroup.coinSymbol;
            currentNetQuantity[symbol] = coinGroup.initialQuantity;
            txPointers[symbol] = 0;
        });

        const finalChartPoints: Point[] = [];
        timeScale.forEach((time, index) => {
            let totalPortfolioValue = 0;

            agregatedTransactions.forEach(coinGroup => {
                const symbol = coinGroup.coinSymbol;
                const marketCoin = marketDataMap[symbol];

                const prices = marketCoin?.sparkline_in_7d?.price;
                if (!prices || index >= prices.length) return;

                const events = coinGroup.agregatedData;

                while (
                    txPointers[symbol] < events.length &&
                    events[txPointers[symbol]].createdAt.getTime() <= time
                ) {
                    const tx = events[txPointers[symbol]];
                    currentNetQuantity[symbol] += (tx.buyOrSell === 'buy' ? tx.quantity : -tx.quantity);
                    txPointers[symbol]++;
                }

                const marketPrice = prices[index];
                totalPortfolioValue += currentNetQuantity[symbol] * marketPrice;
            });

            finalChartPoints.push({
                x: time,
                y: totalPortfolioValue,
            });
        });

        //! add final value 169 point - now
        let finalPortfolioValue = 0;
        agregatedTransactions.forEach(coinGroup => {
            const symbol = coinGroup.coinSymbol;
            const marketCoin = marketDataMap[symbol];
            const currentPrice = marketCoin?.current_price;
            const currentBalance = userCoins?.find(coin => coin.coinSymbol === symbol)?.totalQuantity;

            if (currentPrice !== undefined && currentBalance !== undefined) {
                finalPortfolioValue += currentBalance * currentPrice;
            }
        });
        finalChartPoints.push({
            x: Date.now(),
            y: finalPortfolioValue,
        });
        return finalChartPoints;


    }, [agregatedTransactions, allCoins]);

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
