# Authenticated browser acceptance

`npm run test:e2e` starts a new disposable Supabase project, applies all committed
migrations, builds Next.js with that backend's public key, and runs Chromium.
It needs Docker running, Node from `.nvmrc`, and the committed npm lockfile:

```sh
npm ci
npx playwright install --with-deps chromium
npm run typecheck:e2e
npm run test:e2e
```

The `Authenticated browser` workflow runs on Ubuntu 24.04 with
`--repeat-each=10 --retries=0`: all six scenarios must pass ten times, without
retries masking failures. The backend is provisioned once for these 60 tests;
each execution uses fresh browser state and unique synthetic users/data.
The Supabase CLI and Playwright versions are pinned in `package-lock.json`.
No GitHub secrets, hosted Supabase project, provider account or paid inference
are required. First use downloads Docker images and Chromium.

## Isolation and cleanup

The runner copies `e2e/supabase.toml` and the real migration directory into a new
OS temporary directory. It generates a unique project ID, never links a remote
project, and uses only local `start`, `status` and `stop` commands. Backend/provider
environment variables are replaced for the build and test processes. Existing
Supabase projects and application servers are never reused. Ports must be free:
3100 (Next.js), 55420/55422 (database), 55421 (API), 55424 (captured email),
55425 (inference fixture).

Every test signs up a unique synthetic address through the actual `/login` UI.
Its email goes to the disposable Mailpit mail catcher, never a real mailbox.
The browser follows the actual verification link, completes PKCE through
`/auth/callback`, and sends its real session cookies to the Next.js API.
No service-role key or preloaded authenticated browser state is used to log in.

The runner stops its own Supabase project with `--no-backup` in `finally`, removing
the test database, then removes its temporary directory. Abrupt host termination
can prevent cleanup; identify the generated `prompt-orchestrator-e2e-*` project
before removing any leftover container or volume. CI uses a disposable runner.
Failure reports are retained for three days; traces may contain temporary local
auth tokens. Reports and browser state are ignored by git. Do not reuse this
suite against a live backend or publish its traces as production evidence.

## Covered behavior

- Anonymous cloud reads/writes are rejected.
- Invalid/missing sign-in codes show a retry message and remain unauthenticated.
- Successful and failed callback redirects preserve the browser's full origin,
  even when Next.js uses an internal hostname; session cookies stay usable.
- Real magic-link sign-in creates the personal owner membership.
- The default model selection submits successfully to the server; a browser-local
  fallback cannot satisfy the persistence assertions.
- Quick prompts survive reload and a new browser context with cookies only.
- Clarification answers and final prompt versions persist in PostgreSQL.
  The final-result region must display the exact server-returned prompt, which
  must match the saved version after reload. Copy buttons in comparison cards
  cannot satisfy the final-result assertion.
- Organization creation grants owner membership; a duplicate slug returns 409
  without duplicating enrollment.
- Two signed-in tenants see separate histories. Forging an organization header
  fails; reading/deleting another tenant's session does not expose/remove it.

Only Ollama's HTTP responses are deterministic fixtures. Next.js, Supabase Auth,
PostgREST and database RLS execute normally. This is local full-stack acceptance,
not evidence of model quality, hosted delivery, deployed migrations, backup
recovery, production security readiness, or released desktop/mobile clients.

The hosted formatter still supports the five legacy target families. Workspace
catalogue IDs are mapped to those families for cloud requests, while local
formatting retains the selected catalogue model. Unsupported cloud styles use
`generic`; this change does not add hosted formatting for every catalogue model.

## Debugging

Use `npm run test:e2e -- --grep "organization enrollment"` for one case. Each
invocation creates a new backend and rebuilds; it never uses a deployed site.
`npx playwright show-report` opens the report from the latest local run.
Direct `npx playwright test` fails unless the disposable runner has provisioned
the stack, so a misconfigured developer shell cannot silently test production.
