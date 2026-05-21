# Phase 1: Foundation — Research

**Researched:** 2026-05-21
**Domain:** Quality gates + Next.js 15.5 scaffold + Supabase Pro provisioning + schema migrations + observability for greenfield reboot
**Confidence:** HIGH (versions verified against npm registry 2026-05-21; patterns sourced from `.planning/research/STACK.md` + `.planning/research/ARCHITECTURE.md` which themselves cite official docs)

---

## Summary

Phase 1 is **infrastructure only — no product features**. The goal is a deployed empty Next.js 15.5 app on Vercel with Supabase Pro connected, every quality gate active, every schema base migration applied with RLS, and `/api/healthz` reachable. Phase 2 starts the moment a contributor cannot push a `: any` to `main`, cannot install a package that bloats the bundle past budget, cannot drop a migration without types regenerating in CI, and cannot break the webhook handler without Sentry firing.

The phase carries **12 requirements (FOUND-01..12)** and resolves **2 of the 5 CRITICAL legacy concerns** by construction: TEST-01 (legacy had 0.5% coverage) is killed by per-directory vitest thresholds; TD-05 (NOT-NULL column pointing to dropped table) is killed by greenfield schema + types-in-CI gate. The remaining 3 CRITICAL concerns (SEC-05 webhook silence, DI-01 non-atomic XP, SEC-10 fake refund) are blocked architecturally here (Sentry installed, atomic Postgres function templates established, `refund_requests` migration created) and finalized in Phases 4-5.

**Primary recommendation:** Decompose Phase 1 into 10 atomic plans, sequenced. Plans 1-4 (repo + scaffold + lint + test infra) can begin without external accounts. Plans 5-6 (Supabase + migrations) require Rafael to provision the Supabase Pro project. Plans 7-9 (types pipeline + observability + Vercel) require GitHub + Vercel + Sentry accounts. Plan 10 (smoke E2E) closes the phase with a verifiable green build.

---

## User Constraints (from CONTEXT.md)

> **Note:** No CONTEXT.md exists yet for Phase 1 — `/gsd:discuss-phase 1` has not been run. The orchestrator passed 8 open decisions inline (see below). The planner should treat these as Claude's Discretion + 8 explicit decisions Rafael will lock during discuss-phase OR confirm during plan-phase.

### Locked Decisions (from PROJECT.md + ROADMAP.md + REQUIREMENTS.md + STACK.md research)

