import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { setPage, setSearchQuery } from "./all-crypto.slice";
import SearchSVG from "../../assets/search.svg";

export function CryptoMenu({ totalFilteredCount }: { totalFilteredCount: number }) {
    const dispatch = useAppDispatch();
    const { page, perPage, lastUpdate } = useAppSelector(state => state.allCrypto);
    const currentSearchQuery = useAppSelector(state => state.allCrypto.searchQuery);

    const [inputValue, setInputValue] = useState(currentSearchQuery);

    const [ago, setAgo] = useState(0);
    useEffect(() => {
        if (!lastUpdate) return;

        const updateAgo = () => {
            const lastUpdateTime = new Date(lastUpdate).getTime();
            const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
            setAgo(seconds);
        };

        updateAgo();
        const interval = setInterval(updateAgo, 1000);

        return () => clearInterval(interval);
    }, [lastUpdate]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (inputValue !== currentSearchQuery) {
                dispatch(setSearchQuery(inputValue));
                dispatch(setPage(1));
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [inputValue, dispatch, currentSearchQuery]);

    const totalPages = Math.ceil(totalFilteredCount / perPage);
    const displayTotalPages = totalPages === 0 ? 1 : totalPages;
    const isNextDisabled = page >= displayTotalPages;
    const isPrevDisabled = page === 1;

    return (
        <div className="bg-(image:--color-background) rounded-2xl flex gap-5 justify-between items-center p-4 flex-wrap max-[804px]:justify-center shadow-xl border border-gray-700/50">
            <div className="flex gap-1 flex-col items-start">
                <h2 className="fontTitle text-2xl font-bold text-white">Watch all crypto</h2>
                <h2 className="font-mono text-sm text-gray-400">
                    Last update:
                    <span className="ml-1 text-green-400 font-semibold">{ago}s</span> ago
                </h2>
            </div>

            <div className="flex gap-5 items-center flex-wrap">
                <div className="max-[500px]:w-full flex items-center gap-2 px-3 py-2 rounded-xl border  transition duration-300 focus-within:border-indigo-400">
                    <input
                        id="search-input"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        type="text"
                        placeholder="Search by name or symbol..."
                        className="bg-transparent outline-none text-white placeholder-gray-400 max-[500px]:w-full w-40 sm:w-60"
                    />
                    <div className="w-8 h-8 opacity-80 text-gray-400 flex items-center justify-center">
                        <img src={SearchSVG} alt="search" />
                    </div>
                </div>
            </div>

            <div className="flex gap-2 items-center">
                <button
                    onClick={() => dispatch(setPage(page - 1))}
                    disabled={isPrevDisabled}
                    className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 font-medium"
                >
                    &larr;
                </button>
                <button
                    onClick={() => dispatch(setPage(page + 1))}
                    disabled={isNextDisabled}
                    className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 font-medium"
                >
                    &rarr;
                </button>
            </div>
        </div>
    );
}