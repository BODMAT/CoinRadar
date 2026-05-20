import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  useLoginUserMutation,
  useRegisterUserMutation,
  useLogoutUserMutation,
  useLogoutAllSessionsMutation,
  useResendVerificationMutation,
} from "./auth.api";
import {
  LoginSchema,
  RegisterSchema,
  type Login,
  type Register,
} from "./auth.schema";
import { useAppDispatch, useAppSelector } from "../../store";
import { closePopup } from "../../portals/popup.slice";

type Stage = "signin" | "signup" | "verifying";
type FormKeys = "login" | "password" | "email";
type FormErrors = Partial<Record<FormKeys, string>>;

const inputClass =
  "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400";

const primaryButtonClass =
  "w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transform active:scale-95 transition-all duration-200 cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-1";

const secondaryButtonClass =
  "w-full cursor-pointer py-3 rounded-xl font-semibold text-sm border border-white/20 text-(--color-text) hover:bg-white/10 transition-colors disabled:opacity-60";

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

export function AuthPopup() {
  const dispatch = useAppDispatch();
  const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://coinradar-wmzg.onrender.com/api/";

  const currentUser = useAppSelector((state) => state.auth.user);

  const [stage, setStage] = useState<Stage>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyLogin, setVerifyLogin] = useState<string>("");
  const [verifyEmail, setVerifyEmail] = useState<string>("");
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const [loginData, setLoginData] = useState<Login>({
    login: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState<Register>({
    login: "",
    password: "",
    email: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [
    loginUser,
    { isLoading: isLoginLoading, error: loginError, isError: isLoginError },
  ] = useLoginUserMutation();
  const [
    registerUser,
    {
      isLoading: isRegisterLoading,
      error: registerError,
      isError: isRegisterError,
    },
  ] = useRegisterUserMutation();
  const [logoutUser, { isLoading: isLogoutLoading }] = useLogoutUserMutation();
  const [logoutAllSessions, { isLoading: isLogoutAllLoading }] =
    useLogoutAllSessionsMutation();
  const [resendVerification, { isLoading: isResendLoading }] =
    useResendVerificationMutation();

  if (currentUser) {
    return (
      <div className="fontText w-full max-w-md mx-auto space-y-5">
        <h2 className="fontTitle text-4xl font-bold text-center drop-shadow-sm">
          Signed in
        </h2>
        <div className="text-center text-sm opacity-80 space-y-1">
          <p>
            Logged in as <strong>{currentUser.login}</strong>
          </p>
          {currentUser.email && (
            <p className="text-xs opacity-70">{currentUser.email}</p>
          )}
        </div>

        <button
          type="button"
          disabled={isLogoutLoading}
          onClick={() => {
            logoutUser();
            dispatch(closePopup());
          }}
          className={secondaryButtonClass}
        >
          {isLogoutLoading ? "Logging out..." : "Log out"}
        </button>

        <button
          type="button"
          disabled={isLogoutAllLoading}
          onClick={() => {
            logoutAllSessions();
            dispatch(closePopup());
          }}
          className={secondaryButtonClass}
        >
          {isLogoutAllLoading
            ? "Logging out everywhere..."
            : "Log out of all sessions"}
        </button>
      </div>
    );
  }

  const isLoginMode = stage === "signin";
  const formData = isLoginMode ? loginData : registerData;
  const setFormData = isLoginMode ? setLoginData : setRegisterData;
  const currentSchema = isLoginMode ? LoginSchema : RegisterSchema;
  const isLoading = isLoginLoading || isRegisterLoading;
  const isError = isLoginError || isRegisterError;
  const currentError = isLoginMode ? loginError : registerError;
  const serverErrorMessage = isError ? extractServerError(currentError) : null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    (
      setFormData as (
        updater: (prev: Login | Register) => Login | Register,
      ) => void
    )((prev) => ({ ...prev, [name]: value }) as Login | Register);

    if (formErrors[name as FormKeys]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const result = currentSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        if (issue.path.length > 0 && !newErrors[issue.path[0] as FormKeys]) {
          newErrors[issue.path[0] as FormKeys] = issue.message;
        }
      }
      setFormErrors(newErrors);
      return;
    }

    try {
      if (isLoginMode) {
        await loginUser(result.data as Login).unwrap();
        dispatch(closePopup());
      } else {
        const registered = await registerUser(result.data as Register).unwrap();
        setVerifyLogin((result.data as Register).login);
        setVerifyEmail(registered.email);
        setStage("verifying");
      }
    } catch (err) {
      // 403 on login means email not verified — switch to the verify screen
      // with the right login pre-filled so resend works.
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        (err as { status: number }).status === 403 &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "requiresVerification" in err.data
      ) {
        const data = err.data as { email?: string };
        setVerifyLogin((result.data as Login).login);
        setVerifyEmail(data.email || "");
        setStage("verifying");
        return;
      }
      console.error("API Error:", err);
    }
  };

  const handleContinueWithGoogle = () => {
    window.location.href = `${BASE_URL}auth/google/start`;
    dispatch(closePopup());
  };

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

  if (stage === "verifying") {
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
            setStage("signin");
            setResendNotice(null);
          }}
          className={secondaryButtonClass}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="fontText w-full max-w-md mx-auto">
      <h2 className="fontTitle text-5xl font-bold mb-8 text-center drop-shadow-sm">
        {isLoginMode ? "Sign In" : "Sign Up"}
      </h2>

      {serverErrorMessage && (
        <div className="mb-6 p-4 text-sm text-center text-red-200 bg-red-900/50 border border-red-500/30 rounded-xl backdrop-blur-sm">
          {serverErrorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative group">
          <label className="block text-sm font-semibold opacity-70 mb-2">
            Login Name
          </label>
          <input
            type="text"
            name="login"
            value={formData.login}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass}
            placeholder="Enter your login name"
          />
          {formErrors.login && (
            <p className="mt-1 text-xs text-red-400 font-semibold ml-1">
              {formErrors.login}
            </p>
          )}
        </div>

        {!isLoginMode && (
          <div className="relative group">
            <label className="block text-sm font-semibold opacity-70 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={registerData.email}
              onChange={handleChange}
              disabled={isLoading}
              className={inputClass}
              placeholder="Enter your email address"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-400 font-semibold ml-1">
                {formErrors.email}
              </p>
            )}
          </div>
        )}

        <div className="relative group">
          <label className="block text-sm font-semibold opacity-70 mb-2">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass}
            placeholder="Enter your password"
          />
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-[2.35rem] p-1 rounded-md opacity-75 hover:opacity-100 hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <path d="M3 3l18 18" />
                <path d="M10.58 10.58a2 2 0 102.83 2.83" />
                <path d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7-1 2.24-2.76 4.14-5 5.31" />
                <path d="M6.61 6.61C4.62 7.85 3.06 9.74 2 12c1.73 3.89 6 7 10 7 1.61 0 3.17-.36 4.61-1.01" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          {formErrors.password && (
            <p className="mt-1 text-xs text-red-400 font-semibold ml-1">
              {formErrors.password}
            </p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={
              primaryButtonClass +
              (isLoading ? " opacity-70 cursor-not-allowed grayscale" : "")
            }
            style={{ background: "var(--color-fixed)" }}
          >
            {isLoading
              ? isLoginMode
                ? "Signing In..."
                : "Registering..."
              : isLoginMode
                ? "Sign In"
                : "Create Account"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleContinueWithGoogle}
          disabled={isLoading}
          className={secondaryButtonClass}
        >
          Continue with Google
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm">
        <p className="opacity-80 inline-block mr-2">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}
        </p>
        <button
          type="button"
          onClick={() => {
            setStage(isLoginMode ? "signup" : "signin");
            setFormErrors({});
          }}
          className="cursor-pointer font-bold text-(--color-text) hover:underline underline-offset-4 decoration-2 decoration-purple-400 transition-all"
        >
          {isLoginMode ? "Register now" : "Sign In"}
        </button>
      </div>
    </div>
  );
}
