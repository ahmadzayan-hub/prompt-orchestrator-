"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dict, LOCALES, RTL_LOCALES, type DictKey, type Locale } from "./dictionaries";

interface I18nState {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nState | null>(null);
const COOKIE = "po_locale";

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const fromCookie = document.cookie
    .split("; ")
    .find((p) => p.startsWith(`${COOKIE}=`))
    ?.split("=")[1];
  if (fromCookie && (LOCALES as string[]).includes(fromCookie)) return fromCookie as Locale;
  const fromStorage = localStorage.getItem(COOKIE);
  if (fromStorage && (LOCALES as string[]).includes(fromStorage)) return fromStorage as Locale;
  // Browser language fallback
  const nav = navigator.language || "en";
  if (nav.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // hydrate from storage/cookie/browser on mount
  useEffect(() => {
    const initial = readInitialLocale();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser locale after hydration to keep the initial server/client render consistent.
    setLocaleState(initial);
    applyDirection(initial);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${COOKIE}=${l};path=/;max-age=31536000;SameSite=Lax`;
    localStorage.setItem(COOKIE, l);
    applyDirection(l);
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      const table = (dict as unknown as Record<Locale, Record<DictKey, string>>)[locale];
      let s = table[key] ?? (dict.en as Record<DictKey, string>)[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [locale]
  );

  const dir = (RTL_LOCALES as string[]).includes(locale) ? "rtl" : "ltr";

  const value = useMemo<I18nState>(() => ({ locale, dir, setLocale, t }), [locale, dir, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function applyDirection(l: Locale) {
  if (typeof document === "undefined") return;
  const dir = (RTL_LOCALES as string[]).includes(l) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", l);
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
