import { createApi } from "@reduxjs/toolkit/query/react";
import { UserSchema, type AuthResponse, type Login, type Register, type UserSafe } from "./auth.schema";
import { setUserData, logout } from './auth.slice';
import { clearWalletState, setWalletsList } from "../Wallet/selectedWallet.slice";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["User"],
    endpoints: (builder) => ({
        registerUser: builder.mutation<AuthResponse, Register>({
            query: (credentials) => ({
                url: "auth/register",
                method: "POST",
                body: credentials,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: responseData } = await queryFulfilled;
                    const parsedUser: UserSafe = UserSchema.parse(responseData.user);
                    dispatch(setUserData(parsedUser));
                    dispatch(setWalletsList(parsedUser.wallets || []));
                } catch (error) {
                    console.error("Registration error:", error);
                }
            },
            invalidatesTags: ['User'],
        }),

        loginUser: builder.mutation<AuthResponse, Login>({
            query: (credentials) => ({
                url: "auth/login",
                method: "POST",
                body: credentials,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: responseData } = await queryFulfilled;
                    const parsedUser: UserSafe = UserSchema.parse(responseData.user);
                    dispatch(setUserData(parsedUser));
                    dispatch(setWalletsList(parsedUser.wallets || []));
                } catch (error) {
                    console.error("Login error:", error);
                }
            },
            invalidatesTags: ['User'],
        }),

        getCurrentUser: builder.query<AuthResponse, void>({
            query: () => ({
                url: "auth/me",
                method: "GET",
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: responseData } = await queryFulfilled;
                    const parsedUser: UserSafe = UserSchema.parse(responseData.user);
                    dispatch(setUserData(parsedUser));
                    dispatch(setWalletsList(parsedUser.wallets || []));
                } catch {
                    dispatch(logout());
                    dispatch(clearWalletState());
                }
            },
            providesTags: ['User'],
        }),

        logoutUser: builder.mutation<{ message: string }, void>({
            query: () => ({
                url: "auth/logout",
                method: "POST",
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                } catch (error) {
                    console.error("Logout error:", error);
                } finally {
                    dispatch(logout());
                    dispatch(clearWalletState());
                    dispatch(authApi.util.resetApiState());
                }
            },
            invalidatesTags: ['User'],
        }),
    }),
});

export const {
    useLogoutUserMutation,
    useLoginUserMutation,
    useRegisterUserMutation,
    useGetCurrentUserQuery,
} = authApi;
