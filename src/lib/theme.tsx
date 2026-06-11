import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "light" | "dark" | "system";
const STORAGE_KEY = "reelflex-theme";

interface ThemeCtx {
  mode: Mode;
  resolved: "light" | "dark";
  setMode: (m: Mode) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function applyClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

function getSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Mode | null)) || "system";
    setModeState(stored);
  }, []);

  useEffect(() => {
    const next = mode === "system" ? getSystem() : mode;
    setResolved(next);
    applyClass(next);
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, mode);

    if (mode === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const r = mq.matches ? "dark" : "light";
        setResolved(r);
        applyClass(r);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [mode]);

  const setMode = (m: Mode) => setModeState(m);
  const toggle = () => setModeState(resolved === "dark" ? "light" : "dark");

  return <Ctx.Provider value={{ mode, resolved, setMode, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
