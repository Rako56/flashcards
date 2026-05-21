---
phase: 1
plan: 04
title: Playwright 1.60.0 + Chromium + per-path coverage gate-break probe
status: complete
completed: 2026-05-21
commit: fa09610
requirements: [FOUND-06]
provides:
  - "Playwright 1.60.0 + Chromium binary (E2E infra ready; smoke spec lands Plan 1.13)"
  - "playwright.config.ts (PLAYWRIGHT_BASE_URL env support → Vercel preview URL in CI; webServer for local)"
  - "Per-path Vitest 3.2.4 coverage threshold syntax PROVEN to enforce (T-1.4-01 mitigated)"
key-files:
  created:
    - flashcards/playwright.config.ts
    - flashcards/tests/e2e/.gitkeep
  modified:
    - flashcards/package.json (test:e2e + test:e2e:ui scripts, @playwright/test devDep)
    - flashcards/.gitignore (playwright/.cache, blob-report)
    - flashcards/pnpm-lock.yaml
metrics:
  duration_min: ~5
  files_created: 2
  files_modified: 3
  tasks_completed: 4
  tests_passing: 17
---

# Phase 1 Plan 1.4: Playwright 1.60.0 + Gate-Break Coverage Probe Summary

E2E test infrastructure installed (Playwright 1.60.0 + Chromium binary, config supports Vercel-preview-URL via `PLAYWRIGHT_BASE_URL` env) + the per-path 90% Vitest coverage threshold was PROVEN to fire by intentionally adding 11 untested exports to `lib/srs/` and observing both global-floor and per-path-ceiling threshold errors.

## Goal

Per RESEARCH.md A7 and VALIDATION.md §Gate-Break Tests "Coverage 90% core", the Vitest 3.2.4 per-path threshold syntax (`'lib/srs/**': { lines: 90, ... }`) was documented but unverified. This plan installs Playwright (consumed in Plan 1.13 smoke spec) AND runs a meta-test that adds an uncovered file and confirms `pnpm test --coverage` exits non-zero with a threshold error mentioning both `lib/srs/**` and `90%`. Without this proof, the per-path gate is aspirational.

## Tasks Completed

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Install `@playwright/test@1.60.0` + Chromium | ✓ | `pnpm exec playwright --version` → `Version 1.60.0`. Chromium + Chrome-Headless-Shell downloaded to `%LOCALAPPDATA%\ms-playwright\chromium-1223` (~295 MiB total). |
| 2 | `playwright.config.ts` + `tests/e2e/.gitkeep` | ✓ | Adjusted RESEARCH Example 5 shape to satisfy strict tsconfig (`noPropertyAccessFromIndexSignature` + `exactOptionalPropertyTypes`) — see Deviations below. |
| 3 | Gate-break coverage probe | ✓ | Vitest exit 1 with `ERROR: Coverage for lines (2.85%) does not meet "lib/srs/**" threshold (90%)`. Probe file never staged. |
| 4 | Commit + push | ✓ | Commit `fa09610` on `origin/main`. |

## Acceptance criteria — all green

| # | Check | Result |
|---|-------|--------|
| 1 | `pnpm list @playwright/test` shows 1.60.x | ✓ `1.60.0` |
| 2 | `pnpm exec playwright --version` prints `Version 1.60.x` | ✓ `Version 1.60.0` |
| 3 | `playwright.config.ts` exists; grep `PLAYWRIGHT_BASE_URL` ≥1, `chromium` ≥1, `webServer` ≥1 | ✓ (6 / 1 / 4 matches) |
| 4 | `tests/e2e/.gitkeep` exists | ✓ |
| 5 | `pnpm typecheck` exits 0 | ✓ |
| 6 | Playwright config parses (test --list lists tests when present) | ✓ (verified with a transient sanity spec → 1 test listed → spec removed) |
| 7 | Probe baseline: coverage exits 0, 100% on all 4 protected paths | ✓ |
| 8 | Probe with uncovered file: coverage exits 1 with threshold error mentioning `lib/srs/` and `90%` | ✓ (both lines and statements) |
| 9 | Probe after revert: coverage exits 0 again | ✓ |
| 10 | `git status` clean; no probe file in commit or git history | ✓ `git ls-files lib/srs/` = `__tests__/placeholder.test.ts` + `index.ts` only |
| 11 | `.gitignore` includes playwright artifacts | ✓ (`coverage/`, `.playwright/`, `playwright/.cache/`, `playwright-report/`, `test-results/`, `blob-report/`) |
| 12 | `pnpm lint` and `pnpm format:check` exit 0 | ✓ |
| 13 | Commit `fa09610` pushed to `origin/main` | ✓ |

## Files created

- `playwright.config.ts` — E2E config, Chromium-only project, `baseURL` from `PLAYWRIGHT_BASE_URL` env with `http://localhost:3000` fallback, `webServer` runs `pnpm dev` for local mode and is omitted entirely (via conditional spread, NOT `undefined`) when `PLAYWRIGHT_BASE_URL` is set so CI runs against Vercel preview deploys
- `tests/e2e/.gitkeep` — empty placeholder so the test directory is tracked; smoke spec ships in Plan 1.13

