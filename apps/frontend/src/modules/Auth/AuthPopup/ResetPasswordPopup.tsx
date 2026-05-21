import { useState, type FormEvent } from "react";
import { useResetPasswordMutation } from "../auth.api";
import { PasswordField } from "../PasswordField";
import { extractServerError } from "../auth.utils";
import { useAppDispatch } from "../../../store";
import { closePopup } from "../../../portals/popup.slice";

const primaryButtonClass =
  "w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transform active:scale-95 transition-all duration-200 cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

interface Props {
  token: string;
}

export function ResetPasswordPopup({ token }: Props) {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [resetPassword, { isLoading, error, isError }] =
    useResetPasswordMutation();

  const serverError = isError ? extractServerError(error) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({ token, password }).unwrap();
      setSuccess(true);
      setTimeout(() => dispatch(closePopup()), 2000);
    } catch {
      // error shown via serverError
    }
  };

  if (success) {
    return (
      <div className="fontText w-full max-w-md mx-auto space-y-4 text-center py-4">
        <div className="text-5xl">✓</div>
        <h2 className="fontTitle text-3xl font-bold drop-shadow-sm">
          Password updated
        </h2>
        <p className="text-sm opacity-80">
          Your password has been reset. You can now sign in with your new
          password.
        </p>
      </div>
    );
  }

  return (
    <div className="fontText w-full max-w-md mx-auto">
      <h2 className="fontTitle text-4xl font-bold mb-2 text-center drop-shadow-sm">
        New password
      </h2>
      <p className="text-sm opacity-70 text-center mb-6">
        Choose a strong password for your account.
      </p>

      {(formError || serverError) && (
        <div className="mb-5 p-4 text-sm text-center text-red-200 bg-red-900/50 border border-red-500/30 rounded-xl backdrop-blur-sm">
          {formError || serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={primaryButtonClass}
            style={{ background: "var(--color-fixed)" }}
          >
            {isLoading ? "Saving..." : "Set new password"}
          </button>
        </div>
      </form>
    </div>
  );
}
