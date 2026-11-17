# Changelog

## Unreleased

Security update. No product behaviour changes.

- Next.js 15.5.29 to 16.4.6 with React 19. Next 16 bundles a patched postcss
  (8.5.23), which closes the last high advisory; the production audit now
  reports 0 vulnerabilities. Next 15 bundled postcss 8.4.31 and could not be
  fixed in place.
- Turbopack is now the default bundler (the build compiles with it, no webpack
  config existed). `src/middleware.ts` became `src/proxy.ts` and exports
  `proxy`; the matcher and behaviour are unchanged.
- `next lint` is removed in Next 16. `npm run lint` now runs ESLint 9 with a
  flat config (`eslint.config.mjs`). eslint-plugin-react-hooks 7 adds React
  Compiler rules; `set-state-in-effect` and `immutability` are switched off
  because the CI gate allows no warnings and 13 existing sites
  (localStorage reads after mount) trip them. Re-enable with a refactor PR.
- zod 3.25 to 4.6.7. Clears the zod 3 memory exhaustion advisory on oversized
  constrained collections. No source changes were needed: typecheck, lint, the
  108 existing tests and the production build pass. `uuid()` is stricter in
  zod 4 (RFC 9562 variants only), so all-zero style ids are now rejected at the
  API boundary; `src/lib/zod-contract.test.ts` pins this and the `flatten()`
  error shape the routes return.
  Follow-up: zod 4 also rejects an absent key on a bare `z.unknown()`, so the
  template body schema is `.optional()` to keep accepting requests without
  `body` (the zod 4 upgrade had changed that to a 400).

- Next.js 14.2.15 to 15.5.29. Every 14.x release is affected by the critical
  image optimization remote code execution advisories (GHSA-2464-fhr4-w9xw,
  GHSA-2xp9-vwfh-vxw4) and the Windows-host one (GHSA-p293-qw3h-jr36).
- Next 15 makes `cookies()` and route `params` asynchronous. The server
  Supabase client factory is now async and every call site awaits it. The four
  dynamic API routes await `params`.
- nanoid, ws, source-map-js and postcss updated within their ranges.
- Still open in the production audit, each needing a breaking major: postcss
  bundled inside next (Next 16) and zod 3 memory exhaustion on oversized
  constrained collections (zod 4).

## v0.18.0 — 2026-05-02 — Dark mode polish + real-time expert preamble

The "every page reads cleanly, every prompt is dated" release.

- 🌑 **Dark mode contrast bumped** on every card surface:
  - Home example tiles use solid `slate-900` bases with coloured accent
    borders. Title in `white`, body in `slate-100` — all three (Refactor,
    Tweet, Summarise) now read crisply on AMOLED screens.
  - StepCard body text moved from `slate-300` to `slate-200` and gained
    `leading-relaxed` for breathing room.
- 🔐 **Login page layout fix**:
  - Replaced the cramped vertical stack with a two-column header (lock
    icon + heading + paragraph) so the explanation no longer touches the
    "Open the workspace" button.
  - Wider spacing (`mt-5`), explicit gap between the action button and
    the privacy-policy link.
  - Title in `slate-900 / white`, body in `slate-700 / slate-200`.
- 🅰️ **Wordmark sharpened**:
  - The "ZAI" tri-letter now uses `tracking-wider` so the capital "I"
    sits visibly apart from the following "an" — no more confusion with
    a lowercase "l" in the OS sans-serif.
  - "Studio" gets its own colour layer (`slate-700 / slate-200`) so the
    two-word brand reads at every size.
  - Browser title reordered to "ZAIan Studio — AI Prompt Engineering ·
    زيان ستوديو", so truncation in narrow mobile tabs surfaces the brand
    first.
- 🧠 **Real-time + expert preamble in every prompt**:
  - New `lib/expert-preamble.ts`: pure function that builds a markdown
    block with **today's ISO date** and seven senior-engineer rules
    (think then answer · cite verifiable facts · match user language ·
    refuse to invent · explicit > implicit · surface caveats early ·
    end with the next concrete step).
  - The preamble is **prepended automatically** by `formatPromptFor()`
    for every text/code style (OpenAI, Claude XML, Gemini, Grok,
    DeepSeek, Llama, Mistral, Qwen, Cohere, Copilot-comments,
    Cursor/Replit/v0 spec, Generic). Image/video/audio styles skip it
    so they don't pollute argument-style prompts.
  - The active model name is threaded through, so the preamble can
    address it ("Target model: **Claude Opus 4.7**").
  - Result: every generated prompt is dated **today**, calibrated for
    today's flagship models, and bumped quality across the board.
  - 5 new unit tests for the preamble.
