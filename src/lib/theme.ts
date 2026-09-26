import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

export function useThemeMode() {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const t = localStorage.getItem("kh-theme");
      return t === "light" || t === "dark" ? t : "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") delete root.dataset.theme;
    else root.dataset.theme = mode;
    try {
      if (mode === "system") localStorage.removeItem("kh-theme");
      else localStorage.setItem("kh-theme", mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const isDark =
    mode === "dark" || (mode === "system" && typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);

  return { mode, toggle: () => setMode(isDark ? "light" : "dark"), isDark };
}
