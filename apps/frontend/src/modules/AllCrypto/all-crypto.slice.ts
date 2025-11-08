import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Coin } from "./all-crypto.api";

interface AllCryptoState {
    allCoins: Coin[];
    coinsPerPage: Coin[];
    filteredCoins: Coin[];
    page: number;
    perPage: number;
    isAPILoading: boolean;
}

const initialState: AllCryptoState = {
    allCoins: [],
    coinsPerPage: [],
    filteredCoins: [],
    page: 1,
    perPage: 10,
    isAPILoading: true,
};

const allCryptoSlice = createSlice({
    name: "allCrypto",
    initialState,
    reducers: {
        setPage(state, action: PayloadAction<number>) {
            state.page = action.payload;
            const start = (state.page - 1) * state.perPage;
            state.coinsPerPage = state.filteredCoins.slice(start, start + state.perPage);
        },
        setPerPage(state, action: PayloadAction<number>) {
            state.perPage = action.payload;
            const start = (state.page - 1) * state.perPage;
            state.coinsPerPage = state.filteredCoins.slice(start, start + state.perPage);
        },
        setIsAPILoading(state, action: PayloadAction<boolean>) {
            state.isAPILoading = action.payload;
        },
        filterCoins(state, action: PayloadAction<string>) {
            const query = action.payload.toLowerCase().trim();
            state.filteredCoins = query
                ? state.allCoins.filter(
                    (coin) =>
                        coin.name.toLowerCase().includes(query) ||
                        coin.symbol.toLowerCase().includes(query)
                )
                : state.allCoins;

            state.page = 1;
            state.coinsPerPage = state.filteredCoins.slice(0, state.perPage);
        },
        sincronizeAllCoins(state, action: PayloadAction<Coin[]>) {
            state.allCoins = action.payload;
            state.filteredCoins = action.payload;
            state.coinsPerPage = action.payload.slice(0, state.perPage);
        },
    },
});

export default allCryptoSlice.reducer;
export const { setPage, setPerPage, filterCoins, sincronizeAllCoins, setIsAPILoading } = allCryptoSlice.actions;
