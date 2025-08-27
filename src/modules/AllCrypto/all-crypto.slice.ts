import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Coin } from "../../api/crypto";
import { getAllCoins } from "./all-crypto.thunks";

interface AllCryptoState {
    allCoins: Coin[] | null;
    coinsPerPage: Coin[] | null;
    filteredCoins: Coin[] | null;
    loading: boolean;
    error: string | null;
    page: number;
    perPage: number;
}

const initialState: AllCryptoState = {
    allCoins: [],
    coinsPerPage: [],
    filteredCoins: [],
    loading: false,
    error: null,
    page: 1,
    perPage: 10,
};

const allCryptoSlice = createSlice({
    name: "allCrypto",
    initialState,
    reducers: {
        setPage(state, action: PayloadAction<number>) {
            state.page = action.payload;

            const base = state.filteredCoins ?? [];
            const start = (state.page - 1) * state.perPage;
            state.coinsPerPage = base.slice(start, start + state.perPage);
        },
        setPerPage(state, action: PayloadAction<number>) {
            state.perPage = action.payload;

            const base = state.filteredCoins ?? [];
            const start = (state.page - 1) * state.perPage;
            state.coinsPerPage = base.slice(start, start + state.perPage);
        },
        filterCoinsWithoutRefetch(state, action: PayloadAction<string>) {
            if (!state.allCoins) return;

            const query = action.payload.toLowerCase().trim();
            if (!query) {
                state.filteredCoins = state.allCoins;
            } else {
                state.filteredCoins = state.allCoins.filter(
                    (coin) =>
                        coin.name.toLowerCase().includes(query) ||
                        coin.symbol.toLowerCase().includes(query)
                );
            }

            state.page = 1;
            state.coinsPerPage = state.filteredCoins.slice(0, state.perPage);
        },

        resetFilter(state) {
            state.filteredCoins = state.allCoins;
            state.page = 1;
            state.coinsPerPage = state.filteredCoins?.slice(0, state.perPage) ?? [];
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getAllCoins.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllCoins.fulfilled, (state, action: PayloadAction<Coin[]>) => {
                state.loading = false;
                state.allCoins = action.payload;
                state.filteredCoins = action.payload;

                // update coins per page
                const start = (state.page - 1) * state.perPage;
                const end = start + state.perPage;
                state.coinsPerPage = action.payload.slice(start, end);
            })
            .addCase(getAllCoins.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string ?? "Failed to fetch coins";
            });
    },
});

export default allCryptoSlice.reducer;

export const { setPage, setPerPage, filterCoinsWithoutRefetch, resetFilter } = allCryptoSlice.actions;