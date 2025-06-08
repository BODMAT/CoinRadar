import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type User } from "firebase/auth";
import { loginUser } from "./auth.thunks";

interface AuthState {
    currentUser: User | null;
    isAuth: boolean;
    loading: boolean;
    error: string | null;
}

const storedUser = localStorage.getItem("user-storage-coinradar");
const initialState: AuthState = {
    currentUser: storedUser ? JSON.parse(storedUser) : null,
    isAuth: !!storedUser,
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logout(state) {
            state.currentUser = null;
            state.isAuth = false;
            localStorage.removeItem("user-storage-coinradar");
        },
        resetAuthState(state) {
            state.loading = false;
            state.error = null;
            localStorage.removeItem("user-storage-coinradar");
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.loading = false;
                state.currentUser = action.payload;
                state.isAuth = true;
                localStorage.setItem("user-storage-coinradar", JSON.stringify(action.payload));
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? "Failed to login";
                state.currentUser = null;
                state.isAuth = false;
            });
    },

});

export const { logout, resetAuthState } = authSlice.actions;
export default authSlice.reducer;

