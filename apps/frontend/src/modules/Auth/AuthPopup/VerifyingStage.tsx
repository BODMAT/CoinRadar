import { useState } from "react";
import { useResendVerificationMutation } from "../auth.api";
import { secondaryButtonClass } from "../auth.utils";

interface Props {
  verifyEmail: string;
  verifyLogin: string;
  onBack: () => void;
}

export function VerifyingStage({ verifyEmail, verifyLogin, onBack }: Props) {
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendVerification, { isLoading: isResendLoading }] =
    useResendVerificationMutation();

  const handleResend = async () => {
    setResendNotice(null);
    try {
      const response = await resendVerification({
        login: verifyLogin,
      }).unwrap();
      setResendNotice(response.message);
    } catch {
      setResendNotice(
        "Could not resend right now. Please try again in a moment.",
      );
    }
  };

  return (
    <div className="fontText w-full max-w-md mx-auto space-y-5 text-center">
      <h2 className="fontTitle text-4xl font-bold drop-shadow-sm">
        Check your inbox
      </h2>
      <p className="text-sm opacity-80">
        We sent a confirmation link to
        {verifyEmail ? (
          <>
            {" "}
            <strong>{verifyEmail}</strong>.
          </>
        ) : (
          " your email."
        )}{" "}
        Click it to activate your account, then come back to sign in.
      </p>

      {resendNotice && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {resendNotice}
        </div>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={isResendLoading || !verifyLogin}
        className={secondaryButtonClass}
      >
        {isResendLoading ? "Sending..." : "Resend verification email"}
      </button>

      <button
        type="button"
        onClick={() => {
          onBack();
          setResendNotice(null);
        }}
        className={secondaryButtonClass}
      >
        Back to sign in
      </button>
    </div>
  );
}
