import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { closePopup } from "../../../portals/popup.slice";
import { ProfileSection } from "./ProfileSection";
import { PasswordSection } from "./PasswordSection";
import { DeleteSection } from "./DeleteSection";

type Section = "profile" | "password" | "delete";

const tabButtonClass = (active: boolean) =>
  `flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
    active
      ? "bg-purple-600/30 text-white border border-purple-400/40"
      : "text-(--color-text) opacity-70 hover:opacity-100 hover:bg-white/5 border border-transparent"
  }`;

export function AccountSettingsPopup() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [section, setSection] = useState<Section>("profile");

  if (!currentUser) {
    return (
      <p className="text-center text-sm opacity-80">
        You need to be signed in to manage your account.
      </p>
    );
  }

  const hasPassword = currentUser.hasPassword ?? false;

  return (
    <div className="fontText w-full max-w-md mx-auto space-y-6">
      <div className="text-center text-sm opacity-70">
        Signed in as <strong>{currentUser.login}</strong>
        {currentUser.email && (
          <span className="block text-xs opacity-80">{currentUser.email}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tabButtonClass(section === "profile")}
          onClick={() => setSection("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          className={tabButtonClass(section === "password")}
          onClick={() => setSection("password")}
        >
          Password
        </button>
        <button
          type="button"
          className={tabButtonClass(section === "delete")}
          onClick={() => setSection("delete")}
        >
          Delete account
        </button>
      </div>

      {section === "profile" && <ProfileSection user={currentUser} />}
      {section === "password" && (
        <PasswordSection
          hasPassword={hasPassword}
          userEmail={currentUser.email}
          onDone={() => dispatch(closePopup())}
        />
      )}
      {section === "delete" && (
        <DeleteSection
          hasPassword={hasPassword}
          onDeleted={() => dispatch(closePopup())}
        />
      )}
    </div>
  );
}
