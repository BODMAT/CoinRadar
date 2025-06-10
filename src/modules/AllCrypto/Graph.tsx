import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Filler,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler);

export function Graph({ sparkline_in_7d }: { sparkline_in_7d: { price: number[] } }) {
    const prices = sparkline_in_7d.price;
    const isUp = prices[prices.length - 1] >= prices[0];

    const lineColor = isUp ? '#22c55e' : '#ef4444'; // green or red
    const fillColor = isUp ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

    const data = {
        labels: prices.map((_, i) => i),
        datasets: [
            {
                data: prices,
                borderColor: lineColor,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
        scales: {
            x: { display: false },
            y: { display: false },
        },
    };

    return (
        <div className="w-full h-12">
            <Line data={data} options={options} />
        </div>
    );
}
