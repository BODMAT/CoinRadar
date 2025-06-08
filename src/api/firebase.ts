import { signInWithPopup, type User } from "firebase/auth";
import { auth, googleProvider } from "../firebase.config";

export const getUsers = async (): Promise<User> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Sign-in error:", error.message);
            throw new Error(error.message);
        } else {
            console.error("Unknown sign-in error:", error);
            throw new Error("Unknown error during sign-in");
        }
    }
};
