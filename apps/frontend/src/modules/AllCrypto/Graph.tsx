import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Filler,
    Title,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler, Title);

export function Graph({
    sparkline_in_7d,
    height = 40,
}: {
    sparkline_in_7d: { price: number[] };
    height?: number;
}) {
    const withDatasets: boolean = height !== 40

    const prices = sparkline_in_7d.price;
    const isUp = prices[prices.length - 1] >= prices[0];

    const lineColor = isUp ? '#22c55e' : '#ef4444'; // green or red
    const fillColor = isUp ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

    const data = {
        labels: prices.map((_, __, ___) => {
            return "";
        }),

        datasets: [
            {
                label: withDatasets ? "Price (USD)" : undefined,
                data: prices.map((price) => price.toFixed(5)),
                borderColor: lineColor,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
            },
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: withDatasets
            ? {
                legend: { display: false },
                tooltip: { enabled: true },
                title: {
                    display: true,
                    text: "Last 7 days",
                    font: { size: 14 },
                    color: "#fff",
                },
            }
            : { legend: { display: false }, tooltip: { enabled: false }, title: { display: false } },
        scales: {
            x: {
                display: withDatasets,
                grid: { color: "rgba(255,255,255,0.1)" },
                ticks: { color: "#aaa" },
                title: {
                    display: withDatasets,
                    text: "Time",
                    color: "#ddd",
                },
            },
            y: {
                display: withDatasets,
                grid: { color: "rgba(255,255,255,0.1)" },
                ticks: {
                    color: "#aaa",
                    callback: (value: number | string) => `$${value}`,
                },
                title: {
                    display: withDatasets,
                    text: "Price (USD)",
                    color: "#ddd",
                },
            },
        },
    };


    return (
        <div className="w-full" style={{ height: `${height}px` }}>
            <Line data={data} options={options} />
        </div>
    );
}
