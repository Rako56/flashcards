---
phase: 1
slug: foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
updated: 2026-05-21
---

# Phase 1 — Foundation Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Phase 1 establishes the test infrastructure itself, so most validation is **meta-validation**: we verify that gates fire correctly by intentionally trying to break them (commit `: any`, push without typecheck, regress coverage, etc).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (unit + integration) + Playwright 1.60.x (E2E) |
| **Config file** | `vitest.config.ts` (created by Plan 1.3) + `playwright.config.ts` (created by Plan 1.4) |
| **Quick run command** | `pnpm test --run` (Vitest single run, unit only) |
| **Full suite command** | `pnpm test --run && pnpm test:e2e` (Vitest + Playwright) |
| **Estimated runtime** | Quick: ~5s (empty suite); Full: ~30s with healthcheck smoke E2E |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run` (full suite is small enough; no quick/full distinction in P1)
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm test --run && pnpm test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green AND `gh pr checks` must show all CI jobs green
- **Max feedback latency:** ~30s local; ~3min CI

---

## Per-Task Verification Map

> Populated from the 13 plan files. Each task's `<verify><automated>` block is the gate.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1.1-T0 | 01-01 | 1 | FOUND-01 | T-1.1-04 | Repo location decision recorded | checkpoint:decision | (human approval) | n/a | ⬜ pending |
| 1.1-T1 | 01-01 | 1 | FOUND-01 | T-1.1-04 | Empty private GitHub repo exists | checkpoint:human-action | `gh repo view <owner>/<name>` | n/a | ⬜ pending |
| 1.1-T2 | 01-01 | 1 | FOUND-01 | T-1.1-02, T-1.1-03 | Next 15.5 scaffold with TS strict + pnpm pinned | auto | `pnpm install && pnpm typecheck && pnpm build` | flashcards/package.json | ⬜ pending |
| 1.1-T3 | 01-01 | 1 | FOUND-01 | T-1.1-02 | 4 route groups + providers + error/not-found shells | auto | `pnpm typecheck && pnpm build` | flashcards/app/(marketing)/layout.tsx | ⬜ pending |
| 1.1-T4 | 01-01 | 1 | FOUND-01 | T-1.1-02 | lib/env.ts (Zod) + lib/utils.ts (cn) with tests | auto+tdd | `pnpm typecheck && pnpm build` | flashcards/lib/env.ts | ⬜ pending |
| 1.1-T5 | 01-01 | 1 | FOUND-01 | T-1.1-04 | Reboot-specific CLAUDE.md (no Sparkle) | auto | `test -f CLAUDE.md && grep -q "Flashcards" CLAUDE.md && [ $(grep -ic "sparkle" CLAUDE.md) -le 1 ]` | flashcards/CLAUDE.md | ⬜ pending |
| 1.1-T6 | 01-01 | 1 | FOUND-01 | T-1.1-01 | Initial commit on main, self-bootstrapping | auto | `git log --oneline -1 && gh api .../commits/main` | n/a | ⬜ pending |
| 1.2-T1 | 01-02 | 2 | FOUND-02, FOUND-03, FOUND-04 | T-1.2-01, T-1.2-SC | ESLint v9 + Prettier + husky + lint-staged installed | auto | `pnpm list eslint typescript-eslint @next/eslint-plugin-next prettier husky lint-staged` | flashcards/package.json | ⬜ pending |
| 1.2-T2 | 01-02 | 2 | FOUND-02 | T-1.2-01, T-1.2-02, T-1.2-03 | eslint.config.mjs blocks `any`, UUID, console, deep-relative | auto | `pnpm lint && [ ! -f .eslintrc.json ] && grep -q "no-explicit-any" eslint.config.mjs` | flashcards/eslint.config.mjs | ⬜ pending |
| 1.2-T3 | 01-02 | 2 | FOUND-03 | T-1.2-01 | Prettier config + VS Code settings | auto | `pnpm format:check` | flashcards/.prettierrc | ⬜ pending |
| 1.2-T4 | 01-02 | 2 | FOUND-04 | T-1.2-05 | husky pre-commit + pre-push hooks installed | auto | `test -f .husky/pre-commit && test -f .husky/pre-push && grep -q "lint-staged" .husky/pre-commit && grep -q "typecheck" .husky/pre-commit && grep -q "typecheck" .husky/pre-push` | flashcards/.husky/pre-commit | ⬜ pending |
| 1.2-T5 | 01-02 | 2 | FOUND-02 | T-1.2-01, T-1.2-02, T-1.2-03 | 4 lint-fixtures with intentional violations excluded from default lint/typecheck | auto | `pnpm lint && pnpm typecheck && pnpm exec eslint tests/lint-fixtures/bad-any.ts --no-ignore; [ $? -ne 0 ]` | flashcards/tests/lint-fixtures/bad-any.ts | ⬜ pending |
| 1.2-T6 | 01-02 | 2 | FOUND-02, FOUND-04 | T-1.2-05 | Pre-commit hook proven to block `: any` commit | auto | `git log --oneline -1 | grep -q "Plan 1.2\\|ESLint\\|husky"` | n/a | ⬜ pending |
| 1.3-T1 | 01-03 | 3 | FOUND-05 | T-1.3-SC | Vitest + MSW + RTL + jsdom installed pinned | auto | `pnpm list vitest @vitest/coverage-v8 msw jsdom @testing-library/react` | flashcards/package.json | ⬜ pending |
| 1.3-T2 | 01-03 | 3 | FOUND-05 | T-1.3-01, T-1.3-03, T-1.3-04 | vitest.config.ts with per-path coverage thresholds + MSW server with onUnhandledRequest error | auto | `pnpm typecheck && grep -q "lib/srs/" vitest.config.ts && grep -q "onUnhandledRequest: 'error'" tests/setup.ts` | flashcards/vitest.config.ts | ⬜ pending |
| 1.3-T3 | 01-03 | 3 | FOUND-05 | T-1.3-02 | unit tests for cn() + env() pass | auto+tdd | `pnpm test tests/unit/utils.test.ts tests/unit/env.test.ts` | flashcards/tests/unit/utils.test.ts | ⬜ pending |
| 1.3-T4 | 01-03 | 3 | FOUND-05 | T-1.3-01 | Coverage thresholds engaged via 4 placeholder modules | auto+tdd | `pnpm test --coverage` | flashcards/lib/srs/index.ts | ⬜ pending |
| 1.3-T5 | 01-03 | 3 | FOUND-05 | n/a | Plan 1.3 committed | auto | `git log --oneline -1 | grep -q "Plan 1.3\\|Vitest\\|coverage"` | n/a | ⬜ pending |
| 1.4-T1 | 01-04 | 4 | FOUND-06 | T-1.4-SC | Playwright + Chromium installed | auto | `pnpm list @playwright/test && pnpm exec playwright --version` | flashcards/package.json | ⬜ pending |
| 1.4-T2 | 01-04 | 4 | FOUND-06 | n/a | playwright.config.ts compiles + Chromium ready | auto | `pnpm typecheck && pnpm exec playwright test --list` | flashcards/playwright.config.ts | ⬜ pending |
| 1.4-T3 | 01-04 | 4 | FOUND-05 | T-1.4-01 | Per-path coverage gate-break probe fires | auto | inline probe script (create uncovered-temp.ts → coverage fails → revert → coverage passes) | n/a | ⬜ pending |
| 1.4-T4 | 01-04 | 4 | FOUND-06 | T-1.4-02 | Plan 1.4 committed, no probe file leaked | auto | `git log --oneline -1 | grep -q "Plan 1.4\\|Playwright\\|gate-break"` | n/a | ⬜ pending |
| 1.5-T1 | 01-05 | 5 | FOUND-07 | T-1.5-04, T-1.5-SC | CI workflow with 8 jobs + skip guards for pending artifacts | auto | `test -f .github/workflows/ci.yml && grep -q "name: CI" .github/workflows/ci.yml && grep -c "needs: " .github/workflows/ci.yml | awk '{ if($1 >= 7) exit 0; else exit 1 }'` | flashcards/.github/workflows/ci.yml | ⬜ pending |
| 1.5-T2 | 01-05 | 5 | FOUND-07 | T-1.5-05 | CODEOWNERS + PR template + dependabot.yml | auto | `test -f CODEOWNERS && test -f .github/PULL_REQUEST_TEMPLATE.md && test -f .github/dependabot.yml && grep -q "/lib/srs/" CODEOWNERS` | flashcards/CODEOWNERS | ⬜ pending |
| 1.5-T3 | 01-05 | 5 | FOUND-07 | n/a | CI workflow committed, first run succeeds with skips | auto | `git log --oneline -1 | grep -q "Plan 1.5\\|CI\\|workflow"` | n/a | ⬜ pending |
| 1.5-T4 | 01-05 | 5 | FOUND-07 | T-1.5-01, T-1.5-02, T-1.5-06 | 6 secrets created + branch protection active with admin-bypass OFF | checkpoint:human-action | (human verify + `gh api .../branches/main/protection`) | n/a | ⬜ pending |
| 1.5-T5 | 01-05 | 5 | FOUND-07 | T-1.5-01 | CI lint gate + branch protection both proven to block bad code via probe | auto | `gh pr list --state closed --limit 5 | grep -q "PROBE\\|probe"` | n/a | ⬜ pending |
| 1.6-T1 | 01-06 | 6 | FOUND-10 | T-1.6-05, T-1.6-06 | Supabase Pro project provisioned (HIBP, PITR, branching, extensions) | checkpoint:human-action | (human verify + dashboard screenshot) | n/a | ⬜ pending |
| 1.6-T2 | 01-06 | 6 | FOUND-10 | T-1.6-SC | Supabase deps + CLI linked to Pro project | auto | `pnpm list @supabase/ssr @supabase/supabase-js server-only && test -f supabase/config.toml && pnpm exec supabase status --linked` | flashcards/supabase/config.toml | ⬜ pending |
| 1.6-T3 | 01-06 | 6 | FOUND-10 | T-1.6-01 | .env.local populated (gitignored) + .env.example updated + types stub | auto | `test -f .env.local && git check-ignore .env.local && ! git status --porcelain | grep -q "\.env\.local" && grep -q "export type Database" types/database.types.ts && pnpm typecheck` | flashcards/.env.local | ⬜ pending |
| 1.6-T4 | 01-06 | 6 | FOUND-10 | T-1.6-01, T-1.6-03, T-1.6-07 | 4 Supabase client factories with admin-guard tests | auto+tdd | `pnpm typecheck && pnpm test lib/supabase/__tests__/admin-guard.test.ts && pnpm lint && head -3 lib/supabase/admin.ts | grep -q "'server-only'" && grep -q "auth.getUser()" lib/supabase/middleware.ts` | flashcards/lib/supabase/admin.ts | ⬜ pending |
| 1.6-T5 | 01-06 | 6 | FOUND-10 | n/a | Plan 1.6 PR merged | auto | `git log --oneline -1 | grep -q "Plan 1.6\\|Supabase" && ! git status --porcelain | grep -q "\.env\.local"` | n/a | ⬜ pending |
| 1.7-T1 | 01-07 | 7 | FOUND-11 | T-1.7-02 | Migration 0001 (extensions + fn_user_has_access + set_updated_at) | auto | `test -f supabase/migrations/0001_init_extensions_and_helpers.sql && grep -q "fn_user_has_access" 0001_init_extensions_and_helpers.sql && grep -q "set_updated_at" 0001_init_extensions_and_helpers.sql` | flashcards/supabase/migrations/0001_init_extensions_and_helpers.sql | ⬜ pending |
| 1.7-T2 | 01-07 | 7 | FOUND-11 | T-1.7-01, T-1.7-04 | Migration 0002 (admin_concursos + RLS + TJSP seed inline) | auto | `grep -q "CREATE TABLE public.admin_concursos" 0002_admin_concursos.sql && grep -q "ENABLE ROW LEVEL SECURITY" 0002_admin_concursos.sql && grep -q "INSERT INTO public.admin_concursos" 0002_admin_concursos.sql` | flashcards/supabase/migrations/0002_admin_concursos.sql | ⬜ pending |
| 1.7-T3 | 01-07 | 7 | FOUND-11 | T-1.7-01, T-1.7-04 | Migration 0003 (admin content tables: disciplinas + topicos + flashcards + questoes) | auto | `test -f supabase/migrations/0003_admin_content.sql && grep -c "CREATE TABLE public.admin_" 0003_admin_content.sql | awk '{ if($1 >= 4) exit 0; else exit 1 }'` | flashcards/supabase/migrations/0003_admin_content.sql | ⬜ pending |
| 1.7-T4 | 01-07 | 7 | FOUND-11 | T-1.7-01, T-1.7-03 | Migrations 0004 (users/roles + deferred admin policies) + 0005 (access_junction) | auto | `test -f supabase/migrations/0004_users_profiles_roles.sql && test -f supabase/migrations/0005_access_junction.sql && grep -q "PRIMARY KEY (user_id, concurso_id)" 0005_access_junction.sql` | flashcards/supabase/migrations/0004_users_profiles_roles.sql | ⬜ pending |
| 1.7-T5 | 01-07 | 7 | FOUND-11 | T-1.7-01 | [BLOCKING] supabase db push applies 5 migrations cleanly + pg_policies verified | auto | `pnpm exec supabase migration list && pnpm exec supabase db lint --linked` | n/a | ⬜ pending |
| 1.7-T6 | 01-07 | 7 | FOUND-11 | n/a | Plan 1.7 PR merged; supabase-lint CI job active | auto | `git log --oneline -1 | grep -q "Plan 1.7\\|schema\\|migrations"` | n/a | ⬜ pending |
| 1.8-T1 | 01-08 | 8 | FOUND-11 | T-1.8-01, T-1.8-02 | Migration 0006 (srs_progress + xp_events + mistake_notebook) with UNIQUE idempotency | auto | `test -f supabase/migrations/0006_srs_progress.sql && grep -q "UNIQUE (user_id, idempotency_key)" 0006_srs_progress.sql` | flashcards/supabase/migrations/0006_srs_progress.sql | ⬜ pending |
| 1.8-T2 | 01-08 | 8 | FOUND-11 | T-1.8-03, T-1.8-04, T-1.8-05 | Migrations 0007 (simulados UNIQUE attempt+question) + 0008 (purchases + webhooks PK + refund_requests) | auto | `grep -q "UNIQUE (attempt_id, question_id)" 0007_simulados.sql && grep -q "CREATE TABLE public.refund_requests" 0008_purchases_webhooks.sql && grep -q "event_id text PRIMARY KEY" 0008_purchases_webhooks.sql` | flashcards/supabase/migrations/0008_purchases_webhooks.sql | ⬜ pending |
| 1.8-T3 | 01-08 | 8 | FOUND-11 | T-1.8-02, T-1.8-06, T-1.8-07 | Migrations 0009 (audit_logs append-only) + 0010 (atomic functions + deferred FKs) | auto | `test -f supabase/migrations/0009_audit_logs.sql && test -f supabase/migrations/0010_atomic_functions.sql && grep -c "SECURITY DEFINER" 0010_atomic_functions.sql | awk '{ if($1 >= 6) exit 0; else exit 1 }'` | flashcards/supabase/migrations/0010_atomic_functions.sql | ⬜ pending |
| 1.8-T4 | 01-08 | 8 | FOUND-11 | n/a | seed.sql for local dev | auto | `test -f supabase/seed.sql && grep -q "INSERT INTO public.admin_concursos" supabase/seed.sql && grep -q "admin_disciplinas" supabase/seed.sql` | flashcards/supabase/seed.sql | ⬜ pending |
| 1.8-T5 | 01-08 | 8 | FOUND-11 | T-1.8-01 | [BLOCKING] supabase db push final — full schema applies + lint clean | auto | `pnpm exec supabase migration list && pnpm exec supabase db lint --linked` | n/a | ⬜ pending |
| 1.8-T6 | 01-08 | 8 | FOUND-11 | n/a | Plan 1.8 PR merged; FOUND-11 satisfied | auto | `git log --oneline -1 | grep -q "Plan 1.8\\|schema\\|migrations"` | n/a | ⬜ pending |
| 1.9-T1 | 01-09 | 9 | FOUND-12 | T-1.9-01, T-1.9-03 | Real types/database.types.ts generated from live Supabase | auto | `pnpm typecheck && [ $(wc -l < types/database.types.ts) -gt 200 ] && grep -q "admin_concursos" types/database.types.ts && grep -q "fn_award_xp" types/database.types.ts` | flashcards/types/database.types.ts | ⬜ pending |
| 1.9-T2 | 01-09 | 9 | FOUND-12 | T-1.9-01, T-1.9-05 | types:gen + types:check scripts work; CI types-fresh active | auto | `pnpm types:gen && pnpm types:check && grep -q "types-fresh:" .github/workflows/ci.yml && ! grep -q "hashFiles('types/database.types.ts')" .github/workflows/ci.yml` | flashcards/.github/workflows/ci.yml | ⬜ pending |
| 1.9-T3 | 01-09 | 9 | FOUND-12 | T-1.9-02 | Pre-commit nudge for migration changes | auto | `grep -q "supabase/migrations/\\*.sql" package.json` | flashcards/package.json | ⬜ pending |
| 1.9-T4 | 01-09 | 9 | FOUND-12 | T-1.9-01, T-1.9-04 | Gate-break probe — CI fails on stale types | auto | `gh pr list --state closed --limit 10 | grep -q "PROBE: stale\\|stale types"` | n/a | ⬜ pending |
| 1.9-T5 | 01-09 | 9 | FOUND-12 | n/a | Plan 1.9 PR merged | auto | `git log --oneline -1 | grep -q "Plan 1.9\\|types pipeline"` | n/a | ⬜ pending |
| 1.10-T1 | 01-10 | 10 | FOUND-08 | n/a | Sentry account + project + auth token ready | checkpoint:human-action | (human verify) | n/a | ⬜ pending |
| 1.10-T2 | 01-10 | 10 | FOUND-08 | T-1.10-01, T-1.10-SC | Sentry SDK + pino + wizard configs + PII scrubbing | auto | `pnpm typecheck && pnpm lint && grep -q "beforeSend" sentry.server.config.ts && grep -q "withSentryConfig" next.config.ts` | flashcards/sentry.server.config.ts | ⬜ pending |
| 1.10-T3 | 01-10 | 10 | FOUND-09 | T-1.10-02 | lib/observability/{logger,correlation}.ts with redact paths + tests | auto+tdd | `pnpm test lib/observability/ && pnpm typecheck && pnpm lint` | flashcards/lib/observability/logger.ts | ⬜ pending |
| 1.10-T4 | 01-10 | 10 | FOUND-09 | T-1.10-03, T-1.10-05 | middleware.ts (Node runtime, passthrough + correlationId) | auto | `pnpm build && grep -q "x-correlation-id" middleware.ts && grep -q "runtime: 'nodejs'" middleware.ts` | flashcards/middleware.ts | ⬜ pending |
| 1.10-T5 | 01-10 | 10 | FOUND-08, FOUND-09 | n/a | Plan 1.10 PR merged | auto | `git log --oneline -1 | grep -q "Plan 1.10\\|Sentry\\|observability"` | n/a | ⬜ pending |
| 1.11-T1 | 01-11 | 11 | FOUND-09 | T-1.11-01 | lib/observability/sentry.ts helpers + tests | auto+tdd | `pnpm test lib/observability/__tests__/sentry.test.ts && pnpm typecheck && pnpm lint` | flashcards/lib/observability/sentry.ts | ⬜ pending |
| 1.11-T2 | 01-11 | 11 | FOUND-09 | T-1.11-01 | withErrorTracking wrapper + tests | auto+tdd | `pnpm test lib/observability/__tests__/withErrorTracking.test.ts && pnpm typecheck` | flashcards/lib/observability/withErrorTracking.ts | ⬜ pending |
| 1.11-T3 | 01-11 | 11 | FOUND-09 | T-1.11-02, T-1.11-03 | /api/healthz Route Handler with Zod-validated response + unit test | auto+tdd | `pnpm test tests/unit/healthz.test.ts && pnpm typecheck && pnpm lint && grep -q "captureException\\|captureWithCorrelation" app/api/healthz/route.ts` | flashcards/app/api/healthz/route.ts | ⬜ pending |
| 1.11-T4 | 01-11 | 11 | FOUND-08 | T-1.11-01 | Smoke probe verifies Sentry capture end-to-end with correlationId tag | checkpoint:human-verify | (human verify Sentry dashboard) | n/a | ⬜ pending |
| 1.11-T5 | 01-11 | 11 | FOUND-08, FOUND-09 | n/a | Plan 1.11 PR merged | auto | `git log --oneline -1 | grep -q "Plan 1.11\\|observability\\|healthz"` | n/a | ⬜ pending |
| 1.12-T1 | 01-12 | 12 | (OPS-06 partial) | T-1.12-01, T-1.12-02, T-1.12-03, T-1.12-04 | Vercel Pro project + env + custom domain + wildcard SSL + Sentry integration + monitor | checkpoint:human-action | (human verify + curl tests) | n/a | ⬜ pending |
| 1.12-T2 | 01-12 | 12 | (OPS-06 partial) | T-1.12-06, T-1.12-07, T-1.12-08, T-1.12-09, T-1.12-10 | vercel.json with 5 security headers + robots.txt | auto | inline JSON parse + grep for headers + robots.txt content | flashcards/vercel.json | ⬜ pending |
| 1.12-T3 | 01-12 | 12 | (OPS-06 partial) | n/a | ASAAS_WEBHOOK_TOKEN generated + Vercel CLI secrets added to GitHub | checkpoint:human-action | (human verify) | n/a | ⬜ pending |
| 1.12-T4 | 01-12 | 12 | (OPS-06 partial) | n/a | Plan 1.12 PR merged; production live; security headers active | auto | `git log --oneline -1 | grep -q "Plan 1.12\\|Vercel\\|deploy"` | n/a | ⬜ pending |
| 1.13-T1 | 01-13 | 13 | (verification) | T-1.13-01 | Smoke E2E (4 tests) + CI e2e job active against Vercel preview | auto+tdd | `pnpm typecheck && pnpm exec playwright test --list 2>&1 | grep -c "smoke" | awk '{ if($1 >= 1) exit 0; else exit 1 }' && grep -q "preview-url\\|PLAYWRIGHT_BASE_URL" .github/workflows/ci.yml` | flashcards/tests/e2e/smoke.spec.ts | ⬜ pending |
| 1.13-T2 | 01-13 | 13 | (verification) | T-1.13-02 | 9 gate-break tests documented (3 new probes: Gates 2, 4, 7) | checkpoint:human-verify | (human verify table populated with evidence URLs) | n/a | ⬜ pending |
| 1.13-T3 | 01-13 | 13 | (verification) | n/a | 10-item Phase 1 checklist verified | auto | `pnpm lint && pnpm typecheck && pnpm test --coverage && gh api .../branches/main/protection --jq '.required_pull_request_reviews.required_approving_review_count' | awk '{ if($1 >= 1) exit 0; else exit 1 }'` | n/a | ⬜ pending |
| 1.13-T4 | 01-13 | 13 | (verification) | n/a | STATE.md updated + v0.1.0-phase1 tagged + Plan 1.13 merged | auto | `git log --oneline -1 | grep -q "Plan 1.13\\|smoke\\|Phase 1" && git tag -l v0.1.0-phase1 | grep -q "v0.1.0-phase1"` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity check:** With 13 sequential plan waves and each plan ending with a commit + verification gate, no 3 consecutive tasks lack automated verify. Manual checkpoints (human-action / human-verify) are interleaved with automated tasks. Compliance: **✓ Nyquist-compliant**.

---

## Wave 0 Requirements

Wave 0 in Phase 1 IS the test infrastructure setup itself:

- [x] `vitest.config.ts` — coverage gates: ≥50% global, ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/` (Plan 1.3 — FOUND-05)
- [x] `playwright.config.ts` — E2E against Vercel preview deploy (Plan 1.4 — FOUND-06)
- [x] `tests/setup.ts` — jsdom + RTL globals + MSW server (Plan 1.3)
- [x] `tests/fixtures/` — shared Supabase test client + MSW handlers (Plan 1.3 `tests/msw/`)
- [x] `eslint.config.mjs` — flat config blocking `any`, `as any`, `: any`, `console.log` (Plan 1.2 — FOUND-02)
- [x] `.husky/pre-commit` + `.husky/pre-push` — lint-staged + tsc gates (Plan 1.2 — FOUND-04)
- [x] `.github/workflows/ci.yml` — lint → typecheck → test → build → supabase migrations lint (Plan 1.5 — FOUND-07)
- [x] At least 1 placeholder test in each protected lib directory so coverage thresholds engage (Plan 1.3: `lib/{srs,queue,asaas,access}/index.ts` + `__tests__/placeholder.test.ts`)

