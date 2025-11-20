import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query";
import type { RootState } from "../../store";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/";

export const walletApi = createApi({
    reducerPath: "walletApi",
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            const state = getState() as RootState;
            const token = state.auth.user?.token;

            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }

            return headers;
        },
    }),
    endpoints: (builder) => ({}),
});