"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface Props {
  className?: string;
}

/**
 * Two buttons rolled into one widget:
 *
 *   [Install app]  — appears on Chromium/Edge/Android once the browser fires
 *                    `beforeinstallprompt`. Tapping shows the native install
 *                    sheet. iOS Safari doesn't support that event; we omit
 *                    the button there (PWA install on iOS = "Add to Home
 *                    Screen" from the share sheet, which the user already
 *                    knows).
 *
 *   [Share the app] — uses navigator.share when available (mobile + Safari),
 *                     falls back to copying the URL on desktop. This is the
 *                     "share on every available platform" feature: WhatsApp,
 *                     Telegram, Twitter, Mail, Messages — whatever the OS
 *                     share sheet exposes.
 */
export default function ShareApp({ className }: Props) {
  const t = useT();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: BeforeInstallPromptEvent) {
      e.preventDefault();
      setInstallEvent(e);
    }
    function onInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    // Detect already-installed state (Chrome on Android / Edge on Windows)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Detect standalone browser mode only after hydration.
      setInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const data = {
      title: t("share.title"),
      text: t("share.text"),
      url
    };
    // navigator.share on mobile / iOS Safari → triggers OS share sheet.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(data);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    // Desktop fallback: copy the URL
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(t("share.copied"), url);
    }
  }

  return (
    <div className={"flex items-center gap-1.5 " + (className ?? "")}>
      {installEvent && !installed && (
        <button
          type="button"
          onClick={install}
          className="btn-ghost text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700"
          title={t("install.hint")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">{t("install.button")}</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => void share()}
        className="btn-ghost text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700"
        aria-label={t("share.button")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <span className="hidden sm:inline">{copied ? t("share.copied") : t("share.button")}</span>
      </button>
    </div>
  );
}
