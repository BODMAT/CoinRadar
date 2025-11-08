import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";

export const userSchema = z.object({
    uid: z.string(),
    displayName: z.string(),
    email: z.string(),
    photoURL: z.string().nullable(),
    // ВАЖЛИВО: Додаємо поле token, яке має повертати ваш бекенд для авторизації
    token: z.string().optional(),
});

export type UserSafe = z.infer<typeof userSchema>;

const BASE_URL = "http://localhost:4000/api/v1/";

export const authApi = createApi({
    reducerPath: "authApi",
    // Використовуємо fetchBaseQuery для взаємодії з власним бекендом
    baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
    tagTypes: ["User"],
    endpoints: (builder) => ({
        // -----------------------------------------------------------
        // 1. GET USER (Отримання даних користувача з LocalStorage)
        // -----------------------------------------------------------
        getUser: builder.query<UserSafe | null, void>({
            queryFn: async () => {
                try {
                    // Логіка читання з LocalStorage залишається на клієнті
                    // ми зберігаємо дані та токен користувача для сесії.
                    const stored = localStorage.getItem("user-storage-coinradar");
                    if (!stored) return { data: null };
                    // *ВАЖЛИВО*: Парсимо схему, включаючи потенційний token.
                    const parsed = userSchema.parse(JSON.parse(stored));
                    return { data: parsed };
                } catch {
                    return { data: null };
                }
            },
            providesTags: [{ type: "User", id: "CURRENT" }],
        }),

        // -----------------------------------------------------------
        // 2. LOGIN USER (Запит на БЕКЕНД з логіном/паролем)
        // POST /auth/login
        // -----------------------------------------------------------
        loginUser: builder.mutation<UserSafe, { email: string, password: string }>({ // Змінюємо тип аргументу на облікові дані
            query: (credentials) => ({
                url: "auth/login",
                method: "POST",
                body: credentials, // Припускаємо, що бекенд прийме { email, password }
            }),
            // Обробка успішної відповіді
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data: userData } = await queryFulfilled;

                    // *ВАЖЛИВО*: Зберігаємо дані (включно з токеном), які повернув бекенд
                    const parsedUser = userSchema.parse(userData);
                    localStorage.setItem("user-storage-coinradar", JSON.stringify(parsedUser));

                } catch (error) {
                    // Обробка помилок входу
                    console.error("Помилка входу:", error);
                }
            },
            invalidatesTags: [{ type: "User", id: "CURRENT" }],
        }),

        // -----------------------------------------------------------
        // 3. LOGOUT USER (Запит на БЕКЕНД для виходу/відкликання токена)
        // POST /auth/logout (опціонально, але хороша практика)
        // -----------------------------------------------------------
        logoutUser: builder.mutation<void, void>({
            query: () => ({
                url: "auth/logout", // Припускаємо, що бекенд відкличе токен
                method: "POST",
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    await queryFulfilled;
                    localStorage.removeItem("user-storage-coinradar");
                } catch (error) {
                    // Навіть якщо бекенд-запит на вихід не вдався, ми видаляємо локальну сесію
                    localStorage.removeItem("user-storage-coinradar");
                    console.error("Вихід з системи на сервері не вдався, але локальна сесія очищена.", error);
                }
            },
            invalidatesTags: [{ type: "User", id: "CURRENT" }],
        }),
    }),
});

// *ВАЖЛИВО*: Якщо ви переходите на логін/пароль, 
// вам потрібно буде змінити використання useLoginUserMutation у ваших компонентах.
export const { useLogoutUserMutation, useGetUserQuery, useLoginUserMutation } = authApi;