---
phase: 1
plan: 03
title: Vitest 3.2.4 + MSW + per-path coverage gates + placeholder modules
status: complete
completed: 2026-05-21
commit: a6a9245
---

# Plan 1.3 — Summary

## Goal

Add test infrastructure with per-path coverage gates (≥50% global, ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`) so future plans cannot regress quality. Engages 90% gate from day 1 via 4 placeholder modules.

## Tasks completed

| # | Task | Status |
|---|---|---|
| 1 | Install Vitest 3.2.4 + RTL + MSW 2.7 + jsdom + coverage-v8 | ✓ |
| 2 | Write `vitest.config.ts` (per-path thresholds) + `tests/setup.ts` (MSW + RTL cleanup) | ✓ |
| 3 | Unit tests for `cn()` + `env()` (6 + 7 = 13 test cases) | ✓ |
| 4 | 4 placeholder modules + 4 paired tests (engage 90% gate) | ✓ |
| 5 | Commit on `main` (a6a9245) — pushed to origin | ✓ |

## Acceptance criteria — all green

| # | Check | Result |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` succeeds | ✓ |
| 2 | `pnpm exec vitest run` passes (17 tests, 0 fail) | ✓ |
| 3 | `pnpm exec vitest run --coverage` passes; 100% lines/branches/functions in all protected paths | ✓ |
| 4 | `pnpm lint` exits 0 | ✓ |
| 5 | `pnpm typecheck` exits 0 | ✓ |
| 6 | `pnpm format:check` exits 0 | ✓ |
| 7 | `vitest.config.ts` contains per-path thresholds for `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/` at 90% | ✓ |
| 8 | `tests/setup.ts` boots MSW with `onUnhandledRequest: 'error'` | ✓ |
| 9 | 4 placeholder modules + 4 paired tests exist | ✓ |
| 10 | Test scripts in `package.json` (test, test:coverage) | ✓ |
| 11 | Commit pushed to `origin/main` | ✓ |

## Files created

- `vitest.config.ts` — per-path coverage thresholds (≥50% global, ≥90% core)
- `tests/setup.ts` — MSW server + RTL cleanup + jest-dom matchers
- `tests/unit/utils.test.ts` — 6 test cases for `cn()` from `lib/utils.ts`
- `tests/unit/env.test.ts` — 7 test cases for `env()` from `lib/env.ts` (uses `resetEnvCacheForTests()`)
- `lib/srs/index.ts` — placeholder (`SRS_VERSION = 'fsrs-5-stub'`)
- `lib/srs/__tests__/placeholder.test.ts` — covers `SRS_VERSION`
- `lib/queue/index.ts` — placeholder (`QUEUE_VERSION = 'round-robin-stub'`)
- `lib/queue/__tests__/placeholder.test.ts` — covers `QUEUE_VERSION`
- `lib/asaas/index.ts` — placeholder (`ASAAS_API_VERSION = 'v3'`)
- `lib/asaas/__tests__/placeholder.test.ts` — covers `ASAAS_API_VERSION`
- `lib/access/index.ts` — placeholder (`ACCESS_VERSION = 'stub'`)
- `lib/access/__tests__/placeholder.test.ts` — covers `ACCESS_VERSION`

## Files modified

- `package.json` — added `test`, `test:coverage` scripts; added vitest/msw/RTL devDeps
- `pnpm-lock.yaml` — new transitive deps
- `tsconfig.json` — verify tests/** included for type resolution (may have been ok already)

## Coverage report (after Task 5)

```
File        | % Stmts | % Branch | % Funcs | % Lines
lib         | 100     | 100      | 100     | 100
lib/access  | 100     | 100      | 100     | 100
lib/asaas   | 100     | 100      | 100     | 100
lib/queue   | 100     | 100      | 100     | 100
lib/srs     | 100     | 100      | 100     | 100
```

## Notes / observations

- Plan 1.3 was executed by gsd-executor but the agent connection dropped before writing SUMMARY.md and updating state files. Verification re-run (lint/typecheck/format/test/coverage all green) confirmed the commit is healthy. SUMMARY.md back-filled here.
- 4 placeholder modules engage the 90% gate from commit 1 — Phase 4 (Asaas), Phase 5 (SRS + queue), Phase 2 (access) will replace these stubs with real code + real tests that maintain ≥90%.
- 17 tests total. Suite runs in ~1s.
- MSW configured with `onUnhandledRequest: 'error'` so any test accidentally hitting a real network call fails red instead of silently passing.

## Requirements satisfied

- **FOUND-05** → ✓ Done (Vitest with per-path coverage gates active)

## Next plan

**Plan 1.4** — Playwright E2E config + gate-break coverage probe (4 auto tasks)
