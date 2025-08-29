import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../firebase.config";
import { z } from "zod";

export const userSchema = z.object({
    uid: z.string(),
    displayName: z.string(),
    email: z.string(),
    photoURL: z.string().nullable(),
});

export type UserSafe = z.infer<typeof userSchema>;

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fakeBaseQuery(),
    tagTypes: ["User"],
    endpoints: (builder) => ({
        getUser: builder.query<UserSafe | null, void>({
            queryFn: async () => {
                try {
                    const stored = localStorage.getItem("user-storage-coinradar");
                    if (!stored) return { data: null };
                    const parsed = userSchema.parse(JSON.parse(stored));
                    return { data: parsed };
                } catch {
                    return { data: null };
                }
            },
            providesTags: [{ type: "User", id: "CURRENT" }],
        }),

        loginUser: builder.mutation<UserSafe, void>({
            async queryFn() {
                try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const user = result.user;

                    const parsedUser = userSchema.parse({
                        uid: user.uid,
                        displayName: user.displayName!,
                        email: user.email!,
                        photoURL: user.photoURL,
                    });

                    localStorage.setItem("user-storage-coinradar", JSON.stringify(parsedUser));
                    return { data: parsedUser };
                } catch (error) {
                    if (error instanceof Error) return { error: { message: error.message } };
                    return { error: { message: "Unknown error during sign-in" } };
                }
            },
            invalidatesTags: [{ type: "User", id: "CURRENT" }],
        }),

        logoutUser: builder.mutation<void, void>({
            async queryFn() {
                try {
                    localStorage.removeItem("user-storage-coinradar");
                    return { data: undefined };
                } catch (error) {
                    return { error: { message: "Logout failed" } };
                }
            },
            invalidatesTags: [{ type: "User", id: "CURRENT" }],
        }),
    }),
});

export const { useLoginUserMutation, useLogoutUserMutation, useGetUserQuery } = authApi;
