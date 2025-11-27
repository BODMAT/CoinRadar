import { openPopup } from "../../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../../store";
import { AuthPopup } from "./AuthPopup";

export function Auth() {
    const currentUser = useAppSelector(state => state.auth.user);

    const dispatch = useAppDispatch();
    const handleOpenPopup = () => {
        dispatch(openPopup({ title: `${currentUser ? "USER: " + currentUser.login : "Auth"}`, children: <AuthPopup /> }));
    }

    return (
        <button
            onClick={handleOpenPopup}
            className="flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[white] border-[white] border-2 max-w-[300px] overflow-x-auto"
        >
            {currentUser
                ? (currentUser.login ?? "Authenticated")
                : "Sign in"
            }
        </button>
    );
}