- ✅ **Hard testing**: 96 tests (was 91, +5 preamble), typecheck clean,
  production build clean. Live smoke test: every route returns 200,
  login fallback renders, wordmark uses the sharpened "ZAI" mark.

## v0.17.0 — 2026-05-02 — 100 GB uploads + Vision Reverse mode

The "drop anything in, get the right prompt out" release.

- 📦 **Files up to 100 GB.** Raised the declared cap from 10 MB to 100 GB
  across the platform, mobile, desktop, and the browser extension. The
  platform handles big files honestly, with three tiers:
  - Text-like ≤ 200 KB → full content extracted into the prompt context.
  - Image ≤ 5 MB → inlined as a data URL the AI model can see.
  - Anything bigger → metadata only (filename · size · type), with a
    visible "metadata only" badge on the file chip so the user knows.
  - Human-readable size formatter now ranges KB / MB / GB / TB.
- 🖼 **Vision Reverse mode.** Reverse now has two tabs: **Analyse a
  prompt** (the existing flow) and **From an image** (new). Drop a
  screenshot, design mock, or page, pick one of three actions, and we
  generate a production-grade prompt ready to paste into ChatGPT / Claude
  / Gemini:
  - **📜 Extract written text** — verbatim transcription, preserves
    structure, marks unreadable parts as `[unreadable]`.
  - **🎨 Recreate this design** — component tree, design tokens (colours
    in hex, typography, spacing), implementation plan (React + Tailwind
    for web; SVG for slide/poster), accessibility notes.
  - **✍️ Write similar content** — identifies content type (email, report,
    blog, message), extracts tone + structure, writes a new piece in the
    same shape for the user's scenario.
  - Optional context input ("for a German fintech CTO", "in dark mode")
    is threaded through every generated prompt.
  - Small images embed as data URLs so vision models read them directly;
    larger ones include a clear "drag this into the chat" instruction.
  - Fully bilingual (EN/AR) prompts with localised section labels.
  - 7 new unit tests for the prompt builders.
- ✅ **Hard testing**: 91 tests (was 84), typecheck clean, production
  build clean. Live smoke test: every route returns 200, workspace shows
  the new "100 GB" upload note + Reverse tab, suggest API still works.

## v0.16.0 — 2026-05-02 — ZAIan Studio rename, voice fallback, push-it-further everywhere

The "fix what users actually hit" release.

- 🪪 **Rebranded to ZAIan Studio · زيان ستوديو** across every surface:
  Wordmark, Logo aria-label, page metadata (`<title>`, OG, Twitter,
  JSON-LD), PWA manifest + shortcuts, browser-extension manifest +
  content script, mobile Capacitor `appId` = `com.zaian.studio`,
  desktop Electron `appId` = `com.zaian.studio.desktop` and
  `productName` = `ZAIan Studio`, share-card canvas. Bundle slugs
  changed: `zaian-studio-mobile`, `zaian-studio-desktop`. The English
  "ZAI" tri-letter is rendered in the brand gradient inside the wordmark.
- ✨ **"Push it further" button now everywhere**:
  - **BUILD mode**: already present, kept the same.
  - **REVERSE mode**: the previously-static "What would push this further"
    hint is now a real button. One click takes the strongest available
    suggestion (driven by the same five-dimension quality score), appends
    it to the analysed prompt, re-scores, and shows the **before → after**
    delta inline (`52 → 71/100`).
- 🎙 **Voice recording — stuck-recogniser fallback**:
  - When the recogniser captures audible speech but produces zero
    transcripts for ≥ 8 s (the failure mode reported by users on Samsung
    Internet / Chrome Android with non-English dialects), we now silently
    restart it with `lang="en-US"`, the universally-supported STT locale.
  - If recognition still fails, a prominent **"Type instead"** button
    appears in the live-transcript popover. Clicking it stops the
    recogniser and focuses the textarea so the user keeps moving.
  - The popover is no longer `pointer-events-none` — its buttons now
    actually click.
- ✅ **Hard testing**: 84/84 tests, typecheck clean, production build
  clean. Live smoke test: 10 routes return 200, manifest + HTML show only
  the new brand strings, suggest API still works in EN + AR.

## v0.15.0 — 2026-05-02 — 40+ models, per-model prompt engineering, push-it-further

