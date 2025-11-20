import { useState, type ChangeEvent, type FormEvent } from "react";

import {
    useLoginUserMutation,
    useRegisterUserMutation,
    useLogoutUserMutation
} from "./auth.api";
import {
    LoginSchema,
    RegisterSchema,
    type Login,
    type Register
} from "./auth.schema";
import { useAppDispatch, useAppSelector, type RootState } from "../../store";
import { closePopup } from "../../portals/popup.slice";

type CombinedFormKeys = 'login' | 'password' | 'email';
type FormErrors = Partial<Record<CombinedFormKeys, string>>;

export function AuthPopup() {
    const dispatch = useAppDispatch();

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [logoutUser] = useLogoutUserMutation();
    const [loginData, setLoginData] = useState<Login>({ login: "", password: "" });
    const [registerData, setRegister] = useState<Register>({ login: "", password: "", email: "" });

    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const [loginUser, { isLoading: isLoginLoading, error: loginError, isError: isLoginError }] = useLoginUserMutation();
    const [registerUser, { isLoading: isRegisterLoading, error: registerError, isError: isRegisterError }] = useRegisterUserMutation();

    // const { data: currentUser } = useGetUserQuery();    
    const currentUser = useAppSelector(state => state.auth.user);

    const formData = isLoginMode ? loginData : registerData;
    const setFormData = isLoginMode ? setLoginData : setRegister;
    const currentSchema = isLoginMode ? LoginSchema : RegisterSchema;
    const currentMutation = isLoginMode ? loginUser : registerUser;

    const isLoading = isLoginLoading || isRegisterLoading;
    const isError = isLoginError || isRegisterError;
    const currentError = isLoginMode ? loginError : registerError;


    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Login | Register) => ({ ...prev, [name]: value }));

        if (formErrors[name as CombinedFormKeys]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        const result = currentSchema.safeParse(formData);

        if (!result.success) {
            const newErrors: FormErrors = {};
            for (const issue of result.error.issues) {
                if (issue.path.length > 0 && !newErrors[issue.path[0] as CombinedFormKeys]) {
                    newErrors[issue.path[0] as CombinedFormKeys] = issue.message;
                }
            }
            setFormErrors(newErrors);
            return;
        }

        try {
            await currentMutation(result.data as Login | Register).unwrap();
            dispatch(closePopup());

        } catch (err) {
            console.error('API Error:', err);
        }
    };

    const serverErrorMessage = isError && currentError && 'data' in currentError
        ? (currentError.data as { error: string })?.error || 'Невідома помилка сервера'
        : null;

    return (
        <div className="fontText w-full max-w-md mx-auto">

            <h2 className="fontTitle text-5xl font-bold mb-8 text-center drop-shadow-sm">
                {isLoginMode ? 'Sign In' : 'Sign Up'}
            </h2>

            {serverErrorMessage && (
                <div className="mb-6 p-4 text-sm text-center text-red-200 bg-red-900/50 border border-red-500/30 rounded-xl backdrop-blur-sm">
                    {serverErrorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

                <div className="relative group">
                    <label className="block text-sm font-semibold opacity-70 mb-2">Login Name</label>
                    <input
                        type="text"
                        name="login"
                        value={formData.login}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 
                                     rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 
                                     text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400"
                        placeholder="Enter your login name"
                    />
                    {formErrors.login && (
                        <p className="mt-1 text-xs text-red-400 font-semibold ml-1">{formErrors.login}</p>
                    )}
                </div>

                {!isLoginMode && (
                    <div className="relative group">
                        <label className="block text-sm font-semibold opacity-70 mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={registerData.email}
                            onChange={handleChange}
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 
                                         rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 
                                         text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400"
                            placeholder="Enter your email address"
                        />
                        {formErrors.email && (
                            <p className="mt-1 text-xs text-red-400 font-semibold ml-1">{formErrors.email}</p>
                        )}
                    </div>
                )}

                <div className="relative group">
                    <label className="block text-sm font-semibold opacity-70 mb-2">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 
                                     rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 
                                     text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400"
                        placeholder="Enter your password"
                    />
                    {formErrors.password && (
                        <p className="mt-1 text-xs text-red-400 font-semibold ml-1">{formErrors.password}</p>
                    )}
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg 
                                      transform active:scale-95 transition-all duration-200 cursor-pointer
                                      ${isLoading ? 'opacity-70 cursor-not-allowed grayscale' : 'hover:shadow-purple-500/30 hover:-translate-y-1'}
                                      `}
                        style={{ background: 'var(--color-fixed)' }}
                    >
                        {isLoading
                            ? (isLoginMode ? 'Signing In...' : 'Registering...')
                            : (isLoginMode ? 'Sign In' : 'Create Account')}
                    </button>
                </div>

                {currentUser && isLoginMode && (
                    <button
                        type="button"
                        className="w-full cursor-pointer py-3 rounded-xl font-semibold text-sm border border-white/20 
                                     text-(--color-text) hover:bg-white/10 transition-colors mt-3"
                        onClick={() => { logoutUser(); dispatch(closePopup()); }}
                    >
                        Log out
                    </button>
                )}
            </form>

            <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm">
                <p className="opacity-80 inline-block mr-2">
                    {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setIsLoginMode(!isLoginMode);
                        setFormErrors({});
                    }}
                    className="cursor-pointer font-bold text-(--color-text) hover:underline underline-offset-4 decoration-2 decoration-purple-400 transition-all"
                >
                    {isLoginMode ? 'Register now' : 'Sign In'}
                </button>
            </div>
        </div >
    );
}