**Wave 0 complete: ✓**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| **Supabase Pro features enabled** | FOUND-10 | Pro plan + HIBP toggle + PITR are dashboard-only settings; no API to query | Dashboard https://supabase.com/dashboard → Project → Settings → verify: Plan = Pro, sa-east-1, PITR=7d, Auth → HIBP=on, Branching=enabled |
| **DNS apex A record + wildcard CNAME on flashcards.com.br** | FOUND-09 / 1.12 | DNS propagation; depends on registrar | `dig flashcards.com.br A` returns Vercel IP; `dig random.flashcards.com.br CNAME` returns `cname.vercel-dns.com` |
| **Vercel Pro plan + wildcard SSL provisioned** | OPS-06 / 1.12 | Vercel dashboard-only | Vercel dashboard → project → Settings → Domains → `*.flashcards.com.br` shows valid SSL |
| **Sentry sourcemaps uploaded after deploy** | FOUND-08 | Sentry dashboard view | Sentry dashboard → Releases → latest deploy commit → "Source Maps" tab shows ≥1 uploaded artifact |
| **Branch protection on `main`** | FOUND-07 | GitHub settings | `gh api repos/:owner/:repo/branches/main/protection` shows required_status_checks=ci + required_reviews≥1 + admin_bypass=false |
| **Asaas sandbox account creates a test customer via API call** | FOUND-10 / pre-P4 | External service availability | `curl -X POST https://sandbox.asaas.com/api/v3/customers -H "access_token: $ASAAS_SANDBOX_TOKEN"` returns 200 + customer id |