## Files modified

- `package.json` — added `test:e2e` and `test:e2e:ui` scripts; `@playwright/test@1.60.0` added to `devDependencies`
- `.gitignore` — appended `playwright/.cache/` and `blob-report/` (the other Playwright artifact dirs `coverage/`, `.playwright/`, `playwright-report/`, `test-results/` were already present from Plan 1.1)
- `pnpm-lock.yaml` — `@playwright/test@1.60.0` + 3 transitive deps (`fsevents`, `playwright`, `playwright-core`)

## Gate-break probe — full evidence

This is the centerpiece of Plan 1.4. The probe sequence and observed outputs (captured verbatim from terminal):

### Step 1 — Baseline (no probe file)

```text
$ pnpm test:coverage
...
File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files   |     100 |      100 |     100 |     100 |
 lib        |     100 |      100 |     100 |     100 |
 lib/access |     100 |      100 |     100 |     100 |
 lib/asaas  |     100 |      100 |     100 |     100 |
 lib/queue  |     100 |      100 |     100 |     100 |
 lib/srs    |     100 |      100 |     100 |     100 |

(exit 0)
```

### Step 2 — Add `lib/srs/uncovered-temp.ts` (11 untested exports)

```ts
// 11 untested exports: export const x = 1; export function f1..f11()
// goal: drag lib/srs coverage below 90%
```

### Step 3 — Run coverage with probe file

```text
$ pnpm test:coverage
...
File               | % Stmts | % Branch | % Funcs | % Lines |
All files          |   20.93 |      100 |     100 |   20.93 |
 lib/srs           |    2.85 |      100 |     100 |    2.85 |
  index.ts         |     100 |      100 |     100 |     100 |
  ...vered-temp.ts |       0 |      100 |     100 |       0 | 6-39

ERROR: Coverage for lines (20.93%) does not meet global threshold (50%)
ERROR: Coverage for statements (20.93%) does not meet global threshold (50%)
ERROR: Coverage for lines (2.85%) does not meet "lib/srs/**" threshold (90%)
ERROR: Coverage for statements (2.85%) does not meet "lib/srs/**" threshold (90%)
 ELIFECYCLE  Command failed with exit code 1.

(exit 1)
```

**Both gates fired.** The per-path 90% ceiling for `lib/srs/**` AND the 50% global floor surfaced as separate ERROR lines, proving:

1. The per-path glob key `'lib/srs/**': { lines: 90, functions: 90, branches: 90, statements: 90 }` IS the correct Vitest 3.2.4 syntax (matches RESEARCH.md A7 hypothesis).
2. Vitest computes per-path coverage independently from global, so adding uncovered code in ANY of the 4 protected paths surfaces a distinct threshold violation, not just the global one.
3. The error messages explicitly name `"lib/srs/**"` — making debug-from-CI obvious for future contributors.

### Step 4 — Delete probe file

```text
$ rm lib/srs/uncovered-temp.ts
```

### Step 5 — Re-run coverage (post-revert)

```text
$ pnpm test:coverage
...
File        | % Stmts | % Branch | % Funcs | % Lines
All files   |     100 |      100 |     100 |     100
 lib/srs    |     100 |      100 |     100 |     100
(exit 0)
```

Back to green. Coverage gates re-armed.

### Step 6 — Git status / no leak

```text
$ git status
Changes not staged for commit:
  modified:   .gitignore
  modified:   package.json
  modified:   pnpm-lock.yaml
Untracked files:
  playwright.config.ts
  tests/e2e/
```

Probe file (`lib/srs/uncovered-temp.ts`) does NOT appear. Confirmed clean.

```text
$ git ls-files lib/srs/
lib/srs/__tests__/placeholder.test.ts
lib/srs/index.ts

$ git log --all --pretty=format: --name-only | grep -c "uncovered-temp"
0
```

Probe never reached the index, never reached history.

## Verified Vitest 3.2.4 per-path threshold syntax

Confirmed working shape in `vitest.config.ts`:

```ts
test: {
  coverage: {
    provider: 'v8',
    include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    thresholds: {
      // Global floor
      lines: 50, functions: 50, branches: 50, statements: 50,
      // Per-path ceiling — glob keys are siblings of the global numbers
      'lib/srs/**':    { lines: 90, functions: 90, branches: 90, statements: 90 },
      'lib/queue/**':  { lines: 90, functions: 90, branches: 90, statements: 90 },
      'lib/asaas/**':  { lines: 90, functions: 90, branches: 90, statements: 90 },
      'lib/access/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
}
```

No tweaks to `vitest.config.ts` were required — the shape established in Plan 1.3 worked first try.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `playwright.config.ts` did not compile under strict tsconfig**

