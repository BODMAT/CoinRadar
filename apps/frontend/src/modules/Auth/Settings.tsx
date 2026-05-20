import { openPopup } from "../../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../../store";
import { AccountSettingsPopup } from "./AccountSettingsPopup";

export function Settings() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  if (!currentUser) return null;

  const handleOpen = () => {
    dispatch(
      openPopup({
        title: "Account settings",
        children: <AccountSettingsPopup />,
      }),
    );
  };

  const fallbackLetter = currentUser.login.slice(0, 1).toUpperCase();

  return (
    <button
      onClick={handleOpen}
      title="Account settings"
      className="flex items-center gap-2 px-3 py-1.5 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[white] border-[white] border-2"
    >
      <span className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-sm font-bold">
        {currentUser.photoUrl ? (
          <img
            src={currentUser.photoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          fallbackLetter
        )}
      </span>
      <span className="hidden sm:inline">Settings</span>
    </button>
  );
}