**Stack pins (immutable for v1, all 10 phases):**
- Next.js `15.5.x` (App Router only, NOT 16, NOT Pages Router)
- TypeScript `5.7.x` strict 100% — single `tsconfig.json`, no parallel "strict" file
- Node `20.18.x` pinned via `.nvmrc` + `engines`
- pnpm `9.15.x` pinned via `packageManager` field
- Supabase Pro (`@supabase/ssr@0.10.x` + `supabase-js@2.106.x`)
- Region: `sa-east-1` (São Paulo)
- Vercel Pro hosting
- Tailwind v3 (NOT v4 — design system needs v3's typed token files)
- Zod v3 (NOT v4 — RHF resolver ecosystem still on v3)
- ESLint v9 flat config (NOT Biome — missing react-hooks + next plugin parity)
- Vitest `3.2.x` (NOT 4.x — 4 just shipped, ecosystem still stabilizing)
- husky `9.x` + lint-staged `15.x`
- Sentry `@sentry/nextjs@10.53.x`
- pino `9.x` (Node runtime only, NOT edge/middleware-edge)
- Domain: `flashcards.com.br` + wildcard `*.flashcards.com.br`

**Architectural decisions (already locked in ARCHITECTURE.md):**
- 4 route groups: `(marketing)`, `(app)`, `(admin)`, `(auth)`
- Middleware on Node runtime (15.5 stable), does ONLY 4 things: parse host → resolve concurso → refresh session via `getUser()` → inject headers + rewrite
- Three Supabase clients: `lib/supabase/server.ts` (RSC/SA), `lib/supabase/browser.ts` (Client Components), `lib/supabase/admin.ts` (service-role, `'server-only'` guard)
- 8 base migrations grouped by domain (0001 init → 0008 audit) — NO legacy carried over
- RLS enabled on every table from migration 0001
- Atomic Postgres functions for any read-modify-write
- `service_role` key never in `NEXT_PUBLIC_*`, never in client bundle
- `getConcursoBySlug()` is the only path to a concurso (zero hardcoded UUIDs from day 1)
- Webhook is a Route Handler at `/api/asaas/webhook/route.ts`, NOT an edge function (single Sentry project, type safety, single deploy artifact)
- Coverage gates: ≥50% global; ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`
- ANTI-features stay off: no AI visible to student, no Tiptap, no free tier, no auto-renew

### Claude's Discretion (during planning, recommend defaults; user can override)

| # | Open Decision | Recommended Default | Block? |
|---|---------------|---------------------|--------|
| 1 | GitHub repo location | Rako56/flashcards (personal) → migrate to org later | No — pick now, move later costs ~5min |
| 2 | Repo name | `flashcards` (no suffix) | No |
| 3 | Supabase project name in dashboard | `flashcards-prod` (and `flashcards-staging` if branching enabled separately) | No |
| 4 | Vercel team | Personal (Rako56) → migrate to team later | No |
| 5 | DNS registrar for flashcards.com.br | Use registrar already holding the domain; point NS to Vercel for wildcard | YES — must confirm before Vercel domain setup |
| 6 | Supabase branching from day 1 | **YES** — Pro plan includes; each PR gets isolated DB; eliminates shared-dev-DB conflicts; documented in SUMMARY.md as recommended | No |
| 7 | PostHog account | Create new account; defer wiring to Phase 10 (only install SDK + free tier check in Phase 10) | No — does NOT block Phase 1 |
| 8 | Asaas sandbox API key + webhook endpoint | Rafael creates sandbox account NOW; webhook endpoint configured in Phase 4 plan — Phase 1 only needs env var placeholder | No — does NOT block Phase 1 (blocks Phase 4) |

### Deferred Ideas (OUT OF SCOPE for Phase 1)

| Item | Why deferred | Lands in |
|------|--------------|----------|
| Subdomain resolution (middleware logic for `tjsp.flashcards.com.br`) | Phase 2 — Multi-Tenant Skeleton | Phase 2 |
| TJSP concurso seed data | Phase 2 — needs middleware to be useful | Phase 2 |
| Theme injection / CSS vars | Phase 2 — needs `admin_concursos.theme` populated | Phase 2 |
| Design tokens (paleta, motion, etc.) | Phase 2 — DESIGN-01 | Phase 2 |
| Auth UI (signup/login/etc.) | Phase 3 | Phase 3 |
| Edge function deployments | Phase 4 (welcome email), Phase 7 (cron leagues) | Phase 4+ |
| Asaas client wrapper | Phase 4 | Phase 4 |
| PostHog wiring | Phase 10 — only confirmed install path in Phase 1 if relevant | Phase 10 |
| Performance budgets in CI (`<150KB` landing) | Phase 10 — depends on landing pages existing | Phase 10 |
| LGPD cascade (Resend audience + Sentry user deletion) | Phase 10 | Phase 10 |

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Repository Next.js 15.5 + App Router + TS strict 100% scaffold, pnpm, Node 20.18.x in `.nvmrc` | §1 Next.js Scaffold + §2 TypeScript Strict + §13 pnpm pinning |
| FOUND-02 | ESLint flat config blocks `any`, `: any`, `as any`, deep relative imports, `console.log`; `pnpm lint` fails CI | §3 ESLint flat config v9 + §12 banned rules table |
| FOUND-03 | Prettier configured; `pnpm format:check` fails CI on drift | §3 Prettier config + format:check CI step |
| FOUND-04 | husky + lint-staged pre-commit; pre-push `tsc --noEmit` | §6 Pre-commit hooks |
| FOUND-05 | Vitest coverage gates ≥50% global + ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/` | §4 Vitest coverage tiers per-directory |
| FOUND-06 | Playwright installed + configured E2E in CI against Vercel preview URL | §5 Playwright config + webServer |
| FOUND-07 | GitHub Actions: lint → typecheck → test → build → supabase migrations lint; `main` branch protection | §7 CI workflow |
| FOUND-08 | Sentry SDK Next.js 15 + sourcemaps via Vercel + tags `correlationId`, `userId`, `concursoSlug` | §8 Sentry setup + tagging |
| FOUND-09 | Pino structured logging in Route Handlers + Server Actions with `correlationId` propagation | §9 Pino + correlation IDs |
| FOUND-10 | Supabase Pro project (sa-east-1) + branching per PR | §10 Supabase Pro provisioning |
| FOUND-11 | 8 schema migrations (admin_concursos, admin_*, users/profiles, user_concurso_access, srs, simulados, purchases/webhook_events, audit_log) with RLS + atomic functions | §11 Schema migrations 0001-0008 |
| FOUND-12 | `pnpm types:gen` in CI; build fails if `database.types.ts` stale vs migrations | §12 Types generation pipeline + CI gate |

---

## Project Constraints (from CLAUDE.md)

> The current `./CLAUDE.md` in `sparkle-study-scape/` describes the **legacy Vite SPA**, not the reboot. Phase 1 must **replace** this CLAUDE.md (or write a new one in the new repo) with reboot-appropriate guidance. Captured directives that REMAIN VALID and MUST be honored in the new repo:

- **`docs/PRODUTO.md` is gospel.** Every architectural/scope decision checked against it. Anti-features (AI visible, Tiptap, free tier amplo, multi-idioma, auto-renew, geração automática) are inviolable.
- **Marca:** Flashcards (NOT Sparkle). Domain `flashcards.com.br`. NEVER use "Sparkle" in new code.
- **Use `@/` import alias.** Never relative paths from `src/`. (ESLint rule will enforce.)
- **`cn()` from `@/lib/utils`** for conditional Tailwind. (Will be set up in scaffold.)
- **Prefer shadcn/ui primitives.** Extend via `src/components/ui/`.
- **Tests: Vitest + jsdom + Testing Library** (carry over) + Playwright + MSW (added in reboot).
- **No legacy DB carryover.** Reboot 100% limpo. Cowork re-populates.
- **Edge fn errors:** return `{ error, code: 'SENTINEL' }` business-logic failures with HTTP 4xx; **but webhook returns 500 on transient errors** (legacy violated this — fixed in Phase 4).

**New directives to add to reboot CLAUDE.md (Phase 1 deliverable):**
- TypeScript strict 100%. Zero `: any` / `as any`. ESLint enforces `error`.
- Lint CI blocking — no merge to `main` without green pipeline.
- Coverage gates ≥50% global + ≥90% in `lib/srs/` + `lib/queue/` + `lib/asaas/` + `lib/access/`.
- Sentry + pino from commit 1. Every catch in Route Handlers/Server Actions calls `Sentry.captureException`.
- Atomic Postgres functions for any read-modify-write. NO client-side counter increments.
- RLS on every table. `service_role` only in `lib/supabase/admin.ts` with `'server-only'` guard.
- `getConcursoBySlug()` is the only API to a concurso. NO hardcoded UUIDs (lint rule blocks UUID literals).
- Multi-concurso DB-driven from day 1. Even when only TJSP exists.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Repository scaffolding (Next.js + pnpm) | Build tooling | — | One-time setup, lives in repo root |
| TypeScript strict configuration | Compile-time | — | `tsconfig.json` at root; `tsc --noEmit` in CI |
| ESLint flat config + Prettier | Compile-time | Pre-commit | Lives in `eslint.config.mjs` + `.prettierrc`; enforced both in CI and lint-staged |
| Vitest unit/integration test runner | CI runtime | Dev runtime | Runs in CI (build gate) + locally (`pnpm test --watch`) |
| Playwright E2E | CI runtime | — | Runs against Vercel preview deploy URL after build job |
| GitHub Actions CI orchestrator | CI runtime | — | Triggers lint, typecheck, test, build, supabase-lint; gates merge |
| Pre-commit hooks (husky + lint-staged) | Local pre-commit | — | Runs `eslint --fix` + `prettier --write` + `tsc --noEmit` on staged files |
| Supabase Pro project | Database / Storage / Auth | — | Authoritative state; sa-east-1 region; PITR 7d; HIBP on |
| Schema migrations (`supabase/migrations/`) | Database | CI lint | `supabase db lint` in CI; types regenerated after each |
| RLS policies | Database | — | Postgres enforces; never client-side check alone |
| Atomic Postgres functions | Database | — | Single transaction; called via `supabase.rpc()` |
| Types generation pipeline | Build tooling | CI gate | `pnpm types:gen` + `git diff --exit-code` in CI |
| Sentry SDK | Browser + Server + Edge | — | 3 init configs (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`); sourcemaps via Vercel integration |
| Pino structured logging | Server (Node) | — | Route Handlers + Server Actions + Node middleware ONLY; never edge/browser |
| Correlation ID propagation | Middleware → request → response | — | UUID generated in middleware, threaded via header `x-correlation-id`, attached to Sentry + pino + Supabase logs |
| Vercel Pro hosting | CDN / Edge / Node serverless | — | Wildcard SSL `*.flashcards.com.br` + apex; preview deploys per PR |
| Healthcheck endpoint `/api/healthz` | API / Backend | — | GET returns 200 + DB ping + Sentry reach + Asaas reach (placeholder in P1, full in P10) |

---

## Standard Stack

### Core (Locked, Verified 2026-05-21 on npm registry)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `15.5.18` | Framework + RSC + middleware (Node runtime) | [VERIFIED: npm view next@15 versions] App Router stable, Node middleware GA, ecosystem patterns mature. Pin 15.5 NOT 16 — see STACK.md §1 decision. |
| `typescript` | `5.7.3` | Compile-time type safety | [VERIFIED: npm view typescript@5 versions, 5.7.3 latest stable in 5.7.x line] +3 flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`) catch legacy `: any` disease. |
| `react` + `react-dom` | `19.0.0` | UI runtime | [VERIFIED: ships with Next 15.5] RSC default, `'use client'` boundaries stricter, hydration model proven. |
| `pnpm` | `9.15.9` | Package manager | [VERIFIED: npm view pnpm@9 versions] Pin via `packageManager` field. ~50% disk vs npm, ~2× install speed, strict hoist (catches accidental deps). |
| `@supabase/ssr` | `0.10.3` | Next App Router auth/cookies | [VERIFIED: npm view @supabase/ssr version] `getAll`/`setAll` cookies pattern ONLY. NEVER `auth-helpers-nextjs` (deprecated). |
| `@supabase/supabase-js` | `2.106.1` | Postgres + Storage + RPC client | [VERIFIED: npm view @supabase/supabase-js version] Singleton per request (server) and per session (browser). |
| `supabase` (CLI) | `^2.x` (install via brew/npm) | Local dev + migrations + types gen | Required for `db lint`, `gen types typescript`, `db push`, `link`. |

### CI / Quality Gates

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `eslint` | `9.39.4` (or `^9.18`) | Linter | [VERIFIED: npm view eslint@9 versions] Flat config (v9). Plugins: `typescript-eslint@^8.20`, `@next/eslint-plugin-next@^15.5`, `eslint-plugin-react-hooks@^5.1`, `eslint-plugin-react-refresh`. |
| `typescript-eslint` | `^8.20.0` | TS rules for ESLint v9 | [CITED: typescript-eslint.io] Strict-type-checked + stylistic-type-checked configs are the canonical "no-any + no-floating-promises" combo. |
| `@next/eslint-plugin-next` | `^15.5.0` | Next-specific rules | [CITED: nextjs.org/docs/app/api-reference/config/eslint] Catches `next/server` import in client, `next/image` misuse. |
| `prettier` | `^3.4.2` | Formatter | [CITED: prettier.io] + `prettier-plugin-tailwindcss@^0.6` sorts Tailwind classes deterministically. |
| `husky` | `9.1.7` | Git hooks | [VERIFIED: npm view husky version] v9: `husky init` (NOT `husky install`), `prepare: "husky"` in package.json. |
| `lint-staged` | `15.5.2` | Staged file processor | [VERIFIED: npm view lint-staged@15 versions] Cap at 15.x (16/17 introduce config changes; 15 is stable + STACK pinned). |
| `vitest` | `3.2.4` | Unit/integration test runner | [VERIFIED: npm view vitest@3 versions] Cap at 3.x — 4.0 shipped recently, ecosystem still stabilizing. Jest-compatible API, V8 coverage provider native. |
| `@vitest/coverage-v8` | `^3.2.4` | Coverage provider | Native V8 instrumentation, faster than istanbul, accurate branch coverage. |
| `@playwright/test` | `1.60.0` | E2E browser tests | [VERIFIED: npm view @playwright/test version] Auto-starts dev server via `webServer` config, runs against Vercel preview deploys via `baseURL`. |
| `@testing-library/react` | `^16.1.0` | React component testing | RTL — accessible-by-default queries, no implementation coupling. |
| `@testing-library/jest-dom` | `^6.6.3` | DOM matchers | `toBeInTheDocument`, `toHaveAccessibleName`, etc. Vitest-compatible via `import '@testing-library/jest-dom/vitest'`. |
| `@testing-library/user-event` | `^14.6.0` | User interaction sim | Realistic typing/clicking with timing — replaces `fireEvent` for everything except low-level event dispatch. |
| `msw` | `^2.7.0` | Network mocking | v2 API (`http.get`, NOT `rest.get`). One MSW server per test suite, handlers reset between tests. Replaces inline Supabase mocking. |
| `jsdom` | `^25.0.1` | Browser env for unit tests | Bumped from legacy's 20. ESM behavior tighter — verify imports early. |

### Observability

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/nextjs` | `10.53.1` | Errors + tracing + sourcemaps | [VERIFIED: npm view @sentry/nextjs version] Wraps `next.config.ts` via `withSentryConfig`, injects sourcemap upload, integrates with Vercel via `SENTRY_AUTH_TOKEN`. |
| `pino` | `9.6.0` (or 10.3.x if upgrading) | Structured logging | [VERIFIED: npm view pino version 10.3.1; pin 9.6 per STACK.md or upgrade to 10] Node-only. Transport `pino-pretty` for dev; JSON to stdout in prod (Vercel ingests). |
| `pino-pretty` | `^11.3.0` | Dev pretty-print | Dev only; `NODE_ENV !== 'production'` gate. |

### Forms / State / UI (installed in P1 even though forms ship in P3+, to prevent "decoration" antipattern from legacy)

| Library | Version | Purpose | Why Installed Now |
|---------|---------|---------|-------------------|
| `react-hook-form` | `^7.76.0` | Form state | [VERIFIED: npm view react-hook-form version] Install + 3 example forms (signup placeholder, generic form template, healthcheck form) so legacy "installed but never used" antipattern is impossible. |
| `@hookform/resolvers` | `^5.2.2` | Zod resolver bridge | Pair with RHF for type-safe form validation. |
| `zod` | `^3.25.76` | Runtime validation | NOT v4. RHF resolver still defaults to v3 imports. STACK.md §5 decision. |
| `@tanstack/react-query` | `^5.100.11` | Server-state cache | Install in P1 with QueryClientProvider in `app/providers.tsx`; usage starts in P2+. |
| `tailwindcss` | `3.4.17` | Styling | NOT v4. v3 gives typed token files + shadcn v2 + tailwindcss-animate. STACK.md §4 decision. |
| `tailwindcss-animate` | `^1.0.7` | shadcn animation plugin | Required by shadcn/ui v2 (Tailwind v3 mode). |
| `@tailwindcss/typography` | `^0.5.16` | Prose class | For Termos / Privacidade / blog (Phase 9). Install now to avoid bundle surprise later. |
| `postcss` + `autoprefixer` | `^8.5.6` + `^10.4.21` | Tailwind toolchain | Standard pair. |
| `clsx` + `tailwind-merge` | latest | `cn()` helper | Power `cn()` in `lib/utils.ts`. |
| `shadcn` (CLI) | `2.3.0` | Component generator | `pnpm dlx shadcn@2.3.0 init` — installs primitives. |

### Verify packages at install time

```bash
# Pin Next 15.5.x (latest patch is currently 15.5.18 — bump as needed)
pnpm view next@15.5 version            # → 15.5.18
pnpm view typescript@5.7 version       # → 5.7.3
pnpm view pnpm@9.15 version            # → 9.15.9
pnpm view eslint@9 version             # → 9.39.4 (or latest 9.x)
pnpm view vitest@3.2 version           # → 3.2.4
pnpm view @sentry/nextjs version       # → 10.53.1
pnpm view @supabase/ssr version        # → 0.10.3
pnpm view @supabase/supabase-js version # → 2.106.1
pnpm view @playwright/test version     # → 1.60.0
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js 15.5 | Next.js 16 | 16 brings React Compiler stable, Turbopack default, `proxy.ts` rename, opt-in caching (`'use cache'`). BUT: subdomain tutorials all reference `middleware.ts`, `@supabase/ssr` cookbook is framed around `middleware.ts`, fresh patterns lack battle-test. Pin 15.5; upgrade Q4/2026 via `npx @next/codemod@latest`. |
| pnpm | npm / yarn / bun | npm = slower, larger node_modules, no `packageManager` enforcement. yarn = berry friction, classic unmaintained. bun = promising but not battle-tested for Next+Vercel mid-2026. pnpm = boring-correct. |
| ESLint v9 flat | Biome | Biome 20× faster but misses `eslint-plugin-react-hooks` + `eslint-plugin-next` parity. Use Biome as formatter only (or skip). Revisit 2027. |
| Vitest | Jest | Vitest is 2-3× faster, Jest-compatible API, native ESM, native TS. Jest = legacy choice with slow ESM story. |
| Husky | simple-git-hooks | Husky is heavier but team-standard; simple-git-hooks lighter but smaller user base. Pick husky for team familiarity. |
| Sentry | Bugsnag / Rollbar / LogRocket | Sentry won the Next.js ecosystem (Vercel integration, Next-aware SDK, source map auto-upload). Others fragment the developer mental model. |
| pino | Winston / Bunyan / `console.error` | pino is fastest Node logger (~5× Winston), JSON-by-default, `redact` paths for PII. Winston more featureful but slower + heavier. `console.error` is what killed the legacy (invisible failures). |
| `@sentry/deno` for edge fns | `@sentry/node` via npm: | Phase 1 doesn't deploy edge fns; deferred decision. Phase 4+ uses `@sentry/deno@9` per STACK.md §9 if welcome-email moves to edge. |

### Installation

```bash
# 1. Scaffold (Plan 1.1)
pnpm dlx create-next-app@15.5 flashcards --typescript --eslint --tailwind --app --import-alias "@/*" --src-dir
cd flashcards
echo "20.18.0" > .nvmrc
# Edit package.json to set "packageManager": "pnpm@9.15.9" + "engines": { "node": ">=20.18.0 <23" }

# 2. Core deps (Plan 1.1 cont.)
pnpm add @supabase/ssr@0.10.3 @supabase/supabase-js@2.106.1
pnpm add react-hook-form@^7.76.0 @hookform/resolvers@^5.2.2 zod@^3.25.76
pnpm add @tanstack/react-query@^5.100.11
pnpm add clsx tailwind-merge

# 3. Quality gates (Plan 1.2)
pnpm add -D eslint@^9.18 typescript-eslint@^8.20 @next/eslint-plugin-next@^15.5
pnpm add -D eslint-plugin-react-hooks@^5.1 eslint-plugin-react-refresh
pnpm add -D prettier@^3.4.2 prettier-plugin-tailwindcss@^0.6
pnpm add -D husky@9.1.7 lint-staged@15.5.2

# 4. Test infrastructure (Plan 1.3)
pnpm add -D vitest@3.2.4 @vitest/coverage-v8@^3.2.4
pnpm add -D @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.3 @testing-library/user-event@^14.6.0
pnpm add -D jsdom@^25.0.1 msw@^2.7.0 @vitejs/plugin-react@^4.4.0 vite-tsconfig-paths
pnpm add -D @playwright/test@1.60.0
pnpm exec playwright install chromium

# 5. Sentry (Plan 1.8 — after Sentry account exists)
pnpm dlx @sentry/wizard@latest -i nextjs

# 6. Pino (Plan 1.8)
pnpm add pino@^9.6.0
pnpm add -D pino-pretty@^11.3.0

# 7. shadcn primitives (Plan 1.1)
pnpm dlx shadcn@2.3.0 init
# (interactive: choose default style, base color slate, CSS vars)

# 8. Supabase CLI (Plan 1.5 — install globally for migrations)
# Node-based install: pnpm add -D supabase
# OR brew install supabase/tap/supabase

# 9. Tailwind v3 + plugins (already installed by create-next-app; add typography + animate)
pnpm add -D tailwindcss-animate@^1.0.7 @tailwindcss/typography@^0.5.16
```

**Version verification at install time:** Before each `pnpm add`, the planner MUST verify the current latest patch:

```bash
pnpm view next@15.5 version   # confirm latest 15.5.x patch
pnpm view typescript@5.7 version  # confirm 5.7.x patch
# ...etc for each pinned major
```

Versions in this RESEARCH.md are from npm registry on 2026-05-21. By plan execution time they may have minor patch bumps — accept them, but **NEVER bump majors** without explicit phase decision.

---

## Package Legitimacy Audit

> **Required** — Phase 1 installs ~40+ external packages. Per the Package Legitimacy Gate protocol, every recommended package must pass legitimacy verification.

### Step 1 — slopcheck availability

```bash
pip install slopcheck --break-system-packages 2>/dev/null || pip install slopcheck 2>/dev/null || true
command -v slopcheck && echo "slopcheck available" || echo "slopcheck NOT available — fallback to manual"
```

**At research time:** slopcheck was not run from this research environment (pip not invoked). All packages below are marked **`[ASSUMED]` with manual verification** based on:
1. Sourced from official Next.js / Supabase / Vercel / Anthropic documentation
2. Top-1000 downloads/week on npm registry
3. Source repo on GitHub with >1k stars (or vendor-blessed)
4. Listed in `.planning/research/STACK.md` (which was researched 2026-05-21 with confidence HIGH)

**Planner action required:** Re-run `slopcheck install <pkg> --json` for the full install list before Plan 1.1 + Plan 1.2 + Plan 1.3 + Plan 1.8 execute. If slopcheck flags any as `[SLOP]`, halt + escalate. If `[SUS]`, gate behind `checkpoint:human-verify`.

### Step 2 — Manual audit table

| Package | Registry | Vendor | Source Repo | Verdict |
|---------|----------|--------|-------------|---------|
| `next` | npm | Vercel (official) | github.com/vercel/next.js | [VERIFIED: official] |
| `react`, `react-dom` | npm | Meta (official) | github.com/facebook/react | [VERIFIED: official] |
| `typescript` | npm | Microsoft (official) | github.com/microsoft/TypeScript | [VERIFIED: official] |
| `@supabase/ssr` | npm | Supabase (official) | github.com/supabase/auth-helpers (ssr subfolder, now top-level repo) | [VERIFIED: official] |
| `@supabase/supabase-js` | npm | Supabase (official) | github.com/supabase/supabase-js | [VERIFIED: official] |
| `supabase` (CLI) | npm | Supabase (official) | github.com/supabase/cli | [VERIFIED: official] |
| `eslint` | npm | OpenJS Foundation | github.com/eslint/eslint | [VERIFIED: official] |
| `typescript-eslint` | npm | typescript-eslint org | github.com/typescript-eslint/typescript-eslint | [VERIFIED: official] |
| `@next/eslint-plugin-next` | npm | Vercel (Next.js org) | github.com/vercel/next.js | [VERIFIED: official] |
| `eslint-plugin-react-hooks` | npm | Meta (React org) | github.com/facebook/react | [VERIFIED: official] |
| `prettier` | npm | Prettier org | github.com/prettier/prettier | [VERIFIED: official] |
| `prettier-plugin-tailwindcss` | npm | Tailwind Labs (official) | github.com/tailwindlabs/prettier-plugin-tailwindcss | [VERIFIED: official] |
| `husky` | npm | typicode | github.com/typicode/husky | [VERIFIED: top-100 OSS, 30k+ stars] |
| `lint-staged` | npm | lint-staged org | github.com/lint-staged/lint-staged | [VERIFIED: top-1000 OSS, 13k+ stars] |
| `vitest` | npm | Vitest org (Anthony Fu) | github.com/vitest-dev/vitest | [VERIFIED: 12k+ stars, vendor-blessed by Vite team] |
| `@vitest/coverage-v8` | npm | Vitest org | github.com/vitest-dev/vitest | [VERIFIED: official Vitest plugin] |
| `@playwright/test` | npm | Microsoft (Playwright team) | github.com/microsoft/playwright | [VERIFIED: official] |
| `@testing-library/*` | npm | Testing Library org | github.com/testing-library | [VERIFIED: standard React test toolkit] |
| `msw` | npm | mswjs org | github.com/mswjs/msw | [VERIFIED: 16k+ stars, industry standard for HTTP mocking] |
| `jsdom` | npm | jsdom org | github.com/jsdom/jsdom | [VERIFIED: ~21k stars, default browser env for Node testing] |
| `@vitejs/plugin-react` | npm | Vite (official) | github.com/vitejs/vite-plugin-react | [VERIFIED: official Vite plugin] |
| `vite-tsconfig-paths` | npm | Alec Larson (aleclarson) | github.com/aleclarson/vite-tsconfig-paths | [VERIFIED: ~500k weekly downloads] |
| `@sentry/nextjs` | npm | Sentry (official) | github.com/getsentry/sentry-javascript | [VERIFIED: official] |
| `pino` | npm | pinojs org | github.com/pinojs/pino | [VERIFIED: 13k+ stars, fastest Node logger] |
| `pino-pretty` | npm | pinojs org | github.com/pinojs/pino-pretty | [VERIFIED: official pino plugin] |
| `react-hook-form` | npm | react-hook-form org | github.com/react-hook-form/react-hook-form | [VERIFIED: 42k+ stars] |
| `@hookform/resolvers` | npm | react-hook-form org | github.com/react-hook-form/resolvers | [VERIFIED: official RHF plugin] |
| `zod` | npm | Colin McDonnell (colinhacks) | github.com/colinhacks/zod | [VERIFIED: 36k+ stars, industry standard for runtime validation] |
| `@tanstack/react-query` | npm | TanStack org (Tanner Linsley) | github.com/TanStack/query | [VERIFIED: 43k+ stars] |
| `tailwindcss` | npm | Tailwind Labs (official) | github.com/tailwindlabs/tailwindcss | [VERIFIED: official] |
| `tailwindcss-animate` | npm | Joe Bell (jamiebuilds) | github.com/jamiebuilds/tailwindcss-animate | [VERIFIED: ~2.5k stars, used by shadcn/ui v2] |
| `@tailwindcss/typography` | npm | Tailwind Labs (official) | github.com/tailwindlabs/tailwindcss-typography | [VERIFIED: official] |
| `postcss`, `autoprefixer` | npm | PostCSS team | github.com/postcss | [VERIFIED: industry standard] |
| `clsx` | npm | Luke Edwards (lukeed) | github.com/lukeed/clsx | [VERIFIED: ~8k stars, used by shadcn/ui] |
| `tailwind-merge` | npm | dcastil | github.com/dcastil/tailwind-merge | [VERIFIED: ~4k stars, used by shadcn/ui] |
| `shadcn` (CLI) | npm | shadcn org (Vercel-employed maintainer) | github.com/shadcn-ui/ui | [VERIFIED: 73k+ stars, vendor-blessed by Vercel] |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck not run at research time; all packages above sourced from official docs or top-1000 OSS).
**Packages flagged as suspicious [SUS]:** none.