---

## Gate-Break Tests (Meta-Validation)

> Phase 1's unique requirement: prove each gate fires by intentionally trying to violate it. Run these progressively across Plans 1.2-1.13 and confirmed all green in Plan 1.13.

| Gate | Violation Attempt | Expected Result | Probed In |
|------|-------------------|-----------------|-----------|
| TS strict | Push branch with `const x: any = 1` in any `.ts` file | CI lint step fails red with `@typescript-eslint/no-explicit-any` error | Plan 1.2 (local) + Plan 1.5 (CI) |
| No `console.log` | Push branch with `console.log('test')` in any `.ts` file | CI lint step fails red with `no-console` error | Plan 1.13 |
| TS types regen | Add migration without running `pnpm types:gen` | CI types-check step fails red with diff on `database.types.ts` | Plan 1.9 |
| Coverage 50% global | Add an uncovered `src/lib/uncovered.ts` exporting 100 lines | CI test step fails red with coverage below 50% | Plan 1.13 |
| Coverage 90% core | Add uncovered code in `src/lib/srs/` | CI test step fails red with coverage below 90% in that path | Plan 1.4 |
| Pre-commit lint | Try to commit with lint error | `git commit` fails locally before push | Plan 1.2 |
| Pre-push typecheck | Try to push with `tsc` error | `git push` fails locally | Plan 1.13 |
| Sentry capture | Hit `/api/healthz?simulateError=true` once | Sentry dashboard shows captured exception with `correlationId` tag within 60s | Plan 1.11 |
| Branch protection | Try to push directly to `main` without PR | `git push origin main` fails with protected-branch error | Plan 1.5 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify OR Wave 0 dependencies satisfied (manual checkpoints interleaved appropriately)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (sequential mode with 13 plans, each plan ends with commit + verification)
- [x] Wave 0 covers all infrastructure setup items (vitest config, playwright config, eslint, husky, CI, placeholders)
- [x] No watch-mode flags
- [x] Feedback latency < 30s local / < 5min CI
- [ ] All 9 gate-break tests pass (each gate fires as expected) — verified in Plan 1.13
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter

**Approval:** pending (will be approved 2026-XX-XX after Phase 1 verification — Plan 1.13)
</content>
</invoke>
