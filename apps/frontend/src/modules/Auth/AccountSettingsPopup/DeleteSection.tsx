import { useState } from "react";
import { useDeleteAccountMutation } from "../auth.api";
import { PasswordField } from "../PasswordField";
import { extractServerError } from "../auth.utils";

const dangerButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer bg-red-700 hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed";

export function DeleteSection({
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
