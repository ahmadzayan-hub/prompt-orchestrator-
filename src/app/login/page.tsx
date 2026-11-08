"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useT, useI18n } from "@/lib/i18n/I18nProvider";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Magic-link sign-in.
 *
 * The platform is designed to be useful WITHOUT login (everything works
 * locally), so when the host hasn't been provisioned with Supabase env
 * vars we present a friendly explanation rather than a stack trace, with a
 * one-tap shortcut into the workspace's local mode.
 */
export default function LoginPage() {
  const t = useT();
  const { locale } = useI18n();
  // The env helper reads NEXT_PUBLIC_ values that are inlined into the
  // bundle at build time, so it's safe to evaluate synchronously on the
  // first render — both server-side and client-side see the same answer.
  const [available] = useState<boolean>(() => isSupabaseConfigured());
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "invalid_link") {
      setError(t("login.invalid_link"));
    }
  }, [t]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  // Backend-not-configured state: show a clean explanation + workspace link.
  if (!available) {
    const isAr = locale === "ar";
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
        <div className="card mt-6">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-2xl shrink-0">🔒</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "الدخول معطّل في هذا الإصدار" : "Sign-in is off in this build"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {isAr
                  ? "هذه النسخة تعمل بدون خادم خلفي، لذلك تسجيل الدخول معطّل. كل الميزات تعمل محلّيًا في متصفّحك."
                  : "This build runs without a backend, so sign-in is disabled. Every feature still works locally in your browser."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/workspace" className="btn-primary w-full justify-center">
              {isAr ? "افتح مساحة العمل" : "Open the workspace"}
            </Link>
            <Link
              href="/privacy"
              className="block text-xs text-center text-slate-500 dark:text-slate-400 hover:underline"
            >
              {isAr ? "اقرأ سياسة الخصوصية" : "Read the privacy policy"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
      <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{t("login.subtitle")}</p>
      <form onSubmit={send} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.placeholder")}
          className="w-full"
        />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "…" : t("login.btn.send")}
        </button>
        {sent && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("login.sent")}</p>}
        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>
        )}
      </form>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {locale === "ar"
          ? "أو افتح مساحة العمل بدون تسجيل دخول."
          : "Or open the workspace without signing in."}{" "}
        <Link href="/workspace" className="text-brand-700 dark:text-brand-300 hover:underline">
          {locale === "ar" ? "ادخل الآن" : "Continue"}
        </Link>
      </p>
    </div>
  );
}
