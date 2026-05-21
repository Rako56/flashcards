# Testing Patterns

**Analysis Date:** 2026-05-21

> **Honest posture note (reboot reality check):** Testing in this
> repository is **aspirational**, not real. There is exactly **1 test
> file** (`src/pages/FlashcardStudy/useStudySession.test.ts`) covering
> the queue-building behavior of one hook. That single file currently
> has **1 of 4 tests failing** on `main` — `npm test` exits non-zero
> today (2026-05-21). For 190 `.ts`/`.tsx` source files in `src/`
> (excluding the test itself + auto-generated Supabase types), that's
> a **test-file ratio of ~0.5%** and a real coverage that approaches
> zero outside the `useStudySession` queue logic. For a sellable paid
> product targeting concurso prep — where wrong content surfacing or
> a broken study session is a refund — this is below industry floor.
> The infrastructure (Vitest + jsdom + Testing Library + the
> `setup.ts` polyfill) is in place; the test corpus is not.

## Test Framework

**Runner:**
- `vitest` `^3.2.4`
- Config: `vitest.config.ts` at repo root

**Assertion Library:**
- Vitest built-in `expect` (Chai-compatible)
- `@testing-library/jest-dom` `^6.6.0` adds DOM matchers
  (`toBeInTheDocument`, `toHaveClass`, etc.) via `src/test/setup.ts`

**Component Testing:**
- `@testing-library/react` `^16.0.0` — `renderHook`, `render`,
  `waitFor`, `fireEvent`, `screen` (only `renderHook` + `waitFor` are
  actually used today)

**DOM Environment:**
- `jsdom` `^20.0.3` — declared in `vitest.config.ts` via
  `environment: "jsdom"`

**Browser Automation (declared, unused):**
- `playwright` `^1.59.1` is in `devDependencies` but there is **no**
  `playwright.config.*`, no `e2e/` or `tests/` directory, and no E2E
  spec files. The single document at
  `docs/teste-e2e-flashcards-2026-05-18.md` is a manual test plan
  (markdown), not automated E2E.

**Run Commands:**
```bash
npm test            # vitest run (single pass) — currently exits 1
npm run test:watch  # vitest (watch mode)
npx vitest run src/pages/FlashcardStudy/useStudySession.test.ts   # single file
npm run typecheck:strict   # TypeScript strict on lib/hooks/ui/types
```

There is **no `npm test -- --coverage` script wired up** and no
`@vitest/coverage-*` package installed. To get coverage today you have
to install `@vitest/coverage-v8` then run
`npx vitest run --coverage`. Estimated coverage from the existing 1
test file is **~1-2% of statements** (the hook plus a few transitive
imports it pulls — `buildStudyQueue`, type files), with effectively
**0% on `src/pages/**`, `src/components/**`, `src/hooks/**` (except
`useStudySession`), and `src/lib/**` (except the small surface
exercised by the hook).**

## Test File Organization

**Location:**
- **Co-located** next to source. The lone example sits at
  `src/pages/FlashcardStudy/useStudySession.test.ts` alongside the
  hook it tests.
- Vitest `include` glob: `src/**/*.{test,spec}.{ts,tsx}`. There is no
  `__tests__/` directory and no `tests/` at repo root.

**Naming:**
- `<sourceModule>.test.ts` — only `useStudySession.test.ts` exists
  (1 file).
- `*.spec.ts` allowed by Vitest config but unused.

**Structure:**
```
src/
└── pages/
    └── FlashcardStudy/
        ├── useStudySession.ts        # 666 lines, the hook under test
        ├── useStudySession.test.ts   # 269 lines, the only test
        ├── useRatingHandler.ts       # untested
        ├── index.tsx                 # untested page entry
        └── types.ts
src/test/
└── setup.ts                          # global setup (jest-dom + matchMedia polyfill)
```

## Test Structure

**Suite Organization (from the only test file):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudySession } from './useStudySession';

