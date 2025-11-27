import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
interface AllCryptoState {
    page: number;
    perPage: number;
    searchQuery: string;
    lastUpdate: string;
}

const initialState: AllCryptoState = {
    page: 1,
    perPage: 10,
    searchQuery: "",
    lastUpdate: new Date().toISOString(),
};

const allCryptoSlice = createSlice({
    name: "allCrypto",
    initialState,
    reducers: {
        setPage(state, action: PayloadAction<number>) {
            state.page = action.payload;
        },
        setPerPage(state, action: PayloadAction<number>) {
            state.perPage = action.payload;
            state.page = 1;
        },
        setSearchQuery(state, action: PayloadAction<string>) {
            state.searchQuery = action.payload;
        },
        resetLastUpdate(state) {
            state.lastUpdate = new Date().toISOString();
        }
    },
});

export default allCryptoSlice.reducer;
export const { setPage, setPerPage, resetLastUpdate, setSearchQuery } = allCryptoSlice.actions;
