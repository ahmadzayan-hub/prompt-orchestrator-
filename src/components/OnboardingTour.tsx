"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

const KEY = "po_onboarding_v1";

/**
 * Three-step onboarding overlay shown once on the first visit to /workspace.
 *
 * Plays well with first-time users without hijacking returning ones — once
 * dismissed (or completed), it never appears again unless the user clears
 * site data. The skip and finish buttons both record completion.
 */
export default function OnboardingTour() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser storage after hydration so the server and initial client render agree.
      if (!seen) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  if (!open) return null;

  const steps: Array<{ titleKey: import("@/lib/i18n/dictionaries").DictKey; bodyKey: import("@/lib/i18n/dictionaries").DictKey; emoji: string }> = [
    { titleKey: "tour.s1.title", bodyKey: "tour.s1.body", emoji: "✍️" },
    { titleKey: "tour.s2.title", bodyKey: "tour.s2.body", emoji: "❓" },
    { titleKey: "tour.s3.title", bodyKey: "tour.s3.body", emoji: "✨" }
  ];
  const last = step === steps.length - 1;
  const cur = steps[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-3xl">{cur.emoji}</span>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wide text-brand-700 dark:text-brand-300 font-semibold">
                {t("tour.step", { n: step + 1, total: steps.length })}
              </div>
              <h2 id="tour-title" className="text-lg font-semibold mt-0.5">{t(cur.titleKey)}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t(cur.bodyKey)}</p>
        </div>

        {/* Step pips */}
        <div className="px-6 pb-3 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                "h-1 rounded-full transition-all " +
                (i === step ? "w-6 bg-brand-600" : "w-1.5 bg-slate-200 dark:bg-slate-700")
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-2 flex items-center justify-between gap-2">
          <button onClick={dismiss} className="btn-ghost text-xs text-slate-500">
            {t("tour.skip")}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="btn-ghost text-xs border border-slate-300 dark:border-slate-700"
              >
                {t("tour.back")}
              </button>
            )}
            <button
              onClick={() => (last ? dismiss() : setStep((s) => s + 1))}
              className="btn-primary text-xs"
            >
              {last ? t("tour.start") : t("tour.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
