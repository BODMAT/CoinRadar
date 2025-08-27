import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAllCrypto } from "../../api/crypto";

export const getAllCoins = createAsyncThunk(
    "allCrypto/fetchCoins",
    async (_, thunkAPI) => {
        try {
            const response = await fetchAllCrypto();
            return response;
        } catch (error) {
            return thunkAPI.rejectWithValue(error instanceof Error ? error.message : "Unknown error");
        }
    }
);