The "right prompt for the right model" release.

- 🧠 **40+ frontier AI models catalogued** in `lib/ai-models.ts` and exposed
  through a grouped picker in the workspace. Five families:
  - **Text & reasoning**: GPT-5, GPT-5 Mini, GPT-4.1, Claude Opus 4.7,
    Sonnet 4.6, Haiku 4.5, Gemini 3 Pro, Gemini 3 Flash, Grok 4,
    DeepSeek R1, DeepSeek V3.5, Llama 4 Instruct, Mistral Large 2.1,
    Qwen 3 Max, Cohere Command R+, Reka Core, Generic.
  - **Code & app builders**: Cursor, GitHub Copilot, Replit Agent,
    Lovable, Bolt.new, v0, Codestral.
  - **Image**: Midjourney v7, Flux 2 Pro, SDXL 3, DALL·E 4, Ideogram v3,
    Imagen 4, Recraft v3, Nano Banana Pro.
  - **Video**: Sora 2, Veo 3, Runway Gen-4, Kling 2.5, Pika 2.5,
    Luma Ray 2, Hailuo 2, Seedance.
  - **Audio**: Suno v5, Udio v2, ElevenLabs v3.
  Each entry has a real context window, a vendor, multimodal flag,
  flagship marker, and a one-line "good at" note shown under the picker.
- ✍️ **Per-model prompt formatters** in `lib/model-formatters.ts`. 30
  distinct prompt styles, each tuned to its target's idioms:
  - `openai-system` — System + Task + Context + Format + Success.
  - `claude-xml` — `<role>/<context>/<task>/<format>` blocks.
  - `gemini-multimodal` — JSON-friendly with structured output guidance.
  - `grok-realtime` — leads with "use real-time data", date-stamps claims.
  - `deepseek-reason` — step-by-step reasoning chain mandatory.
  - `llama-instruct` — `[INST] ... [/INST]` markers.
  - `midjourney-args` — `--ar 16:9 --style raw --s 250 --v 7`.
  - `sdxl-tags` — comma-separated tags + Negative prompt + DPM++ params.
  - `flux-natural`, `dalle-natural`, `ideogram-typo`, `imagen-natural`,
    `recraft-vector`, `nano-banana`.
  - `sora-shotlist` — numbered shot list with camera + duration.
  - `veo-natural`, `runway-cinematic`, `kling-shotlist`, `pika-natural`,
    `luma-natural`, `hailuo-natural`, `seedance-natural`.
  - `music-prompt` — Genre / Mood / Tempo / Structure / Lyrics.
  - `tts-elevenlabs` — `<voice>` and `<emotion>` tags.
  - `code-comments` (Copilot) and `code-spec` (Cursor / Replit / v0).
  18 new unit tests for the formatter dispatcher.
- ✨ **"Push it further" button** on every final-prompt card. One tap:
  picks the strongest improvement for the current draft (driven by the
  same five-dimension quality score), appends the corresponding markdown
  block, and re-engineers the prompt. Lets the user climb toward 100%
  quality with a single click instead of editing manually.
- 🛠 **Workspace streamline**: replaced the 5-option `<select>` with the
  grouped, searchable model picker. Bumped the legacy `chatgpt|claude|
  copilot|gemini|generic` defaults to `gpt-5` so new users get the most
  capable model out of the box. The legacy strings still work end-to-end
  through `resolveModel()` for backward compat.
- 📏 **TokenMeter understands every model**: looks up context window from
  the catalogue (e.g. 1M for GPT-4.1, 2M for Gemini 3 Pro, 500k for
  Claude Opus 4.7) and renders the bar accordingly. Also gained dark
  mode for emerald/amber/rose tints.
- ✅ **Hard testing**: 84 tests pass (was 66, +18 model-formatter tests),
  typecheck clean, production build clean. Live `next start` smoke test:
  every route returns 200, suggest API works EN+AR, enhance correctly
  401s without auth.

## v0.14.0 — 2026-05-02 — Privacy, /learn, desktop, voice fix mobile, em-dashes out

The "polish + reach" release.

- 📜 **Real privacy policy page** at `/privacy`, fully bilingual (EN/AR).
  Plain-language sections covering what stays on the device, what reaches
  our server, what we never do, the user's rights, and contact. Linked
  from the footer, settings, and login fallback.
- 🔓 **Login graceful fallback**: when Supabase env vars are missing on
  the deploy, the login page no longer surfaces a stack trace. Instead
  it shows a clean card explaining sign-in is off in this build, with a
  one-tap link into the local-mode workspace.
