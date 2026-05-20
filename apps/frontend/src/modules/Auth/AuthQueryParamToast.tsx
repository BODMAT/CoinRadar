import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppDispatch } from "../../store";
import { authApi } from "./auth.api";
import { logout } from "./auth.slice";
import { clearWalletState } from "../Wallet/selectedWallet.slice";

type Tone = "success" | "info" | "error";
interface Notice {
  tone: Tone;
  text: string;
}

const MESSAGES: Record<string, Notice> = {
  verified: {
    tone: "success",
    text: "Email verified. You can sign in now.",
  },
  already_verified: {
    tone: "info",
    text: "This email is already verified. Sign in to continue.",
  },
  verify_error: {
    tone: "error",
    text: "Verification link is invalid or expired. Request a new one from the sign-in popup.",
  },
  google_success: {
    tone: "success",
    text: "Signed in with Google.",
  },
  google_error: {
    tone: "error",
    text: "Google sign-in failed. Try again or use email and password.",
  },
  google_pending_merge: {
    tone: "info",
    text: "Check your inbox to confirm linking Google to your account.",
  },
  merge_confirmed: {
    tone: "success",
    text: "Google is now linked. You are signed in.",
  },
  merge_already_done: {
    tone: "info",
    text: "This Google link has already been confirmed. Try signing in.",
  },
  merge_error: {
    tone: "error",
    text: "Could not confirm Google linking. The link may be invalid or expired.",
  },
  account_deleted: {
    tone: "success",
    text: "Account deleted. We won't miss the data, only you.",
  },
  already_deleted: {
    tone: "info",
    text: "This deletion link has already been used.",
  },
  delete_error: {
    tone: "error",
    text: "Could not confirm account deletion. The link may be invalid or expired.",
  },
};

const toneClass: Record<Tone, string> = {
  success: "bg-green-900/80 border-green-500/50 text-green-50",
  info: "bg-purple-900/80 border-purple-500/50 text-purple-50",
  error: "bg-red-900/80 border-red-500/50 text-red-50",
};

export function AuthQueryParamToast() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");
    if (!authParam) return;

    const matched = MESSAGES[authParam];
    if (matched) setNotice(matched);

    if (authParam === "account_deleted") {
      dispatch(logout());
      dispatch(clearWalletState());
      dispatch(authApi.util.resetApiState());
    }

    if (authParam === "merge_confirmed" || authParam === "google_success") {
      dispatch(authApi.util.invalidateTags(["User"]));
    }

    params.delete("auth");
    const next =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", next);
  }, [dispatch]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key="auth-toast"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className={
            "fixed bottom-6 right-6 max-w-sm z-100000 px-5 py-4 rounded-xl border backdrop-blur-md shadow-lg text-sm font-semibold " +
            toneClass[notice.tone]
          }
          role="status"
        >
          {notice.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
