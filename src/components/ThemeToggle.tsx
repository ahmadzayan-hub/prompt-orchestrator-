"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

type Theme = "light" | "dark" | "system";
const KEY = "po_theme_v1";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const wantDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", wantDark);
}

function readInitial(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(KEY) as Theme | null;
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* ignore */ }
  return "system";
}

/**
 * Three-state theme toggle: light / dark / system.
 *
 * Persists in localStorage (`po_theme_v1`) and respects the OS preference
 * when set to "system". Listens for OS changes while in system mode so the
 * UI tracks Night Shift / Auto-dark schedules without a refresh.
 */
export default function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readInitial();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser theme after hydration while preserving the initial placeholder.
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);

    // Track OS preference while in "system" mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readInitial() === "system") applyTheme("system");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  function pick(next: Theme) {
    setTheme(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* ignore */ }
    applyTheme(next);
  }

  if (!mounted) {
    // Avoid hydration mismatch on first paint
    return <span className="w-9 h-9 inline-block" aria-hidden="true" />;
  }

  // Cycle order: system → light → dark → system
  const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const label =
    theme === "light" ? t("theme.light") :
    theme === "dark"  ? t("theme.dark")  : t("theme.system");

  return (
    <button
      type="button"
      onClick={() => pick(next)}
      aria-label={`${t("theme.label")}: ${label}`}
      title={`${t("theme.label")}: ${label}`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 hover:border-brand-400 transition text-base"
    >
      <span aria-hidden="true">
        {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🌗"}
      </span>
    </button>
  );
}
