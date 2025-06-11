import SearchSVG from "../../assets/search.svg";

export function CryptoMenu() {
    return (
        <div className="bg-[image:var(--color-background)] rounded-2xl flex gap-5 justify-between items-center p-2 flex-wrap max-[804px]:justify-center">
            <h2 className="fontTitle text-2xl text-center">Watch all crypto</h2>

            <div className="flex gap-5 items-center flex-wrap">
                {/* Пошук */}
                <div className="max-[500px]:w-full flex items-center gap-2 bg-[var(--color-card)] px-3 py-2 rounded border border-white/20">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent outline-none text-[var:--color-text] border-[var:--color-text] placeholder-white/50 max-[500px]:w-full w-40 sm:w-60"
                        onChange={(e) => console.log("search:", e.target.value)}
                    />
                    <button className="w-8 h-8 opacity-80 cursor-pointer transitioned bg-[var(--color-card)] rounded-[50%] p-2 hover:scale-90" onClick={() => console.log("search")}>
                        <img src={SearchSVG} alt="Search" />
                    </button>
                </div>

                {/* Кнопка фільтрів */}
                <button
                    onClick={() => console.log("add selected filters")}
                    className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[var:--color-text] border-[white] border-2"
                >
                    Filters
                </button>
            </div>
            <div className="flex gap-1 items-center">
                {/* Кнопки навігації */}
                <button
                    onClick={() => console.log("go back")}
                    className="cursor-pointer px-4 py-2 bg-[var(--color-card)] text-[var:(--color-text)] border-[white] rounded border hover:scale-105 transitioned"
                >
                    ←
                </button>
                <button
                    onClick={() => console.log("go forward")}
                    className="cursor-pointer px-4 py-2 bg-[var(--color-card)] text-[var:(--color-text)] border-[white] rounded border hover:scale-105 transitioned"
                >
                    →
                </button>
            </div>
        </div>
    );
}
