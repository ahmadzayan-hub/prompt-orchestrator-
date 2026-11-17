"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ShareApp from "@/components/ShareApp";
import {
  listFor,
  loadPreferred,
  savePreferred,
  type VoiceLocale
} from "@/lib/voice-locales";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

const SMART_SUBMIT_KEY = "po_smart_submit_v1";
const TOUR_KEY = "po_onboarding_v1";

export const dynamic = "force-dynamic";

/**
 * Grammarly-style settings hub.
 *
 * Mirrors the visual structure of the reference screenshot the user shared
 * (Settings • Appearance • Blocked apps • Share feedback • Demo tutorial •
 * Support • Version • Privacy). Each row is a self-contained card so the
 * page works on phone, tablet, and desktop with no horizontal scroll.
 */
export default function SettingsPage() {
  const t = useT();
  const { locale } = useI18n();

  const [voice, setVoice] = useState<VoiceLocale | null>(null);
  const [smartSubmit, setSmartSubmit] = useState(false);

  useEffect(() => {
    setVoice(loadPreferred(locale));
    try {
      setSmartSubmit(window.localStorage.getItem(SMART_SUBMIT_KEY) === "1");
    } catch { /* ignore */ }
  }, [locale]);

  function setVoiceLocale(code: string) {
    const list = listFor(locale);
    const v = list.find((x) => x.code === code);
    if (!v) return;
    setVoice(v);
    savePreferred(locale, v);
  }

  function toggleSmartSubmit() {
    const next = !smartSubmit;
    setSmartSubmit(next);
    try { window.localStorage.setItem(SMART_SUBMIT_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  function replayTour() {
    try { window.localStorage.removeItem(TOUR_KEY); } catch { /* ignore */ }
    // Intentional full navigation so the tour restarts on a fresh workspace load.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/workspace";
  }

  const voiceList = listFor(locale);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-3 sm:space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("settings.subtitle")}</p>
      </header>

      {/* Appearance */}
      <Row icon="🎨" title={t("settings.appearance.title")} body={t("settings.appearance.body")}>
        <ThemeToggle />
      </Row>

      {/* Voice dialect */}
      <Row icon="🗣" title={t("settings.voice.title")} body={t("settings.voice.body")}>
        <select
          aria-label={t("voice.dialect")}
          value={voice?.code ?? ""}
          onChange={(e) => setVoiceLocale(e.target.value)}
          className="text-sm min-w-[180px]"
        >
          {voiceList.map((v) => (
            <option key={v.code} value={v.code}>
              {v.flag} {locale === "ar" ? v.ar : v.en}
            </option>
          ))}
        </select>
      </Row>

      {/* Smart submit */}
      <Row icon="⚡" title={t("settings.smart.title")} body={t("settings.smart.body")}>
        <button
          type="button"
          onClick={toggleSmartSubmit}
          aria-pressed={smartSubmit}
          className={
            "relative w-12 h-6 rounded-full transition border " +
            (smartSubmit
              ? "bg-emerald-500 border-emerald-600"
              : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600")
          }
        >
          <span
            className={
              "absolute top-0.5 inline-block w-5 h-5 rounded-full bg-white shadow transition-transform " +
              (smartSubmit ? "translate-x-6" : "translate-x-0.5")
            }
          />
        </button>
      </Row>

      {/* Privacy */}
      <Row icon="🔒" title={t("settings.privacy.title")} body={t("settings.privacy.body")}>
        <Link
          href="/admin/feedback"
          className="text-xs text-brand-700 dark:text-brand-300 hover:underline"
        >
          {t("settings.privacy.see_data")}
        </Link>
      </Row>

      {/* Share / Install */}
      <Row icon="📤" title={t("settings.share.title")} body={t("settings.share.body")}>
        <ShareApp />
      </Row>

      {/* Demo tutorial */}
      <Row icon="🎓" title={t("settings.demo.title")} body={t("settings.demo.body")}>
        <button onClick={replayTour} className="btn-primary text-xs">
          {t("settings.demo.replay")}
        </button>
      </Row>

      {/* Share feedback */}
      <Row icon="💬" title={t("settings.feedback.title")} body={t("settings.feedback.body")}>
        <a
          href={CONTACT_MAILTO}
          className="btn-ghost border border-slate-300 dark:border-slate-700 text-xs"
        >
          {t("settings.feedback.email")}
        </a>
      </Row>

      {/* Support */}
      <Row icon="🛟" title={t("settings.support.title")} body={t("settings.support.body")}>
        <a
          href={CONTACT_MAILTO}
          className="text-xs text-brand-700 dark:text-brand-300 hover:underline break-all"
        >
          {CONTACT_EMAIL}
        </a>
      </Row>

      {/* Version */}
      <Row icon="ℹ️" title={t("settings.version.title")} body={t("settings.version.body")}>
        <span className="text-xs text-slate-500 tabular-nums">v0.12.0</span>
      </Row>

      {/* Privacy policy */}
      <Row icon="📜" title={t("settings.policy.title")} body={t("settings.policy.body")}>
        <Link
          href="/privacy"
          className="text-xs text-brand-700 dark:text-brand-300 hover:underline"
        >
          {t("settings.policy.read")}
        </Link>
      </Row>
    </div>
  );
}

function Row({
  icon, title, body, children
}: {
  icon: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex items-start gap-3 sm:gap-4">
      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
        <span aria-hidden="true">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{body}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