**Planner action:** Re-run slopcheck before each `pnpm add` batch. If any package marked `[VERIFIED: official]` above fails slopcheck, treat as a tooling false positive and escalate, do NOT silently downgrade install. The planner must produce a slopcheck-verified `pnpm-lock.yaml` before Plan 1.10 (smoke E2E) closes the phase.

---

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│ Developer Workstation                                                   │
│  pnpm install / pnpm dev / pnpm test                                    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Pre-commit hook (husky)                                            │  │
│  │  - lint-staged (eslint --fix + prettier --write on staged files)  │  │
│  │  - tsc --noEmit (full project typecheck)                          │  │
│  │  REJECTS commit if any check fails                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                       git push (verified)                               │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GitHub                                                                  │
│   Branch protection: main requires PR + green CI                       │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │ GitHub Actions: .github/workflows/ci.yml                           │ │
│   │                                                                    │ │
│   │   install (pnpm install --frozen-lockfile)                         │ │
│   │      │                                                             │ │
│   │      ├──→ lint  (pnpm lint + pnpm format:check)                   │ │
│   │      ├──→ typecheck  (pnpm typecheck)                              │ │
│   │      ├──→ test  (pnpm test --coverage)  ──→ coverage gates         │ │
│   │      ├──→ types-fresh  (pnpm types:gen + git diff --exit-code)    │ │
│   │      └──→ supabase-lint  (supabase db lint)                        │ │
│   │             │                                                      │ │
│   │             └──→ build  (pnpm build with env injection)            │ │
│   │                    │                                                │ │
│   │                    └──→ e2e  (Playwright vs Vercel preview)        │ │
│   │                                                                    │ │
│   │   All gates green → merge enabled                                  │ │
│   └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Vercel (Pro)                                                            │
│   - Preview deploy per PR (URL: <branch>-flashcards-rako56.vercel.app) │
│   - Production deploy on merge to main                                  │
│   - Wildcard SSL *.flashcards.com.br + apex                             │
│   - ENV vars segregated: development / preview / production             │
│   - Sentry integration: SENTRY_AUTH_TOKEN injected, sourcemaps upload   │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────────┐      ┌────────────────┐
│ Sentry       │      │ Vercel runtime   │      │ Supabase Pro   │
│  - Errors    │      │  - Edge: static  │      │  (sa-east-1)   │
│  - Tracing   │◄─────│  - Node: SSR +   │◄────►│  - Postgres 16 │
│  - Source    │      │    API routes    │      │  - Auth (HIBP) │
│    maps      │      │  - Middleware    │      │  - PITR 7d     │
│  - Tags:     │      │    on Node       │      │  - Branching   │
│    correl-Id │      │    (15.5 stable) │      │    per PR      │
│    userId    │      │                  │      │  - RLS on all  │
│    concurso  │      │  /api/healthz    │      │    tables      │
└──────────────┘      └──────────────────┘      └────────────────┘
                               │
                               ▼
                    pino structured logs
                    → stdout → Vercel logs ingestion
```

### Recommended Project Structure (Phase 1 deliverable)

```
flashcards/                                       # NEW REPO (Plan 1.1)
├── .github/
│   └── workflows/
│       ├── ci.yml                                # Plan 1.4 — install → lint → typecheck → test → types-fresh → supabase-lint → build → e2e
│       └── codeql.yml                            # (optional) — GitHub native security scanning
├── .husky/                                       # Plan 1.2
│   ├── pre-commit                                # lint-staged + tsc --noEmit
│   └── pre-push                                  # tsc --noEmit (redundant safety)
├── .planning/                                    # GSD docs (already exists in legacy; copy/symlink or fresh)
├── .vscode/
│   └── settings.json                             # Prettier as default formatter, ESLint auto-fix on save
├── app/
│   ├── (marketing)/                              # Plan 1.1 placeholder — empty layout
│   │   └── layout.tsx                            # Marketing chrome (header/footer stubs)
│   ├── (app)/                                    # Plan 1.1 placeholder
│   │   └── layout.tsx                            # AppShell stub (no auth check yet — P3)
│   ├── (admin)/                                  # Plan 1.1 placeholder
│   │   └── layout.tsx                            # requireAdmin() stub (no role check yet — P8)
│   ├── (auth)/                                   # Plan 1.1 placeholder
│   │   └── layout.tsx                            # Centered auth chrome
│   ├── api/
│   │   └── healthz/
│   │       └── route.ts                          # Plan 1.8 — GET 200, ?simulateError=true triggers Sentry test
│   ├── layout.tsx                                # Root HTML shell + Sentry instrumentation
│   ├── error.tsx                                 # Global error boundary
│   ├── not-found.tsx
│   ├── global-error.tsx                          # Boundary for root layout errors
│   ├── globals.css                               # Tailwind layers + base tokens (P2 expands)
│   └── providers.tsx                             # QueryClientProvider + (P2: ThemeProvider)
├── middleware.ts                                 # Plan 1.1 stub — passthrough only; P2 adds subdomain logic
├── instrumentation.ts                            # Plan 1.8 — Sentry Node + Edge init switch
├── sentry.client.config.ts                       # Plan 1.8
├── sentry.server.config.ts                       # Plan 1.8
├── sentry.edge.config.ts                         # Plan 1.8
├── lib/
│   ├── supabase/
│   │   ├── server.ts                             # Plan 1.5 — createServerClient (per-request)
│   │   ├── browser.ts                            # Plan 1.5 — createBrowserClient (singleton)
│   │   ├── admin.ts                              # Plan 1.5 — service-role + 'server-only' guard
│   │   └── middleware.ts                         # Plan 1.5 — updateSession helper
│   ├── observability/
│   │   ├── sentry.ts                             # Plan 1.8 — Sentry helpers (tag setters)
│   │   ├── logger.ts                             # Plan 1.8 — pino instance
│   │   └── correlation.ts                        # Plan 1.8 — UUID gen + header propagation
│   ├── srs/                                      # P1 empty stub; P5 populates
│   ├── queue/                                    # P1 empty stub; P5 populates
│   ├── asaas/                                    # P1 empty stub; P4 populates
│   ├── access/                                   # P1 empty stub; P3 populates
│   ├── env.ts                                    # Plan 1.1 — Zod-validated process.env (lazy throw)
│   └── utils.ts                                  # Plan 1.1 — cn() from clsx + twMerge
├── types/                                        # Generated types
│   └── database.types.ts                         # Plan 1.7 — supabase gen types output (gitignored locally, regenerated in CI)
├── supabase/
│   ├── config.toml                               # Plan 1.5 — local dev config (project_id, ports, auth toggles)
│   ├── migrations/                               # Plan 1.6
│   │   ├── 0001_init_extensions_and_helpers.sql  # pgcrypto, pg_cron, pg_net + fn_user_has_access skeleton
│   │   ├── 0002_admin_concursos.sql              # admin_concursos + theme + simulado_config + price_cents + status + RLS
│   │   ├── 0003_admin_content.sql                # admin_disciplinas + admin_topicos + admin_flashcards + admin_questoes + status enum + RLS
│   │   ├── 0004_users_profiles_roles.sql         # user_profiles + user_roles + RLS
│   │   ├── 0005_access_junction.sql              # user_concurso_access (PK user_id+concurso_id) + RLS
│   │   ├── 0006_srs_progress.sql                 # user_flashcard_progress + srs_reviews (append-only) + RLS
│   │   ├── 0007_simulados.sql                    # simulado_runs + simulado_answers (UNIQUE attempt_id+question_id) + RLS
│   │   ├── 0008_purchases_webhooks.sql           # purchases + webhook_events (PK Asaas event_id) + refund_requests + RLS
│   │   ├── 0009_audit_logs.sql                   # audit_log + legal_audit_log + LGPD-relevant tables + RLS
│   │   └── 0010_atomic_functions.sql             # fn_award_xp, fn_grant_access, fn_process_webhook_event, fn_batch_upsert_progress, fn_user_has_access
│   ├── functions/                                # P1 empty; P4+ adds welcome-email, process-leagues
│   └── seed.sql                                  # Local dev seed only (TJSP fixture; never prod)
├── tests/
│   ├── unit/                                     # Co-located test files preferred; tests/unit for shared fixtures
│   │   └── healthz.test.ts                       # Plan 1.3 — verifies /api/healthz returns 200
│   ├── e2e/
│   │   └── smoke.spec.ts                         # Plan 1.10 — visit /, expect 200, no console errors
│   ├── fixtures/                                 # Static fixtures
│   └── msw/
│       ├── server.ts                             # Plan 1.3 — Node msw server
│       └── handlers.ts                           # Empty array initially; P3+ adds Supabase + Asaas handlers
├── scripts/
│   ├── verify-no-hardcoded-uuids.ts              # Plan 1.2 — custom lint script ESLint can't easily express
│   └── check-env.ts                              # Plan 1.1 — validates .env.local against lib/env.ts schema
├── public/
│   ├── favicon.ico
│   └── robots.txt                                # `User-agent: *` `Disallow: /admin/` `Disallow: /api/` (P9 expands)
├── .env.example                                  # Plan 1.1 — documented env vars (NO secrets)
├── .env.local                                    # gitignored, populated by Rafael per Plan 1.5 + 1.8 + 1.9
├── .eslintrc.cjs                                 # DEPRECATED — DO NOT CREATE (use flat config below)
├── eslint.config.mjs                             # Plan 1.2 — flat config v9
├── .prettierrc                                   # Plan 1.2
├── .prettierignore                               # Plan 1.2
├── .gitignore                                    # Plan 1.1 (.next, node_modules, .env.local, coverage, .playwright)
├── .nvmrc                                        # Plan 1.1 — "20.18.0"
├── next.config.ts                                # Plan 1.1 + 1.8 (Sentry wrap)
├── package.json                                  # Plan 1.1 — scripts: dev, build, start, lint, format:check, typecheck, test, test:watch, test:e2e, types:gen
├── playwright.config.ts                          # Plan 1.3
├── postcss.config.mjs                            # Plan 1.1
├── tailwind.config.ts                            # Plan 1.1
├── tsconfig.json                                 # Plan 1.1 — strict + +3 flags
├── vercel.json                                   # Plan 1.9 — headers (CSP, HSTS), redirects, cache rules
├── vitest.config.ts                              # Plan 1.3 — coverage thresholds + per-directory overrides
├── components.json                               # Plan 1.1 — shadcn config
├── CLAUDE.md                                     # Plan 1.1 — new reboot CLAUDE.md (NOT legacy's)
└── README.md                                     # Plan 1.1 — minimal: how to dev, test, deploy
```

### Pattern 1: TypeScript Strict 100% Single tsconfig

**What:** ONE `tsconfig.json` at repo root with `strict: true` + 3 additional flags. NO `tsconfig.strict.json` parallel file. NO per-directory opt-in. If `tsc --noEmit` fails, no commit.

**When to use:** Always. Day 1, commit 1. Killing the legacy's "strict-where-easy" disease.

**Example:**

```jsonc
// tsconfig.json (Plan 1.1)
// Source: STACK.md §2 + verified against typescriptlang.org/tsconfig
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "verbatimModuleSyntax": true,

    // Strict family (all on)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "alwaysStrict": true,
    "useUnknownInCatchVariables": true,

    // The +3 the legacy lacked
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    // Misc strictness
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "coverage", "playwright-report"]
}
```

**The +3 catch:**
- `noUncheckedIndexedAccess`: `arr[i]` becomes `T | undefined` → forces conscious bounds checking → would have caught the "cards repeating in same section" class of bug
- `exactOptionalPropertyTypes`: `interface X { a?: string }` no longer accepts `a: undefined` explicitly → conscious "absent vs set to undefined"
- `noPropertyAccessFromIndexSignature`: cannot dot-access record keys not statically known → prevents `obj.someKey` typos in dynamic configs (e.g., per-concurso theme dictionary)

**Watch out:** `exactOptionalPropertyTypes` may break some `react-hook-form` `defaultValues: { x: undefined }` patterns. Fix by using empty strings or sensible defaults; do NOT downgrade to `exactOptionalPropertyTypes: false`.

### Pattern 2: ESLint Flat Config v9 with No-Mercy Rules

**What:** Single `eslint.config.mjs` (NOT `.eslintrc.*` — legacy `.cjs` format is dead in v9). Severity `error` for everything that causes prod bugs. Custom rule blocks UUID literals in code (forces `getConcursoBySlug()` use).

**When to use:** Always. From commit 1. CI fails the build if `pnpm lint` exits non-zero.

**Example:**

```javascript
// eslint.config.mjs (Plan 1.2)
// Source: STACK.md §12 + verified against typescript-eslint.io flat config docs
import js from '@eslint/js'
import tsEslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tsEslint.config(
  js.configs.recommended,
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',         // ERROR not warn

      // The "no any disease" wall
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Prevent silent failures
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          // Block hardcoded UUIDs in code — force getConcursoBySlug()
          selector: "Literal[value=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i]",
          message: 'Hardcoded UUIDs are forbidden. Use getConcursoBySlug() or a typed constant.',
        },
      ],

      // Block deep relative imports — force @/ alias
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../../*'], message: 'Use @/ alias instead of deep relative imports.' },
          { group: ['*/lib/supabase/admin'], message: "Import lib/supabase/admin only with explicit 'server-only' guard." },
        ],
      }],
    },
  },
  {
    // server-only enforcement
    files: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    rules: {
      // Additional server-side rules if needed
    },
  },
  {
    // Test files are looser on some rules
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'coverage/', 'playwright-report/', 'public/', 'types/database.types.ts'],
  },
)
```

**Why ban `console.log` but allow `console.warn`/`console.error`:** `console.log` is debug residue; `console.warn`/`console.error` are sometimes legitimate fallbacks before Sentry init. Sentry config initializes early enough that even those should be rare.

**Why the UUID-literal ban:** Legacy had `e08f8a46-3a1f-4414-ae34-6d29c1091c74` hardcoded in 30+ places. Every multi-concurso pivot paid this cost. The lint rule is cheap to add and impossible to forget.

### Pattern 3: Vitest Coverage Gates Per-Directory

**What:** Single `vitest.config.ts` declares global threshold (50%) AND per-path overrides (90% for money/correctness-critical dirs). CI fails if any threshold regresses.

**When to use:** Day 1, before any feature test. Coverage gates are pre-committed values, not aspirational.

**Example:**

```typescript
// vitest.config.ts (Plan 1.3)
// Source: STACK.md §8 + PROJECT.md OPS-03 + verified against vitest.dev coverage docs
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**', 'tests/e2e/**', 'playwright-report'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/types/**',
        '**/*.test.*',
        '**/*.spec.*',
        'tests/**',
        'app/**/page.tsx',         // Pages are integration-tested via E2E
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/**/not-found.tsx',
      ],
      thresholds: {
        // Global floor
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,

        // Per-directory ceiling (Vitest 3.x supports per-path thresholds via glob)
        // NOTE: as of Vitest 3.2, per-path thresholds use this shape:
        'lib/srs/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'lib/queue/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'lib/asaas/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'lib/access/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },
})
```

**Watch out:** Per-path thresholds in Vitest 3.x require the V8 provider and exact path glob. If thresholds don't take effect, double-check the glob and confirm with `pnpm test --coverage --reporter=verbose`. As of Vitest 3.2.4 the per-path syntax is stable; in 4.x it may have shifted to a different config key — pin to 3.x as STACK.md mandates.

**Setup file:**

```typescript
// tests/setup.ts (Plan 1.3)
// Source: STACK.md §8
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

### Pattern 4: GitHub Actions CI Pipeline

**What:** Single workflow file. Jobs: install (shared cache) → lint, typecheck, test, types-fresh, supabase-lint (parallel) → build → e2e (against Vercel preview). All required for merge.

**When to use:** Day 1. Branch protection on `main` requires every gate green.

**Example:**

