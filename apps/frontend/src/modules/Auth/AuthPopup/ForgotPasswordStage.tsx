import { useState, type ChangeEvent, type FormEvent } from "react";
import { useForgotPasswordMutation } from "../auth.api";
import {
  extractServerError,
  inputClass,
  secondaryButtonClass,
} from "../auth.utils";

interface Props {
  onBack: () => void;
}

export function ForgotPasswordStage({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading, error, isError }] =
    useForgotPasswordMutation();

  const serverError = isError ? extractServerError(error) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      setSent(true);
    } catch {
      // error shown via serverError
    }
  };

  if (sent) {
    return (
      <div className="fontText w-full max-w-md mx-auto space-y-5 text-center">
        <h2 className="fontTitle text-4xl font-bold drop-shadow-sm">
          Check your inbox
        </h2>
        <p className="text-sm opacity-80">
          If an account with <strong>{email}</strong> exists, a password reset
          link is on its way.
        </p>
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="fontText w-full max-w-md mx-auto">
      <h2 className="fontTitle text-5xl font-bold mb-4 text-center drop-shadow-sm">
        Forgot password?
      </h2>
      <p className="text-sm opacity-70 text-center mb-6">
        Enter your email and we'll send you a reset link.
      </p>

      {serverError && (
        <div className="mb-5 p-4 text-sm text-center text-red-200 bg-red-900/50 border border-red-500/30 rounded-xl backdrop-blur-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative group">
          <label className="block text-sm font-semibold opacity-70 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            disabled={isLoading}
            className={inputClass}
            placeholder="Enter your email address"
            autoComplete="email"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transform active:scale-95 transition-all duration-200 cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: "var(--color-fixed)" }}
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </div>

        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back to Sign In
        </button>
      </form>
    </div>
  );
}