- 🎙 **Voice fix for mobile**: Samsung Internet, Chrome on Android, and
  some iOS Safari builds break under `continuous: true`. We now run
  `continuous: false` on mobile UAs with transparent auto-restart on
  `onend`, which matches the desktop UX while actually working on phones.
  The live transcript popover and "no speech detected" diagnostic from
  v0.13 stay; together they make the voice loop reliable.
- 🇪🇬 **Egyptian dialect already first** (from v0.13). Default fallback
  remains `ar-EG` for the broadest mobile recogniser coverage.
- ✂️ **Em-dashes removed** from every user-visible string. The Python
  pass replaces ` — ` with `,` (or `:` where it served as a label
  introduction) across i18n + engine + suggestion templates. AR strings
  use the Arabic comma (`،`). Net effect: the platform stops looking
  AI-authored.
- 🎓 **`/learn` page** with eight curated open YouTube courses on prompt
  engineering: Anthropic interactive tutorial, DeepLearning.AI × OpenAI,
  freeCodeCamp 5h course, Karpathy LLM deep-dive, Google Gemini Cookbook,
  Microsoft Reactor, plus multimodal + tools/agents. Filtered by level
  (beginner / intermediate / advanced) with search across topics.
- ✨ **Tagline rewrite**: home subtitle now leads with "We re-engineer
  your prompts professionally" instead of "We detect your intent".
- 🌙 **Dark-mode contrast bump on example cards**: the lighter `/30 → /10`
  gradients couldn't carry body text on Samsung dark mode. Switched to
  `*-950 → slate-900` solid bases with brighter title (`slate-50`) and
  body (`slate-200`) so every card is readable at a glance.
- 🖥 **Desktop app** scaffolded under `desktop/` (Electron 31). Native
  menus, `Cmd/Ctrl+Shift+P` global shortcut, system-tray-friendly,
  external links open in the OS browser, sandbox + contextIsolation on
  for security. Builds .dmg / .nsis / .AppImage / .deb. Full docs at
  `docs/DESKTOP.md`.
- 🦊 **Extension cross-browser**: extension/manifest.json gained
  `browser_specific_settings.gecko` (Firefox 115+) and `options_ui`
  (Firefox-correct), bumped version to 0.14.0.
- 📱 **Mobile bumped** to 0.14.0 (Capacitor v6 still latest stable);
  the iOS keyboard-extension architecture remains documented in
  `docs/MOBILE-SUGGESTIONS.md`.
- ✅ **Hard testing**: typecheck, 66/66 tests, production build all
  green. Live `next start` walk: 23 routes return 200 (added /privacy
  and /learn). Login fallback now renders synchronously on first paint.

## v0.13.0 — 2026-05-02 — Brand rename, dark mode, voice fix, domain picker

The "feels right end-to-end" release.

- 🪪 **Renamed to PromptsZAIan** (single word, "ZAI" rendered in the brand
  gradient). Arabic stays **موجة زيان**. Updated everywhere: dictionary,
  layout metadata, OG/Twitter, JSON-LD, PWA manifest + shortcuts, browser
  extension manifest + content script, mobile Capacitor config, share-card
  canvas. Bundle id is now `com.zaian.promptszaian`.
- 🌙 **Dark mode rebuilt**:
  - Hero title used a slate-900 → slate-900 gradient that turned invisible
    on the dark background — now flips to a white → slate-100 → white
    gradient in dark mode.
  - HeroIllustration's hard-coded `#fff` rectangles and `#cbd5e1` lines
    moved into CSS classes (`.hi-*`) with proper dark variants in
    `globals.css` so the illustration adapts cleanly.
  - Every `pre` block in the workspace (final prompt + before/after
    panels) now has dark backgrounds, dark borders, light text.
  - Trial banner, footer, draft-restored strip, info/error banners,
    skeletons, and the IntentBadge tone map all gained `dark:` variants.
  - Quick spot-check on every visible surface — no more invisible text.
- 🎙 **Voice recording — actually working feedback**:
  - Added a **live transcript popover** that floats above the mic button
    while listening, showing exactly what the recogniser is hearing in
    real time (interim results stream in immediately).
  - Added a **"no speech detected" diagnostic** that pops up after 5 s of
    audio without any words, telling the user to try a different dialect.
  - Both states give the user clear visible proof the recogniser is
    alive, fixing the "I speak but nothing happens" failure mode.