- **Found during:** Task 2 verify (`pnpm typecheck`)
- **Issue:** RESEARCH.md Example 5 uses `process.env.CI` / `process.env.PLAYWRIGHT_BASE_URL` direct property access AND assigns `webServer: undefined` conditionally. Both are rejected by this repo's strict tsconfig:
  - `noPropertyAccessFromIndexSignature: true` → `process.env.CI` must be `process.env['CI']`.
  - `exactOptionalPropertyTypes: true` → `webServer: undefined` is rejected even when the destination type is `T | undefined`.
  - `workers: process.env.CI ? 1 : undefined` triggered the same `exactOptionalPropertyTypes` error.
- **Fix:** Rewrote the config to:
  1. Use bracket env access (`process.env['CI']`, `process.env['PLAYWRIGHT_BASE_URL']`).
  2. Build the config object literal and conditionally spread `workers` and `webServer` (`...(IS_CI ? { workers: 1 } : {})`) so the keys are OMITTED rather than set to `undefined`.
  3. Add an explicit `PlaywrightTestConfig` type annotation to surface any further drift early.
- **Files modified:** `playwright.config.ts`
- **Why this isn't a deviation from the SPIRIT of the RESEARCH example:** The runtime behavior is identical to Example 5 — local dev spawns `pnpm dev`, CI uses `PLAYWRIGHT_BASE_URL`. The change is purely a strict-mode TypeScript ergonomics adjustment. Documented inline at the top of the file so future contributors don't reintroduce the unsafe shape.

**2. [Note — Not a deviation] Playwright `test --list` exits 1 when 0 tests exist**

- **Observation:** The PLAN.md acceptance criterion says `pnpm exec playwright test --list` "exits 0 (lists 0 tests but no errors)". In Playwright 1.60.0, an empty `testDir` causes `--list` to emit `Error: No tests found` and exit 1. This is Playwright's intentional behavior, NOT a config error.
- **Verification:** Created a transient `tests/e2e/sanity.spec.ts` with one passing test → `pnpm exec playwright test --list` listed it and exited 0 → deleted the spec. This confirms the config itself parses fine; the empty-dir exit code is unrelated.
- **No action taken:** The acceptance criterion as written was slightly imprecise. The actual gate (config syntactically valid, parses, lists tests when present) is satisfied. Documented here for transparency.

## Notes / observations

- **Pre-commit hook ran clean during the Plan 1.4 commit** — `lint-staged` reformatted `package.json` (Prettier alignment), `eslint --max-warnings 0 --no-warn-ignored` and `tsc --noEmit` both passed.
- **Engine warning during install:** `WARN  Unsupported engine: wanted: {"node":">=20.18.0 <23"} (current: {"node":"v24.14.1","pnpm":"9.15.9"})`. Local dev runs on Node 24 because the agent shell inherits the user's environment; the `engines` constraint in package.json is what CI will enforce. Not a blocker for Plan 1.4 since all gates (lint/typecheck/test/coverage/playwright config parse) ran green.
- **Playwright deferred to CI run in Plan 1.13** — `pnpm test:e2e` was NOT executed locally because (a) there are no specs yet (smoke spec lands Plan 1.13) and (b) it would require spawning `pnpm dev` and a real headed browser, which would extend Plan 1.4 unnecessarily. The acceptance criterion is "config exists + parses + Chromium installed", which is satisfied. Plan 1.13 will run the first actual E2E.

## Requirements satisfied

- **FOUND-06** → ✓ Done (Playwright installed + configured E2E in CI; baseURL env-driven for Vercel preview deploys; smoke spec lands Plan 01-13)

## Threat mitigations applied

- **T-1.4-01 (HIGH, Tampering: per-path threshold silently downgraded by Vitest)** → MITIGATED. Probe explicitly proves the per-path threshold fires. Future Vitest upgrades that silently break this shape will surface as a regression because the per-path lines will revert to global-only enforcement, which any new probe-style test would catch.
- **T-1.4-02 (MEDIUM, Repudiation: probe file accidentally committed)** → MITIGATED. Single-session probe + explicit `rm` step BEFORE `git add` + `git status` verification confirmed no leak. `git ls-files lib/srs/` and `git log --all` both show 0 references to `uncovered-temp.ts`.
- **T-1.4-SC (LOW, Tampering: Playwright browser binary)** → MITIGATED. `@playwright/test` is the official Microsoft package per RESEARCH.md Audit table; Chromium downloaded via official `pnpm exec playwright install chromium` from cdn.playwright.dev.

## Self-Check: PASSED

- File `playwright.config.ts`: FOUND
- File `tests/e2e/.gitkeep`: FOUND
- File `lib/srs/uncovered-temp.ts`: ABSENT (correct — probe artifact)
- Commit `fa09610`: FOUND in `git log --oneline --all`
- Pushed to `origin/main`: CONFIRMED

## Next plan

**Plan 1.5** — GitHub Actions CI workflow + branch protection + CODEOWNERS + Dependabot (FOUND-07).
