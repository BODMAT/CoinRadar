import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserSafe } from './auth.schema';

const STORAGE_KEY = import.meta.env.VITE_USER_STORAGE_KEY || "user-storage-coinradar"; //! for rehydrate

interface AuthState {
    user: UserSafe | null;
}

const loadInitialState = (): UserSafe | null => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        return JSON.parse(serializedState) as UserSafe;
    } catch (e) {
        console.error("Error loading initial USER state:", e);
        return null;
    }
};

const initialState: AuthState = {
    user: loadInitialState(),
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUserData(state, action: PayloadAction<UserSafe>) {
            state.user = action.payload;
        },

        logout(state) {
            state.user = null;
        },
    },
});

export const { setUserData, logout } = authSlice.actions;

export default authSlice.reducer;