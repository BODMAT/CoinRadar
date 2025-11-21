import type { SingleValue } from "react-select";
import type { MyCoinComponent } from "../modules/Transactions/transaction.api";

export const SortOptions = [
    { value: "sort", label: "Sort by" },
    { value: "total_price", label: "Total price" },
    { value: "quantity", label: "Quantity" },
    { value: "date", label: "Date" },
    { value: "profit", label: "Profit" }
]

export const handleChangeSort = ({
    sortOption,
    sortedCoins,
    setSortedCoins,
}: {
    sortOption: SingleValue<{ value: string; label: string }>,
    sortedCoins: MyCoinComponent[] | null,
    setSortedCoins: React.Dispatch<React.SetStateAction<MyCoinComponent[] | null>>
}) => {
    if (!sortedCoins || sortOption?.value === "sort") return;

    const coinsCopy = [...sortedCoins];

    if (sortOption?.value === "total_price") {
        setSortedCoins(coinsCopy.sort((a, b) => b.quantity * b.currentPrise - a.quantity * a.currentPrise));
    } else if (sortOption?.value === "quantity") {
        setSortedCoins(coinsCopy.sort((a, b) => b.quantity - a.quantity));
    } else if (sortOption?.value === "date") {
        setSortedCoins(coinsCopy.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()));
    } else if (sortOption?.value === "profit") {
        setSortedCoins(coinsCopy.sort((a, b) => b.profit - a.profit));
    }
};


export const styles = (theme: "dark" | "light") => ({
    control: (base: any) => ({
        ...base,
        cursor: "pointer",
        backgroundColor: "transparent",
        borderColor: theme === "dark" ? "#fff" : "#000",
        color: theme === "dark" ? "#fff" : "#000",
        boxShadow: "none",
        outline: "none",
        "&:hover": {
            borderColor: theme === "dark" ? "#aaa" : "#333",
        },
    }),
    singleValue: (base: any) => ({
        ...base,
        color: theme === "dark" ? "#fff" : "#000",
    }),
    menu: (base: any) => ({
        ...base,
        backgroundColor: theme === "dark" ? "#222" : "#eee",
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isFocused
            ? theme === "dark"
                ? "#333"
                : "#ddd"
            : theme === "dark"
                ? "#222"
                : "#fff",
        color: theme === "dark" ? "#fff" : "#000",
        cursor: "pointer",
    }),
    dropdownIndicator: (base: any) => ({
        ...base,
        color: theme === "dark" ? "#fff" : "#000",
        "&:hover": {
            color: theme === "dark" ? "#fff" : "#000",
        },
    }),
    indicatorSeparator: () => ({ display: "none" }),
});
