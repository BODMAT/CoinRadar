export const SortOptions = [
    { value: "sort", label: "Default sort" },
    { value: "total_price", label: "Total price" },
    { value: "quantity", label: "Quantity" },
    { value: "profit", label: "Profit" }
]


export const styles = (theme: "dark" | "light") => ({
    control: (base: any) => ({
        ...base,
        cursor: "pointer",
        backgroundColor: "transparent",
        borderColor: theme === "dark" ? "#fff" : "#000",
        color: theme === "dark" ? "#fff" : "#000",
        boxShadow: "none",
        outline: "none",
        minWidth: "200px",
        maxWidth: "310px",
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
