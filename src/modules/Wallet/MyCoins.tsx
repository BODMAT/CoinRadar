import { useEffect, useState } from "react";
import Select from "react-select";
import { useAppSelector } from "../../store";
import type { Theme } from "../FixedFooter/theme.slice";
// API CoinGecko
const ALL_CRYPTO_API_URL =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false';


interface CoinApi {
    id: string;
    name: string;
    image: string;
    current_price: number;
}

interface CoinLocal extends CoinApi {
    quantity: number;
    buying_price: number;
    date: string;
}

export function MyCoins() {
    const [coins, setCoins] = useState<CoinLocal[]>([]);

    useEffect(() => {
        const fetchCoins = async () => {
            const res = await fetch(ALL_CRYPTO_API_URL);
            const data: CoinApi[] = await res.json();

            // Модифікуємо кожну монету
            const extendedCoins: CoinLocal[] = data.map((coin) => ({
                ...coin,
                buying_price: +(coin.current_price * (0.95 + Math.random() * 0.1)).toFixed(2),
                date: randomPastDate(),
                quantity: Math.floor(Math.random() * 10) + 1, // від 1 до 10
            }));

            setCoins(extendedCoins);
        };

        fetchCoins();
    }, []);


    type SortOption = { label: string; value: keyof CoinLocal };

    const SORT_OPTIONS: SortOption[] = [
        { label: "Name", value: "name" },
        { label: "Current Price", value: "current_price" },
        { label: "Buying Price", value: "buying_price" },
        { label: "Date", value: "date" },
    ];
    const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS[0]);
    const sortedCoins = [...coins].sort((a, b) => {
        if (!sortBy) return 0;
        const key = sortBy.value;
        const valA = a[key];
        const valB = b[key];

        if (typeof valA === "number" && typeof valB === "number") {
            return valB - valA; // по убыванию
        }
        return String(valA).localeCompare(String(valB)); // по алфавиту / даті
    });

    const theme: Theme = useAppSelector((state) => state.theme.theme);

    return (
        <div>
            <div className="w-full flex justify-between gap-10 mb-5">
                <h1 className="fontTitle text-2xl">My coins:</h1>
                <Select
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={(opt) => opt !== null && setSortBy(opt)}
                    placeholder="Sort by"
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
            <div className="">
                <div className="grid items-center grid-cols-5 font-semibold border-b pb-2 text-sm text-gray-700 dark:text-gray-200">
                    <div>Name</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-center">Current Price</div>
                    <div className="text-center">Buying Price</div>
                    <div className="text-center">Date</div>
                </div>

                {sortedCoins.map((coin) => (
                    <button
                        onClick={() => console.log("coin modal to change")}
                        key={coin.id}
                        className="cursor-pointer grid grid-cols-5 items-center border-b py-2 text-sm hover:bg-gray-100/10 w-full"
                    >
                        <div className="flex items-center gap-2">
                            <img src={coin.image} alt={coin.name} className="w-5 h-5" />
                            <span>{coin.name}</span>
                        </div>
                        <div>{coin.quantity}</div>
                        <div>${coin.current_price}</div>
                        <div>${coin.buying_price}</div>
                        <div>{coin.date}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Функція для генерації випадкової дати за останні 30 днів
function randomPastDate(): string {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const pastDate = new Date(now.setDate(now.getDate() - daysAgo));
    return pastDate.toISOString().split("T")[0]; // yyyy-mm-dd
}
