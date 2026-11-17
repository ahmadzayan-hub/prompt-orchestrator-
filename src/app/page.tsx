"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import HeroIllustration from "@/components/HeroIllustration";
import { PenIcon, ChatIcon, SparkleIcon } from "@/components/StepIcons";
import type { TargetModel } from "@/lib/types";

export default function HomePage() {
  const t = useT();
  return (
    <div className="relative overflow-hidden">
      {/* soft gradient bg blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] rounded-full bg-gradient-to-br from-brand-500/20 via-violet-500/10 to-pink-400/10 blur-3xl" />
        <div className="absolute top-40 -right-20 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-gradient-to-br from-amber-200/30 to-rose-200/10 blur-3xl rtl:right-auto rtl:-left-20" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 lg:pt-20 pb-8 sm:pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Copy column */}
          <div className="text-center lg:text-start">
            <UaeBadge />
            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent">
              {t("home.title")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl lg:max-w-none mx-auto lg:mx-0">
              {t("home.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-3">
              <a href="/workspace" className="btn-primary">{t("home.cta.workspace")}</a>
              <a href="/templates" className="btn-ghost border border-slate-300 dark:border-slate-700">{t("home.cta.templates")}</a>
            </div>
            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto lg:mx-0">
              {t("home.origin_long")}
            </p>
          </div>

          {/* Hero illustration column */}
          <div className="order-first lg:order-last">
            <HeroIllustration className="w-full h-auto max-w-md sm:max-w-lg lg:max-w-none mx-auto" />
          </div>
        </div>
      </div>

      {/* How-it-works steps */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <StepCard
            tone="brand"
            icon={<PenIcon className="w-6 h-6" />}
            title={t("home.step1.title")}
            body={t("home.step1.body")}
          />
          <StepCard
            tone="violet"
            icon={<ChatIcon className="w-6 h-6" />}
            title={t("home.step2.title")}
            body={t("home.step2.body")}
          />
          <StepCard
            tone="emerald"
            icon={<SparkleIcon className="w-6 h-6" />}
            title={t("home.step3.title")}
            body={t("home.step3.body")}
          />
        </div>
      </div>

      {/* Concrete examples — landing pads into the workspace */}
      <ExamplesSection />
    </div>
  );
}

function UaeBadge() {
  const t = useT();
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-gradient-to-r from-emerald-50 via-white to-rose-50 dark:from-emerald-900/20 dark:via-slate-900 dark:to-rose-900/20 border border-slate-200 dark:border-slate-700 shadow-sm"
      role="note"
      aria-label="Made in the UAE, free for the world"
    >
      <span aria-hidden="true" className="text-base leading-none">🇦🇪</span>
      <span className="text-slate-700 dark:text-slate-200">{t("home.pill")}</span>
    </span>
  );
}

function ExamplesSection() {
  const t = useT();
  const examples: Array<{
    titleKey: "home.examples.coding.title" | "home.examples.writing.title" | "home.examples.analysis.title";
    bodyKey: "home.examples.coding.body" | "home.examples.writing.body" | "home.examples.analysis.body";
    model: TargetModel;
    tone: "violet" | "sky" | "emerald";
  }> = [
    { titleKey: "home.examples.coding.title",   bodyKey: "home.examples.coding.body",   model: "chatgpt", tone: "violet" },
    { titleKey: "home.examples.writing.title",  bodyKey: "home.examples.writing.body",  model: "chatgpt", tone: "sky" },
    { titleKey: "home.examples.analysis.title", bodyKey: "home.examples.analysis.body", model: "claude",  tone: "emerald" }
  ];

  function tryExample(textKey: typeof examples[number]["bodyKey"], model: TargetModel) {
    const text = t(textKey);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("po_starter", JSON.stringify({ text, model }));
    }
    // Intentional full navigation: the starter text is handed over via sessionStorage.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/workspace";
  }

  // Solid bases in dark mode (slate-800/900 with coloured borders) so body
  // text in slate-100 reads with full contrast. Earlier translucent gradients
  // washed text out on AMOLED screens.
  const toneClass: Record<string, string> = {
    violet:  "from-violet-50 to-violet-100/60 border-violet-200 dark:from-slate-900 dark:to-slate-900 dark:border-violet-600",
    sky:     "from-sky-50 to-sky-100/60 border-sky-200 dark:from-slate-900 dark:to-slate-900 dark:border-sky-600",
    emerald: "from-emerald-50 to-emerald-100/60 border-emerald-200 dark:from-slate-900 dark:to-slate-900 dark:border-emerald-600"
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {t("home.examples.title")}
      </h2>
      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {examples.map((e) => (
          <button
            key={e.titleKey}
            onClick={() => tryExample(e.bodyKey, e.model)}
            className={
              "text-start rounded-xl border bg-gradient-to-br p-4 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-brand-500 " +
              toneClass[e.tone]
            }
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(e.titleKey)}</div>
            <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-100 line-clamp-3 leading-relaxed">{t(e.bodyKey)}</p>
            <span className="mt-3 inline-block text-xs font-semibold text-brand-700 dark:text-brand-200">
              {t("home.examples.try")} →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCard({
  tone,
  icon,
  title,
  body
}: {
  tone: "brand" | "violet" | "emerald";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const tones: Record<string, string> = {
    brand:   "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
    violet:  "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
  };
  return (
    <div className="card hover:shadow-md transition group">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]} group-hover:scale-105 transition`}>
        {icon}
      </div>
      <div className="mt-3 font-medium">{title}</div>
      <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
