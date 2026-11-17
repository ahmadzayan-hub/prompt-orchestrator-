"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

const KEY = "po_trial_banner_dismissed_v1";

export default function TrialBanner() {
  const t = useT();
  const [hidden, setHidden] = useState(true); // start hidden until we read storage

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser dismissal preference after hydration.
      setHidden(v === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setHidden(true);
  }

  if (hidden) return null;

  const message = t("trial.banner", { email: CONTACT_EMAIL });
  // Build the banner with a clickable email link instead of plain text.
  const parts = message.split(CONTACT_EMAIL);

  return (
    <div className="bg-gradient-to-r from-brand-50 via-violet-50 to-pink-50 dark:from-brand-900/30 dark:via-violet-900/20 dark:to-pink-900/20 border-b border-brand-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
        <span className="inline-flex items-center justify-center rounded-full bg-brand-600 text-white w-5 h-5 text-[10px] font-bold flex-shrink-0">β</span>
        <p className="flex-1 leading-snug">
          {parts[0]}
          <a href={CONTACT_MAILTO} className="text-brand-700 dark:text-brand-300 font-medium hover:underline break-all">
            {CONTACT_EMAIL}
          </a>
          {parts[1] ?? ""}
        </p>
        <button
          onClick={dismiss}
          className="btn-ghost text-xs px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          {t("trial.dismiss")}
        </button>
      </div>
    </div>
  );
}
