# Repository guide

## Identity and current behavior

This guide applies to `ahmadzayan-hub/prompt-orchestrator-`, branch `main`.
The similarly named prompt repository is distinct; preserve its source,
packaged clients and release history.

The implemented workflow is intent detection, clarification, prompt formatting
and session/version storage. Do not represent an approval/release/rollback
platform, an AI evaluation verdict or a hosted tenant security acceptance as
complete without separate evidence.

## Configuration that matches the code

The active intent service imports `src/lib/llm/ollama.ts`. Its configuration
comes from `src/lib/env.ts`: `OLLAMA_BASE_URL`, `OLLAMA_MODEL_REASONING`,
`OLLAMA_MODEL_FAST` and `OLLAMA_MODEL_REWRITE`. A paid-provider key in an example
environment file is not proof that a different adapter is connected.

Use the correct Supabase project URL and public key. The public-key reader
accepts `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the legacy anon-key name.
Keep privileged keys server-only. Do not paste real credentials into issues,
README examples, client bundles or screenshots.

Local model availability, model downloads and compute are separate from the
Next.js process. A hosted server cannot call a laptop’s localhost address.
Use only approved connectivity and inference access controls. Existing guides’
free-tier examples are not current price guarantees or a recommendation to
publish an unprotected model port.

## Migration and release checks

Read [tenant-enrollment-release-review.md](tenant-enrollment-release-review.md).

1. Record the exact source SHA, target application and backend project.
2. Inspect the actual schema, policies, grants, signup trigger and migration ledger.
3. Verify backup recovery using an isolated restore.
4. Replay the reviewed upgrade and prove creator-bound organization enrollment,
   owner/admin/member restrictions and cross-tenant denial with populated data.
5. Run real hosted sign-in and repeated/concurrent onboarding, then verify session
   creation, answers, finalization and persistence after reload.
6. Test the real inference endpoint and failure cases with authorized inputs and
   an approved spend boundary, if applicable.
7. Deploy only after those checks and the relevant change approvals. Confirm
   the live source and backend, not just a static page or a host’s READY label.

Do not assign historical orphan organizations to guessed owners or restore the
former permissive bootstrap policy during rollback. Preserve data and use the
fail-closed plan in the review document.

## Contributions and visuals

Run the application scripts from the README and the appropriate isolated SQL
suite for behavior changes. Preserve desktop, mobile and browser-extension
sources. Publishing a client release is separate from editing a README.

The README uses the existing `public/icon.svg` unchanged. It is a repository
brand mark, not a product screenshot, certification or generated proof of
operation. No new logo or license is introduced. Existing assets are preserved.

Do not put secrets, customer prompts or exploit-ready private findings in public
issues. Use a maintainer-approved private channel for sensitive reports; this
guide does not invent a security address or response-time commitment.
