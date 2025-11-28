import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserSafe } from './auth.schema';
import type { RootState } from '../../store';
import { jwtDecode } from "jwt-decode";

const STORAGE_KEY = import.meta.env.VITE_USER_STORAGE_KEY || "user-storage-coinradar";

interface AuthState {
    user: UserSafe | null;
}
interface DecodedToken {
    exp: number; // Expiration time (seconds)
    iat: number; // Issued at
    id: string;
}

const loadInitialState = (): UserSafe | null => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }

        const user = JSON.parse(serializedState) as UserSafe;

        if (user.token) {
            try {
                const decoded = jwtDecode<DecodedToken>(user.token);
                const currentTime = Date.now() / 1000;

                if (decoded.exp < currentTime) {
                    console.log("Storage: Token expired. Clearing auth.");
                    localStorage.removeItem(STORAGE_KEY);
                    return null;
                }
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
        }

        return user;
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
        },

        logout(state) {
            state.user = null;
            localStorage.removeItem(STORAGE_KEY);
        },
    },
});

export const { setUserData, logout } = authSlice.actions;
export const selectCurrentUser = (state: RootState) => state.auth.user;

export default authSlice.reducer;