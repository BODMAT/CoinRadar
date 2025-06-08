import { createAsyncThunk } from "@reduxjs/toolkit";
import type { User } from "firebase/auth";
import { getUsers } from "../../api/firebase";

export const loginUser = createAsyncThunk<User, void, { rejectValue: string }>(
    "auth/loginUser",
    async (_, { rejectWithValue }) => {
        try {
            const user = await getUsers();
            return user;
        } catch (error) {
            if (error instanceof Error) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue("Failed to login due to unknown error");
        }
    }
);

