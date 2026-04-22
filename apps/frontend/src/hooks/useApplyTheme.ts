import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const useApplyTheme = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", theme === "dark");
    html.classList.toggle("light", theme === "light");
  }, [theme]);
};
