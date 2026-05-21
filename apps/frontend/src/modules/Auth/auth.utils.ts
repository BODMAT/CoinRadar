export const extractServerError = (error: unknown): string | null => {
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

export const inputClass =
  "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-(--color-text) transitioned hover:bg-white/20 dark:hover:bg-black/30 placeholder-gray-400";

export const secondaryButtonClass =
  "w-full cursor-pointer py-3 rounded-xl font-semibold text-sm border border-white/20 text-(--color-text) hover:bg-white/10 transition-colors disabled:opacity-60";
