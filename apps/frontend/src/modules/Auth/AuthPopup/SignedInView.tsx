import { useAppDispatch } from "../../../store";
import { closePopup } from "../../../portals/popup.slice";
import {
  useLogoutUserMutation,
  useLogoutAllSessionsMutation,
} from "../auth.api";
import { secondaryButtonClass } from "../auth.utils";
import type { UserSafe } from "../auth.schema";

export function SignedInView({ user }: { user: UserSafe }) {
  const dispatch = useAppDispatch();
  const [logoutUser, { isLoading: isLogoutLoading }] = useLogoutUserMutation();
  const [logoutAllSessions, { isLoading: isLogoutAllLoading }] =
    useLogoutAllSessionsMutation();

  return (
    <div className="fontText w-full max-w-md mx-auto space-y-5">
      <h2 className="fontTitle text-4xl font-bold text-center drop-shadow-sm">
        Signed in
      </h2>
      <div className="text-center text-sm opacity-80 space-y-1">
        <p>
          Logged in as <strong>{user.login}</strong>
        </p>
        {user.email && <p className="text-xs opacity-70">{user.email}</p>}
      </div>

      <button
        type="button"
        disabled={isLogoutLoading}
        onClick={() => {
          logoutUser();
          dispatch(closePopup());
        }}
        className={secondaryButtonClass}
      >
        {isLogoutLoading ? "Logging out..." : "Log out"}
      </button>

      <button
        type="button"
        disabled={isLogoutAllLoading}
        onClick={() => {
          logoutAllSessions();
          dispatch(closePopup());
        }}
        className={secondaryButtonClass}
      >
        {isLogoutAllLoading
          ? "Logging out everywhere..."
          : "Log out of all sessions"}
      </button>
    </div>
  );
}