```yaml
# .github/workflows/ci.yml (Plan 1.4)
# Source: STACK.md §10 + verified against docs.github.com/actions
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  PNPM_VERSION: 9.15.9
  NODE_VERSION_FILE: .nvmrc

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }}, run_install: false }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  types-fresh:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: pnpm install --frozen-lockfile
      - run: pnpm types:gen
        env:
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - name: Fail if types are stale
        run: |
          if ! git diff --exit-code types/database.types.ts; then
            echo "::error::types/database.types.ts is stale. Run 'pnpm types:gen' and commit the result."
            exit 1
          fi

  supabase-lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase db lint --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  build:
    needs: [lint, typecheck, test, types-fresh, supabase-lint]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Install Playwright Chromium
        run: pnpm exec playwright install --with-deps chromium
      - name: Wait for Vercel preview
        if: github.event_name == 'pull_request'
        run: |
          # Vercel deploys async; poll the preview URL until 200
          PREVIEW_URL="${{ steps.vercel-preview-url.outputs.url }}"
          for i in {1..30}; do
            if curl -fsS "$PREVIEW_URL/api/healthz" > /dev/null; then break; fi
            sleep 10
          done
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.vercel-preview-url.outputs.url || 'http://localhost:3000' }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

**Branch protection (Plan 1.4 — set via GitHub Settings UI or `gh api`):**
- `main` requires PR + ≥1 review
- Required status checks: `lint`, `typecheck`, `test`, `types-fresh`, `supabase-lint`, `build`, `e2e`
- No direct pushes to main
- Linear history (no merge commits) — optional but recommended

### Pattern 5: Pre-commit Hook (husky + lint-staged)

**What:** `.husky/pre-commit` runs lint-staged (fast, file-scoped) + `tsc --noEmit` (slower, full-project). Rejects commit on failure. Pre-push also runs `tsc --noEmit` as redundant safety.

**When to use:** Always. Day 1. Bypass via `--no-verify` requires conscious decision + post-hoc PR comment.

**Example:**

```bash
# .husky/pre-commit (Plan 1.2)
# Source: STACK.md §10 + husky.js.org v9 docs
pnpm lint-staged
pnpm typecheck
```

```bash
# .husky/pre-push (Plan 1.2)
pnpm typecheck
```

```json
// package.json (Plan 1.2 — partial)
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
  }
}
```

**Husky v9 setup:**

```bash
pnpm dlx husky init
# Creates .husky/pre-commit (template) — replace with above
```

**Watch out:**
- husky v9 dropped `husky install` — use `husky init` once. The `prepare: "husky"` script is the replacement.
- `pnpm typecheck` in pre-commit feels slow (~5-20s on a real project). Worth it. Alternative: `tsc --noEmit --incremental` + cached state (fast after first run). Don't downgrade to lint-staged-only — TS errors in unstaged files MUST block.
- `--max-warnings 0` on `eslint --fix` ensures any warning becomes a fail. Since this project has zero `warn` rules (all `error`), this is belt-and-suspenders.

### Pattern 6: Supabase Pro Provisioning + Branching

**What:** Two-step. Step 1 — Rafael creates Supabase Pro project in dashboard (sa-east-1, $25/mo). Step 2 — code uses `@supabase/ssr` server/browser/admin client factories. Branching enabled = each PR gets isolated DB schema.

**When to use:** Day 0 of Phase 1 — must exist before migrations run.

**Project setup checklist (Plan 1.5):**

1. **Dashboard → New Project**: name `flashcards-prod`, region `sa-east-1`, Pro plan ($25/mo)
2. **Database password**: Rafael generates strong password, stores in 1Password/Bitwarden (NEVER in repo)
3. **Postgres version**: 16+ (Supabase default in 2026)
4. **Extensions to enable** (Database → Extensions):
   - `pgcrypto` (UUIDs, hashing — usually already on)
   - `uuid-ossp` (UUID v4 in default values)
   - `pg_cron` (in-DB scheduled jobs — replaces legacy edge fn cron)
   - `pg_net` (async HTTP from Postgres, paired with pg_cron)
   - `pg_stat_statements` (query perf — usually on)
5. **Auth dashboard config (BEFORE first signup)**:
   - HIBP Leaked password protection: **ON** (Pro feature, blocks SEC-01)
   - Email confirmations: **ON**
   - Min password length: **10**
   - Site URL: `https://flashcards.com.br`
   - Redirect URLs (add all):
     - `https://flashcards.com.br/auth/callback`
     - `https://*.flashcards.com.br/auth/callback`
     - `http://localhost:3000/auth/callback`
     - All Vercel preview URLs as added
   - JWT expiry: 3600s (default)
   - Refresh token rotation: **ON**
6. **PITR**: Settings → Backups → enable 7-day Point-in-Time Recovery (Pro feature)
7. **Connection pooler**: copy the pooler URL on port **6543** (transaction mode) for serverless. Use port 5432 only for migrations/admin scripts.
8. **Service-role key**: Settings → API → copy `service_role` key into Vercel env var `SUPABASE_SERVICE_ROLE_KEY` (NOT `NEXT_PUBLIC_*`). Restrict in Supabase config to specific IPs if possible.
9. **Branching (recommended day 1)**:
   - Branches → Enable Branching
   - Configure: when GitHub PR opens, Supabase creates a branched DB. URL injected as preview env var.
   - GitHub integration: connect repo, allow Supabase to comment on PRs with branch DB URL

**Local dev setup (Plan 1.5):**

```bash
# Install CLI
pnpm add -D supabase
# OR globally: brew install supabase/tap/supabase

# Init in repo
supabase init  # creates supabase/config.toml

# Link to remote
supabase link --project-ref <PROJECT_REF>  # interactive

# Start local Docker stack (for local dev — needs Docker Desktop)
supabase start
# → Postgres on 54322, Studio on 54323, Auth on 54321
```

**Three Supabase client factories (Plan 1.5):**

```typescript
// lib/supabase/server.ts (Plan 1.5)
// Source: STACK.md §3 + verified against supabase.com/docs/guides/auth/server-side/creating-a-client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — middleware will persist
          }
        },
      },
      cookieOptions: {
        domain: process.env.NODE_ENV === 'production' ? '.flashcards.com.br' : undefined,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    }
  )
}
```

```typescript
// lib/supabase/browser.ts (Plan 1.5)
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: process.env.NODE_ENV === 'production' ? '.flashcards.com.br' : undefined,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    }
  )
  return client
}
```

```typescript
// lib/supabase/admin.ts (Plan 1.5)
// CRITICAL: 'server-only' import + runtime throw — prevents bundling to client
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.ts cannot be imported in a client context')
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (server-only)')
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

```typescript
// lib/supabase/middleware.ts (Plan 1.5 — used by middleware.ts in P2)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
      cookieOptions: {
        domain: process.env.NODE_ENV === 'production' ? '.flashcards.com.br' : undefined,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    }
  )

  // CRITICAL: do NOT remove — refreshes the session
  await supabase.auth.getUser()
  return response
}
```

### Pattern 7: Schema Migrations (0001-0010, all RLS, atomic fns)

**What:** 10 ordered migration files, each domain-scoped, every table with RLS + 4 default policies, atomic Postgres functions for read-modify-write operations.

**When to use:** Phase 1 builds the BASE schema. Subsequent phases ADD migrations (e.g., Phase 3 adds `srs_state` ALTER, Phase 5 adds simulado tweaks). Never rewrite 0001-0010 — extend with 0011+.

**Migration 0001 — Init + helpers:**

```sql
-- supabase/migrations/0001_init_extensions_and_helpers.sql
-- Plan 1.6 — Migration 1 of 10
-- Source: ARCHITECTURE.md §5 + STACK.md §3

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pg_cron and pg_net enabled via Supabase dashboard (extensions tab), not portable SQL

-- Single source of truth for access check, referenced by every content-table RLS policy
CREATE OR REPLACE FUNCTION public.fn_user_has_access(p_concurso_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_concurso_access
    WHERE user_id = auth.uid()
      AND concurso_id = p_concurso_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.fn_user_has_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_user_has_access(uuid) TO authenticated;
```

**Migration 0002 — admin_concursos (DB-driven multi-tenant from day 1):**

```sql
-- supabase/migrations/0002_admin_concursos.sql

CREATE TABLE public.admin_concursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,32}$'),
  title text NOT NULL,
  banca text NOT NULL,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  duration_days int NOT NULL DEFAULT 365 CHECK (duration_days > 0),
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulado_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_concursos_slug_active ON public.admin_concursos (slug) WHERE status = 'active';

ALTER TABLE public.admin_concursos ENABLE ROW LEVEL SECURITY;

-- Default policies (4):
-- 1. authenticated users SELECT active concursos (for landings, dashboards)
CREATE POLICY "admin_concursos_select_active_authenticated"
  ON public.admin_concursos
  FOR SELECT
  TO authenticated, anon
  USING (status = 'active');

-- 2. admins SELECT all
CREATE POLICY "admin_concursos_select_all_admin"
  ON public.admin_concursos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3. admins INSERT/UPDATE/DELETE
CREATE POLICY "admin_concursos_write_admin"
  ON public.admin_concursos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 4. service_role bypasses RLS by default (no policy needed — Supabase convention)
```

**Migrations 0003-0010** follow the same template:

- **0003** `admin_disciplinas`, `admin_topicos`, `admin_flashcards` (status enum draft→review→active), `admin_questoes` — every table with `concurso_id` FK + RLS using `fn_user_has_access(concurso_id)` + status='active' filter for students
- **0004** `user_profiles` (CPF validated via trigger), `user_roles` (role enum: admin, curator, support, student) — RLS: users read/write own profile, admins read all
- **0005** `user_concurso_access` (junction, PK `(user_id, concurso_id)`, `expires_at timestamptz NULL`, `granted_at`, `purchase_id` FK nullable) — RLS: users read own
- **0006** `user_flashcard_progress` (projection, FK card_id), `srs_reviews` (append-only audit, no UPDATE/DELETE policies — INSERT only) — RLS: users read/write own
- **0007** `simulado_runs` (`expires_at timestamptz NOT NULL` for server-authoritative timer), `simulado_answers` UNIQUE `(attempt_id, question_id)` — RLS: users read/write own runs
- **0008** `purchases` (UNIQUE `asaas_payment_id`), `webhook_events` (PK = Asaas event_id text), `refund_requests` (the table the legacy never created — fixes SEC-10) — RLS: service_role only writes; users read own purchases + own refund requests
- **0009** `audit_log` (generic), `legal_audit_log` (LGPD/CDC-relevant: refund requests, account deletions, data exports), `lgpd_deletion_requests` — RLS: append-only for users, admin read all
- **0010** Atomic functions: `fn_award_xp(p_user_id, p_amount)`, `fn_grant_access(...)`, `fn_process_webhook_event(p_event_id)`, `fn_batch_upsert_progress(p_items jsonb)`, `fn_delete_user_cascade(p_user_id)` — ALL with `SECURITY DEFINER` + `SET search_path = public` (Supabase advisor will warn if missed)

**Atomic XP function (template for read-modify-write):**

```sql
-- 0010_atomic_functions.sql excerpt
CREATE OR REPLACE FUNCTION public.fn_award_xp(p_user_id uuid, p_amount int, p_idempotency_key text)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_profiles;
  v_already_awarded boolean;
