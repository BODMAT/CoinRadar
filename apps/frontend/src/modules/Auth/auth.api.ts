import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { UserSchema, type AuthResponse, type Login, type Register, type UserSafe } from "./auth.schema";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
        prepareHeaders: (headers) => {
            // prepareHeaders використовується для додавання заголовків до запитів
            const stored = localStorage.getItem("user-storage-coinradar");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.token) {
                        headers.set("Authorization", `Bearer ${parsed.token}`);
                    }
                } catch (e) {
                    console.error("Error parsing token", e);
                }
            }
            return headers;
        },
    }),
    tagTypes: ["User"],
    endpoints: (builder) => ({
        getUser: builder.query<UserSafe | null, void>({
            queryFn: async () => {
                try {
                    const stored = localStorage.getItem("user-storage-coinradar");
                    if (!stored) return { data: null };
                    const parsed = UserSchema.parse(JSON.parse(stored));
                    return { data: parsed };
                } catch {
                    console.error("Помилка отримання користувача");
                    return { data: null };
                }
            },
            providesTags: [{ type: "User", id: "CURRENT" }],
        }),

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
                    const parsedUser = UserSchema.parse(userData);
                    localStorage.setItem("user-storage-coinradar", JSON.stringify(parsedUser));

                    //! RTK MANUAL INVALIDATION
                    dispatch(
                        authApi.util.invalidateTags([{ type: "User", id: parsedUser.login }])
                    );

                    dispatch(
                        authApi.util.updateQueryData('getUser', undefined, () => {
                            return parsedUser;
                        })
                    );
                } catch (error) {
                    console.error("Помилка реєстрації:", error);
                }
            },
            invalidatesTags: [], //! RTK MANUAL INVALIDATION
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
                    localStorage.setItem("user-storage-coinradar", JSON.stringify(parsedUser));

                    //! RTK MANUAL INVALIDATION
                    dispatch(
                        authApi.util.invalidateTags([{ type: "User", id: parsedUser.login }])
                    );

                    dispatch(
                        authApi.util.updateQueryData('getUser', undefined, () => {
                            return parsedUser;
                        })
                    );
                } catch (error) {
                    console.error("Помилка входу:", error);
                }
            },
            invalidatesTags: [], //! RTK MANUAL INVALIDATION
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
                    localStorage.removeItem("user-storage-coinradar");

                    dispatch(
                        authApi.util.updateQueryData('getUser', undefined, () => {
                            return null;
                        })
                    );

                } catch (error) {
                    localStorage.removeItem("user-storage-coinradar");
                    console.error("Помилка виходу (фейковий запит):", error);
                    dispatch(
                        authApi.util.updateQueryData('getUser', undefined, () => {
                            return null;
                        })
                    );
                }
            },
            invalidatesTags: [], //! RTK MANUAL INVALIDATION
        }),
    }),
});

export const { useLogoutUserMutation, useGetUserQuery, useLoginUserMutation, useRegisterUserMutation } = authApi;