describe('useStudySession', () => {
  beforeEach(async () => {
    buildStudyQueueMock.mockReset();
    const { clearFx } = await importHelpers();
    clearFx();
  });

  it('happy path: assembles smart queue and passes classified cards to buildStudyQueue', async () => {
    /* ... */
  });
  it('pace-aware: passes preExamMode through from buildStudyQueue + uses examPace.status', async () => { /* ... */ });
  it('custom-set mode: bypasses smart queue and preserves caller order exactly', async () => { /* ... */ });
  it('WAL overlay: a card with in-memory progress is reclassified, even if DB returns stale data', async () => {
    /* ⚠ FAILING on 2026-05-21 — AssertionError at line 267 */
  });
});
```

**Patterns:**
- Single top-level `describe(hookName, ...)` block per file.
- One `beforeEach` resets mocks and clears the fake Supabase store.
- Each `it()` block is self-contained — seeds its own Supabase
  fixtures via `setFx(table, rows)`, configures `buildStudyQueueMock`,
  renders the hook with `renderHook`, awaits state via `waitFor(() =>
  expect(result.current.loading).toBe(false))`, then asserts on
  `result.current` and on the args captured by `buildStudyQueueMock`.
- No teardown / `afterEach` — relies on `beforeEach` clearing.
- No nested `describe` for sub-scenarios.

## Mocking

**Framework:** `vi` (Vitest's `jest`-compatible mock API)

**Patterns (from `useStudySession.test.ts`):**
```typescript
// Hand-built chainable Supabase client mock with fixture store
vi.mock('@/integrations/supabase/client', () => {
  const fixtures: Record<string, any[]> = {};

  function chain(table: string): any {
    const c: any = {
      _table: table,
      select: () => c,
      eq:     () => c,
      in:     () => c,
      or:     () => c,
      order:  () => c,
      limit:  () => c,
      maybeSingle: async () => buildSingleResponse(table),
      then:   (resolve: any) => resolve(buildArrayResponse(table)),
    };
    return c;
  }

  return {
    __setSupabaseFixture: (table: string, rows: any[]) => { fixtures[table] = rows; },
    __clearSupabaseFixtures: () => { /* ... */ },
    supabase: {
      from: (table: string) => chain(table),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

// Function-level mock with spy
const buildStudyQueueMock = vi.fn();
vi.mock('@/lib/edital/queue', () => ({
  buildStudyQueue: (...args: any[]) => buildStudyQueueMock(...args),
}));
```

**What to Mock (observed):**
- The Supabase client — replaced with a tiny chainable stub that holds
  per-table fixtures. Lets the test seed `admin_flashcards`,
  `user_flashcard_progress`, `goals`, `admin_topicos` per scenario.
- Pure functions on the dependency boundary — `buildStudyQueue` is
  spied so the test can assert on its inputs without re-running the
  smart-queue algorithm.
- `buildTopicSnapshots` — stubbed to return `new Map()` (not relevant
  to the scenarios under test).

**What NOT to Mock (observed):**
- React itself.
- React Query (the hook does not use Query — it owns its own loading
  state).
- Date/`Date.now()` — tests compute `Date.now() ± N*86400000` inline
  for past/future timestamps. (This will produce flaky tests if a hook
  ever depends on clock alignment; consider `vi.useFakeTimers()` for
  future tests.)

**Test helpers:**
- `async function importHelpers()` — dynamic import of the mocked
  module to access the `__setSupabaseFixture` / `__clearSupabaseFixtures`
  escape hatches. This is the working pattern for new tests against
  Supabase-backed hooks.

## Fixtures and Factories

**Test Data:**
- **Inline fixtures**, declared inside each `it()` block. No shared
  factory functions yet. Example:
  ```typescript
  setFx('admin_flashcards', [
    { id: 'a1', tipo_card: 'conceito', front_text: 'F1', back_text: 'B1',
      palavras_chave: [], dificuldade: 'media', disciplina_id: 'd1',
      topico_id: 't1', topico_titulo: 'T1' },
    { id: 'a2', /* ... */ },
  ]);
  setFx('user_flashcard_progress', [
    { id: 'p1', flashcard_id: 'a2', status: 'review', interval_days: 1,
      repetitions: 1, lapses: 0,
      due_at: new Date(Date.now() - 86400000).toISOString() },
  ]);
  ```

**Location:**
- Inline in test bodies. No `__fixtures__/`, no `factories/`, no
  `testUtils.ts`. As soon as a second test file appears, this should
  be extracted to a shared module.

**Notable test constants in the file:**
- `FAKE_USER`, `BASE_PARAMS`, `BASE_PREFS` — declared at file scope
  and reused across all 4 cases.

## Coverage

**Requirements:** None enforced. No coverage threshold in
`vitest.config.ts`, no `@vitest/coverage-*` dep installed.

**Estimate (file-count basis):**
- Source files in `src/` (excluding `.test.ts` and auto-generated
  `src/integrations/supabase/types.ts`): **189**
- Test files: **1**
- Test-file ratio: **~0.5%**
- Realistic statement coverage from running the existing suite: **1-2%**
  (only `useStudySession.ts` plus transitive imports of
  `@/lib/edital/queue`, `@/lib/edital/types`, and
  `@/lib/gamification/topicMastery` are exercised, and even those are
  partial — only the paths reachable from the 4 scenarios in the file).

**Current run state (`npx vitest run`, 2026-05-21):**
```
Test Files  1 failed (1)
Tests       1 failed | 3 passed (4)
   Start at 13:20:25
   Duration 1.89s

FAIL src/pages/FlashcardStudy/useStudySession.test.ts > useStudySession
     > WAL overlay: a card with in-memory progress is reclassified,
       even if DB returns stale data
AssertionError: expected true to be false // Object.is equality
  expect(secondCall.candidates[0].isDue).toBe(false);
                                          ^

```
The "WAL overlay" test asserts that an in-memory progress write
(simulating a just-rated card with a future `due_at`) should mark the
card as `isDue: false` on the next `loadQueue()`. It returns `true`,
indicating either a regression in the hook or a stale assertion in
the test. Either way: **`npm test` is red on `main` today.**

**View Coverage (after install):**
```bash
npm install --save-dev @vitest/coverage-v8
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Scope: pure functions + custom hooks.
- Approach: `renderHook` + mocked module dependencies. Only one example.
- Untested unit-level code (high-priority gaps):
  - `src/lib/srs.ts` — the FSRS-5 spaced repetition algorithm.
    Wrong scheduling = wrong product. **Must have tests before launch.**
  - `src/lib/edital/queue.ts` — `buildStudyQueue` (mocked in the
    existing test, never tested for itself).
  - `src/lib/edital/progress.ts` — exam-target progress + pace.
  - `src/lib/gamification/combo.ts`, `topicMastery.ts`, `levels.ts` —
    gamification math, user-visible numbers.
  - `src/lib/cpf.ts` — CPF validator (critical for Asaas signup).
  - `src/lib/normalizeDiscipline.ts`, `auth-errors.ts`, `time/brt.ts`
    — small but boundary code.

**Integration Tests:**
- **None.** No tests render pages with a mock Supabase or a mock
  router. No tests of `ProtectedRoute` / `AdminRoute` / `AuthOnlyRoute`.
- The existing test renders a hook with a stub Supabase — this is
  the closest the suite gets to integration, and it's a hook test in
  spirit.

**E2E Tests:**
- **None automated.** Playwright is installed but not configured.
- A manual test plan exists at
  `docs/teste-e2e-flashcards-2026-05-18.md` — useful as a checklist,
  not a regression net.

**Edge Function Tests:**
- **None.** `supabase/functions/**` (asaas-webhook,
  create-asaas-payment, grant-access, audit-flashcards-validator,
  send-welcome-email, etc.) have no tests. Deno's built-in test runner
  isn't wired up. These functions handle real money via Asaas — they
  must have at least smoke tests before a paid launch.

## Common Patterns

**Async Testing:**
```typescript
const { result } = renderHook(() => useStudySession({ /* ... */ }));
await waitFor(() => expect(result.current.loading).toBe(false));
expect(buildStudyQueueMock).toHaveBeenCalled();
```
- `waitFor` polls until the assertion passes or the default timeout
  (1s) elapses.
- `act()` is not used explicitly — Testing Library wraps state updates.

**Error Testing:**
- **No examples in the current suite.** No test asserts that a
  Supabase error is surfaced as a toast, no test forces a network
  failure, no test verifies `ErrorBoundary` fallback. **This is a gap.**

**Hook State Assertion:**
```typescript
expect(result.current.queue.map((c) => c.id)).toEqual(['a3', 'a1', 'a2']);
expect(result.current.preExamMode).toBe(true);
expect(result.current.queueExplain).toMatch(/pré-prova/i);
```
- Direct destructuring of `result.current`.
- `toEqual` for arrays, `toBe` for primitives/refs, `toMatch` for
  strings/regex.

**Mock Inspection:**
```typescript
const arg = buildStudyQueueMock.mock.calls[0][0];
expect(arg.candidates).toHaveLength(2);
const a2 = arg.candidates.find((c: any) => c.id === 'a2');
expect(a2.isNew).toBe(false);
```
- Captures the first call's first argument and asserts on its shape.

## What a Sellable Product Needs (gap to industry floor)

Rough order of priority for a paid launch:

1. **Make the existing test pass.** `npm test` cannot stay red on `main`.
2. **Cover `src/lib/srs.ts`.** Spaced repetition correctness is the
   product. Property-based or table-driven tests of the FSRS-5
   transitions across `again/hard/good/easy` from every state.
3. **Cover `src/lib/edital/queue.ts` directly** (not just via mock in
   `useStudySession`).
4. **Cover the access guard chain.** `useAccess` + `useAdmin` +
   `ProtectedRoute` + `AdminRoute` + `AuthOnlyRoute` — the paywall
   *is* the business model. A regression here either gives away
   the product for free or locks paying users out.
5. **Cover the Asaas integration boundary.** At minimum a test that
   `create-asaas-payment` rejects invalid payloads, that `asaas-webhook`
   only accepts requests from Asaas IPs / with the expected signature,
   and that `grant-access` writes the correct
   `user_concurso_access` row with the right `expires_at`. These run
   under Deno — wire up `deno test` even if the unit count starts at 1.
6. **Cover `src/lib/cpf.ts`.** The CPF validator is on the signup
   critical path.
7. **Cover the simulado scoring.** `SimuladoRun` + `SimuladoResult` —
   wrong totals erode trust immediately.
8. **Add a `coverage` script + a CI gate** with a starting threshold
   you commit to grow (e.g., 30% lines on `src/lib/**` initially, 60%
   by launch).
9. **At least one smoke E2E** with Playwright — login →
   pick concurso → start session → rate a card → see score change.
   Even one passing E2E covers a lot of ground.
10. **CI workflow file** at `.github/workflows/ci.yml` that runs
    `npm run lint`, `npm test`, and `npm run typecheck:strict` on
    every PR. None exists today.

The infrastructure cost to get here is **low** — Vitest + Testing
Library are already configured, the working mock pattern in the
existing test is reusable, and the strict tsconfig already exists.
The cost is writing the tests.

---

*Testing analysis: 2026-05-21*
