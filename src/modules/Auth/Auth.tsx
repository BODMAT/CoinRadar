import { useAppDispatch, useAppSelector, type RootState } from "../../store";
import { loginUser } from "./auth.thunks";
import { resetAuthState } from "./auth.slice";

export function Auth() {
    const dispatch = useAppDispatch();
    const { loading, isAuth, currentUser } = useAppSelector((state: RootState) => state.auth);

    const handleLogin = () => {
        dispatch(resetAuthState());
        dispatch(loginUser());
    };

    return (
        <button
            onClick={handleLogin}
            className="flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[white] border-[white] border-2"
        >
            {loading ? (
                "Loading..."
            ) : isAuth ? (
                currentUser?.displayName ?? "Authenticated"
            ) : (
                "Auth"
            )}

        </button>
    );
}
