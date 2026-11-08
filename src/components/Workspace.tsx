"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { safeFetch } from "@/lib/safe-fetch";
import {
  detectIntentLocal,
  generateQuestionsLocal,
  reconstructPromptLocal,
  type LocalQuestion
} from "@/lib/local-engine";
import type { TargetModel } from "@/lib/types";
import { apiTargetModel } from "@/lib/api-target-model";
import ModelPicker from "@/components/ModelPicker";
import VoiceInput from "@/components/VoiceInput";
import FileUpload, { type AttachedFile, formatAttachedAsContext } from "@/components/FileUpload";
import FeedbackWidget from "@/components/FeedbackWidget";
import QualityBadge from "@/components/QualityBadge";
import TokenMeter from "@/components/TokenMeter";
import PromptDiff from "@/components/PromptDiff";
import InlineLintHints from "@/components/InlineLintHints";
import LiveSuggestions from "@/components/LiveSuggestions";
import { suggestForDraft } from "@/lib/live-suggestions";
import DomainPicker from "@/components/DomainPicker";
import ModelComparison from "@/components/ModelComparison";
import VariantComparison from "@/components/VariantComparison";
import PromptCard from "@/components/PromptCard";
import StylePackPicker from "@/components/StylePackPicker";
import OnboardingTour from "@/components/OnboardingTour";
import ReverseMode from "@/components/ReverseMode";
import {
  toggleBookmark,
  clearUnstarred
} from "@/lib/local-history";
import { loadDraft, saveDraft, clearDraft } from "@/lib/draft-store";
import type { Intent } from "@/lib/local-engine";
import {
  loadHistory,
  saveHistoryEntry,
  clearHistory,
  removeHistoryEntry,
  type LocalHistoryEntry
} from "@/lib/local-history";

interface PromptVersion {
  id: string;
  version: number;
  target_model: TargetModel;
  final_prompt: string;
  rationale: string | null;
}

interface UIQuestion {
  id: string;
  position: number;
  question: string;
  rationale: string | null;
  required: boolean;
}

interface UISession {
  id: string;
  intent: string;
  intent_confidence: number;
  questions: UIQuestion[];
  source: "cloud" | "local";
}

const INTENT_KEYS: Record<string, DictKey> = {
  coding: "intent.coding",
  writing: "intent.writing",
  research: "intent.research",
  analysis: "intent.analysis",
  planning: "intent.planning",
  creative: "intent.creative",
  design: "intent.design",
  conversation: "intent.conversation",
  image: "intent.image",
  video: "intent.video",
  audio: "intent.audio",
  software: "intent.software",
  website: "intent.website",
  report: "intent.report",
  other: "intent.other"
};