- 🇪🇬 **Egyptian dialect first**: reordered the Arabic voice list to put
  🇪🇬 ar-EG at index 0 (also the default fallback). Added 🇵🇸 Palestine
  and 🇸🇩 Sudan. Total: 18 Arabic dialects.
- 🧰 **Domain picker = de-bias from "image-only"**: added a horizontal
  pill strip above the textarea with all 15 prompt domains visible at
  once (Writing, Coding, Software, Website, Research, Analysis, Report,
  Planning, Creative, Design, Image, Video, Audio, Conversation, Other).
  Auto-detects from the user's text, but a manual pick locks the intent
  and overrides detection. The image style packs now appear *only* when
  the user has explicitly locked the Image domain — no more accidental
  image-flavoured output.
- ✅ **Hard testing**: typecheck, 66 tests, production build all green.
  Live smoke test against `next start`: every public route returns 200,
  Arabic + English suggest API works, malformed JSON correctly returns
  400, unauth `/api/v1/enhance` correctly returns 401, manifest +
  sitemap + robots all serve the right content.

## v0.12.0 — 2026-05-01 — Real-time suggestions everywhere

The "Grammarly for AI prompts" release.

- 🤖 **`/api/v1/suggest`** — anonymous, fast, pure-function endpoint that
  returns 1-3 context-aware suggestion chips for any draft. No LLM
  round-trip; runs in single-digit ms. Feeds every other suggestion
  surface in the platform.
- ✨ **In-app live suggestions** — Grammarly-style chip strip above the
  workspace textarea. Debounced 250 ms, suggestions are *additions* the
  user can apply with one tap (never replace their text), and dismissed
  chips don't return for the same session.
- 🧩 **Browser extension v0.12** — content script now injects a floating,
  draggable suggestion bubble on ChatGPT, Claude, Copilot, and Gemini
  composers. Identical UX to Grammarly's grammar bubble, but for prompt
  quality. Toggleable from the extension options page (host URL, locale,
  live-suggestions on/off). The classic ✨ Enhance button stays.
- 📲 **PWA Web Share Target** — manifest declares `share_target` so once
  the PWA is installed (Android Chromium / Edge), users get a "Share to
  ZAI@n" entry in the system share sheet. Inbound text routes to a new
  `/share` page that pre-loads the workspace.
- ⚙️ **Settings page** at `/settings` — a Grammarly-inspired hub with
  rows for Appearance / Voice dialect / Smart submit / Privacy / Share
  & Install / Demo tutorial / Share feedback / Support / Version /
  Privacy policy. Each row is a self-contained card.
- 🎓 **Re-runnable demo tutorial** — Settings → Demo tutorial clears the
  onboarding flag and reopens the workspace so the 3-step tour replays.
- 🔌 **Supabase MCP server** — `.mcp.json` shipped at repo root with the
  project's `mcp.supabase.com` HTTP transport pre-wired, so collaborators
  on Claude Code automatically get the Supabase MCP after running
  `claude /mcp` once to authenticate.
- 📱 **Native mobile architecture doc** — `docs/MOBILE-SUGGESTIONS.md`
  — full design for the iOS Custom Keyboard Extension and the Android
  Floating Bubble + IME, all targeting the same `/api/v1/suggest`
  contract. Privacy commitment included.
- ✅ **Quality**: 66 tests (was 59), typecheck, production build all pass.
  Zero failures. New routes generated: `/settings`, `/share`,
  `/api/v1/suggest`.

## v0.11.0 — 2026-05-01 — Reverse mode, A/B, library, admin

The "every idea on the roadmap, shipped" release — all ten v0.11 ideas plus
patterns drawn from PromptHero studies (visual style packs, saved library,
template categories).

- 🔍 **Reverse mode**: paste a polished prompt and learn why it works. Pure
  local analyser (`lib/reverse-analyzer.ts`) returns intent, quality
  breakdown, structural skeleton, strengths list, and one specific
  improvement target. Build / Reverse toggle at the top of the workspace.
- 🎓 **Onboarding tour**: dismissible 3-step intro on first visit.
- ⚡ **Voice-to-final smart submit**: opt-in toggle (⚡ button next to mic).
  When the user stops speaking for 2.5 s and the recogniser has captured a
  final transcript, the workspace auto-generates the prompt. Persisted in
  localStorage.
- 🛡 **Anti-hallucination guardrails**: a five-rule "Trust & accuracy"
  block is now appended to every report and research scaffold (cite
  verifiable sources only / distinguish facts from inferences / mark
  speculation / quote with source / acknowledge gaps). Both EN and AR.
