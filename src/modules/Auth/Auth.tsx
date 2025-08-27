import { useAppDispatch, useAppSelector, type RootState } from "../../store";
import { logout } from "./auth.slice";
import { loginUser } from "./auth.thunks";

export function Auth() {
    const dispatch = useAppDispatch();
    const { loading, currentUser } = useAppSelector((state: RootState) => state.auth);


    const handleLogin = () => {
        dispatch(logout());
        dispatch(loginUser());
    };

    return (
        <button
            onClick={handleLogin}
            className="flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[white] border-[white] border-2"
        >
            {loading ? (
                "Loading..."
            ) : currentUser ? (
                currentUser?.displayName ?? "Authenticated"
            ) : (
                "Auth"
            )}

        </button>
    );
}
