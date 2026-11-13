import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "alag-theme";
const query = () => window.matchMedia("(prefers-color-scheme: dark)");

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(mode: ThemeMode): boolean {
  const dark = mode === "dark" || (mode === "system" && query().matches);
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

/** Light / dark / system. System follows the OS setting live. Choice is saved in localStorage. */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(readStored);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    setDark(apply(mode));
    if (mode !== "system") return;
    const mq = query();
    const onChange = () => setDark(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice just will not persist */
    }
    setModeState(next);
  }, []);

  return { mode, dark, setMode };
}