- 🖼 **Shareable PNG cards**: render the final prompt as a 1200×1500
  branded image, downloadable or shareable via the OS share sheet
  (uses `navigator.share({ files })` where supported).
- ⚖️ **A/B variant comparison**: alongside the multi-model comparison,
  generate Concise + Detailed versions of the same prompt. The user picks
  the winner, choice posts to `/api/feedback` with
  `comment: "variant_winner: concise|detailed"` so the platform learns
  which length lands better per intent.
- ⭐ **Saved prompts library** (PromptHero-inspired): each history item now
  has a star toggle. New All / Saved tabs filter the list. "Clear" only
  removes un-starred items so the user's library survives.
- 🎨 **Image style packs** (PromptHero-inspired): 10 curated visual styles
  — Cinematic, Editorial, Anime, Oil, Cyberpunk, Minimalist, 3D Render,
  Vintage Film, Watercolor, Pixel Art — each one click appends a
  battle-tested set of modifiers. Picker auto-shows when the prompt is
  detected as `image` or `design`.
- 📊 **Admin feedback dashboard**: `/admin/feedback` with KPI cards,
  by-intent and by-model bar charts, top complaint tags, locale split,
  and the latest 20 rows. Reads from `/api/admin/feedback` which trusts
  Supabase RLS to gate access to org owners/admins.
- 🧩 **Browser extension polished**: rebranded to Prompt ZAI@n, MV3 hotkey
  Alt+P added, contextMenus permission for future right-click integration,
  full README with install + packaging instructions.
- 🔌 **Public API v1**: stable `/api/v1/enhance` endpoint (POST, bearer
  API key) for third-party integrations. Returns `api_version: "v1"` so
  callers can branch on schema changes safely. Existing
  `/api/extension/enhance` kept for backward compat.
- ✅ **Quality**: 59 tests (was 54), typecheck, production build all pass.

## v0.10.0 — 2026-05-01 — Multi-domain, professional voice, mobile

The "every kind of prompt, on every device" release.

- 🎙 **Voice recording rebuilt for real-world use**:
  - Explicit `getUserMedia` pre-flight so the browser's microphone prompt
    appears immediately and clearly. No more silent failures.
  - Live audio-level meter (RMS off the analyser node) → users can *see* the
    mic is working as they speak.
  - Interim transcripts are now streamed to the textarea — words appear as
    spoken, then commit when finalised. Final results replace interims
    cleanly so nothing duplicates.
  - Distinct error states for "denied", "no device", "unsupported", etc.,
    with actionable messages.
  - Continues recording across silence pauses; only stops when the user
    explicitly stops.
- 🖼 **Multi-domain prompt orchestration** — six new specialised intents
  with their own clarifying questions and output scaffolds:
  - **Image** (Midjourney/SDXL/Flux/DALL·E): subject + style + lighting +
    composition + negative prompt + diffusion params
  - **Video** (Runway/Sora/Pika/Veo): duration, aspect ratio, shot list,
    voice-over, music, hook + CTA
  - **Audio** (ElevenLabs/Suno/Udio): format, voice character, pacing,
    music & SFX cues, deliverable spec
  - **Software**: platform, stack, MVP features, data model, auth,
    acceptance tests, explicit out-of-scope
  - **Website**: purpose, page outline, hero copy, visual system,
    components, breakpoints, A11y, SEO
  - **Report**: executive summary, methodology, findings, recommendations,
    risks, references — decision-grade structure
  - 15 new unit tests for intent detection + reconstruction.
- ⚖️ **Side-by-side model comparison**: one click generates the same prompt
  formatted for ChatGPT, Claude, and Gemini in parallel cards with token
  estimates so the user can pick the best fit. All local, instant.
- 🌗 **Dark mode**: three-state toggle (light / dark / system), persisted
  in localStorage, applied before first paint to avoid a flash. Tracks
  OS preference live in system mode. Tailwind `darkMode: "class"`, dark
  variants on every surface.
- 💡 **Inline lint hints** under the textarea — at most two chips at a time
  ("Add audience", "Specify format", "Mention what to avoid") that appear
  only when the prompt actually needs them. A green "looking good" when
  the prompt is healthy.
- 📲 **Share + Install**: Web Share API integration for one-tap sharing on
  WhatsApp, Telegram, X, Mail, Messages, AirDrop — anywhere the OS share
  sheet exposes. Native PWA install button appears on Chromium/Android
  when the browser fires `beforeinstallprompt`.