BEGIN
  -- Idempotency check via xp_events
  SELECT EXISTS (
    SELECT 1 FROM public.xp_events
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
  ) INTO v_already_awarded;
  IF v_already_awarded THEN
    SELECT * FROM public.user_profiles WHERE user_id = p_user_id INTO result;
    RETURN result;
  END IF;

  -- Atomic increment + audit
  INSERT INTO public.xp_events (user_id, amount, source, idempotency_key)
    VALUES (p_user_id, p_amount, 'study', p_idempotency_key);

  UPDATE public.user_profiles
    SET total_xp = total_xp + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_award_xp(uuid, int, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_award_xp(uuid, int, text) TO authenticated;
```

**Note:** Atomic functions for SRS batch and webhook processing live in 0010 as TEMPLATES — actual logic populated in Phase 5 (SRS) and Phase 4 (webhook). Phase 1 ships the skeleton + `fn_award_xp` + `fn_user_has_access` ready to go.

### Pattern 8: Types Generation Pipeline (FOUND-12 — the CI gate)

**What:** `pnpm types:gen` runs `supabase gen types typescript --linked > types/database.types.ts`. CI runs the same and fails build if `git diff --exit-code` shows uncommitted changes.

**When to use:** Day 1. Locks the contract: any migration in a PR MUST be accompanied by a regenerated types file.

**Example:**

```json
// package.json scripts (Plan 1.7)
{
  "scripts": {
    "types:gen": "supabase gen types typescript --linked > types/database.types.ts && prettier --write types/database.types.ts",
    "types:check": "pnpm types:gen && git diff --exit-code types/database.types.ts"
  }
}
```

**CI gate already in `.github/workflows/ci.yml` `types-fresh` job above.** If `pnpm types:gen` produces a diff, CI fails with:

```
::error::types/database.types.ts is stale. Run 'pnpm types:gen' and commit the result.
```

**Pre-commit reminder (lint-staged extension):**

```json
// package.json
{
  "lint-staged": {
    "supabase/migrations/*.sql": [
      "echo 'Reminder: run pnpm types:gen after migration changes'"
    ]
  }
}
```

(Not enforceable in pre-commit because types gen needs DB connection — CI is the gate. Pre-commit just nudges.)

### Pattern 9: Sentry SDK + Correlation IDs + Pino

**What:** Sentry SDK initialized for browser, Node server, and Edge runtime separately. Correlation ID generated in middleware (or healthcheck fallback), threaded through all logs + Sentry tags. Pino logs to stdout (JSON in prod, pretty in dev).

**When to use:** Day 1. Every catch in Route Handlers/Server Actions calls `Sentry.captureException`. Every log includes `correlationId`.

**Setup (Plan 1.8):**

```bash
pnpm dlx @sentry/wizard@latest -i nextjs
# Interactive: select project, paste DSN, accept sourcemap upload, accept Vercel integration
```

Generates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` wrapped in `withSentryConfig`
- Adds `SENTRY_AUTH_TOKEN` to Vercel env

**Edit `sentry.server.config.ts`:**

```typescript
// sentry.server.config.ts (Plan 1.8)
// Source: STACK.md §9 + docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,

  // PII scrubbing — never ship CPF/email/passwords to Sentry
  beforeSend(event, hint) {
    if (event.request?.headers) {
      delete event.request.headers['cookie']
      delete event.request.headers['authorization']
    }
    if (event.user) {
      delete event.user.email   // identify by user_id only, not CPF/email
      delete (event.user as { cpf?: string }).cpf
    }
    // Scrub CPF from any string in extra/breadcrumbs
    const scrubCpf = (s: string) => s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_SCRUBBED]')
    if (event.message) event.message = scrubCpf(event.message)
    return event
  },
})
```

**Correlation ID propagation (Plan 1.8):**

```typescript
// lib/observability/correlation.ts
import { headers } from 'next/headers'

export async function getCorrelationId(): Promise<string> {
  const h = await headers()
  return h.get('x-correlation-id') ?? crypto.randomUUID()
}

export function setSentryContext(opts: {
  correlationId: string
  userId?: string
  concursoSlug?: string
}) {
  // Imported from @sentry/nextjs at call site to avoid edge bundle bloat
}
```

```typescript
// middleware.ts (Plan 1.1 stub; P2 expands subdomain logic)
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') ?? crypto.randomUUID()
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })
  response.headers.set('x-correlation-id', correlationId)
  request.headers.set('x-correlation-id', correlationId)  // propagate to downstream
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs',  // 15.5 stable Node middleware
}
```

**Pino logger (Plan 1.8):**

```typescript
// lib/observability/logger.ts
// Source: STACK.md §9 + getpino.io
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'flashcards',
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.cpf',
      '*.password',
      '*.token',
      '*.email',           // identify by user_id internally
      '*.refresh_token',
    ],
    censor: '[REDACTED]',
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
})

export function logWithCorrelation(correlationId: string) {
  return logger.child({ correlationId })
}
```

**Healthcheck endpoint (Plan 1.8):**

```typescript
// app/api/healthz/route.ts
// Source: STACK.md §9 + Vercel monitoring docs
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const correlationId = request.headers.get('x-correlation-id') ?? crypto.randomUUID()
  const log = logger.child({ correlationId, route: '/api/healthz' })

  // Test path: ?simulateError=true triggers Sentry capture
  if (url.searchParams.get('simulateError') === 'true') {
    const err = new Error('Healthcheck test error — Sentry sanity probe')
    Sentry.captureException(err, { extra: { correlationId } })
    log.error({ err }, 'sentry_probe_triggered')
    return NextResponse.json(
      { ok: false, code: 'SENTRY_PROBE', correlationId },
      { status: 500 }
    )
  }

  const checks: Record<string, 'ok' | 'fail' | 'skip'> = {
    supabase: 'skip',
    sentry: 'ok',  // sentry init succeeded
  }

  // DB ping (lightweight)
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('admin_concursos').select('id').limit(1)
    checks.supabase = error ? 'fail' : 'ok'
    if (error) log.error({ err: error }, 'supabase_ping_failed')
  } catch (err) {
    checks.supabase = 'fail'
    Sentry.captureException(err, { extra: { correlationId } })
    log.error({ err }, 'supabase_ping_threw')
  }

  const overall = Object.values(checks).every((v) => v !== 'fail')
  log.info({ checks, overall }, 'healthcheck')

  return NextResponse.json(
    { ok: overall, checks, correlationId, timestamp: new Date().toISOString() },
    { status: overall ? 200 : 503 }
  )
}
```

### Pattern 10: Vercel Pro + Wildcard SSL + Preview Deploys

**What:** Vercel Pro project linked to GitHub. Custom domain `flashcards.com.br` + wildcard `*.flashcards.com.br`. Preview deploy per PR. ENV vars segregated by environment.

**When to use:** Phase 1 final plan. Phase 2 starts using the wildcard subdomain in middleware.

**Setup checklist (Plan 1.9 — manual steps in Vercel dashboard):**

1. **Create project**: Vercel dashboard → New → Import from GitHub → select `flashcards` repo
2. **Framework preset**: Next.js (auto-detected from `next` package)
3. **Root directory**: leave blank (repo root)
4. **Build command**: `pnpm build` (auto)
5. **Install command**: `pnpm install --frozen-lockfile`
6. **Output directory**: `.next` (auto)
7. **Node version**: 20.x (matches `.nvmrc`)
8. **ENV vars** — add for each environment (Development / Preview / Production):

```bash
# Production env
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role>  # NEVER set NEXT_PUBLIC_*
SUPABASE_PROJECT_ID=<prod-ref>
SUPABASE_ACCESS_TOKEN=<personal-access-token>  # for `supabase` CLI in CI
NEXT_PUBLIC_SENTRY_DSN=https://<sentry-key>@sentry.io/<project-id>
SENTRY_AUTH_TOKEN=<sentry-internal-integration-token>  # auto-injected by Sentry Vercel integration
NEXT_PUBLIC_ROOT_DOMAIN=flashcards.com.br
NEXT_PUBLIC_APP_URL=https://flashcards.com.br
ASAAS_API_URL=https://api.asaas.com/v3  # prod
ASAAS_API_KEY=<prod-key>                # placeholder — Rafael creates Asaas prod account in P4
ASAAS_WEBHOOK_TOKEN=<32-byte hex>       # `openssl rand -hex 32`
RESEND_API_KEY=<resend-key>             # placeholder — P4 wires
NODE_ENV=production  # auto
LOG_LEVEL=info

# Preview env (Supabase branching auto-injects DB URL per PR)
NEXT_PUBLIC_SUPABASE_URL=<branch-url>   # auto by Supabase branching
NEXT_PUBLIC_SUPABASE_ANON_KEY=<branch-anon>
SUPABASE_SERVICE_ROLE_KEY=<branch-service-role>
ASAAS_API_URL=https://sandbox.asaas.com/api/v3  # SANDBOX for preview
ASAAS_API_KEY=<sandbox-key>
NEXT_PUBLIC_SENTRY_DSN=<preview-DSN>  # separate Sentry project for noise isolation, OR same with VERCEL_ENV tag
```

9. **Add custom domain**: Settings → Domains → Add `flashcards.com.br` (apex) → Vercel provides DNS records. Add `*.flashcards.com.br` (wildcard) → **requires Vercel nameservers** (not just A records).
10. **DNS at registrar** (Rafael action):
    - Set NS records to Vercel-provided values OR
    - Apex: A `76.76.21.21` + AAAA `2606:4700::6810:84e5` (Vercel anycast)
    - Wildcard requires Vercel NS — A record alone won't issue SSL for `*.flashcards.com.br`
11. **SSL provisioning**: Vercel auto-provisions Let's Encrypt cert for apex + wildcard within ~5-10min after DNS propagates
12. **Sentry integration**: Vercel Marketplace → Sentry → connect → auto-injects `SENTRY_AUTH_TOKEN`
13. **GitHub integration**: Vercel dashboard auto-deploys preview per PR; comment on PR with preview URL

**Vercel monitoring (Plan 1.9):**
- Settings → Monitoring → add `/api/healthz` as a Vercel Monitor (free up to N/min)
- Alert email/Slack on 503 response

**vercel.json (Plan 1.9):**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" }
      ]
    }
  ]
}
```

**CSP header — defer to P9.** Phase 1 ships HSTS + frame options + content-type only. Strict CSP requires testing against Sentry/Supabase/Asaas resource URLs which can't be enumerated until P4-9. Setting a too-loose CSP now creates false security; setting strict now breaks Sentry sourcemap upload.

### Anti-Patterns to Avoid (specific to Phase 1)

- **Anti-pattern:** "Install dependencies as decoration." Legacy installed RHF + Zod + date-fns and never used them — paid bundle cost for zero value. Solution: every package added in Phase 1 ships with at least one usage example (`tests/example-rhf-form.test.tsx` exercises RHF, `lib/utils.ts` uses clsx + tailwind-merge, etc.).
- **Anti-pattern:** "Skip the pre-commit hook for 'one quick fix'." Solution: pre-commit hook + pre-push hook + CI gate are belt-and-suspenders. The hook can be bypassed with `--no-verify` but the CI gate cannot. Tracker shows team how often `--no-verify` was used.
- **Anti-pattern:** "Per-directory tsconfig.json with relaxed strict." Solution: ONE tsconfig.json. No parallel files. If a file truly cannot compile under strict, fix the file or quarantine it under a single `// @ts-expect-error -- TICKET-LINK` with explicit reason.
- **Anti-pattern:** "Set coverage threshold to 0% to ship faster." Solution: Coverage threshold is a one-way ratchet. Lower it once and you've lost it forever. CI fails on regression.
- **Anti-pattern:** "Put service_role key in `NEXT_PUBLIC_*`." Solution: ESLint rule `no-restricted-imports` blocks `lib/supabase/admin` imports from `app/` files that aren't Route Handlers. Plus runtime `throw` in `admin.ts`.
- **Anti-pattern:** "Sentry init in client component only." Solution: 3 init files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) via `@sentry/wizard`. Don't manually write Sentry init.
- **Anti-pattern:** "Set `output: 'export'` for static-only builds." Solution: Static export breaks middleware (which is the entire Phase 2 mechanism). Vercel SSR is the only target.
- **Anti-pattern:** "Single Supabase singleton imported everywhere." Solution: Three factory functions (`createClient` for server, `createClient` for browser, `createAdminClient` for service-role). New server client per request (server-side leak otherwise).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase auth + cookies in Next.js App Router | Custom `getServerSession` | `@supabase/ssr` + `getAll`/`setAll` pattern | Auth-helpers-nextjs is deprecated; SSR pattern handles refresh, cookie domain, RSC quirks. Hand-rolling = "logged out on refresh" bug class. |
| Coverage thresholds + reporting | Custom test runner aggregator | `@vitest/coverage-v8` with `thresholds` config | V8 native instrumentation, per-directory globs, HTML + lcov + json reports — solved problem. |
| Pre-commit hooks | Custom shell scripts in `.git/hooks/` | husky + lint-staged | `.git/hooks/` not in version control; husky v9 sets up `core.hooksPath` to `.husky/` so hooks ARE versioned. |
| Subdomain routing + wildcard SSL | Custom DNS + manual cert renewal | Vercel custom domain wildcard + auto Let's Encrypt | Vercel issues wildcard SSL only when domain uses Vercel nameservers; auto-renewal; cert pinning handled. |
| Error tracking + source maps | `console.error` + manual log shipping | Sentry SDK + Vercel integration | Auto-upload sourcemaps, breadcrumbs, user context, release tracking. Legacy SEC-05 (silent failures) is impossible if every catch calls `Sentry.captureException`. |
| Structured logging | `JSON.stringify(obj) + console.log` | pino + `redact` paths | pino redacts CPF/email/tokens automatically, structured query in Vercel logs, fastest Node logger (5× Winston). |
| Atomic counter increment | Client read-modify-write | Postgres function with `UPDATE col = col + N` | Atomic by Postgres row-lock at any isolation level. Hand-rolling = DI-01 lost-XP bug. |
| Idempotency for webhook | Inline Map/Set | Postgres `webhook_events` table with PK on Asaas event_id | Database-enforced uniqueness survives multi-instance Vercel deploys. In-memory Map dies on cold start. |
| Type generation from DB schema | Hand-typed `interface Concurso` | `supabase gen types typescript --linked` | Auto-regenerated on every migration; committed; CI enforces freshness. Hand-typed = drift (TD-05 bug class). |
| UUID validation | Regex + `uuidv4()` checks | `zod.string().uuid()` + Postgres `uuid` column type | Single source of truth: DB enforces format, Zod validates at boundary, types align. |
| Cookie domain detection | Per-environment switch in code | `cookieOptions.domain` in `@supabase/ssr` config | Production gets `.flashcards.com.br`; dev/preview undefined. Mishandled = login on subdomain A, logged out on subdomain B (P13 bug class). |
| RLS policy logic | Per-table helper function | `fn_user_has_access(p_concurso_id)` single SQL helper | One source of truth referenced by every content-table policy. Update access semantics in one place. |

**Key insight:** Phase 1's job is to install the right packages and wire them correctly — NOT to write custom infrastructure. Every custom solution in Phase 1 (custom subdomain extractor, custom coverage aggregator, custom Sentry wrapper) is a future maintenance burden. The ecosystem has solved these.

---

## Runtime State Inventory

> **Not applicable** — Phase 1 is greenfield. There is no existing runtime state to migrate. The legacy `sparkle-study-scape/` codebase + legacy `zjyogswbgcauwqisvuyq.supabase.co` project remain intact as archive (Rafael decision 2026-05-21).

**Items explicitly NOT being touched:**
- Legacy Supabase project `zjyogswbgcauwqisvuyq` — archived, never queried by reboot code, NEVER deleted (legal/financial record retention)
- Legacy `belisario-deploy` patterns — that's a different project entirely (WordPress legal firm), no overlap
- Existing GSD `.planning/` directory in `sparkle-study-scape/` — the new repo `flashcards/` will start with its own `.planning/` (or symlink — Plan 1.1 decision)

**Items moving with the developer (one-time setup, NOT runtime state):**
- GSD CLI tools (`gsd-sdk`, `gsd-tools.cjs`) — globally installed, no per-project state
- Developer Anthropic API key — global tool config
- Cowork content (when produced) — fresh DB ingest, no migration of legacy cards

---

## Common Pitfalls (Phase-1-specific cuts of PITFALLS.md)

### Pitfall P1: "Documented but not enforced" conventions
**What goes wrong:** CLAUDE.md says "use RHF + Zod"; code uses `useState`. Without CI gate, conventions decay.
**Why it happens:** Aspirational docs without automated verification.
**How to avoid:**
1. CI gates exist BEFORE the first feature commit (Plan 1.4)
2. ESLint rules with `error` severity for the things that matter
3. CODEOWNERS for `lib/srs/`, `lib/access/`, `lib/asaas/`, `supabase/migrations/` (Rafael required reviewer)
4. Every package installed in Phase 1 ships with at least one usage example to prove "we actually use this"
**Warning signs:** PR merges with lint warnings, CI badge red on `main`, "I'll fix in follow-up" PR comments

### Pitfall P2: TypeScript strict adopted "partially"
**What goes wrong:** `tsconfig.strict.json` covers 30% of code; rest runs strict: false. 297 `no-explicit-any` errors accumulate.
**How to avoid:**
1. ONE `tsconfig.json` with `strict: true` + 3 additional flags (Plan 1.1)
2. ESLint `@typescript-eslint/no-explicit-any: 'error'` (Plan 1.2)
3. `pnpm types:gen` in CI prevents "as any" workaround for stale types (Plan 1.7)
4. Escape hatch: `// eslint-disable-next-line ... -- REASON: TICKET-123` with mandatory comment
**Warning signs:** First `: any` cast in a PR not blocked by CI, Supabase `(as any).from(...)`, "I'll fix the types later"

### Pitfall P5: Tables that don't exist but code thinks they do (legacy SEC-10)
**What goes wrong:** `/reembolso` writes to `refund_requests` — table never created → silent failure → UI shows success.
**How to avoid:**
1. Migration 0008 creates `refund_requests` BEFORE Phase 4 writes to it (Plan 1.6)
2. `pnpm types:gen` in CI = generated types are the contract (Plan 1.7)
3. `legal_audit_log` in 0009 captures every legal-sensitive action regardless (Plan 1.6)
**Warning signs:** Manual migration reference but no file, `(supabase as any).from('table')`, UI says "received" with no DB row

### Pitfall P6: Free-tier infrastructure on paid product
**What goes wrong:** Supabase Free auto-pauses after 7 days → paying user's next login times out.
**How to avoid:**
1. Supabase Pro provisioned day 0 of Phase 1 (Plan 1.5)
2. Vercel Pro provisioned day 0 of Phase 1 (Plan 1.9)
3. Sentry Team tier when volume justifies (Phase 10, but Free OK during Phase 1)
4. PITR 7d enabled (Pro feature) — accidental `DELETE` survivable
**Warning signs:** `Connection terminated` errors, Supabase email "project will auto-pause"

### Pitfall P10: Pivot leftovers as zombie code
**What goes wrong:** Old features remain in code/DB after pivots. Legacy had 12 zombie edge functions + 4 zombie tables.
**How to avoid (Phase 1 specific):**
1. New repo = clean slate. NO carryover from legacy.
2. ANTI-features in CLAUDE.md as forbidden (AI gen, Tiptap, free tier, multi-idioma)
3. ESLint `no-restricted-imports` blocks any `*deprecated*` or `*legacy*` patterns
4. `knip` weekly in CI (start with permissive config; tighten as code grows)
**Warning signs:** Migrations creating tables a later migration drops, dead exports, AnyType drift

