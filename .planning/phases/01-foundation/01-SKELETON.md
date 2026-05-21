# Walking Skeleton — Flashcards

**Phase:** 1
**Generated:** 2026-05-21
**Project:** flashcards.com.br — marketplace de preparações curadas

---

## Capability Proven End-to-End

A signed-in (or anonymous) request to `https://flashcards.com.br/api/healthz` returns a JSON response with `{ status: "ok", checks: { supabase: "ok", sentry: "ok" }, concurso_count: 1, correlationId: <uuid> }`, where:
- The Next.js 15.5 app is **deployed on Vercel Pro** behind the apex domain + wildcard SSL
- The Node middleware injects a `correlationId` header
- The Route Handler queries **Supabase Pro (sa-east-1)** via the service-role client, reads exactly one seed row from `admin_concursos` (TJSP fixture inserted by migration 0002 or seed), and returns the count
- Sentry receives a test exception when `?simulateError=true` is appended, with the `correlationId` tag visible in the dashboard within 60s
- The full CI pipeline (lint → typecheck → test → types-fresh → supabase-lint → build → e2e) is green on the PR that ships this slice

That single GET endpoint exercises: **Next.js scaffold + TS strict + ESLint + Vitest + Playwright + Supabase Pro + RLS + atomic Postgres function (stub) + Sentry + pino + Vercel Pro + DNS + wildcard SSL + CI**. Every gate fires once.

