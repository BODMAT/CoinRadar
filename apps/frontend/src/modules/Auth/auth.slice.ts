import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserSafe } from "./auth.schema";
import type { RootState } from "../../store";

interface AuthState {
  user: UserSafe | null;
}

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
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
export const selectCurrentUser = (state: RootState) => state.auth.user;

export default authSlice.reducer;
