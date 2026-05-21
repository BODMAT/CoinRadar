import { useState, type ChangeEventHandler } from "react";

const inputClass =
  "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400";

interface Props {
  name?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  label?: string;
  error?: string;
}

export function PasswordField({
  name,
  value,
  onChange,
  disabled,
  placeholder,
  autoComplete,
  label,
  error,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative group">
      {label && (
        <label className="block text-sm font-semibold opacity-70 mb-2">
          {label}
        </label>
      )}
      <input
        type={visible ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={inputClass}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className={`absolute right-3 ${
          label ? "top-[2.35rem]" : "top-1/2 -translate-y-1/2"
        } p-1 rounded-md opacity-75 hover:opacity-100 hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed transition-colors`}
      >
        {visible ? (
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
      {error && (
        <p className="mt-1 text-xs text-red-400 font-semibold ml-1">{error}</p>
      )}
    </div>
  );
}
