# Coding Conventions

**Analysis Date:** 2026-05-21

> **Honest posture note (reboot reality check):** The conventions
> *documented* in `CLAUDE.md` and the conventions actually *enforced* in
> the codebase diverge significantly. `npm run lint` reports **409 errors
> + 26 warnings** across the repo (435 total) — yet there is no CI gate
> blocking on lint, no pre-commit hook, no GitHub Actions workflow
> (`.github/` does not exist). TypeScript strict mode is opt-in via a
> separate `tsconfig.strict.json` that covers only ~30% of the source
> tree (`src/lib/**`, `src/hooks/**`, `src/components/ui/**`,
> `src/types/**`). The other ~70% (`src/pages/**`, all feature
> components) runs under `tsconfig.app.json` with `strict: false`,
> `noImplicitAny: false`, no `strictNullChecks`. The escape-hatch budget
> shows it: **297 `@typescript-eslint/no-explicit-any` errors** across
> the codebase, with **166 `as any` casts** in 42 files and **136
> explicit `: any` annotations** in 43 files. For a paid product this is
> a senior-review fail unless the reboot tightens the rails.

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` — e.g., `DueCardsCard.tsx`,
  `AdminConcursoDetail.tsx`, `FlashcardStudy/index.tsx`
- Custom hooks: **mixed** — `useAuth.tsx`, `useAccess.ts`,
  `useExamTarget.ts` (camelCase, dominant) but also `use-toast.ts`,
  `use-mobile.tsx` (kebab-case, inherited from shadcn boilerplate, never
  cleaned up). Convention drift — pick one and rename the kebab files.
- Library modules: lowercase or camelCase — `srs.ts`, `audio.ts`,
  `auth-errors.ts`, `normalizeDiscipline.ts`, `tipo-card-labels.ts`
- Type-only files: `types.ts` (e.g., `src/pages/FlashcardStudy/types.ts`)
- Test files: `*.test.ts` co-located next to source (only 1 example
  exists: `src/pages/FlashcardStudy/useStudySession.test.ts`)
- Index barrels: `index.ts` — e.g., `src/components/dashboard/widgets/index.ts`

**Functions:**
- Components: `PascalCase` — `export function DueCardsCard() { ... }`
- Hooks: `camelCase`, must start with `use` — `export function useAccess()`
- Plain functions: `camelCase` — `buildStudyQueue`, `buildTopicSnapshots`,
  `normalizeDiscipline`
- Constants in module scope: `SCREAMING_SNAKE_CASE` —
  `SESSION_VERSION`, `MAX_CARD_IDS`, `FALLBACK_CONCURSO_ID`, `TOAST_LIMIT`

**Variables:**
- Local: `camelCase` — `goalConcursoId`, `nowIso`, `activeGoal`
- React Query keys: kebab-case strings — `['user-concurso-access',
  user?.id]`, `['dashboard-due-cards', user?.id]`

**Types:**
- Interfaces: `PascalCase` — `UseAccessResult`, `PaymentData`,
  `UseStudySessionOptions`, `UseStudySessionReturn`
- Type aliases: `PascalCase` — `BillingType`, `Tab`, `CardReport`
- Discriminated union members: `PascalCase` for the type, lowercase
  string literal for the discriminator (e.g., `goal_type: 'concurso'`)
- Interface vs type alias: mixed — `interface` for object shapes,
  `type` for unions/aliases (acceptable, but not enforced)

## Code Style

**Formatting:**
- **No Prettier config detected** (no `.prettierrc*`, no
  `prettier.config.*`, no `.editorconfig`). Formatting is "whatever the
  IDE/editor does". Two-space indent is the de facto rule from the
  Vite/shadcn template.
- Mixed quote style: `'single'` dominant in `src/lib/**`, `src/hooks/**`,
  and most feature code, but `"double"` in `src/App.tsx`,
  `src/test/setup.ts`, and many UI primitives. Confirms no auto-format.
- Trailing commas: inconsistent.
- Semicolons: used (Vite default).
- **Recommendation for the reboot:** add Prettier + `.editorconfig`,
  pin a single quote style, run `npx prettier --write .` once, then add
  `npm run format` to the lint script. This alone removes thousands of
  spurious diffs in future PRs.

**Linting:**
- ESLint 9 with `tseslint.config(...)` in `eslint.config.js` (flat
  config). Extends:
  - `@eslint/js` `recommended`
  - `typescript-eslint` `recommended`
  - `eslint-plugin-react-hooks` `recommended`
  - `eslint-plugin-react-refresh`
- Files: `**/*.{ts,tsx}`
- Ignored: `dist`, `supabase/functions/**`, `scripts/**`
- Overrides:
  - `@typescript-eslint/no-unused-vars: off` (intentional — but means
    dead code can pile up unnoticed)
  - `react-refresh/only-export-components: warn` with
    `allowConstantExport: true`
- **Actual lint state (2026-05-21):** 435 problems, 409 errors. Top
  rule violations:

  | Rule | Count |
  |------|-------|
  | `@typescript-eslint/no-explicit-any` | 297 |
  | `@typescript-eslint/no-empty-object-type` | 100 |
  | `react-refresh/only-export-components` | 14 |
  | `react-hooks/exhaustive-deps` | 12 |
  | `@typescript-eslint/no-unused-expressions` | 2 |

  The 100 `no-empty-object-type` errors are almost entirely in
  `src/components/ui/**` (shadcn primitives extending Radix props with
  empty interfaces) — relatively benign, but they crowd out signal.
  The 12 `exhaustive-deps` warnings are **real correctness bugs**
  waiting to fire (stale closures in `useEffect`).

- **Senior-review flag:** lint is documented as the gate (`npm run lint`)
  but currently fails by orders of magnitude. Either drop the rule
  (honest), fix violations (preferred), or ratchet (e.g., baseline
  ignore the existing count then forbid new ones).

## TypeScript Strictness

**Two tsconfigs in play:**

| File | Strict | Scope | Notes |
|------|--------|-------|-------|
| `tsconfig.app.json` | `strict: false` | all of `src/` | The build/dev runtime. `noImplicitAny: false`, no `strictNullChecks`, no `noUnusedLocals`. |
| `tsconfig.strict.json` | `strict: true` | `src/lib/**`, `src/hooks/**`, `src/components/ui/**`, `src/types/**` | Extends `tsconfig.app.json` and overrides with `strict: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`. Currently passes 0 errors — meaningful, but covers ~30% of source. |
| `tsconfig.json` (root) | mixed | references-only | Sets `noImplicitAny: false`, `strictNullChecks: false` for the root project; delegates to `tsconfig.app.json` + `tsconfig.node.json`. |

**Implications:**
- `npm run typecheck` runs the non-strict variant — currently passes.
- `npm run typecheck:strict` runs the strict variant scoped to the
  whitelisted dirs — currently passes.
- `src/pages/**` and `src/components/**` (except `ui/`) get **zero
  strict checking**. This is where 100% of the `as any` casts and most
  of the explicit `any` annotations live. Production code paths that
  touch Supabase, Asaas, gamification, simulado scoring — all unchecked.
- The strict configs do not get exercised in any CI gate (there's no
  CI). Drift is invisible until someone runs it manually.
- **For a sellable product:** flip `tsconfig.app.json` `strict: true`
  and pay the migration tax (several days). Or at minimum, expand
  `tsconfig.strict.json` to cover `src/pages/**` and gate it in CI.

## Import Organization

**Order (observed pattern, not enforced):**
1. React + framework imports: `import { useState, useEffect } from 'react'`
2. Third-party libraries:
   `import { useQuery } from '@tanstack/react-query'`,
   `import { motion } from 'framer-motion'`,
   `import { toast } from 'sonner'`
3. `@/` alias imports — components, hooks, lib, integrations
4. Relative imports — only inside multi-file feature folders (e.g.,
   `./types`, `./useStudySession`)
5. Type-only imports use `import type { ... }` when known (sometimes
   missed — see most `*.tsx` files)

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.app.json`, `tsconfig.json`,
  `vitest.config.ts`, and Vite via SWC plugin). **Strict rule in
  CLAUDE.md:** "Use `@/` import alias — never relative paths from
  `src/`". Mostly upheld; relative imports are confined to colocated
  feature folders.

## Error Handling

**Patterns in use:**
- **UI surface — `sonner` toasts** (123 toast calls across 27 files).
  Convention: `toast.success('...')` / `toast.error('...')` for
  user-facing failures, typically in `try/catch` blocks. Example
  (`ReportCardButton.tsx:65`):
  ```ts
  try {
    const { error } = await supabase.rpc('report_flashcard' as any, { ... });
    if (error) throw error;
  } catch {
    toast.error('Erro ao reportar. Tente novamente.');
  } finally {
    setLoading(false);
  }
  ```
  Note: catch block swallows the error object entirely — not logged,
  not reported. Common pattern. **There is no Sentry / error
  reporting integration**, so swallowed errors disappear.
- **Two competing toast systems** —
  `@/components/ui/toaster` (shadcn/Radix) AND
  `@/components/ui/sonner` (Sonner). Both mounted in `App.tsx`. The
  Radix one (`src/hooks/use-toast.ts`) is the shadcn boilerplate with
  `TOAST_REMOVE_DELAY = 1000000` (16-minute timeout — a known shadcn
  artifact). Almost all *new* code uses `sonner` directly via
  `import { toast } from 'sonner'`. **Clean up:** delete the unused
  Radix toaster + `use-toast.ts`.
- **Supabase errors** — destructured from the response
  (`const { data, error } = await supabase.from(...)`). Most call sites
  check `error` but a non-trivial number silently swallow:
  ```ts
  const { data: concurso } = await (supabase as any)
    .from('admin_concursos').select('title, slug').eq('id', concursoId).maybeSingle();
  // no error check — if it fails, concurso is undefined and the
  // user gets "?? null" through the rest of the flow
  ```
- **`try/catch`** appears in 111 places across 40 files. Most
  catch blocks either toast-and-swallow or `console.error` (25 calls)
  and swallow. No central error handler beyond `ErrorBoundary` at the
  App root.
- **`ErrorBoundary`** wraps the whole app (`src/components/ErrorBoundary.tsx`).
  No granular boundaries around lazy-loaded pages — a thrown error
  inside a page nukes the whole UI to the boundary's fallback.
- **Edge function sentinels** — documented pattern: edge functions
  return HTTP 4xx with `{ error, code: 'SENTINEL' }`; frontend reads
  `code` to branch UX (e.g., `ALREADY_HAS_ACCESS` in `Checkout.tsx`).
  Only consistently followed in the Asaas/Checkout flow.

**Senior-review flags:**
- No structured logging — `console.error` only.
- No error monitoring (Sentry / Highlight / etc.).
- `catch { ... }` (no binding) is used in places where the error info
  would have been useful — silent failures in production.
- Several `as any` casts are *because* error handling was skipped:
  `(supabase as any).from('admin_concursos').select(...)` — the cast
  papers over a missing type, but the call still silently fails on
  network/RLS errors.

## Validation

**Documented in CLAUDE.md:** "React Hook Form + Zod — forms + validation"

**Actual state:**
- **Zero** imports of `zod` outside `src/components/ui/form.tsx` (the
  shadcn primitive).
- **Zero** `useForm()` calls outside the same primitive.
- `zod` and `react-hook-form` ARE in `package.json`'s `dependencies`
  (with `@hookform/resolvers`), so the runtime is paid-for but not used.
- Forms are written with raw `<input>` / `<textarea>` and `useState`
  (see `ReportCardButton.tsx`, `Checkout.tsx`, `Onboarding.tsx`,
  `Settings.tsx`, `Signup.tsx`, `Login.tsx`).
- Validation is ad hoc — CPF check (`src/lib/cpf.ts`) is hand-rolled,
  email format is implicit (input `type="email"`), no centralized
  schema for any payload sent to Supabase or Asaas.

**Senior-review flag — this is the single biggest doc-vs-reality gap.**
For a paid product:
- Schemas should at minimum cover: `signup`, `onboarding profile`,
  `checkout payment`, `support ticket`, `report card`, every edge
  function payload boundary.
- Without Zod at the boundary, you have no runtime guarantee about
  what's hitting the DB or Asaas.

## Logging

**Framework:** `console.*` only (25 calls across 20 files).

**Patterns:**
- `console.error('Sign out error:', err)` in `useAuth.tsx`
- Scattered `console.error` in `ErrorBoundary`, `QuestionCard`,
  `useReviewBatcher`, etc.
- No log levels, no namespacing, no environment switch (logs ship to
  production console).

**Recommendation for the reboot:**
- Wire Sentry (or PostHog with error tracking) before launch.
- Replace `console.error` with a thin logger that no-ops in production
  but reports unexpected errors to Sentry.

## Comments

**When to Comment:**
- **Heavy use of leading docblock comments** on hooks, modules, and
  business-logic files. Examples:
  - `useAccess.ts` — 20-line header explaining business model + query
    flow + the `as any` cast rationale
  - `useStudySession.ts` — full responsibilities + invariants doc
  - `DueCardsCard.tsx` — explains the count rule and the URL cap
  - `useStudySession.test.ts` — explains *why* the tests exist
- This is the strongest convention in the codebase and a real asset.
  New code should preserve the practice.

**JSDoc/TSDoc:**
- Tag syntax is mostly informal (`/** ... */` blocks with prose).
  Few `@param` / `@returns` tags. Acceptable for an internal codebase.

**TODO / FIXME / HACK markers:**
- **Zero** `TODO`, `FIXME`, `HACK`, or `XXX` comments in `src/`. Either
  the team is disciplined about resolving them or they've never adopted
  the convention. Given the volume of `as any` casts and the failing
  test, the latter is likely.

## Function Design

**Size:**
- Largest pages are unsplit — `Landing.tsx` (1211 lines),
  `AdminConcursoDetail.tsx` (1011), `AdminReviewQueue.tsx` (994),
  `LandingTJSP.tsx` (811), `Checkout.tsx` (751), `EditalMap.tsx`
  (713), `useStudySession.ts` (666), `Onboarding.tsx` (633),
  `Settings.tsx` (578), `SimuladoConfig.tsx` (614). **All would benefit
  from extraction.**
- The auto-generated `src/integrations/supabase/types.ts` (2033 lines)
  doesn't count.
- `src/components/icons/StudyIcons.tsx` (1358 lines) is an icon barrel
  with 116 exports — fine, but should be tree-shakeable.

**Parameters:**
- Multi-arg functions consistently use a single options-object
  parameter when there are 3+ args:
  `useStudySession({ user, params, studyPrefs, examTarget, examPace })`
- Plain `(x, y)` for 1–2 args.

**Return Values:**
- Hooks return either:
  - A typed object shape (preferred — `UseAccessResult`,
    `UseStudySessionReturn`)
  - The raw React Query result (`useQuery({ ... })` destructured at
    the call site)
- No tuples returned from hooks.

## Module Design

**Exports:**
- Mix of named exports (preferred for hooks, lib utils, feature
  components) and default exports (every page in `src/pages/**` uses
  `export default`, because React Router's lazy() expects default
  exports). 45 default exports total.
- Named exports for components are dominant in `src/components/**`:
  `export function DueCardsCard()`, `export function ReportCardButton()`.
- Type / interface exports inline at declaration site.

**Barrel Files:**
- `src/components/dashboard/widgets/index.ts` — re-exports all widget
  components.
- No other barrels detected. Tree-shaking is fine because Vite/SWC
  handles it, but barrels mean named imports work from the folder.

## Stack-specific patterns

- **React Query everywhere** — `useQuery({ queryKey: [...], queryFn,
  enabled: !!user, staleTime: ... })`. Mutations are rarer; many
  writes go through direct `supabase.from(...).insert(...)` without
  cache invalidation, which can leave the UI stale until the next
  refetch.
- **`(x as any)` to fight stale Supabase types** — pattern is repeated
  whenever the DB schema is ahead of `src/integrations/supabase/types.ts`.
  The proper fix is `supabase gen types typescript` on every migration.
- **`cn()` for conditional Tailwind** — used universally; comes from
  `@/lib/utils`. Honored everywhere.
- **`Logger`-less console.error** — no abstraction, see Logging.

## Documented vs Enforced (the reboot summary)

| Convention (docs) | Actually enforced? | Evidence |
|---|---|---|
| Use `@/` alias, never relative from `src/` | Yes (mostly) | Relative imports only inside feature folders |
| Use `cn()` for conditional Tailwind | Yes | Universal |
| TypeScript strict where it matters | Partial | Strict only in `lib/hooks/ui/types`, no CI gate |
| `npm run lint` clean | **No** | 409 errors / 26 warnings currently |
| `React Hook Form + Zod` for forms | **No** | Zero usage in app code |
| Edge functions return `{ error, code: 'SENTINEL' }` | Partial | Only the Asaas/Checkout flow |
| Tests via Vitest + jsdom + Testing Library | **Aspirational** | 1 test file, 1/4 tests failing |
| No `AI generation`, no Tiptap caderno | Yes (pivot in progress) | Code paths still present but flagged in `PENDENCIAS-2026-05-16.md` |

---

*Convention analysis: 2026-05-21*