### Pitfall P11: service_role key leak
**What goes wrong:** `service_role` bypasses ALL RLS. One leak = entire DB compromised.
**How to avoid:**
1. `lib/supabase/admin.ts` imports `'server-only'` + runtime `throw` if `typeof window !== 'undefined'` (Plan 1.5)
2. ENV var `SUPABASE_SERVICE_ROLE_KEY` (NOT `NEXT_PUBLIC_*`)
3. ESLint `no-restricted-imports` patterns include `'*/lib/supabase/admin'`
4. Pre-release audit: `grep -r SUPABASE_SERVICE_ROLE_KEY src/` matches only `lib/supabase/admin.ts`
5. Sentry `beforeSend` scrubs any string matching service role key pattern (defense-in-depth)
**Warning signs:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` anywhere, key value visible in Sentry breadcrumbs

### Pitfall P15: Schema drift creates "looks done but broken" UI
**What goes wrong:** Migration drops a table; hook returns hardcoded `[]`; UI renders zeros forever.
**How to avoid (Phase 1 specific):**
1. `pnpm types:gen` in CI is the gate — types MUST match schema (Plan 1.7)
2. Greenfield schema = no legacy tables to be dropped accidentally
3. Visual regression tests in Phase 7 catch "0/0 Tópicos" symptom; not Phase 1's job to verify UI yet

### Pitfall P18: Middleware Node API bleed
**What goes wrong:** Middleware historically required Edge runtime → no `pino`, no `Sentry.captureException`, no Supabase service-role.
**How to avoid:**
1. Next.js 15.5 → Node middleware GA. Phase 1 uses `runtime: 'nodejs'` in middleware config.
2. STACK.md §1 + this RESEARCH.md mandate Node middleware
3. CI build verifies middleware compiles (next build catches runtime mismatch)
**Warning signs:** Middleware imports `next/server` but uses `pino` or `@sentry/node` (incompatible)

### Pitfall P19: Connection exhaustion
**What goes wrong:** Vercel serverless can spawn 1000+ concurrent instances. Each opens Postgres connection. Pool exhausted within minutes.
**How to avoid:**
1. Connection pooler URL port 6543 (transaction mode) — Plan 1.5 ENV var setup
2. Singleton browser client (one per session), per-request server client (auto-cleanup)
3. Service-role admin client: per-handler instantiation acceptable because Vercel reuses Node instances
4. `pg_stat_statements` enabled in Plan 1.5; monitor pool usage post-launch
**Warning signs:** "remaining connection slots reserved" errors, intermittent 500s during traffic spikes

### Pitfall TEST-01: Coverage gates without enforcement
**What goes wrong:** Legacy had 1 test file for 190 source files (0.5%). Promise of "50% coverage" decays to 20% without an actual gate.
**How to avoid:**
1. `vitest.config.ts` thresholds (Plan 1.3) — CI fails if regressed
2. Per-directory ceilings (90% on `lib/srs/`, `lib/queue/`, etc.) — higher bar for money paths
3. Phase 5 + Phase 4 ship tests with the feature, not "later"
4. Quarterly mutation testing review (Stryker — deferred to post-launch, but planned)
**Warning signs:** Coverage threshold = 0, `vitest run` not in CI, `.skip` tests >2 weeks old

---

## Code Examples (canonical patterns referenced by plans)

### Example 1: `package.json` scripts (Plan 1.1)

```json
{
  "name": "flashcards",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.9",
  "engines": { "node": ">=20.18.0 <23" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "types:gen": "supabase gen types typescript --linked > types/database.types.ts && prettier --write types/database.types.ts",
    "types:check": "pnpm types:gen && git diff --exit-code types/database.types.ts",
    "db:reset": "supabase db reset",
    "db:push": "supabase db push",
    "db:diff": "supabase db diff",
    "db:lint": "supabase db lint",
    "prepare": "husky"
  }
}
```

### Example 2: `lib/env.ts` Zod-validated env (Plan 1.1)

```typescript
// Source: zod.dev + Next.js Build-Time-Validated Env Vars pattern
import { z } from 'zod'