- 🍎 **iOS native shell** (Capacitor scaffolded): full mobile/README.md
  with iOS + Android build instructions, microphone permission setup,
  share-sheet integration. Bundle id rebrand to `com.zaian.promptzaian`.
  Android shell remains supported and now compatible with API 22+ (≈99%
  of devices). Both shells share the live web app for instant updates.
- ✅ **Quality**: 54 tests (was 39), typecheck, production build all pass.

## v0.9.0 — 2026-05-01 — Dialects, token budget, drafts, diff

The "tangible value per session" release.

- 🇦🇪🇪🇬🇸🇦 **Voice dialect picker with country flags**: replaces the old MSA default. Arabic users see 🇦🇪 الإمارات (default), 🇸🇦 السعودية, 🇪🇬 مصر, 🇰🇼, 🇶🇦, 🇧🇭, 🇴🇲, 🇯🇴, 🇱🇧, 🇸🇾 الشام, 🇮🇶, 🇾🇪, 🇲🇦, 🇩🇿, 🇹🇳, 🇱🇾. English users see 🇺🇸/🇬🇧/🇦🇺/🇨🇦/🇮🇳. Selection persists in localStorage. Picker is a 36×36 button right next to the mic — flag-first, scannable.
- 📏 **Token-budget meter**: every final-prompt card now shows estimated tokens (low–mid–high) against the active model's context window (Generic 8k, ChatGPT 128k, Claude 200k, Copilot 64k, Gemini 1M). Colour-coded: emerald = fits, amber = getting full, rose = trim before sending. Pure-function estimator with 11 unit tests; honest ±15% range so users see uncertainty rather than false precision.
- 💾 **Auto-save drafts**: raw prompt + target model are saved to localStorage on every keystroke (debounced 500 ms, 7-day TTL). On reload, the workspace shows a soft amber "Draft restored" strip with a "Discard" button. Completing or abandoning a session clears the draft.
- 🔍 **Before/after diff viewer**: collapsible card under the final prompt, highlighting in emerald the lines the orchestrator added. Line-level LCS — pure function, 4 unit tests, bounded so a 5k-line input still renders instantly.
- ✅ **Quality**: 39 tests (was 24), typecheck, production build all pass. Zero failures.

## v0.8.0 — 2026-05-01 — Brand identity + sharper learning loop

The "Prompt ZAI@n / موجة زيان" release.

- 🪪 **New brand**: the platform is now **Prompt ZAI@n** in English and **موجة زيان** in Arabic. Wordmark component shows the active form prominently with the other form as a small subtitle so both audiences recognise it. Logo, manifest, page titles, OG/Twitter metadata, JSON-LD schema, app-name keys all updated. PWA install name = "ZAI@n".
- 🇦🇪 **"Made in UAE — free for the world"** is now visible on every page: a soft gradient pill above the hero, a one-paragraph note under the CTAs, and a refreshed footer line. The trial banner reinforces it.
- 📊 **Prompt-quality score (0-100)** with a 5-dimension breakdown — clarity, specificity, structure, audience, format. Renders as a circular gauge + horizontal bars on every final-prompt card, with a "+Δ vs your raw input" delta so users see the value the orchestrator added at a glance. Pure-function scorer in `lib/quality-score.ts`, fully unit-tested (6 new tests).
- 🎯 **Two-step feedback**: when a user thumbs-down, six reason chips appear (too long / too short / off-topic / bad format / wrong tone / wrong language) plus an optional note. Tags are stored alongside the rating, giving the learning loop a much sharper signal than a binary rating alone.
- 🏠 **Home empty-state polish**: three concrete example cards under the hero ("Refactor a slow component", "Marketing tweet", "Summarise a topic"). Tapping any card pre-loads the workspace with that prompt + the right target model.
- 🔍 **SEO**: new JSON-LD WebApplication schema published in the page head — `countryOfOrigin: UAE`, `isAccessibleForFree: true`, multilingual, free offer.
- ✅ **Quality**: 24 tests (was 18), typecheck, production build all pass.

## v0.7.0 — 2026-05-01 — Phase-1 public trial

The "real-time learning loop" release.

