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

  return (
    <button
      onClick={handleOpen}
      className="flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[white] border-[white] border-2 max-w-[300px]"
    >
      Settings
    </button>
  );
}
