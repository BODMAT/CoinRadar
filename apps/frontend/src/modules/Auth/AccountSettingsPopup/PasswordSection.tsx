import { useState, type FormEvent } from "react";
import { useSetPasswordMutation } from "../auth.api";
import { PasswordField } from "../PasswordField";
import { extractServerError } from "../auth.utils";

const primaryButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

export function PasswordSection({
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
