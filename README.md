<img src="public/icon.svg" alt="Existing Prompt Orchestrator mark" width="76" height="76">

# Prompt Orchestrator

**Turn an incomplete request into a clearer, model-aware prompt.**

A web workspace and API for intent detection, clarifying questions, prompt
reconstruction, templates and session history. Organizations and row-level
policies provide the database structure for separating team work.

Next.js 14 · React 18 · TypeScript · Supabase · Ollama

[Capabilities](#what-it-helps-you-do) · [Setup](#local-setup) ·
[Verification](#verify-changes) · [Repository guide](docs/REPOSITORY_GUIDE.md) ·
[العربية](#بالعربية)

## What it helps you do

| Your task | Repository capability | Important boundary |
| --- | --- | --- |
| Start from a rough idea | Intent classification and gap analysis | Inference needs an available model service |
| Add useful context | Question/answer session workflow | Clarification is not factual verification |
| Shape the final request | Target-model prompt formatting and rationale | A formatted prompt is not a guaranteed model outcome |
| Reuse prior work | Templates, history and prompt versions | Hosted persistence must be checked with real identity |
| Use browser tools | MV3 extension source and enhancement endpoint | Endpoint access and client releases need their own security review |

**Raw request → Intent → Questions → Answers → Reconstructed prompt → History**

## Current status

This is [`ahmadzayan-hub/prompt-orchestrator-`](https://github.com/ahmadzayan-hub/prompt-orchestrator-),
branch `main`, a distinct repository from PromptOps. Preserve both repositories’
assets and release links rather than assuming they are disposable duplicates.

At `f8e190b4934fd770b1d12d192346943aba996d66`, the 23 October 2026 integration passed
[tenant RLS and concurrency CI](https://github.com/ahmadzayan-hub/prompt-orchestrator-/actions/runs/40004425086).
That workflow verifies isolated PostgreSQL behavior. It is **not** a full
JavaScript build, authenticated hosted application, browser test or recovery test.
The repository’s automatic GitHub Pages build is static hosting, not a running
Next.js API and database.

No current complete hosted installation is certified here. The locked framework
version and dependency state need review before a new operational release.
Hosting, model compute and storage are not guaranteed to be free.

## Local setup

Install a Node.js/npm runtime compatible with the committed lockfile. This
repository’s current tenant workflow does not pin or validate a Node runtime.

```bash
git clone https://github.com/ahmadzayan-hub/prompt-orchestrator-.git
cd prompt-orchestrator-
npm ci
cp .env.example .env.local
```

Configure a dedicated development backend, not production:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the
  legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for the intended Supabase project.
- A server-only service-role key only for the privileged paths that require it.
- `OLLAMA_BASE_URL` and the reasoning/fast/rewrite model names for the inference
  service that the application server can actually reach.
- `NEXT_PUBLIC_APP_URL` for this installation. Replace example extension access
  values before enabling a real client; a published sample key is not security.

Review the complete migration chain and
[tenant enrollment release plan](docs/tenant-enrollment-release-review.md) before
applying it to a development database. Existing databases require read-only
inspection, backup/restore validation and an explicit upgrade plan.

```bash
npm run dev
```

Open **http://localhost:3000/workspace**. Local inference runs separately; the
app does not install models or start Ollama for you. On a hosted server,
`localhost:11434` does not reach a developer’s computer. Do not solve that by
exposing an unauthenticated inference port to the internet.

## Architecture and clients

| Area | Source |
| --- | --- |
| Workspace, templates and history | `src/app/` |
| Sessions, organization enrollment and enhancement API | `src/app/api/` |
| Intent, clarification and formatter services | `src/lib/services/` |
| Ollama adapter and prompt instructions | `src/lib/llm/` |
| Database and isolation fixtures | `supabase/` |
| Browser extension, desktop and mobile sources | `extension/`, `desktop/`, `mobile/` |

Client source is not evidence of a signed, installed or store-published release.
Verify each client’s destination and real workflow before distributing it.

## Verify changes

The application scripts are available for local verification; do not interpret
their presence as a recorded pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For the database suite, use an approved disposable PostgreSQL environment:

```bash
python3 scripts/test-tenant-rls.py --pg-bin /path/to/postgresql/bin --full-chain --concurrent
```

The test identity fixture is not hosted Supabase Auth. Before release, verify
two-user isolation, signup/retry behavior, saved sessions after reload, real
inference, provider failure handling and backup recovery.

## Documentation

- [API](docs/API.md)
- [Tenant enrollment and migration review](docs/tenant-enrollment-release-review.md)
- [Desktop](docs/DESKTOP.md) and [mobile](docs/MOBILE.md)
- [Repository guide](docs/REPOSITORY_GUIDE.md)

Older deployment notes describe possible infrastructure, not a promise of free
hosting or permission to open a public tunnel, create credentials or change a
live database.

## بالعربية

**Prompt Orchestrator** يساعد على توضيح الطلب عبر أسئلة وسياق إضافي ثم صياغته
للنموذج المستهدف. يحتفظ بهيكل للجلسات والقوالب والنسخ ضمن مؤسسات منفصلة.

اختبارات عزل قاعدة البيانات نجحت، لكن ذلك لا يثبت تشغيل التطبيق الكامل على
الاستضافة. يلزم التحقق من تسجيل الدخول والحفظ الفعلي وخدمة الاستدلال وتجربة
المستخدم. صفحة GitHub ثابتة ليست خادم التطبيق ولا قاعدة بياناته.

## License and contributions

No repository-wide license file is present in the reviewed source. This README
does not introduce a license. Retain existing notices and assets, propose
reviewable changes, and never include private prompts or credentials in issues.
