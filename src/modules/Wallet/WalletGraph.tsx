import { useEffect, useState } from "react";
import Select from "react-select";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    TimeScale,
    Filler,
} from "chart.js";
import 'chartjs-adapter-date-fns';
import type { ChartOptions } from "chart.js";
import { useAppSelector } from "../../store";
import type { Theme } from "../FixedFooter/theme.slice";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, TimeScale, Filler);

type Point = { x: number; y: number };

const durations = [
    { value: 1, label: "24h" },
    { value: 7, label: "7d" },
    { value: 30, label: "30d" },
    { value: 90, label: "90d" },
];

export function WalletGraph() {
    const [duration, setDuration] = useState(durations[1]); // default 7d
    const [chartData, setChartData] = useState<Point[]>([]);
    const [loading, setLoading] = useState(false);

    const theme: Theme = useAppSelector((state) => state.theme.theme);

    const isGrowing = chartData.length > 1 && chartData.at(-1)!.y > chartData[0].y;
    const lineColor = isGrowing ? "#4caf50" : "#f44336"; // green or red
    const fillColor = isGrowing ? "rgba(76, 175, 80, 0.2)" : "rgba(244, 67, 54, 0.2)";

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const res = await fetch(
                `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${duration.value}`
            );
            const json = await res.json();
            const formatted = json.prices.map((p: [number, number]) => ({
                x: p[0],
                y: p[1],
            }));
            setChartData(formatted);
            setLoading(false);
        };
        fetchData();
    }, [duration]);

    const data = {
        datasets: [
            {
                data: chartData,
                borderColor: lineColor,
                backgroundColor: fillColor,
                tension: 0.3,
                pointRadius: 0,
                fill: true,
            },
        ],
    };

    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: "time",
                time: {
                    unit: duration.value <= 1 ? "hour" : "day",
                },
                ticks: { color: theme === "dark" ? "#fff" : "#000" },
                grid: { display: false },
            },
            y: {
                ticks: { color: theme === "dark" ? "#fff" : "#000" },
                grid: { color: theme === "dark" ? "#555" : "#ccc" },
            },
        },
        plugins: {
            legend: { display: false },
        },
    };

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row gap-3 mb-3 items-start sm:items-center w-full">
                <h1 className="fontTitle text-2xl">Filter:</h1>
                <Select
                    options={durations}
                    value={duration}
                    onChange={(opt) => setDuration(opt!)}
                    className=""
                    styles={{
                        control: (base) => ({
                            ...base,
                            backgroundColor: "transparent",
                            borderColor: theme === "dark" ? "#fff" : "#000",
                            color: theme === "dark" ? "#fff" : "#000",
                            boxShadow: "none",
                            outline: "none",
                            '&:hover': {
                                borderColor: theme === "dark" ? "#aaa" : "#333",
                            },
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: theme === "dark" ? "#fff" : "#000",
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: theme === "dark" ? "#222" : "#eee",
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused
                                ? theme === "dark" ? "#333" : "#ddd"
                                : theme === "dark" ? "#222" : "#fff",
                            color: theme === "dark" ? "#fff" : "#000",
                        }),
                        dropdownIndicator: (base) => ({
                            ...base,
                            color: theme === "dark" ? "#fff" : "#000",
                            '&:hover': {
                                color: theme === "dark" ? "#fff" : "#000",
                            },
                        }),
                        indicatorSeparator: () => ({ display: "none" }),
                    }}
                />

            </div>
            <div className="w-full h-[300px]">
                {loading || chartData.length === 0 ? (
                    <div className="text-white text-center pt-20">Loading...</div>
                ) : (
                    <Line data={data} options={options} />
                )}
            </div>
        </div>
    );
}
