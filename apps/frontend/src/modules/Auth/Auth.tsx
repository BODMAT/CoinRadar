import { useGetUserQuery, useLoginUserMutation, useLogoutUserMutation } from "./auth.api";

export function Auth() {
    const { data: currentUser, isLoading } = useGetUserQuery();
    const [loginUser] = useLoginUserMutation();
    const [logoutUser] = useLogoutUserMutation();

    const handleLogin = async () => {
        await logoutUser();
        await loginUser();
    };

    return (
        <button
            onClick={handleLogin}
            className="flex justify-center items-center text-center px-9 py-2 bg-[var(--color-card)] cursor-pointer rounded transitioned hover:scale-105 text-[white] border-[white] border-2"
        >
            {isLoading ? (
                "Loading..."
            ) : currentUser ? (
                currentUser?.displayName ?? "Authenticated"
            ) : (
                "Auth"
            )}

        </button>
    );
}