---

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | **Next.js 15.5.18** (App Router, Node middleware) | Subdomain routing patterns mature in 15.5; `middleware.ts` Node runtime stable; 16's `proxy.ts` rename has sparse tutorials. STACK.md §1. |
| Language | **TypeScript 5.7.3 strict 100%** | Single `tsconfig.json` with `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noPropertyAccessFromIndexSignature`. Kills legacy "strict-where-easy" disease. |
| Package manager | **pnpm 9.15.9** | Pinned via `packageManager` field + `engines.node`. ~50% less disk than npm, strict hoist catches accidental deps. |
| Data layer | **Supabase Pro (sa-east-1)** + Postgres 16 + RLS + atomic Postgres functions | Auth + DB + Storage + Edge Functions in one. PITR 7d, HIBP on, branching per PR. `@supabase/ssr@0.10.3` for cookies. |
| Auth | **Supabase Auth (email/password + Google OAuth)** with HIBP toggle + ≥10 char min | Cookie domain `.flashcards.com.br` cross-subdomain. JWT 1h + refresh rotation. Phase 1 wires the client factories only; Phase 3 implements the flows. |
| Multi-tenant model | **Subdomain per concurso** (`<slug>.flashcards.com.br`) resolved by middleware → `admin_concursos.slug`. Tema visual via `theme JSONB` + CSS vars inline (no FOUC). | DB-driven from day 1. `getConcursoBySlug()` is the only API to a concurso. Hardcoded UUIDs banned by ESLint. |
| Service-role isolation | `lib/supabase/admin.ts` with `'server-only'` import + runtime `if (typeof window !== 'undefined') throw` | Prevents service_role leak to client bundle. ESLint `no-restricted-imports` adds belt-and-suspenders. |
| Styling | **Tailwind v3.4.17** + **shadcn/ui v2.3** + `tailwindcss-animate` + `@tailwindcss/typography` | v3 (not v4) — design system needs typed token files + shadcn v2 compatibility. Revisit Q1/2027. |
| Forms | **React Hook Form 7.76 + Zod 3.25** | Zod v3 (not v4) — RHF resolver still defaults to v3 imports. Installed in P1, used in P3+. |
| State (server) | **TanStack Query v5.100** | Singleton browser client, per-request server client. Phase 1 sets up `QueryClientProvider`; usage starts P2+. |
| Forms validation boundary | **Zod at every Server Action + Route Handler** | Single source of truth: Zod schema validates input; `supabase gen types` validates DB shape at compile. |
| Linter | **ESLint v9.39 flat config** + `typescript-eslint@^8.20` (strictTypeChecked + stylisticTypeChecked) | Single `eslint.config.mjs`. NOT Biome — missing react-hooks + next plugin parity. Custom rule blocks UUID literals. |
| Formatter | **Prettier 3.4** + `prettier-plugin-tailwindcss` | Sorts Tailwind classes deterministically. |
| Pre-commit | **husky 9.1 + lint-staged 15.5** | `husky init` (not legacy `husky install`). `.husky/pre-commit` runs lint-staged + tsc; `.husky/pre-push` runs tsc. |
| Tests | **Vitest 3.2.4** (jsdom) + **MSW v2.7** + **Playwright 1.60.0** (chromium) | V8 coverage provider, per-path thresholds (≥50% global, ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`). Playwright runs against Vercel preview URL. |
| CI | **GitHub Actions** — install → lint → typecheck → test → types-fresh → supabase-lint → build → e2e | All required status checks for `main` branch protection. Concurrency cancel-in-progress. |
| Branch protection | `main` requires PR + ≥1 review + all CI green + no direct pushes | Configured via `gh api` or UI. Admin-bypass off. |
| Observability | **Sentry @sentry/nextjs 10.53** + **pino 9.6** + correlationId propagation | Three Sentry configs (client/server/edge). pino redacts CPF/email/tokens. correlationId generated in middleware, threaded via `x-correlation-id` header into Sentry tags + pino child logger. |
| Hosting | **Vercel Pro** + Sentry Vercel integration | Wildcard SSL `*.flashcards.com.br` + apex. Preview deploy per PR. ENV vars segregated dev/preview/production. Supabase branching auto-injects per-PR DB URL. |
| Deployment target | Production at `flashcards.com.br`, preview at `<branch>-flashcards-<account>.vercel.app` | Sentry sourcemap auto-upload via `SENTRY_AUTH_TOKEN` from Vercel integration. |
| Directory layout | `app/` (route groups), `lib/` (`supabase/`, `observability/`, `srs/`, `queue/`, `asaas/`, `access/`, `env.ts`, `utils.ts`), `supabase/migrations/`, `types/database.types.ts`, `tests/{unit,e2e,fixtures,msw}/` | Feature-grouped but with route groups for chrome/guards separation. |

---

## Stack Touched in Phase 1

- [x] Project scaffold — `create-next-app@15.5` with TS strict + pnpm + Tailwind + App Router + shadcn init
- [x] Routing — `/api/healthz` route handler + middleware passthrough; 4 route group placeholders (`(marketing)`, `(app)`, `(admin)`, `(auth)`)
- [x] Database — 10 migrations applied; `admin_concursos` table with TJSP seed; `fn_user_has_access(uuid)` Postgres function; `/api/healthz` reads from `admin_concursos`
- [x] UI — root `app/page.tsx` placeholder rendering Flashcards branding; no interactive features yet (Phase 2 onwards)
- [x] Deployment — Vercel Pro project linked to GitHub repo, preview deploy per PR, apex + wildcard SSL provisioned, `flashcards.com.br/api/healthz` returns 200

---

## Out of Scope (Deferred to Later Slices)

The Walking Skeleton is **infrastructure with one real DB read**. The following are explicitly NOT in Phase 1:

- **Subdomain routing logic** — middleware in P1 is a passthrough that only injects `x-correlation-id`. P2 adds host parsing + concurso resolution + route group rewrite.
- **Theme injection per concurso** — `admin_concursos.theme JSONB` exists from day 1 but no consumer reads it. P2 adds CSS vars + sub-theme rendering.
- **Auth flows** — Supabase client factories exist; `useUser`, signup/login/logout, OAuth flows ship in P3.
- **Checkout / webhook** — Asaas env vars are placeholders only; `lib/asaas/` directory is empty. P4 ships the funnel + webhook.
- **SRS / queue logic** — `lib/srs/` and `lib/queue/` are empty (placeholder tests only to make coverage gate fire). P5 ships FSRS-5 + interleaving.
- **Simulado** — `simulado_runs` + `simulado_answers` tables exist (RLS + UNIQUE constraint), but no UI/Server Actions. P6 ships the timed exam.
- **Cadernos / Dashboard / Design system finalization** — P7 ships these.
- **Admin pipeline** — `(admin)` route group is a placeholder. P8 ships review queue + bulk import + edital parser.
- **Marketing landings + SEO** — P9 ships hub + per-concurso landings + sitemap + OG images.
- **Production observability** — Sentry alerts, PostHog funnel, performance budgets, soft launch — P10.
- **Tiptap, AI gen, free tier, multi-idioma, auto-renew** — ANTI-features, never shipped (PRODUTO.md §5/§12).
- **Native mobile app** — v2 (post 1000 alunos engajados).
- **Migration from legacy** — zero. Reboot 100% limpo. Cowork re-popula.

---

## Subsequent Slice Plan

Each later phase adds one user-visible capability on top of this skeleton without altering its architectural decisions:

- **Phase 2:** Hit `tjsp.flashcards.com.br` → middleware resolves concurso → theme inline via CSS vars → route group rewrite (zero FOUC). Tokens base (paleta, tipografia Inter, motion presets, dark mode foundation). TJSP seed populated. `getConcursoBySlug()` helper. `lib/supabase/admin.ts` runtime guard test passes.
- **Phase 3:** Aluno cria conta (email+senha ≥10 chars, HIBP rejeita vazadas), confirma email, loga (email/Google), bate em `PrepPaywall` se não tem acesso, solicita deleção LGPD com `fn_delete_user_cascade`.
- **Phase 4:** Aluno completa checkout PIX/boleto/cartão Asaas; webhook idempotente cria `user_concurso_access` atomicamente via `fn_process_webhook_event`; reembolso CDC art. 49 escreve em `refund_requests` real.
- **Phase 5:** Sessão SRS com FSRS-5, round-robin determinístico (resolve o bug do legado), XP atômico via `fn_award_xp`, WAL IndexedDB sobrevive refresh.
- **Phase 6:** Simulado 5h/70Q WAL strict-durability, timer server-authoritative, sobrevive crash/refresh/dual-tab.
- **Phase 7:** 3 cadernos (Erros + Praticar Erros, Questões personalizado, Cards Marcados), dashboard widgets, mapa do edital, identidade visual Flashcards finalizada com sub-temas por concurso.
- **Phase 8:** Admin pipeline Cowork — review queue, bulk import, edital parser, refund queue, métricas. (Pode rodar em paralelo com P6/P7 após P5.)
- **Phase 9:** Hub + landings per-concurso (SEO long-tail), sitemap, OG dinâmico, demo cards públicos, schema.org Product + Course.
- **Phase 10:** PostHog funnel, LGPD cascade externa, alerts produção, performance budgets CI, primeira cohort paga (5-10 TJSP).

---

*This SKELETON.md is the architectural contract of Phase 1. Subsequent phases consume these decisions without re-negotiating them. Changes to this contract require explicit re-planning of Phase 1.*
