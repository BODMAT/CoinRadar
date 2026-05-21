import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import {
  useSetPasswordMutation,
  useDeleteAccountMutation,
  useUpdateProfileMutation,
} from "./auth.api";
import type { UserSafe } from "./auth.schema";
import { PasswordField } from "./PasswordField";
import { useAppDispatch, useAppSelector } from "../../store";
import { closePopup } from "../../portals/popup.slice";
import {
  extractServerError,
  inputClass,
  secondaryButtonClass,
} from "./auth.utils";

type Section = "profile" | "password" | "delete";

const MAX_PHOTO_BYTES = 600 * 1024;

const primaryButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const dangerButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer bg-red-700 hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed";

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

function ProfileSection({ user }: { user: UserSafe }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [login, setLogin] = useState(user.login);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    user.photoUrl ?? null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [updateProfile, { isLoading, error, isError }] =
    useUpdateProfileMutation();
  const serverError = isError ? extractServerError(error) : null;

  const dirty = login !== user.login || photoUrl !== (user.photoUrl ?? null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Please pick an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("Image is too large. Max ~600 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    };
    reader.onerror = () => setFileError("Could not read the file.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    if (!dirty) return;

    const payload: { login?: string; photoUrl?: string | null } = {};
    if (login !== user.login) payload.login = login.trim();
    if (photoUrl !== (user.photoUrl ?? null)) {
      payload.photoUrl = photoUrl === null ? null : photoUrl.trim();
    }

    try {
      const response = await updateProfile(payload).unwrap();
      setSuccessMessage(response.message);
    } catch (error) {
      console.error("Update profile failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={() => setFileError("Could not load that image.")}
            />
          ) : (
            <span className="text-3xl opacity-60">
              {user.login.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={secondaryButtonClass}
          >
            Upload from device
          </button>
          <button
            type="button"
            onClick={() => setPhotoUrl(null)}
            disabled={isLoading || photoUrl === null}
            className={secondaryButtonClass}
          >
            Remove photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold opacity-70 mb-2">
          Photo URL
        </label>
        <input
          type="text"
          value={photoUrl && !photoUrl.startsWith("data:") ? photoUrl : ""}
          onChange={(e) => setPhotoUrl(e.target.value || null)}
          disabled={isLoading}
          className={inputClass}
          placeholder="https://example.com/avatar.png"
        />
        {photoUrl?.startsWith("data:") && (
          <p className="mt-1 text-xs opacity-60">
            Currently using an uploaded image. Type a URL above to switch.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold opacity-70 mb-2">
          Change login
        </label>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          disabled={isLoading}
          className={inputClass}
          placeholder="Enter a new login (3-30 characters)"
          maxLength={30}
        />
        <p className="mt-1 text-xs opacity-60">
          If this login is already taken, you will see a notification after
          saving.
        </p>
      </div>

      {(fileError || serverError) && (
        <div className="p-3 text-sm text-red-200 bg-red-900/40 border border-red-500/30 rounded-xl">
          {fileError || serverError}
        </div>
      )}
      {successMessage && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !dirty}
        className={primaryButtonClass}
        style={{ background: "var(--color-fixed)" }}
      >
        {isLoading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

function PasswordSection({
  hasPassword,
  onDone,
}: {
  hasPassword: boolean;
  onDone: () => void;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [setPasswordMutation, { isLoading, error, isError }] =
    useSetPasswordMutation();

  const serverError = isError ? extractServerError(error) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    if (hasPassword && !oldPassword) {
      setFormError("Current password is required.");
      return;
    }

    try {
      const response = await setPasswordMutation(
        hasPassword ? { password, oldPassword } : { password },
      ).unwrap();
      setSuccessMessage(response.message);
      setOldPassword("");
      setPassword("");
      setConfirm("");
      setTimeout(onDone, 1500);
    } catch (error) {
      console.error("Set password failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm opacity-80">
        {hasPassword
          ? "Change your password. You will stay signed in on this device; revoke other sessions from the Sign-in popup if needed."
          : "Set a password so you can also sign in without Google."}
      </p>

      {successMessage && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {successMessage}
        </div>
      )}
      {(formError || serverError) && (
        <div className="p-3 text-sm text-red-200 bg-red-900/40 border border-red-500/30 rounded-xl">
          {formError || serverError}
        </div>
      )}

      {hasPassword && (
        <PasswordField
          label="Current password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          disabled={isLoading}
          placeholder="Current password"
          autoComplete="current-password"
        />
      )}

      <PasswordField
        label="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        placeholder="At least 6 characters"
        autoComplete="new-password"
      />

      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={isLoading}
        placeholder="Repeat new password"
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={isLoading}
        className={primaryButtonClass}
        style={{ background: "var(--color-fixed)" }}
      >
        {isLoading
          ? "Saving..."
          : hasPassword
            ? "Change password"
            : "Set password"}
      </button>
    </form>
  );
}

function DeleteSection({
  hasPassword,
  onDeleted,
}: {
  hasPassword: boolean;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [deleteAccount, { isLoading: isDeleting, error: deleteError }] =
    useDeleteAccountMutation();
  const serverError = extractServerError(deleteError);

  const handleDelete = async () => {
    setFormError(null);
    if (hasPassword && !password) {
      setFormError("Password is required to confirm deletion.");
      return;
    }
    try {
      await deleteAccount(hasPassword ? { password } : {}).unwrap();
      setSuccessNotice("Account deleted. Closing...");
      setTimeout(onDeleted, 1200);
    } catch (error) {
      console.error("Delete account failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 text-sm text-red-100 bg-red-900/40 border border-red-500/30 rounded-xl">
        Deleting your account removes all wallets, transactions and sessions.
        This cannot be undone.
      </div>

      {(formError || serverError) && (
        <div className="p-3 text-sm text-red-200 bg-red-900/40 border border-red-500/30 rounded-xl">
          {formError || serverError}
        </div>
      )}
      {successNotice && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {successNotice}
        </div>
      )}

      {hasPassword ? (
        <PasswordField
          label="Current password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isDeleting || successNotice !== null}
          placeholder="Current password"
          autoComplete="current-password"
        />
      ) : (
        <p className="text-sm opacity-80">
          Your account is signed in via Google. Click delete to remove it
          immediately.
        </p>
      )}

      <button
        type="button"
        disabled={isDeleting || successNotice !== null}
        onClick={handleDelete}
        className={dangerButtonClass}
      >
        {isDeleting ? "Deleting..." : "Delete my account"}
      </button>
    </div>
  );
}
