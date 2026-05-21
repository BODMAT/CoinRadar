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
import { PasswordField } from "./PasswordField";
import { useAppDispatch, useAppSelector } from "../../store";
import { closePopup } from "../../portals/popup.slice";
import {
  extractServerError,
  inputClass,
  secondaryButtonClass,
} from "./auth.utils";

type Stage = "signin" | "signup" | "verifying";
type FormKeys = "login" | "password" | "email";
type FormErrors = Partial<Record<FormKeys, string>>;

const primaryButtonClass =
  "w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transform active:scale-95 transition-all duration-200 cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-1";

export function AuthPopup() {
  const dispatch = useAppDispatch();
  const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://coinradar-wmzg.onrender.com/api/";

  const currentUser = useAppSelector((state) => state.auth.user);

  const [stage, setStage] = useState<Stage>("signin");
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

        <PasswordField
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Enter your password"
          autoComplete={isLoginMode ? "current-password" : "new-password"}
          error={formErrors.password}
        />

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
