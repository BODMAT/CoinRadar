import { useState, type ChangeEvent, type FormEvent } from "react";
import { useLoginUserMutation, useRegisterUserMutation } from "../auth.api";
import {
  LoginSchema,
  RegisterSchema,
  type Login,
  type Register,
} from "../auth.schema";
import { PasswordField } from "../PasswordField";
import { useAppDispatch, useAppSelector } from "../../../store";
import { closePopup } from "../../../portals/popup.slice";
import {
  extractServerError,
  inputClass,
  secondaryButtonClass,
} from "../auth.utils";
import { SignedInView } from "./SignedInView";
import { VerifyingStage } from "./VerifyingStage";
import { ForgotPasswordStage } from "./ForgotPasswordStage";

type Stage = "signin" | "signup" | "verifying" | "forgot";
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
  const [verifyLogin, setVerifyLogin] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");

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

  if (currentUser) {
    return <SignedInView user={currentUser} />;
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

  if (stage === "verifying") {
    return (
      <VerifyingStage
        verifyEmail={verifyEmail}
        verifyLogin={verifyLogin}
        onBack={() => setStage("signin")}
      />
    );
  }

  if (stage === "forgot") {
    return <ForgotPasswordStage onBack={() => setStage("signin")} />;
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

        {isLoginMode && (
          <div className="text-right -mt-1">
            <button
              type="button"
              onClick={() => setStage("forgot")}
              className="text-xs opacity-60 hover:opacity-100 hover:underline underline-offset-4 decoration-purple-400 transition-opacity cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        )}

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
