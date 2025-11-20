import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { UserSchema, type AuthResponse, type Login, type Register, type UserSafe } from "./auth.schema";
import type { RootState } from "../../store";
import { setUserData, logout } from './auth.slice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/";
const STORAGE_KEY = import.meta.env.VITE_USER_STORAGE_KEY || "user-storage-coinradar";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.user?.token;
            if (token) {
                headers.set("Authorization", `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ["User"],
    endpoints: (builder) => ({
        //REGISTER USER

        registerUser: builder.mutation<AuthResponse, Register>({
            query: (credentials) => ({
                url: "auth/register",
                method: "POST",
                body: credentials,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: responseData } = await queryFulfilled;
                    const userData = responseData.user;
                    const parsedUser: UserSafe = UserSchema.parse(userData);

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedUser));

                    dispatch(setUserData(parsedUser));
                    // dispatch(setWalletsList(parsedUser.wallets || [])); in future
                } catch (error) {
                    console.error("Помилка реєстрації:", error);
                }
            },
            invalidatesTags: ['User'],
        }),

        //LOGIN USER
        loginUser: builder.mutation<AuthResponse, Login>({
            query: (credentials) => ({
                url: "auth/login",
                method: "POST",
                body: credentials,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: responseData } = await queryFulfilled;
                    const userData = responseData.user;
                    const parsedUser = UserSchema.parse(userData);

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedUser));

                    dispatch(setUserData(parsedUser));
                    // dispatch(setWalletsList(parsedUser.wallets || [])); in future
                } catch (error) {
                    console.error("Помилка входу:", error);
                }
            },
            invalidatesTags: ['User'],
        }),

        //LOGOUT USER
        logoutUser: builder.mutation<void, void>({
            //! ФЕЙКОВИЙ ЗАПИТ - НА БД НЕМА REFRESH TOKEN
            queryFn: async () => {
                return { data: undefined };
            },

            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    localStorage.removeItem(STORAGE_KEY);

                    dispatch(logout());

                    // dispatch(clearWalletState()); in future
                    dispatch(authApi.util.resetApiState());

                } catch (error) {
                    localStorage.removeItem(STORAGE_KEY);
                    console.error("Помилка виходу (фейковий запит):", error);
                }
            },
            invalidatesTags: ['User'],
        }),
    }),
});

export const { useLogoutUserMutation, useLoginUserMutation, useRegisterUserMutation } = authApi;