import { useEffect, useState } from "react";
import SearchSVG from "../../assets/search.svg";
import { useAppDispatch, useAppSelector } from "../../store";
import { setPage, filterCoinsWithoutRefetch, resetFilter } from "./all-crypto.slice";
export function CryptoMenu() {
    const dispatch = useAppDispatch();
    const { page, coinsPerPage } = useAppSelector(state => state.allCrypto);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (inputValue.length >= 1) {
            dispatch(filterCoinsWithoutRefetch(inputValue));
        } else {
            dispatch(resetFilter());
        }
    }, [inputValue, dispatch]);

    return (
        <div className="bg-[image:var(--color-background)] rounded-2xl flex gap-5 justify-between items-center p-2 flex-wrap max-[804px]:justify-center">
            <h2 className="fontTitle text-2xl text-center">Watch all crypto</h2>

            <div className="flex gap-5 items-center flex-wrap">
                {/* search */}
                <div className="max-[500px]:w-full flex items-center gap-2 bg-[var(--color-card)] px-3 py-2 rounded border border-white/20">
                    <input
                        onChange={e => setInputValue(e.target.value)}
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent outline-none text-[var:--color-text] border-[var:--color-text] placeholder-white/50 max-[500px]:w-full w-40 sm:w-60"
                    />
                    <button className="w-8 h-8 opacity-80 cursor-pointer transitioned bg-[var(--color-card)] rounded-[50%] p-2 hover:scale-90" onClick={() => console.log("search")}>
                        <img src={SearchSVG} alt="Search" />
                    </button>
                </div>
            </div>
            <div className="flex gap-1 items-center">
                {/* navigation */}
                <button
                    onClick={() => dispatch(setPage(page - 1))} disabled={page === 1}
                    className="cursor-pointer px-4 py-2 bg-[var(--color-card)] text-[var:(--color-text)] border-[white] rounded border hover:scale-105 transitioned disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ←
                </button>
                <button
                    onClick={() => dispatch(setPage(page + 1))} disabled={(coinsPerPage?.length ?? 0) < 10}
                    className="cursor-pointer px-4 py-2 bg-[var(--color-card)] text-[var:(--color-text)] border-[white] rounded border hover:scale-105 transitioned disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    →
                </button>
            </div>
        </div>
    );
}