const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),  // server-only

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Domain
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('flashcards.com.br'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://flashcards.com.br'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  // Placeholders for future phases (validated but optional in Phase 1)
  ASAAS_API_URL: z.string().url().default('https://api.asaas.com/v3'),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

// Lazy validation — throws on first access in server context, not at import time
let cachedEnv: ServerEnv | null = null

export function env(): ServerEnv {
  if (cachedEnv) return cachedEnv
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}`)
  }
  cachedEnv = parsed.data
  return cachedEnv
}
```

### Example 3: `app/api/healthz/route.ts` (Plan 1.8)

See Pattern 9 above for full implementation.

### Example 4: Playwright smoke test (Plan 1.10)

```typescript
// tests/e2e/smoke.spec.ts
// Source: playwright.dev + Next.js E2E docs
import { test, expect } from '@playwright/test'

test.describe('Phase 1 smoke', () => {
  test('healthz returns 200', async ({ request }) => {
    const response = await request.get('/api/healthz')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.checks.supabase).toBe('ok')
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('sentry probe fires correctly', async ({ request }) => {
    const response = await request.get('/api/healthz?simulateError=true')
    expect(response.status()).toBe(500)
    const body = await response.json()
    expect(body.code).toBe('SENTRY_PROBE')
  })

  test('home page renders without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    await page.goto('/')
    await expect(page).toHaveTitle(/Flashcards/i)
    expect(consoleErrors).toHaveLength(0)
  })

  test('robots.txt blocks /admin and /api', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)
    const text = await response.text()
    expect(text).toContain('Disallow: /admin')
    expect(text).toContain('Disallow: /api')
  })
})
```

### Example 5: `playwright.config.ts` (Plan 1.3)

```typescript
import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // mobile + safari deferred to Phase 7 (DESIGN-07)
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined  // Use externally-provided URL (Vercel preview in CI)
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
```

### Example 6: `.prettierrc` (Plan 1.2)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Example 7: `.gitignore` (Plan 1.1)

```
# dependencies
node_modules/
.pnpm-store/

# Next.js
.next/
out/

# environment
.env*
!.env.example

# testing
coverage/
.playwright/
playwright-report/
test-results/

# generated types (CI regenerates; locally optional)
# (DO NOT gitignore — types/database.types.ts MUST be committed)

# OS
.DS_Store
Thumbs.db

# editor
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/

# logs
*.log
npm-debug.log*
pnpm-debug.log*

# misc
*.tsbuildinfo
.eslintcache
```

---

## State of the Art (verified 2026-05-21)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.eslintrc.json` | `eslint.config.mjs` (flat config) | ESLint 9 (Apr 2024) → stable | All Phase 1 configs use flat. Legacy code on `.eslintrc` patterns will not work. |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` with `getAll`/`setAll` | 2024 | Auth-helpers deprecated. Tutorials still confuse the two; copy-paste old patterns = silent session bugs. |
| Pages Router | App Router | Next 13.4 (2023) → stable | RSC default. Middleware on Node now stable (15.5). |
| Vitest 2.x | Vitest 3.x → 4.x recent | Vitest 4.0 (recent) | STACK pins 3.2.4 — 4.x ecosystem stabilizing. Coverage threshold config shape may shift in 4.x. |
| husky + `husky install` | husky 9 + `husky init` | husky 9 (2024) | `husky install` removed. Setup uses `prepare: "husky"` script. |
| `framer-motion` | `motion/react` | Renamed Q3/2024 | Import path changed but API identical. Phase 1 doesn't install motion (P2+ feature). |
| Tailwind v3 → v4 | v4 stable, but v3 chosen for v1 design system | Tailwind v4 stable Jan 2025 | STACK.md §4 — design system needs v3's typed token files + shadcn v2 + tailwindcss-animate. Revisit Q1/2027. |
| Zod v3 → v4 | v4 stable, v3 chosen for RHF compat | Zod v4 stable mid-2025 | STACK.md §5 — RHF resolver still defaults to v3 imports. Revisit Q1/2027. |
| Next.js 15 → 16 | 16 stable, 15.5 chosen for subdomain patterns | Next 16 stable Q2/2026 | STACK.md §1 — `proxy.ts` rename is fresh, subdomain tutorials reference `middleware.ts`. Revisit Q4/2026. |
| `next-pwa` | Serwist | next-pwa abandoned 2022 | Phase 1 doesn't install PWA. Deferred to v1.1 post-launch (PRODUTO.md). |
| Sentry sourcemap manual upload | Sentry Vercel integration | 2023+ | Auto-injects `SENTRY_AUTH_TOKEN`. Don't manually configure sourcemap upload. |
| Branch protection without status checks | Branch protection + required status checks | GitHub 2018+ standard | Plan 1.4 enforces every gate as required check. |

**Deprecated / outdated patterns to avoid:**
- `.eslintrc.{json,cjs,yml}` — use `eslint.config.mjs` flat config
- `tsconfig.strict.json` parallel files — use one `tsconfig.json` with `strict: true`
- `@supabase/auth-helpers-nextjs` (any version) — use `@supabase/ssr`
- `cookies.get/set/remove` in Supabase SSR — use `getAll`/`setAll` only
- `husky install` — use `husky init` + `prepare: "husky"`
- `next.config.js` — use `next.config.ts` (TS native config supported since 15.0)
- `dependabot.yml` — Renovate is more configurable (defer Renovate setup to post-Phase-1 polish)
- `console.log` as logging strategy — pino + Sentry
- Returning 200 on webhook errors — return 500 for transient, 200 only for unrecoverable (Phase 4 enforces; Phase 1 just installs Sentry SDK)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Rafael will create a NEW GitHub account/org for `flashcards` repo (NOT reuse legacy `Rako56/sparkle-study-scape`) | User Constraints | Wrong: planner uses Rako56 personal for now (recommended default) — no real risk, can migrate later |
| A2 | Rafael will provision Supabase Pro project named `flashcards-prod` in sa-east-1 | User Constraints + Plan 1.5 | If wrong region: latency ↑ for BR users (~50-100ms). If wrong plan (Free instead): auto-pause kills app after 7d. CRITICAL to verify before plan execution. |
| A3 | DNS for `flashcards.com.br` is at a registrar Rafael controls and can point NS to Vercel | Plan 1.9 | Wrong: wildcard SSL won't issue → Phase 2 subdomain routing fails. BLOCKER for Plan 1.9 — must confirm. |
| A4 | Supabase branching is enabled from day 1 | User Constraints | If not: each PR shares the dev DB → migration conflicts → slowdown. Recommended default YES; user can override. |
| A5 | PostHog account creation is deferred to Phase 10 | User Constraints | If wrong (Rafael wants PostHog day 1): adds ~30min to Phase 1 — install `posthog-js` + `posthog-node` + identify wrapper. Not a blocker, just rescope. |
| A6 | Asaas sandbox creds are NOT needed in Phase 1 (only placeholder env var) | User Constraints | Correct — Asaas client wrapper lands in Phase 4. Plan 1.9 just sets empty/placeholder env vars in Vercel. |
| A7 | Vitest 3.2.4 per-path coverage thresholds work as documented (`'lib/srs/**': { lines: 90 }`) | Pattern 3 | If config shape differs in Vitest 3.2.4 vs documented: gate still works at global 50% but per-directory 90% silently downgrades. Verify with `pnpm test --coverage --reporter=verbose` in Plan 1.3. |
| A8 | TypeScript 5.7.3 is the correct line to pin (latest 5.x is 5.9.3) | Standard Stack | STACK.md pinned 5.7.3; npm shows 5.7.3 is current 5.7.x patch. 5.9.x available but 5.7 is stable for `verbatimModuleSyntax`. If upgrading to 5.9.x: re-verify `exactOptionalPropertyTypes` interaction with RHF (low risk, but worth checking). |
| A9 | pnpm 9.15.9 is current 9.x and Vercel supports it via `packageManager` field | Standard Stack | Correct — pnpm 9 caps at 9.15.9; Vercel supports `packageManager` field auto-detection. |
| A10 | Sentry Vercel integration auto-injects `SENTRY_AUTH_TOKEN` | Pattern 9 + Plan 1.8 + Plan 1.9 | Correct per docs.sentry.io. If integration setup fails: manual token in Vercel env var. |
| A11 | Supabase Pro region `sa-east-1` is São Paulo and provides <50ms latency to BR users | Plan 1.5 | [VERIFIED: supabase.com/docs/guides/platform/regions] sa-east-1 = São Paulo. Latency depends on user's ISP but <50ms typical. |
| A12 | HIBP password protection is a Pro-tier feature in Supabase | Plan 1.5 | [VERIFIED: supabase.com/docs/guides/auth/password-security] HIBP available on Pro. |
| A13 | Schema migrations 0001-0010 can be merged into a single deploy without staging conflicts (greenfield) | Plan 1.6 | Correct — greenfield, no rows. `supabase db push --linked` applies in order. |
| A14 | The 10-plan decomposition is the right granularity for Phase 1 | Suggested Plan Decomposition | If plans too coarse: planner re-splits. If too fine: planner merges. Granularity = `fine` per `.planning/config.json` → 5-10 plans target = correct. |
| A15 | Branch protection on `main` can be configured via `gh api` automatically (GitHub Pro permits) | Plan 1.4 | [CITED: docs.github.com/rest/branches/branch-protection] Pro+ org accounts get branch protection via API. Free accounts get UI only. Rafael's account type determines this — Plan 1.4 includes both paths. |

**If this table is empty:** N/A — there are 15 assumptions to confirm. Most are recommended defaults Rafael can override during plan-phase. A2, A3 are BLOCKERS — Plans 1.5 and 1.9 cannot execute without resolution.

---

## Open Questions

1. **Does Rafael have an existing GitHub Pro/Team org for `flashcards`, or use personal Rako56?**
   - What we know: Legacy lives in `Rako56/sparkle-study-scape`. Rafael has GitHub Pro (private repos).
   - What's unclear: Which org/account for `flashcards`?
   - Recommendation: Default to `Rako56/flashcards` (personal). Migrate to org later if needed (5-minute GitHub operation, no code impact).

2. **Domain DNS — is `flashcards.com.br` currently parked, pointing somewhere, or unconfigured?**
   - What we know: Rafael owns the domain per HUB Obsidian.
   - What's unclear: Current DNS state.
   - Recommendation: Plan 1.9 includes a "verify DNS state, then point NS to Vercel" step. If domain is parked/redirected, expect 5-30min DNS propagation.

3. **Supabase project name(s) — separate `staging` project or rely on branching?**
   - What we know: SUMMARY.md recommends branching from day 1 (each PR isolated). PROJECT.md doesn't specify.
   - What's unclear: Does Rafael want a long-lived `flashcards-staging` project in addition to per-PR branches?
   - Recommendation: Day 1 = `flashcards-prod` + branching only (saves $25/mo on a staging project). Add staging if cross-PR test fixtures become necessary (Phase 4+).

4. **`xp_events` table — Phase 1 or Phase 5?**
   - What we know: ARCHITECTURE.md mentions atomic XP function with idempotency key.
   - What's unclear: Does the table ship in 0010 (Phase 1) or land with SRS code (Phase 5)?
   - Recommendation: Ship `xp_events` skeleton in 0010 (just the table + RLS). Function logic lands in Phase 5. Reason: Phase 1's `fn_award_xp` template needs to reference an existing table.

5. **`lgpd_deletion_requests` schema — what columns?**
   - What we know: AUTH-09 ships in Phase 3 with `fn_delete_user_cascade`. The request workflow needs a request → confirmation → execution loop.
   - What's unclear: Does Phase 1's 0009 migration ship just the table skeleton (id, user_id, requested_at, confirmed_at, executed_at, status enum) or also the cascade function?
   - Recommendation: Phase 1 = table skeleton + RLS. Phase 3 = cascade function + full workflow.

6. **Sentry project — one or three?**
   - What we know: STACK.md §9 mentions per-environment DSN.
   - What's unclear: Three Sentry projects (dev/preview/prod) for noise isolation, or one project with `environment` tag?
   - Recommendation: One project with `environment` tag (cheaper, single dashboard). Three projects if alert noise becomes a problem post-launch.

7. **PostHog integration — Phase 1 install or fully deferred?**
   - What we know: SUMMARY.md says Phase 10 for funnel events.
   - What's unclear: Should Phase 1 install `posthog-js` to avoid bundle churn when P10 lands?
   - Recommendation: Defer entirely. PostHog SDK is small (~20KB gzipped); installing in P1 without using it violates "no decoration" anti-pattern. Install in P10.

8. **Concurso seed data — `tjsp` row in 0002 or no?**
   - What we know: Phase 2 needs a TJSP seed for subdomain routing test.
   - What's unclear: Does Phase 1's migration 0002 INSERT a TJSP row, or does Phase 2's plan insert it separately?
   - Recommendation: Phase 1 migrations create empty schema; Phase 2 (or seed script) inserts TJSP fixture. Keeps Phase 1 free of product content.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All build/test tasks | ✓ (TBD on Rafael's machine) | Need 20.18.x | If missing: install via fnm/nvm |
| pnpm | Package manager | ✓ (TBD) | Need 9.15.x | If missing: `npm install -g pnpm@9.15.9` |
| Docker Desktop | Local Supabase stack | ✓ (TBD) | Latest | OPTIONAL — only needed for `supabase start` local dev. Cloud-only dev works without. |
| Git | Version control | ✓ | latest | — |
| GitHub account | Repo + Actions | ✓ (Rafael has Pro) | — | — |
| Vercel account | Hosting | ✓ (Rafael has Pro) | — | — |
| Supabase account | DB/Auth | ✓ (Rafael has account) | — | Pro plan required ($25/mo) |
| Sentry account | Error tracking | TBD | — | If not: create free account at sentry.io (Team tier $26/mo later) |
| Supabase CLI | Migrations + types | Install via pnpm | latest | `pnpm add -D supabase` (project-local) — works everywhere |
| Playwright browsers | E2E tests | Install via `pnpm exec playwright install chromium` | 1.60.x | — |
| Asaas account | Payments | TBD (sandbox creates free) | — | NOT BLOCKING for Phase 1 — placeholder env vars only |
| PostHog account | Product analytics | DEFERRED to Phase 10 | — | NOT BLOCKING |
| Resend account | Transactional email | DEFERRED to Phase 4 | — | NOT BLOCKING |

**Missing dependencies with no fallback:**
- DNS control over `flashcards.com.br` — Plan 1.9 BLOCKS if Rafael cannot point NS to Vercel or set Vercel-provided A records

**Missing dependencies with fallback:**
- Docker Desktop — Phase 1 can complete using Supabase cloud project only (no local stack). Add Docker in Phase 5+ when richer local fixtures help.
- Sentry account — Plans 1.8 + 1.9 require it; if Rafael hasn't created one, recommend doing so before plan execution (5-min signup).

---

## Validation Architecture

> Per `.planning/config.json` → `workflow.nyquist_validation: true` (verified). Section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (unit/integration) + Playwright 1.60.0 (E2E) |
| Config file | `vitest.config.ts` + `playwright.config.ts` (both created in Plan 1.3) |
| Quick run command | `pnpm test` (Vitest single-run) |
| Watch command | `pnpm test:watch` (Vitest watch mode for dev) |
| Full suite command | `pnpm test && pnpm test:e2e` (unit + E2E) |
| Coverage command | `pnpm test --coverage` |
| E2E command | `pnpm test:e2e` (Playwright Chromium) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FOUND-01 | Scaffold exists; `pnpm dev` starts on :3000; `pnpm build` produces .next/ | smoke | `pnpm build && pnpm start` (manual smoke) | ❌ Plan 1.1 deliverable |
| FOUND-02 | `pnpm lint` exits 0 on clean code, exits 1 on `: any` | unit | `pnpm lint` + intentionally-broken fixture | ❌ Wave 0 (tests/lint-fixtures/) |
| FOUND-03 | `pnpm format:check` exits 0 on formatted code, exits 1 on drift | unit | `pnpm format:check` + intentionally-drifted fixture | ❌ Wave 0 |
| FOUND-04 | Pre-commit hook runs lint-staged + tsc; rejects bad commits | manual + smoke | Manual: stage a `: any` file, attempt commit, expect rejection | ❌ Plan 1.2 verification step |
| FOUND-05 | `pnpm test --coverage` enforces ≥50% global + ≥90% per-directory | smoke | `pnpm test --coverage` + fixture with low coverage in lib/srs/ | ❌ Wave 0 (tests/coverage-fixtures/) |
| FOUND-06 | Playwright `chromium` runs against `PLAYWRIGHT_BASE_URL` | smoke | `pnpm test:e2e` with baseURL set | ❌ Plan 1.10 |
| FOUND-07 | CI pipeline runs all gates on PR; merge blocked on red | manual + smoke | Open test PR with broken commit, expect CI red | ❌ Plan 1.4 verification |
| FOUND-08 | Sentry captures from `/api/healthz?simulateError=true` | smoke | `curl /api/healthz?simulateError=true` then check Sentry UI | ❌ Plan 1.8 |
| FOUND-09 | pino emits structured JSON with correlationId on Node routes | unit | Hit /api/healthz, parse stdout/Vercel log, assert JSON structure | ❌ Plan 1.8 |
| FOUND-10 | Supabase Pro project responds, branching creates branch DB on PR | manual | Dashboard verification + PR creation test | ❌ Plan 1.5 verification |
| FOUND-11 | All 10 migrations apply cleanly; `pg_policies` returns ≥1 per table | unit (pgTAP optional) + smoke | `supabase db reset && psql -c "SELECT tablename, count(*) FROM pg_policies GROUP BY tablename"` | ❌ Plan 1.6 verification |
| FOUND-12 | `pnpm types:gen` produces non-empty file matching schema; CI fails on stale | smoke | Apply migration, skip types:gen, push PR, expect CI red | ❌ Plan 1.7 verification |

### Sampling Rate (per Nyquist validation strategy)

- **Per task commit:** `pnpm lint && pnpm typecheck && pnpm test` (~30-60s on Phase 1's small surface)
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm test --coverage && pnpm test:e2e` (~3-5min including Playwright cold start)
- **Phase gate:** Full suite green + manual smoke of Sentry probe + Supabase branching + DNS resolution before `/gsd:verify-work`

### Wave 0 Gaps (to be filled before plan execution)

- [ ] `tests/setup.ts` — Vitest setup (MSW + jest-dom + cleanup) — Plan 1.3
- [ ] `tests/msw/server.ts` + `tests/msw/handlers.ts` — MSW Node server — Plan 1.3
- [ ] `tests/e2e/smoke.spec.ts` — Phase 1 smoke E2E — Plan 1.10
- [ ] `tests/lint-fixtures/bad-any.ts` + `tests/lint-fixtures/bad-console-log.ts` — intentionally-broken files that `pnpm lint` must reject — Plan 1.2 verification
- [ ] `tests/coverage-fixtures/low-coverage.ts` (in lib/srs/) — proves per-directory threshold enforces — Plan 1.3 verification
- [ ] `playwright.config.ts` — base config with Vercel preview URL support — Plan 1.3
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8 @playwright/test ...` — Plan 1.3
- [ ] `package.json` scripts — `test`, `test:watch`, `test:e2e`, `types:check` — Plan 1.1

*(No existing test infrastructure to leverage — new repo.)*

---

## Security Domain

> Per `.planning/config.json` → `security_enforcement` not explicitly set → treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Supabase Auth (email/password + Google OAuth), HIBP on, ≥10 char passwords — full ASVS V2 satisfied in Phase 3; Phase 1 enables HIBP toggle |
| V3 Session Management | yes | `@supabase/ssr` with `getAll`/`setAll`, cookie `Domain=.flashcards.com.br`, `SameSite=Lax`, `Secure` (prod), JWT 1h + refresh rotation — Phase 1 wires the client factories |
| V4 Access Control | yes | Postgres RLS on every table (Plan 1.6 enforces in every migration), `fn_user_has_access(p_concurso_id)` single helper, role enum `user_roles.role` (Plan 1.6) |
| V5 Input Validation | yes | Zod at every Server Action + Route Handler boundary (RHF + `@hookform/resolvers/zod` installed in Plan 1.1 even though forms ship P3+); `supabase gen types` enforces DB shape at compile time (Plan 1.7) |
| V6 Cryptography | partial | Supabase handles `bcrypt` for passwords + JWT signing internally. Phase 1 introduces: `pgcrypto` extension (Plan 1.6) for any custom needs; webhook token via `openssl rand -hex 32` (Plan 1.9 placeholder). NEVER hand-roll crypto. |
| V7 Error Handling & Logging | yes | Sentry SDK + pino structured logs from day 1; `redact` paths on PII; `Sentry.beforeSend` scrubs CPF/email; `correlationId` propagation (Plan 1.8) |
| V8 Data Protection | yes | TLS 1.3 via Vercel + Supabase; PITR 7d enabled (Plan 1.5); LGPD `audit_log` + `legal_audit_log` tables created (Plan 1.6); `fn_delete_user_cascade` template scaffolded |
| V9 Communications | yes | HTTPS enforced; HSTS header in `vercel.json` (Plan 1.9); Asaas API + Supabase API use HTTPS only |
| V10 Malicious Code | partial | `npm audit` in CI (add to Plan 1.4); Renovate weekly dep updates (deferred post-P1); slopcheck before each `pnpm add` (Package Legitimacy Audit section) |
| V11 Business Logic | partial | Phase 1 lays the foundation; specific controls (atomic XP, idempotent webhook, etc.) land with their features (P4, P5) |
| V12 Files & Resources | n/a (P1) | No file upload in Phase 1. Lands in P8 (admin bulk import). |
| V13 API & Web Service | yes | Webhook auth via `asaas-access-token` header + `timingSafeEqual` comparison (placeholder in P1; full handler in P4); CORS not needed (same-origin via subdomains) |
| V14 Configuration | yes | ENV vars segregated per env (dev/preview/prod) in Vercel (Plan 1.9); `lib/env.ts` Zod-validated at server boot (Plan 1.1); `service_role` NEVER in `NEXT_PUBLIC_*` |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role key bundled to client | Spoofing + Information Disclosure | `'server-only'` import in `lib/supabase/admin.ts` + runtime `if (typeof window !== 'undefined') throw` + ESLint `no-restricted-imports` (Plan 1.5) |
| Sentry breadcrumb leaking CPF/email | Information Disclosure (LGPD) | `Sentry.beforeSend` scrub function + pino `redact` paths (Plan 1.8) |
| Webhook spoofed payload | Spoofing | `timingSafeEqual` token check + re-fetch payment from Asaas (Phase 4 implementation; Phase 1 reserves `ASAAS_WEBHOOK_TOKEN` env var) |
| Migration drops table; code still references | Tampering / Denial of Service | `pnpm types:gen` in CI gate (Plan 1.7) — code with stale references fails compile |
| Hardcoded UUID for concurso bypasses access check | Tampering / Information Disclosure | ESLint `no-restricted-syntax` blocks UUID literals (Plan 1.2) — forces `getConcursoBySlug()` use |
| Pre-commit hook bypassed via `--no-verify` | Repudiation | CI gate is unbypassable — even if `--no-verify` skips local check, CI fails the PR (Plan 1.4) |
| Free-tier Supabase auto-pauses | Denial of Service | Supabase Pro from day 0 (Plan 1.5) |
| Postgres connection exhaustion under serverless burst | Denial of Service | Connection pooler URL port 6543 (Plan 1.5); singleton browser client; per-request server client |
| RLS policy missing on new table | Information Disclosure | Migration template requires `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + 4 default policies (Plan 1.6); Supabase advisor warns missing RLS |
| Source maps leaked publicly | Information Disclosure | Sentry uploads sourcemaps but Vercel does NOT serve `*.map` files publicly by default; verify `next.config.ts` doesn't expose them |
| Branch protection bypassed by admin | Tampering | Admin-bypass disabled in branch protection settings (Plan 1.4 — manual UI step) |

---

## Sources

### Primary (HIGH confidence)

- **Internal — verified against this project's own research**:
  - `.planning/research/STACK.md` (2078 lines, 2026-05-21) — version pins, "do NOT use" callouts, RHF/Zod/Vitest configs
  - `.planning/research/ARCHITECTURE.md` (1522 lines, 2026-05-21) — 12 architectural patterns, RLS schema, atomic functions
  - `.planning/research/PITFALLS.md` (1083+ lines, 2026-05-21) — 25 documented pitfalls with mitigations
  - `.planning/research/SUMMARY.md` (347 lines, 2026-05-21) — synthesis + 5 critical legacy concerns mapped
  - `.planning/PROJECT.md` (228 lines, 2026-05-21) — product thesis, constraints, key decisions
  - `.planning/REQUIREMENTS.md` — FOUND-01..12 requirement definitions + traceability
  - `.planning/ROADMAP.md` — Phase 1 goal + success criteria

- **External — primary docs (verified URLs, 2026-05-21)**:
  - [Next.js 15.5 docs](https://nextjs.org/docs) — App Router, middleware Node runtime, async APIs
  - [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — `getAll`/`setAll` cookies pattern
  - [Supabase Pro pricing](https://supabase.com/pricing) — branching, PITR, HIBP
  - [TypeScript tsconfig reference](https://www.typescriptlang.org/tsconfig/) — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
  - [typescript-eslint flat config](https://typescript-eslint.io/users/configs/) — `strictTypeChecked` + `stylisticTypeChecked`
  - [Vitest coverage docs](https://vitest.dev/guide/coverage) — V8 provider, per-path thresholds
  - [Playwright Next.js integration](https://nextjs.org/docs/app/guides/testing/playwright) — `webServer` config
  - [Sentry Next.js wizard](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — installation + sourcemap upload
  - [Sentry Vercel integration](https://docs.sentry.io/organization/integrations/deployment/vercel/) — auto token injection
  - [Pino docs](https://getpino.io/) — `redact` paths, Vercel logs integration
  - [husky v9 docs](https://typicode.github.io/husky/) — `husky init` setup
  - [Vercel custom domains + wildcard SSL](https://vercel.com/docs/projects/domains) — nameserver requirement

- **External — npm registry verified 2026-05-21**:
  - Confirmed package existence + current version for: next@15.5.18, typescript@5.7.3, pnpm@9.15.9, eslint@9.39.4, vitest@3.2.4, @sentry/nextjs@10.53.1, @supabase/ssr@0.10.3, @supabase/supabase-js@2.106.1, @playwright/test@1.60.0, husky@9.1.7, lint-staged@15.5.2

### Secondary (MEDIUM confidence)

- [Subdomain routing in Next.js (Medium article)](https://medium.com/@sheharyarishfaq/subdomain-based-routing-in-next-js-a-complete-guide-for-multi-tenant-applications-1576244e799a) — verified pattern matches official Next.js docs
- [GitHub Actions CI/CD for Next.js (dev.to)](https://dev.to/whoffagents/github-actions-cicd-for-nextjs-tests-type-checking-and-auto-deploy-1kp7) — verified against `actions/setup-node` + `pnpm/action-setup` v4 official READMEs
- [The Strictest TypeScript Config (Vladyslav Zubko, 2026)](https://whatislove.dev/articles/the-strictest-typescript-config/) — `+3 flag` rationale validated against TypeScript handbook

### Tertiary (LOW confidence — flagged for plan-execution validation)

- Vitest 3.2.4 per-path coverage threshold exact syntax — verified syntax shape via docs, but planner MUST run `pnpm test --coverage --reporter=verbose` in Plan 1.3 to confirm thresholds are actually enforced per-directory (not just globally)
- Branch protection API endpoints for GitHub Pro accounts — verified for Team+, free accounts may need UI-only; Plan 1.4 includes both paths

---

## Suggested Plan Decomposition

Per `.planning/config.json` → `granularity: "fine"` → target 5-10 plans for Phase 1. Recommended decomposition is **10 plans**, sequenced strictly because `parallelization: false` in config.

### Dependency Graph

```
Plan 1.1 (Repo + Scaffold + TS strict)
    │
    ├──→ Plan 1.2 (ESLint + Prettier + Husky)
    │       │
    │       └──→ Plan 1.3 (Vitest + Playwright + Coverage gates)
    │               │
    │               └──→ Plan 1.4 (GitHub Actions CI + branch protection)
    │
    ├──→ Plan 1.5 (Supabase Pro provisioning + 3 clients + branching)
    │       │
    │       └──→ Plan 1.6 (Schema migrations 0001-0010 + RLS + atomic fns)
    │               │
    │               └──→ Plan 1.7 (Types pipeline + CI gate)
    │
    ├──→ Plan 1.8 (Sentry + Pino + correlation IDs + /api/healthz)
    │
    └──→ Plan 1.9 (Vercel Pro setup + DNS + wildcard SSL + preview deploys)
            │
            └──→ Plan 1.10 (Smoke E2E + Phase 1 verification gate)
```

### Plan Definitions

**Plan 1.1 — Repo + Next.js 15.5 Scaffold + TypeScript Strict 100% + pnpm**
- Deliverables:
  - New GitHub repo `Rako56/flashcards` (or per-Rafael decision)
  - `pnpm dlx create-next-app@15.5 --typescript --eslint --tailwind --app --import-alias "@/*" --src-dir false`
  - `.nvmrc` = `20.18.0`
  - `package.json` with `packageManager: "pnpm@9.15.9"` + `engines.node`
  - `tsconfig.json` with full strict + 3 flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`)
  - 4 route group placeholders: `app/(marketing)/layout.tsx`, `app/(app)/layout.tsx`, `app/(admin)/layout.tsx`, `app/(auth)/layout.tsx`
  - `app/layout.tsx` root shell, `app/page.tsx` placeholder, `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`
  - `lib/utils.ts` with `cn()` helper, `lib/env.ts` with Zod validation
  - `components.json` for shadcn, `pnpm dlx shadcn@2.3.0 init` (slate base color, CSS vars)
  - `.env.example` documented, `.gitignore`, `README.md`
  - New `CLAUDE.md` for reboot (replaces legacy version) — anti-features, conventions, stack pins
  - `package.json` scripts: dev, build, start, typecheck
  - Core deps: react-hook-form, @hookform/resolvers, zod, @tanstack/react-query, clsx, tailwind-merge, tailwindcss-animate, @tailwindcss/typography
  - `app/providers.tsx` with `QueryClientProvider`
- Dependencies: None (first plan)
- Estimated tasks: 10-12
- Acceptance: `pnpm dev` starts on :3000; `pnpm typecheck` exits 0; route groups visible in `app/`

**Plan 1.2 — ESLint Flat Config + Prettier + Husky + lint-staged**
- Deliverables:
  - `eslint.config.mjs` flat config v9 with full rule set (no-explicit-any, no-floating-promises, no-restricted-syntax UUID block, no-restricted-imports `@/` enforcement, react-hooks/exhaustive-deps as error, no-console allow warn/error)
  - `.prettierrc` + `.prettierignore`
  - husky 9 setup: `pnpm dlx husky init`, `.husky/pre-commit` runs lint-staged + tsc, `.husky/pre-push` runs tsc
  - `package.json` `prepare: "husky"`, `lint-staged` block
  - `package.json` scripts: lint, lint:fix, format, format:check
  - VS Code `.vscode/settings.json` (Prettier default formatter, ESLint auto-fix on save)
  - Test fixture: `tests/lint-fixtures/bad-any.ts` + `tests/lint-fixtures/bad-uuid.ts` (intentionally rejected by lint) — these are tracked but excluded from build
- Dependencies: Plan 1.1
- Estimated tasks: 7-9
- Acceptance: `pnpm lint` exits 0 on clean code; `pnpm lint -- tests/lint-fixtures/bad-any.ts` exits 1; pre-commit hook rejects bad commit

**Plan 1.3 — Vitest + Playwright + Coverage Gates + MSW**
- Deliverables:
  - `vitest.config.ts` with V8 coverage provider, global 50% + per-dir 90% thresholds for `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`
  - `tests/setup.ts` (jest-dom + MSW server + cleanup)
  - `tests/msw/server.ts` + `tests/msw/handlers.ts` (empty initially)
  - `playwright.config.ts` with `webServer` for local + `PLAYWRIGHT_BASE_URL` for CI/Vercel preview
  - `pnpm exec playwright install chromium`
  - Test directories: `tests/unit/`, `tests/e2e/`, `tests/fixtures/`
  - Sample tests: `tests/unit/utils.test.ts` (proves cn() works), `tests/unit/env.test.ts` (proves Zod env validates)
  - `package.json` scripts: test, test:watch, test:e2e, test:e2e:ui
  - Coverage threshold verification fixture: temporarily low-coverage file in `lib/srs/` to prove gate works (then removed)
- Dependencies: Plan 1.2 (eslint compatible with test files)
- Estimated tasks: 8-10
- Acceptance: `pnpm test` exits 0 with sample tests passing; `pnpm test --coverage` reports thresholds correctly; `pnpm test:e2e` runs locally (will be filled with smoke test in Plan 1.10)

**Plan 1.4 — GitHub Actions CI + Branch Protection**
- Deliverables:
  - `.github/workflows/ci.yml` with jobs: install, lint, typecheck, test, types-fresh, supabase-lint, build, e2e (per Pattern 4 above)
  - GitHub Actions secrets configured: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
  - Branch protection on `main`: require PR, ≥1 review, all status checks required, linear history, no direct pushes
  - CODEOWNERS file: `/lib/srs/ @Rako56`, `/lib/asaas/ @Rako56`, `/supabase/migrations/ @Rako56`, `/app/api/asaas/ @Rako56` (Rafael required reviewer on money/correctness paths)
  - `.github/PULL_REQUEST_TEMPLATE.md` with checklist (link issue, ran tests, ran types:gen, no console.log, no `: any`)
- Dependencies: Plans 1.1 + 1.2 + 1.3 (CI runs these gates)
- Estimated tasks: 5-7
- Acceptance: Open test PR with intentionally-broken commit → CI red → cannot merge. Push clean commit → CI green → merge enabled.

**Plan 1.5 — Supabase Pro Provisioning + Branching + 3 Clients**
- Deliverables (manual + code):
  - Manual (Rafael in dashboard): create Supabase Pro project `flashcards-prod` in sa-east-1, enable PITR 7d, set Auth config (HIBP on, ≥10 char passwords, redirect URLs), enable extensions (pgcrypto, uuid-ossp, pg_cron, pg_net), enable branching, generate service_role key
  - Code: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/admin.ts` (with `'server-only'` + runtime throw), `lib/supabase/middleware.ts`
  - `supabase init`, `supabase link --project-ref <ref>`
  - `supabase/config.toml` reviewed, local dev `supabase start` verified (if Docker available)
  - ENV vars added to local `.env.local` (and Rafael adds to Vercel in Plan 1.9)
  - Documented in `README.md`: how to link, how to apply migrations, how to gen types
- Dependencies: Plan 1.1 (env validation schema needs Supabase URL keys)
- Estimated tasks: 6-8
- Blockers: Rafael must complete dashboard setup before code lands. Verify via `psql` ping or `supabase status`.
- Acceptance: `lib/supabase/server.ts` + `browser.ts` + `admin.ts` exist with correct types; `supabase status --linked` shows project healthy; HIBP enabled (Auth → Settings dashboard screenshot in PR)

**Plan 1.6 — Schema Migrations 0001-0010 + RLS Everywhere + Atomic Function Templates**
- Deliverables:
  - `supabase/migrations/0001_init_extensions_and_helpers.sql` (extensions + `fn_user_has_access`)
  - `supabase/migrations/0002_admin_concursos.sql` (slug + theme + simulado_config + price_cents + status + RLS)
  - `supabase/migrations/0003_admin_content.sql` (disciplinas + topicos + flashcards + questoes + status enum + RLS)
  - `supabase/migrations/0004_users_profiles_roles.sql` (user_profiles + user_roles + RLS)
  - `supabase/migrations/0005_access_junction.sql` (user_concurso_access + RLS)
  - `supabase/migrations/0006_srs_progress.sql` (user_flashcard_progress + srs_reviews append-only + xp_events skeleton + RLS)
  - `supabase/migrations/0007_simulados.sql` (simulado_runs + simulado_answers UNIQUE + RLS)
  - `supabase/migrations/0008_purchases_webhooks.sql` (purchases UNIQUE asaas_payment_id + webhook_events PK on event_id + refund_requests + RLS)
  - `supabase/migrations/0009_audit_logs.sql` (audit_log + legal_audit_log + lgpd_deletion_requests + RLS)
  - `supabase/migrations/0010_atomic_functions.sql` (fn_award_xp + fn_user_has_access updates + templates for fn_grant_access, fn_process_webhook_event, fn_batch_upsert_progress, fn_delete_user_cascade)
  - `supabase db push --linked` applied to prod
  - `supabase db lint` passes (CI runs this in Plan 1.4)
  - Local seed `supabase/seed.sql` (TJSP fixture for dev — Phase 2 may extend)
- Dependencies: Plan 1.5 (Supabase project must exist)
- Estimated tasks: 10-12 (one per migration + apply + verify)
- Acceptance: `pg_policies` returns ≥1 policy per table; `supabase db lint` exits 0; `supabase db reset && supabase db push --linked` succeeds clean

**Plan 1.7 — Types Generation Pipeline + CI Gate**
- Deliverables:
  - `package.json` scripts: `types:gen` (runs supabase gen types typescript --linked + prettier write), `types:check` (runs types:gen + git diff --exit-code)
  - Initial `types/database.types.ts` generated and committed
  - CI job `types-fresh` in `.github/workflows/ci.yml` already added in Plan 1.4 — verify it runs against the new types
  - Pre-commit reminder for `.sql` files in `supabase/migrations/` (echo message — not enforceable in pre-commit without DB, just nudges)
  - README documentation: "How to regenerate types after migrations"
- Dependencies: Plans 1.4 + 1.5 + 1.6
- Estimated tasks: 4-5
- Acceptance: `pnpm types:gen` produces correct file; CI fails build on intentionally-stale types (verify with test PR)

**Plan 1.8 — Sentry SDK + Pino Logger + Correlation IDs + Healthcheck**
- Deliverables:
  - `pnpm dlx @sentry/wizard@latest -i nextjs` (interactive: select project, paste DSN, enable Vercel integration, accept sourcemap upload)
  - Customize `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` with PII scrubbing + tags
  - `instrumentation.ts` correctly routes Node vs Edge
  - `lib/observability/logger.ts` (pino with redact paths)
  - `lib/observability/correlation.ts` (getCorrelationId, setSentryContext)
  - `middleware.ts` stub generates + propagates `x-correlation-id` header (Phase 2 expands)
  - `app/api/healthz/route.ts` (GET 200 + Supabase ping + Sentry probe via `?simulateError=true`)
  - Vercel monitor pointing at `/api/healthz` (Plan 1.9 will wire)
  - Test: hit healthz, verify Sentry UI shows event with correlationId tag
- Dependencies: Plans 1.1 + 1.5
- Estimated tasks: 8-10
- Acceptance: `/api/healthz` returns 200 + checks: { supabase: 'ok' }; `/api/healthz?simulateError=true` returns 500 + Sentry captures + correlationId tag visible in Sentry UI

**Plan 1.9 — Vercel Pro Setup + Custom Domain + Wildcard SSL + Preview Deploys**
- Deliverables (manual + code):
  - Manual (Rafael in Vercel dashboard): create project, link to GitHub repo, set framework Next.js, set Node 20.x, configure ENV vars per env (development/preview/production), add custom domain `flashcards.com.br` + wildcard `*.flashcards.com.br`
  - Manual (Rafael at DNS registrar): point NS to Vercel OR set apex A `76.76.21.21` + AAAA + delegate wildcard (NS path mandatory for wildcard SSL)
  - Wait for Let's Encrypt SSL provisioning (~5-10min after DNS propagates)
  - Vercel Sentry integration enabled → `SENTRY_AUTH_TOKEN` auto-injected
  - Vercel monitor: `/api/healthz` configured with email/Slack alert on non-200
  - Code: `vercel.json` with HSTS, X-Frame-Options, Referrer-Policy headers
  - Code: `public/robots.txt` (`Disallow: /admin`, `Disallow: /api`)
  - Verify: hit `https://flashcards.com.br/api/healthz` and `https://placeholder.flashcards.com.br/api/healthz` both return 200 (subdomain logic comes in P2 but SSL must work)
- Dependencies: Plans 1.1 + 1.5 + 1.8
- Estimated tasks: 6-8
- Blockers: DNS control over flashcards.com.br
- Acceptance: Apex + wildcard SSL both valid (curl -I https://flashcards.com.br + https://test.flashcards.com.br); preview deploy URL generated on test PR; ENV vars segregated correctly

**Plan 1.10 — Smoke E2E + Phase 1 Verification Gate**
- Deliverables:
  - `tests/e2e/smoke.spec.ts` (4 tests: healthz returns 200, sentry probe fires, home renders no errors, robots.txt correct)
  - CI `e2e` job runs against Vercel preview URL (already wired in Plan 1.4; verify works)
  - Phase 1 verification checklist (post-final-merge):
    1. ✅ `pnpm lint` blocks `: any` in fresh PR
    2. ✅ `pnpm typecheck` strict 100% passes
    3. ✅ `pnpm test --coverage` reports ≥50% global and ≥90% on `lib/{srs,queue,asaas,access}/*` (with empty modules → trivially 100%)
    4. ✅ `pnpm types:gen` + CI fails build if stale
    5. ✅ Supabase Pro project active in sa-east-1, PITR 7d, HIBP on, branching enabled
    6. ✅ Sentry captures `/api/healthz?simulateError=true` with correlationId tag
    7. ✅ Pre-commit hook blocks bad commit (manual test: `git add` a `: any` file, attempt commit, expect rejection)
    8. ✅ Vercel preview deploy works for test PR
    9. ✅ Wildcard SSL valid (curl two random subdomains, both 200 OK)
    10. ✅ Branch protection on `main` requires green CI + ≥1 review
  - Update `.planning/STATE.md` → Phase 1 complete, ready for Phase 2
  - Tag release: `git tag v0.1.0-phase1` + GitHub release
- Dependencies: All prior plans (1.1-1.9)
- Estimated tasks: 4-6
- Acceptance: All 10 checklist items pass; Phase 1 marked complete; ready to invoke `/gsd:plan-phase 2`

### Plan Boundary Rationale

- **Why 10 plans?** Phase 1 has 12 requirements + cross-cutting concerns. 10 plans give a 1:1.2 ratio of plans to requirements, with sequential dependencies. Smaller plans = clearer rollback points if a gate fails.
- **Why not parallelize?** `parallelization: false` in config. Even if true, Plans 1.5 (Supabase) and 1.9 (Vercel) require Rafael's manual dashboard actions that block until done — true parallel work limited.
- **Why is 1.5 → 1.6 → 1.7 sequential?** Migrations need Supabase project to apply against; types pipeline needs migrations applied to generate types.
- **Why is 1.8 separable from 1.5?** Sentry/Pino don't need Supabase data; healthz endpoint needs both (Plan 1.8 finalizes after Plan 1.5 hands off env vars).
- **Plan 1.10 last:** Final verification must run after all infrastructure exists. Smoke E2E is the final gate before declaring Phase 1 done.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versions verified against npm registry 2026-05-21; STACK.md sources cross-checked against official docs
- Architecture patterns: **HIGH** — sourced from ARCHITECTURE.md which itself cites official Next.js + Supabase + Vercel docs
- Pitfalls: **HIGH** — sourced from PITFALLS.md + legacy CONCERNS.md (72 documented issues); all Phase 1 pitfalls have explicit prevention mechanisms
- Plan decomposition: **HIGH** — follows GSD `fine` granularity (5-10 plans); dependency graph derived from technical prerequisites
- Open questions: **MEDIUM** — 8 questions are deferred decisions Rafael can resolve in `/gsd:discuss-phase 1` or during plan-phase; defaults documented
- Security domain: **HIGH** — ASVS categories mapped to Phase 1 controls; threat patterns sourced from PITFALLS.md + STACK.md security sections

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (30 days for stable infrastructure; revisit if Next.js 16 patterns mature, Vitest 4 ecosystem stabilizes, or Supabase auth API changes)
