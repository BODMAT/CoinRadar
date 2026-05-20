import { useState, type FormEvent } from "react";
import {
  useSetPasswordMutation,
  useSendOneTimePasswordMutation,
  useDeleteAccountMutation,
  useRequestDeleteAccountMutation,
} from "./auth.api";
import { useAppDispatch, useAppSelector } from "../../store";
import { closePopup } from "../../portals/popup.slice";

type Section = "password" | "otp" | "delete";

const inputClass =
  "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400";

const primaryButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const dangerButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer bg-red-700 hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed";

const secondaryButtonClass =
  "w-full cursor-pointer py-3 rounded-xl font-semibold text-sm border border-white/20 text-(--color-text) hover:bg-white/10 transition-colors disabled:opacity-60";

const tabButtonClass = (active: boolean) =>
  `flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
    active
      ? "bg-purple-600/30 text-white border border-purple-400/40"
      : "text-(--color-text) opacity-70 hover:opacity-100 hover:bg-white/5 border border-transparent"
  }`;

const extractServerError = (error: unknown): string | null => {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data
  ) {
    return String((error.data as { error: unknown }).error);
  }
  return null;
};

export function AccountSettingsPopup() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [section, setSection] = useState<Section>("password");

  if (!currentUser) {
    return (
      <p className="text-center text-sm opacity-80">
        You need to be signed in to manage your account.
      </p>
    );
  }

  const hasPassword = currentUser.hasPassword ?? true;

  return (
    <div className="fontText w-full max-w-md mx-auto space-y-6">
      <div className="text-center text-sm opacity-70">
        Signed in as <strong>{currentUser.login}</strong>
        {currentUser.email && (
          <span className="block text-xs opacity-80">{currentUser.email}</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={tabButtonClass(section === "password")}
          onClick={() => setSection("password")}
        >
          Password
        </button>
        <button
          type="button"
          className={tabButtonClass(section === "otp")}
          onClick={() => setSection("otp")}
        >
          One-time password
        </button>
        <button
          type="button"
          className={tabButtonClass(section === "delete")}
          onClick={() => setSection("delete")}
        >
          Delete account
        </button>
      </div>

      {section === "password" && (
        <PasswordSection
          hasPassword={hasPassword}
          onDone={() => dispatch(closePopup())}
        />
      )}
      {section === "otp" && <OtpSection />}
      {section === "delete" && (
        <DeleteSection
          hasPassword={hasPassword}
          onDeleted={() => dispatch(closePopup())}
        />
      )}
    </div>
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
    } catch {
      // server error surfaces via `error`
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
        <div>
          <label className="block text-sm font-semibold opacity-70 mb-2">
            Current password
          </label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            disabled={isLoading}
            className={inputClass}
            placeholder="Current password"
            autoComplete="current-password"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold opacity-70 mb-2">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className={inputClass}
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold opacity-70 mb-2">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isLoading}
          className={inputClass}
          placeholder="Repeat new password"
          autoComplete="new-password"
        />
      </div>

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

function OtpSection() {
  const [sendOtp, { isLoading, error, isError }] =
    useSendOneTimePasswordMutation();
  const [message, setMessage] = useState<string | null>(null);

  const serverError = isError ? extractServerError(error) : null;

  const handleSend = async () => {
    setMessage(null);
    try {
      const response = await sendOtp().unwrap();
      setMessage(response.message);
    } catch {
      // surfaced via `error`
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-80">
        Sends a one-time password to your email and replaces your current
        password with it. Useful if you signed up with Google and want to log in
        manually, or if you forgot your password while signed in here.
      </p>

      {message && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {message}
        </div>
      )}
      {serverError && (
        <div className="p-3 text-sm text-red-200 bg-red-900/40 border border-red-500/30 rounded-xl">
          {serverError}
        </div>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={handleSend}
        className={primaryButtonClass}
        style={{ background: "var(--color-fixed)" }}
      >
        {isLoading ? "Sending..." : "Send one-time password to my email"}
      </button>
    </div>
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
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const [deleteAccount, { isLoading: isDeleting, error: deleteError }] =
    useDeleteAccountMutation();
  const [requestDelete, { isLoading: isRequesting, error: requestError }] =
    useRequestDeleteAccountMutation();

  const serverError =
    extractServerError(deleteError) || extractServerError(requestError);

  const handleDelete = async () => {
    setFormError(null);
    if (confirmation !== "DELETE") {
      setFormError('Type "DELETE" in the confirmation box to proceed.');
      return;
    }
    if (hasPassword && !password) {
      setFormError("Password is required to confirm deletion.");
      return;
    }
    try {
      await deleteAccount(hasPassword ? { password } : {}).unwrap();
      onDeleted();
    } catch {
      // surfaced via `serverError`
    }
  };

  const handleRequestEmail = async () => {
    setEmailNotice(null);
    try {
      const response = await requestDelete().unwrap();
      setEmailNotice(response.message);
    } catch {
      // surfaced via `serverError`
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

      {emailNotice && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {emailNotice}
        </div>
      )}

      {hasPassword ? (
        <>
          <div>
            <label className="block text-sm font-semibold opacity-70 mb-2">
              Current password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDeleting}
              className={inputClass}
              placeholder="Current password"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold opacity-70 mb-2">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isDeleting}
              className={inputClass}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className={dangerButtonClass}
          >
            {isDeleting ? "Deleting..." : "Delete my account"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm opacity-80">
            Your account has no password (Google sign-in only). We will email
            you a confirmation link — click it to delete. The link expires in 1
            hour.
          </p>
          <button
            type="button"
            disabled={isRequesting}
            onClick={handleRequestEmail}
            className={secondaryButtonClass}
          >
            {isRequesting
              ? "Sending..."
              : "Email me a deletion confirmation link"}
          </button>
        </>
      )}
    </div>
  );
}