- 📥 **Feedback widget + `/api/feedback`**: thumbs up/down + optional note on every generated prompt. Anonymous-friendly. Persists to a new `feedback` table when Supabase is configured (`0002_feedback.sql` migration), logs to console otherwise so the UI never blocks. The team can read aggregate signal in real time and steer the engine — this is the learning loop for the public trial.
- 🕘 **Anonymous local history**: every browser keeps its last 20 prompts in `localStorage`, with quick "Restore" / "Remove" / "Clear". Non-logged-in users now get a real history experience without any backend.
- ✉️ **Contact**: `ahmad.zaian@outlook.com` is now visible in the footer, in a dismissible public-trial banner at the top of every page, and as a single-source-of-truth `lib/contact.ts` for site-wide reuse.
- ⌨️ **Power-user UX**: Cmd/Ctrl+Enter starts a session, +Shift does quick-enhance. New "Regenerate" and "Download .md" buttons on the final card. Skip-to-content link, focus-visible rings, ARIA roles on alerts/status, label–for/id wiring on every input. Loading skeleton replaces the bare disabled state.
- 🌍 **i18n polish**: intent badges now translate (coding/writing/research/analysis/planning/creative/design/conversation/other) so the Arabic UI is end-to-end Arabic. New strings for feedback, contact, history, trial banner.
- 🛡 **Operational hardening**: `next.config.mjs` adds X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS to every response. Open-Graph + Twitter cards for social shares. `robots.txt` + `sitemap.xml` for indexing. Privacy note on file uploads.
- ✅ **Quality**: 18 tests, typecheck, production build all pass. Zero failures.

## v0.6.0 — 2026-05-01

The "zero-fail Vercel functions" release.

- 🛡 **Vercel functions zero-fail**: every API route is now wrapped in `safeRoute`, which detects "backend not configured" (the default state on a free-tier Vercel deploy without Supabase) and returns `200 { unavailable: true }` instead of a 5xx. The 48.5% error rate observed on Vercel Observability is fixed at the source. Client `safe-fetch` normalises this envelope to "fall through to local mode."
- 🎙 **Long-form voice recording**: the mic now records until the user explicitly stops. Web Speech recognisers auto-end after a silence window (especially on mobile Chrome) — we transparently restart the recogniser as long as the user is still in listening mode, with a live elapsed-time indicator.
- 📎 **Universal file upload**: the upload widget now accepts *any* file — images, PDFs, docs, archives, code — up to 10 MB each. Text-like files are extracted as before; images are inlined as data URLs (vision-capable models can read them); other binaries are surfaced to the prompt as filename + size + MIME type so the model knows the user attached them.
- 🎨 **Responsive redesign**: the workspace now uses a 2-column layout on `lg+` (input left, output right) and a clean stack on tablet/mobile, reaching `max-w-7xl`. Home, header, footer, templates, history all aligned to the new wide layout. The "Try a starter" row was removed from the workspace — templates page already covers that need.
- ✅ **Quality**: 18 tests, typecheck, production build all clean.

## v0.3.0 — 2026-05-01

The "it works on my phone" release.

- ✅ Bug fix: client-side `Failed to execute 'json' on 'Response'` is gone (safeFetch wrapper + handles empty/non-JSON bodies).
- 🌍 Multilingual: full English + Arabic dictionaries, `<html dir="rtl">` switching, language toggle persisted in cookie + localStorage, RTL-safe layouts using logical properties.
- 📱 Mobile: PWA manifest + service worker (installable on Android), responsive header with hamburger menu, Capacitor scaffold for a true `.apk`.
- 🛠 Local engine: full client-side prompt orchestration — intent detection (EN+AR), question generation, model-specific reconstruction (ChatGPT, Claude, Copilot, Gemini, generic). Workspace falls back to local engine on any backend failure, so the app *always* produces a result.
- 🎨 Brand mark: prompt-cursor + spark logo on a brand→violet→pink gradient.
- ✨ Visual aids: hero illustration (raw note → spark → polished card), line-art step icons (Pen, Chat, Sparkle), coloured intent badges, decorative corner sparks.
- ✅ Quality: 18 vitest tests, typecheck and production build clean.

Tag: `v0.3.0` (local, on commit `526fa8c`).

## v0.2.0

- Vitest harness with 18 unit tests across 4 service modules.
- Quick-enhance mode (skip clarifications).
- Six starter prompts on workspace, before/after compare panel, history search.
- Gemini target_model end-to-end, graceful LLM-unreachable 503.

## v0.1.0

- Initial multi-tenant SaaS scaffold: Next.js + Supabase + Ollama + Vercel.
- Browser extension (MV3) for ChatGPT / Claude / Copilot / Gemini.
- Self-contained interactive demo at `/demo.html`.