export default function Workspace() {
  const t = useT();
  const { locale } = useI18n();
  const [raw, setRaw] = useState("");
  // model holds either a legacy TargetModel ('chatgpt' | 'claude' | …) or
  // any new model id from the AI_MODELS catalogue ('gpt-5', 'claude-opus-4-7'…).
  const [model, setModel] = useState<string>("gpt-5");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [session, setSession] = useState<UISession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [mode, setMode] = useState<"build" | "reverse">("build");
  const [historyFilter, setHistoryFilter] = useState<"all" | "starred">("all");
  // null = let the engine auto-detect; non-null = user has explicitly locked
  // a domain and we should pass it through to the engine.
  const [forcedIntent, setForcedIntent] = useState<Intent | null>(null);

  // Hydrate a starter dropped from /templates, restore an auto-saved draft,
  // and rehydrate the local history list.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stash = sessionStorage.getItem("po_starter");
    if (stash) {
      try {
        const { text, model: m } = JSON.parse(stash) as { text: string; model: TargetModel };
        setRaw(text);
        if (m) setModel(m);
        clearDraft();
      } catch { /* ignore */ }
      sessionStorage.removeItem("po_starter");
    } else {
      const draft = loadDraft();
      if (draft) {
        setRaw(draft.raw);
        setModel(draft.model);
        setDraftRestored(true);
      }
    }
    setHistory(loadHistory());
  }, []);

  // Auto-save the in-progress draft (debounced so we don't thrash localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      if (raw.trim()) saveDraft({ raw, model });
      else clearDraft();
    }, 500);
    return () => window.clearTimeout(id);
  }, [raw, model]);

  function composedPrompt(): string {
    return raw + formatAttachedAsContext(files, locale);
  }

  const startSession = useCallback(async (quick = false) => {
    setLoading(true); setError(null); setInfo(null); setFinalPrompt(null); setRationale(null);
    const composed = composedPrompt();

    const r = await safeFetch<{ session: { id: string; intent: string | null; intent_confidence: number | null; questions: UIQuestion[]; prompt_versions?: PromptVersion[] }; mode: string }>(
      "/api/sessions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_prompt: composed, target_model: apiTargetModel(model), quick })
      }
    );

    if (r.ok && r.data) {
      const s = r.data.session;
      setSession({
        id: s.id,
        intent: s.intent ?? "other",
        intent_confidence: s.intent_confidence ?? 0,
        questions: s.questions ?? [],
        source: "cloud"
      });
      setAnswers({});
      if (r.data.mode === "quick" && s.prompt_versions?.length) {
        const first = s.prompt_versions[0];
        setFinalPrompt(first.final_prompt);
        setRationale(first.rationale);
        rememberHistory(raw, s.intent ?? "other", model, first.final_prompt);
      }
      setLoading(false);
      return;
    }
    runLocal(quick, composed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, model, files, locale]);

  function runLocal(quick: boolean, composed: string) {
    const detected = detectIntentLocal(composed);
    // User-locked domain trumps auto-detection so the engine produces the
    // right scaffold (e.g. don't fall into "image" when the user explicitly
    // said "writing").
    const effective = forcedIntent
      ? { intent: forcedIntent, confidence: 1 }
      : detected;
    if (quick) {
      const result = reconstructPromptLocal({
        raw: composed, intent: effective.intent, qa: [], targetModel: model, locale
      });
      setSession({
        id: "local",
        intent: effective.intent,
        intent_confidence: effective.confidence,
        questions: [],
        source: "local"
      });
      setFinalPrompt(result.final_prompt);
      setRationale(result.rationale);
      setInfo(locale === "ar" ? "وضع محلي — لا يحتاج إلى اتصال." : "Running locally — no backend needed.");
      rememberHistory(raw, effective.intent, model, result.final_prompt);
      setLoading(false);
      return;
    }
    const questions: LocalQuestion[] = generateQuestionsLocal(composed, effective.intent, locale);
    setSession({
      id: "local",
      intent: effective.intent,
      intent_confidence: effective.confidence,
      questions,
      source: "local"
    });
    setAnswers({});
    setInfo(locale === "ar" ? "وضع محلي — لا يحتاج إلى اتصال." : "Running locally — no backend needed.");
    setLoading(false);
  }

  function rememberHistory(rawText: string, intent: string, target: TargetModel | string, finalText: string) {
    saveHistoryEntry({ raw: rawText, intent, target_model: target, final_prompt: finalText });
    setHistory(loadHistory());
    // Once a prompt is finalised it has been preserved in history; the
    // pending-draft is no longer interesting.
    clearDraft();
  }

  function discardDraft() {
    clearDraft();
    setRaw("");
    setDraftRestored(false);
  }

  async function submitAnswers() {
    if (!session) return;
    setLoading(true); setError(null);
    const composed = composedPrompt();

    if (session.source === "local") {
      const qa = session.questions
        .map((q) => ({ question: q.question, answer: (answers[q.id] ?? "").trim() }))
        .filter((p) => p.answer.length > 0);
      const result = reconstructPromptLocal({
        raw: composed, intent: session.intent as never, qa, targetModel: model, locale
      });
      setFinalPrompt(result.final_prompt);
      setRationale(result.rationale);
      rememberHistory(raw, session.intent, model, result.final_prompt);
      setLoading(false);
      return;
    }

    const payload = Object.entries(answers)
      .filter(([, v]) => v.trim().length > 0)
      .map(([question_id, answer]) => ({ question_id, answer }));
    if (payload.length > 0) {
      await safeFetch(`/api/sessions/${session.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload })
      });
    }
    const r = await safeFetch<{ version: PromptVersion }>(`/api/sessions/${session.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_model: apiTargetModel(model) })
    });
    if (!r.ok || !r.data) {
      const qa = session.questions
        .map((q) => ({ question: q.question, answer: (answers[q.id] ?? "").trim() }))
        .filter((p) => p.answer.length > 0);
      const result = reconstructPromptLocal({
        raw: composed, intent: session.intent as never, qa, targetModel: model, locale
      });
      setFinalPrompt(result.final_prompt);
      setRationale(result.rationale);
      setInfo(locale === "ar" ? "أُكمل الموجِّه محليًا بعد تعذّر الخادم." : "Completed locally after server was unreachable.");
      rememberHistory(raw, session.intent, model, result.final_prompt);
    } else {
      setFinalPrompt(r.data.version.final_prompt);
      setRationale(r.data.version.rationale);
      rememberHistory(raw, session.intent, model, r.data.version.final_prompt);
    }
    setLoading(false);
  }

  function reset() {
    setSession(null); setAnswers({}); setFinalPrompt(null); setRationale(null); setError(null); setInfo(null);
  }

  async function copyFinal() {
    if (!finalPrompt) return;
    try {
      await navigator.clipboard.writeText(finalPrompt);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = finalPrompt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadFinal() {
    if (!finalPrompt) return;
    const blob = new Blob([finalPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `prompt-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function regenerate() {
    // Re-run with the same raw + answers, producing a fresh take.
    if (!session) {
      void startSession(false);
      return;
    }
    setFinalPrompt(null);
    setRationale(null);
    void submitAnswers();
  }

  /**
   * One-tap quality boost.
   *
   * Picks the top-ranked suggestion for the current draft, appends it to
   * the raw input, and re-generates. Effectively "what would push this
   * prompt closer to 100% quality?" answered in a single click.
   */
  function pushItFurther() {
    const next = suggestForDraft(raw, { locale }, 1)[0];
    if (!next) return;
    const append = locale === "ar" ? next.append_ar : next.append_en;
    const after = (raw.trim() + append);
    setRaw(after);
    // Reset the session and regenerate from the augmented input.
    setSession(null);
    setAnswers({});
    setFinalPrompt(null);
    setRationale(null);
    setError(null);
    setInfo(null);
    setTimeout(() => { void startSession(true); }, 50);
  }

  // Voice transcript handler with two modes:
  //   - isFinal=true  → commit the chunk and clear the interim buffer.
  //   - isFinal=false → render this chunk live so the user sees their words,
  //                     but mark it as provisional so the next chunk can
  //                     replace it instead of doubling up.
  const interimBaseRef = useRef<string>("");
  function handleVoice(text: string, isFinal: boolean) {
    if (isFinal) {
      setRaw((cur) => {
        const base = interimBaseRef.current || cur;
        const cleaned = (base ? base.trim() + " " : "") + text.trim();
        interimBaseRef.current = "";
        return cleaned;
      });
    } else {
      setRaw((cur) => {
        // Capture the committed-so-far baseline the first time we see an
        // interim chunk; subsequent interim updates rewrite from there.
        if (!interimBaseRef.current) interimBaseRef.current = cur;
        const base = interimBaseRef.current;
        const sep = base && !base.endsWith(" ") ? " " : "";
        return base + sep + text;
      });
    }
  }

  function restoreFromHistory(entry: LocalHistoryEntry) {
    setRaw(entry.raw);
    if (entry.target_model) setModel(entry.target_model);
    setSession(null);
    setAnswers({});
    setFinalPrompt(null);
    setRationale(null);
    setError(null);
    setInfo(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Cmd/Ctrl+Enter starts with questions; Cmd/Ctrl+Shift+Enter does quick.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== "Enter") return;
      if (raw.trim().length < 3) return;
      e.preventDefault();
      void startSession(e.shiftKey);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [raw, startSession]);

  const beforeStats = useMemo(() => stats(raw), [raw]);
  const afterStats = useMemo(() => (finalPrompt ? stats(finalPrompt) : null), [finalPrompt]);
  const hasOutput = Boolean(finalPrompt || (session && session.questions.length > 0));
  // Live intent preview drives the domain picker + style-pack visibility.
  // If the user has explicitly locked a domain, that wins.
  const detectedIntent = useMemo<Intent>(
    () => (raw.trim().length >= 6 ? detectIntentLocal(raw).intent : "other"),
    [raw]
  );
  const previewIntent: Intent = forcedIntent ?? detectedIntent;

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
      <OnboardingTour />

      {/* Mode toggle: Build (default) or Reverse-analyse */}
      <div className="mb-4 sm:mb-6 inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setMode("build")}
          aria-pressed={mode === "build"}
          className={
            "px-4 py-1.5 rounded-full text-xs font-medium transition " +
            (mode === "build"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900")
          }
        >
          ✍️ {t("mode.build")}
        </button>
        <button
          type="button"
          onClick={() => setMode("reverse")}
          aria-pressed={mode === "reverse"}
          className={
            "px-4 py-1.5 rounded-full text-xs font-medium transition " +
            (mode === "reverse"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900")
          }
        >
          🔍 {t("mode.reverse")}
        </button>
      </div>

      {mode === "reverse" ? (
        <ReverseMode />
      ) : (
      <div className={
        "grid gap-4 sm:gap-6 " +
        (hasOutput ? "lg:grid-cols-2" : "lg:grid-cols-1 lg:max-w-3xl lg:mx-auto")
      }>
        {/* Input column */}
        <section className="card shadow-sm relative overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute -top-6 -right-6 w-24 h-24 sm:w-28 sm:h-28 opacity-20 pointer-events-none rtl:right-auto rtl:-left-6"
            viewBox="0 0 100 100" fill="none"
          >
            <defs>
              <linearGradient id="sp" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
            <path d="M50 5 L58 42 L95 50 L58 58 L50 95 L42 58 L5 50 L42 42 Z" fill="url(#sp)"/>
          </svg>

          {/* Domain picker — surfaces every supported prompt type so the
              platform feels general-purpose, not image-only. */}
          <DomainPicker
            active={previewIntent}
            autoDetected={forcedIntent === null}
            onPick={(next) => setForcedIntent(next)}
            className="mb-3"
          />

          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <label className="text-sm font-medium" htmlFor="po-raw">{t("ws.label.raw")}</label>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {t("ws.stats", { chars: beforeStats.chars, words: beforeStats.words })}
            </span>
          </div>

          <div className="mt-2 relative">
            <textarea
              id="po-raw"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={6}
              className="w-full pe-14 min-h-[140px] sm:min-h-[180px] resize-y"
              placeholder={t("ws.placeholder.raw")}
            />
            <div className="absolute bottom-2 end-2">
              <VoiceInput
                onTranscript={handleVoice}
                onAutoSubmit={() => {
                  // Voice "smart-submit": after the user stops speaking for a
                  // beat, kick off the questions flow automatically.
                  if (raw.trim().length >= 3 && !loading) void startSession(false);
                }}
                onTypeInstead={() => {
                  const el = document.getElementById("po-raw") as HTMLTextAreaElement | null;
                  el?.focus();
                }}
              />
            </div>
          </div>

          <InlineLintHints text={raw} />
          <LiveSuggestions
            text={raw}
            onApply={(appended) => setRaw((cur) => (cur || "") + appended)}
          />
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t("ws.shortcut.hint")}</p>

          {draftRestored && (
            <div className="mt-3 flex items-center gap-2 flex-wrap rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-3 py-2 text-xs" role="status">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15A9 9 0 1 1 5.64 5.64L23 10"/>
              </svg>
              <span className="flex-1">{t("draft.restored")}</span>
              <button
                onClick={discardDraft}
                className="btn-ghost px-2 py-0.5 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                {t("draft.discard")}
              </button>
            </div>
          )}

          <FileUpload files={files} onChange={setFiles} className="mt-4" />
          {files.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t("ws.privacy.files")}</p>
          )}

          {/* Style packs only appear when the user has *explicitly* picked
              the Image domain — auto-detection alone shouldn't make the
              platform look image-focused. */}
          {forcedIntent === "image" && (
            <StylePackPicker
              className="mt-4"
              onPick={(appended) => {
                setRaw((cur) => (cur.trim() + appended));
              }}
            />
          )}

          <ModelPicker value={model} onChange={setModel} className="mt-4" />

          <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {session && (
              <button onClick={reset} className="btn-ghost border border-slate-300 col-span-2 sm:col-span-1">
                {t("ws.btn.new_session")}
              </button>
            )}
            <button
              onClick={() => startSession(true)}
              disabled={loading || raw.length < 3}
              className="btn-ghost border border-slate-300"
            >
              {t("ws.btn.quick")}
            </button>
            <button
              onClick={() => startSession(false)}
              disabled={loading || raw.length < 3}
              className="btn-primary"
            >
              {loading ? t("ws.btn.working") : session ? t("ws.btn.restart") : t("ws.btn.start")}
            </button>
          </div>

          {info && (
            <div className="mt-3 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 p-3 text-sm flex items-start gap-2" role="status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span>{info}</span>
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 p-3 text-sm" role="alert">
              <div className="font-medium">{error.message}</div>
              {error.hint && <div className="text-rose-700 dark:text-rose-300 text-xs mt-1">{error.hint}</div>}
            </div>
          )}

          {/* Local history + saved library — privacy-friendly, browser-only */}
          {!hasOutput && history.length > 0 && (
            <RecentList
              history={history}
              filter={historyFilter}
              setFilter={setHistoryFilter}
              onRestore={restoreFromHistory}
              onRemove={(id) => { removeHistoryEntry(id); setHistory(loadHistory()); }}
              onClear={() => { clearUnstarred(); setHistory(loadHistory()); }}
              onBookmark={(id) => { toggleBookmark(id); setHistory(loadHistory()); }}
            />
          )}
        </section>

        {/* Output column */}
        {hasOutput && (
          <section className="space-y-4 sm:space-y-6">
            {loading && !finalPrompt && <Skeleton />}

            {session && session.questions.length > 0 && !finalPrompt && (
              <div className="card shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm text-slate-500">{t("ws.detected_intent")}</div>
                    <div className="font-medium flex items-center gap-2">
                      <IntentBadge intent={session.intent} />
                      <span className="text-xs text-slate-500">
                        {t("ws.confidence", { percent: Math.round(session.intent_confidence * 100) })}
                      </span>
                    </div>
                  </div>
                  {session.source === "local" && (
                    <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded">local</span>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <div className="text-sm font-medium">{t("ws.questions_title")}</div>
                  {session.questions
                    .sort((a, b) => a.position - b.position)
                    .map((q) => (
                      <div key={q.id}>
                        <label className="block text-sm font-medium" htmlFor={`q-${q.id}`}>{q.question}</label>
                        {q.rationale && <div className="text-xs text-slate-500 mt-0.5">{q.rationale}</div>}
                        <textarea
                          id={`q-${q.id}`}
                          rows={2}
                          className="w-full mt-2"
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((s) => ({ ...s, [q.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  <button onClick={submitAnswers} disabled={loading} className="btn-primary w-full sm:w-auto">
                    {loading ? t("ws.btn.generating") : t("ws.btn.generate")}
                  </button>
                </div>
              </div>
            )}

            {finalPrompt && (
              <>
                <div className="card shadow-sm" role="region" aria-label={t("ws.final_title")}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-medium flex items-center gap-2">
                      <SparkIcon /> {t("ws.final_title")}
                      {session && <IntentBadge intent={session.intent} />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={pushItFurther}
                        disabled={loading || raw.trim().length < 8}
                        title={t("ws.btn.push_hint")}
                        className="btn-primary text-xs"
                      >
                        ✨ {t("ws.btn.push_further")}
                      </button>
                      <button onClick={regenerate} disabled={loading} className="btn-ghost border border-slate-300 dark:border-slate-700 text-xs">
                        <RefreshIcon /> {t("ws.btn.regenerate")}
                      </button>
                      <button onClick={downloadFinal} className="btn-ghost border border-slate-300 dark:border-slate-700 text-xs">
                        <DownloadIcon /> {t("ws.btn.download")}
                      </button>
                      <button onClick={copyFinal} className="btn-ghost border border-slate-300 dark:border-slate-700 text-xs">
                        {copied ? t("ws.copied") : t("ws.btn.copy")}
                      </button>
                      <PromptCard
                        text={finalPrompt}
                        intent={session?.intent ?? null}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <QualityBadge finalText={finalPrompt} rawText={raw} />
                    <TokenMeter text={finalPrompt} model={model} />
                  </div>

                  <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-3 text-sm border border-slate-200 dark:border-slate-700 max-h-[60vh] overflow-auto">
{finalPrompt}
                  </pre>

                  <PromptDiff raw={raw} final={finalPrompt} className="mt-3" />
                  {rationale && (
                    <details className="mt-3 text-sm text-slate-600">
                      <summary className="cursor-pointer">{t("ws.why")}</summary>
                      <p className="mt-2">{rationale}</p>
                    </details>
                  )}

                  <FeedbackWidget
                    sessionId={session?.id ?? null}
                    intent={session?.intent ?? null}
                    targetModel={model}
                    rawLength={raw.length}
                    finalLength={finalPrompt.length}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="card">
                    <div className="text-xs text-slate-500 mb-1">{t("ws.before")}</div>
                    <pre className="whitespace-pre-wrap rounded bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-3 text-sm border border-slate-200 dark:border-slate-700 max-h-60 overflow-auto">
{raw}
                    </pre>
                    <div className="text-xs text-slate-500 mt-2">
                      {t("ws.stats", { chars: beforeStats.chars, words: beforeStats.words })}
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-xs text-slate-500 mb-1">{t("ws.after")}</div>
                    <pre className="whitespace-pre-wrap rounded bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-100 p-3 text-sm border border-emerald-200 dark:border-emerald-800 max-h-60 overflow-auto">
{finalPrompt}
                    </pre>
                    <div className="text-xs text-slate-500 mt-2">
                      {afterStats && t("ws.stats", { chars: afterStats.chars, words: afterStats.words })}
                      {afterStats && (
                        <span className="ms-2 text-emerald-700">
                          {t("ws.added_words", { n: Math.max(0, afterStats.words - beforeStats.words) })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {session && (
                  <>
                    <VariantComparison
                      raw={raw}
                      intent={(session.intent as Intent) ?? "other"}
                      qa={session.questions
                        .map((q) => ({
                          question: q.question,
                          answer: (answers[q.id] ?? "").trim()
                        }))
                        .filter((p) => p.answer.length > 0)}
                      targetModel={model}
                      sessionId={session.id}
                    />
                    <ModelComparison
                      raw={raw}
                      intent={(session.intent as Intent) ?? "other"}
                      qa={session.questions
                        .map((q) => ({
                          question: q.question,
                          answer: (answers[q.id] ?? "").trim()
                        }))
                        .filter((p) => p.answer.length > 0)}
                    />
                  </>
                )}
              </>
            )}
          </section>
        )}
      </div>
      )}
    </div>
  );
}

function stats(s: string) {
  const trimmed = s.trim();
  return { chars: trimmed.length, words: trimmed ? trimmed.split(/\s+/).length : 0 };
}

function IntentBadge({ intent }: { intent: string }) {
  const t = useT();
  const tone: Record<string, string> = {
    coding:       "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    writing:      "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    research:     "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    analysis:     "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    planning:     "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    creative:     "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    design:       "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    conversation: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    image:        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    video:        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    audio:        "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    software:     "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    website:      "bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
    report:       "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
    other:        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
  };
  const key = INTENT_KEYS[intent] ?? "intent.other";
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${tone[intent] ?? tone.other}`}>{t(key)}</span>
  );
}

function Skeleton() {
  return (
    <div className="card shadow-sm" aria-hidden="true">
      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
}

function RecentList({
  history,
  filter,
  setFilter,
  onRestore,
  onRemove,
  onClear,
  onBookmark
}: {
  history: LocalHistoryEntry[];
  filter: "all" | "starred";
  setFilter: (f: "all" | "starred") => void;
  onRestore: (e: LocalHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onBookmark: (id: string) => void;
}) {
  const t = useT();
  const visible = filter === "starred"
    ? history.filter((h) => h.bookmarked)
    : history;
  const starredCount = history.filter((h) => h.bookmarked).length;

  return (
    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-medium">{t("ws.recent")}</h2>
        <div className="flex items-center gap-1">
          {/* All / Starred filter pill */}
          <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              className={
                "px-2.5 py-0.5 rounded-full transition " +
                (filter === "all"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-slate-300")
              }
            >
              {t("ws.recent.tab_all")} · {history.length}
            </button>
            <button
              type="button"
              onClick={() => setFilter("starred")}
              aria-pressed={filter === "starred"}
              className={
                "px-2.5 py-0.5 rounded-full transition " +
                (filter === "starred"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-slate-300")
              }
            >
              ★ {t("ws.recent.tab_starred")} · {starredCount}
            </button>
          </div>
          <button
            onClick={onClear}
            className="btn-ghost text-xs text-slate-500 hover:text-rose-600 px-2 py-1"
            title={t("ws.recent.clear_hint")}
          >
            {t("ws.recent.clear")}
          </button>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {visible.slice(0, 8).map((h) => (
          <li
            key={h.id}
            className="group flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs"
          >
            <button
              type="button"
              onClick={() => onBookmark(h.id)}
              aria-label={t(h.bookmarked ? "ws.recent.unstar" : "ws.recent.star")}
              aria-pressed={!!h.bookmarked}
              className={
                "w-5 h-5 inline-flex items-center justify-center rounded-full transition " +
                (h.bookmarked
                  ? "text-amber-500"
                  : "text-slate-400 hover:text-amber-500")
              }
            >
              <span aria-hidden="true">{h.bookmarked ? "★" : "☆"}</span>
            </button>
            <IntentBadge intent={h.intent ?? "other"} />
            <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{h.raw}</span>
            <button
              onClick={() => onRestore(h)}
              className="btn-ghost px-2 py-0.5 text-xs hover:bg-white dark:hover:bg-slate-800"
            >
              {t("ws.recent.restore")}
            </button>
            <button
              onClick={() => onRemove(h.id)}
              aria-label={t("ws.recent.remove")}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </li>
        ))}
        {visible.length === 0 && filter === "starred" && (
          <li className="text-xs text-slate-500 italic">{t("ws.recent.no_starred")}</li>
        )}
      </ul>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 L13.5 9 L21 12 L13.5 15 L12 22 L10.5 15 L3 12 L10.5 9 Z" fill="url(#sg)"/>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
