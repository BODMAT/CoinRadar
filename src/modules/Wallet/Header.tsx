export function Header() {
    return (
        <div className="flex justify-between max-md:flex-col items-center gap-7 bg-[image:var(--color-background)] rounded-2xl p-3">
            <div className="flex gap-5">
                <h1 className="fontTitle text-2xl">Wallet:</h1>
                <h2 className="fontTitle text-2xl">$110000</h2>
            </div>
            <div className="flex gap-5 max-[420px]:flex-col">
                <button onClick={() => console.log("add transaction modal")} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[var:--color-text] border-[var:--color-text] border-2">Add transaction</button>
                <button onClick={() => console.log("view transaction modal")} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[var:--color-text] border-[var:--color-text] border-2">View transactions</button>
            </div>
        </div>
    )
}