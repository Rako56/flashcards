# Research Summary — Flashcards Reboot

**Project:** flashcards.com.br — marketplace de preparações curadas para concursos públicos brasileiros
**Domain:** Multi-tenant curated flashcard SaaS, BR market, R$ 297/ano per concurso
**Researched:** 2026-05-21
**Confidence:** HIGH

---

## TL;DR for the Roadmapper

Build a **multi-tenant Next.js 15.5 + Supabase Pro** platform with one subdomínio por concurso driven by middleware subdomain routing. The core product is three things done perfectly: FSRS-5 SRS session with tested round-robin interleaving, a 5-hour WAL-persistent simulado, and a Cowork-curated editorial pipeline. Everything else is scaffolding.

Skip: IA visível ao aluno, rich-text caderno, free tier, native mobile, subscription auto-renew — these are anchored anti-features in PRODUTO.md and the reasons the legacy accumulated 72 concerns in 18 months.

Be careful about: webhook silence (return 500 not 200 on DB errors), non-atomic XP (Postgres RPC only), schema drift (types regen in CI), multi-subdomain cookie scope, and the SRS round-robin bug that made Rafael scrap the entire codebase.

Build order: foundation (gates + schema + infra) → multi-tenant skeleton → auth → checkout + webhook → SRS core → simulado → cadernos + dashboard → admin pipeline → marketing + SEO → polish + launch.

Open questions before Phase 0: Next.js 15 vs 16, Supabase branching strategy, PostHog vs alternative for analytics, Asaas sandbox environment setup, and whether admin AI tools (edital parser) are in scope for v1 or deferred.

---

## Stack At-a-Glance

| Layer | Choice | Version | Do NOT use |
|---|---|---|---|
| Framework | Next.js (App Router only) | `15.5.x` (pin) | Pages Router; `output: 'export'`; Edge runtime in middleware |
| Language | TypeScript strict 100% | `5.7.3` | `any`, `: any`, `as any` — blocked by ESLint `error` |
| Package manager | pnpm | `9.x` | npm, yarn |
| Node | Node LTS | `20.18.x` (pin `.nvmrc`) | Node 18 or 22 |
| UI primitives | shadcn/ui + Radix | CLI v2.3 (Tailwind v3 mode) | Tailwind v4 (too churny for v1 design system) |
| Styling | Tailwind CSS | `3.4.17` | v4 — revisit Q1/2027 |
| Forms | React Hook Form + Zod | RHF `7.76.x` + Zod `3.25.x` | Zod v4 subpath (RHF resolver ecosystem not ready); hand-rolled `useState` forms |
| Server state | TanStack Query | `v5.100.x` | Single global QueryClient; raw fetch in client components |
| Animation | motion/react (Framer Motion v12) | `motion@12.39.x` | Full Framer for cosmetic landing animations |
| Charts | Recharts | `3.8.x` | Import Recharts on marketing pages (lazy-load to `/statistics` only) |
| DB / Auth | Supabase Pro | `@supabase/ssr@0.10.x`, `supabase-js@2.106.x` | Free tier (auto-pauses); `auth-helpers-nextjs` (deprecated); `cookies.get/set/remove` in SSR |
| SRS algorithm | ts-fsrs (thin wrapper + own tests) | `~4.x` | Trusting client FSRS state without server sanity-check |
| Payment | Asaas v3 (raw `fetch`, no SDK) | API only | Any unofficial Asaas npm SDK; hardcoded production URL without env toggle |
| Email | Resend | `resend@^4` | Mixing marketing + transactional in same API key |
| Observability | Sentry + pino | `@sentry/nextjs@10.53.x`, `pino@^9` | `console.error` as sole strategy; pino in middleware/edge runtime |
| Tests | Vitest + RTL + MSW + Playwright | `vitest@3.2.x`, `playwright@1.60.x`, `msw@^2.7` | Jest; snapshot tests; inline Supabase mocking per test |
| Lint/format | ESLint flat config + Prettier | `eslint@9.x`, `prettier@3.x` | Biome as ESLint replacement (missing react-hooks + next plugin parity) |
| Pre-commit | husky + lint-staged | `husky@9.x`, `lint-staged@15.x` | `--no-verify` bypasses |
| Hosting | Vercel (Pro) + Supabase Pro | — | Vercel Hobby for prod |
| PWA | Serwist | `@serwist/next@^9` | `next-pwa` (abandoned) |
| Analytics | PostHog | latest | Identifying users by CPF in PostHog |

**Trade-off to decide before Phase 0:**
ARCHITECTURE.md recommends Next.js 16 for greenfield (proxy.ts is cleaner, React Compiler included, Turbopack default). STACK.md recommends 15.5 for doc stability and battle-tested subdomain patterns. The reboot's core feature is wildcard subdomain routing — Next 16's `proxy.ts` rename is a fresh pattern with sparse tutorials. **Recommendation: pin 15.5.x; schedule upgrade to 16 for Q4/2026 after the subdomain patterns are stable.**

---

## Features Map

### v1 Table Stakes (all must ship before first paid user)

**Funnel:** TS-01 Hub landing (RSC + SEO) / TS-02 Per-concurso landing on subdomain / TS-03 Demo cards (5-10) / TS-04 Signup + verification / TS-05 Checkout PIX+boleto+cartão / TS-06 Parcelamento 12x / TS-07 Webhook idempotent + visible failures / TS-08 Polling pós-pagamento (PIX) / boleto distinct UX / TS-09 Reembolso CDC art. 49 real / TS-10 Termos + Privacidade LGPD

**SRS core:** TS-11 FSRS-5 / TS-12 Rating 1-clique + keyboard / TS-13 Round-robin interleaving (DIFF-07 — the bug that killed the legacy) / TS-14 Auto caderno de erros / TS-15 Cards marcados / TS-16 Resume session (WAL) / TS-17 DOMPurify sanitization

**Simulado:** TS-19 Cronometrado DB-configured / TS-20 Distribuição por disciplina / TS-21 WAL persistence (DIFF-11) / TS-22 Marcar e voltar / TS-23 Grid navigator / TS-24 Single submit at end / TS-25 Resultado por disciplina / TS-26 Review answers / TS-27 Auto caderno de erros

**Cadernos:** TS-28 Caderno de Erros auto-populated / TS-29 Caderno de Questões personalizado / TS-30 Cards Marcados / TS-31 Observação curta

**Dashboard:** TS-32 Dashboard com hero + due cards + streak / TS-33 Próxima revisão countdown / TS-34 Streak + freeze / TS-35 Estatísticas por disciplina / TS-36 Heatmap / TS-37 Mapa do Edital dinâmico / TS-38 Drill-down por tópico

**Ops:** TS-39 Google OAuth / TS-40 Account deletion LGPD / TS-41 Mobile responsive / TS-42 Multi-concurso DB-driven day 1 / TS-43 Subdomain switching / TS-44 Sentry + logging / TS-45 Sessão configurável

**Admin pipeline:** ADM-01 Review queue / ADM-02 Bulk import cards / ADM-03 Bulk import questões / ADM-04 Edital parser / ADM-05 Quality audit / ADM-06 Coverage dashboard / ADM-07 Manual access grant / ADM-08 Refund queue / ADM-09 Report card queue / ADM-10 Card edit com histórico / ADM-11 Curator audit log / ADM-12 Métricas Cowork

### v1 Differentiators (also ship — marketing depends on them)

DIFF-01 Curadoria humana visível / DIFF-02 100% edital coberto / DIFF-03 Projeção de prontidão (may defer 30d) / DIFF-04 Sub-tema visual por concurso / DIFF-07 Round-robin determinístico testado / DIFF-10 Painel premium design system / DIFF-11 Simulado WAL marketing hook / DIFF-12 Zero IA visível na landing / DIFF-13 Annual one-shot narrative

### Out of Scope (PRODUTO.md §5/§12 — anchored)

ANTI-01 AI generation / ANTI-02 Tiptap editor / ANTI-03 Free tier amplo / ANTI-04 Multi-idioma / ANTI-05 Auto-renew / ANTI-06 DIY deck editor / ANTI-07 Chat IA / ANTI-08 Push guilt / ANTI-09 Gamification spam / ANTI-10 Multi-tier pricing / ANTI-11 Videoaulas / ANTI-12 Fórum / ANTI-14 OCR PDF upload / ANTI-15 Native mobile v1 / ANTI-17 Migração dados legado

### Future / v2+

FUT-01 Native app (after 1000+ alunos) / FUT-02 Combo multi-concurso Q4/2026 / FUT-04 Audio mode / FUT-06 Ranking público / FUT-08 Reset SRS por tópico

---

## Architecture in 1 Page

```
Browser
  flashcards.com.br | app.… | tjsp.… | admin.…
  RSC pages | Client islands | Server Actions | IndexedDB WAL
       |
       v
Vercel Edge — middleware.ts
  1. Parse Host → surface + concurso slug
  2. supabase.auth.getUser() — session refresh (CRITICAL: getUser not getSession)
  3. Inject x-concurso-slug, x-surface, x-user-id headers
  4. Rewrite to route group: (marketing)|(app)|(admin)|(auth)
       |
       v
Vercel Node — App Router
  (marketing)/  RSC-heavy, public, SEO, cache:3600
  (app)/        RSC shell + client islands, auth+access gated
  (admin)/      RSC + Server Actions, role gated
  (auth)/       Server Actions for mutations
  api/          Route Handlers (webhook, healthz, OG images)
       |
       v
Supabase Pro (sa-east-1)
  Postgres:  admin_concursos (slug, price_cents, theme jsonb, simulado_config jsonb)
             admin_disciplinas, admin_topicos, admin_flashcards (status: draft→review→active)
             admin_questoes, user_concurso_access (junction, PK user_id+concurso_id)
             user_flashcard_progress, srs_reviews (immutable append-only)
             simulado_runs, simulado_answers (UNIQUE attempt_id+question_id)
             purchases, webhook_events (idempotency, PK on Asaas event_id)
             refund_requests, legal_audit_log, audit_log
             + RLS everywhere + fn_award_xp + fn_process_webhook_event + fn_batch_upsert_progress
  Auth:      email/pwd + Google OAuth, HIBP on, pwd ≥10 chars, cookie Domain=.flashcards.com.br
  Storage:   private bucket + signed URLs (avatars); public (OG images)
  Edge Fns:  process-leagues (pg_cron only), send-welcome-email (Resend)

External:   Asaas (PIX/boleto/cartão), Sentry, Resend, PostHog
            Vercel Edge Config (concurso slug→id cache for middleware hot path)
```

**Component responsibilities summary:**
- `middleware.ts` — subdomain resolver + session refresh + header injection + route rewrite (ONLY these 4 things)
- `lib/srs/fsrs.ts` — FSRS-5 pure functions, zero deps, ≥95% coverage
- `lib/queue/builder.ts` — `buildStudyQueue` pure, tested round-robin (the bug fix)
- `lib/simulado/wal.ts` — strict-durability IndexedDB WAL for 5-hour sessions
- `/api/asaas/webhook/route.ts` — idempotent + re-fetch verify + 500-on-transient
- `lib/supabase/admin.ts` — service-role client with `'server-only'` guard + runtime throw

**Build order (canonical from ARCHITECTURE.md):**
P0 Foundation → P1 Multi-tenant skeleton → P2 Auth + access → P3 Checkout + webhook → P4 SRS core → P5 Simulado → P6 Cadernos + dashboard → P7 Admin pipeline → P8 Marketing + SEO → P9 Polish + launch

**Parallelization:** Phase 7 (admin pipeline) can run alongside Phase 5/6 once Phase 4 is done.

**5 Hardest trade-offs:**
1. Next.js 15.5 vs 16 — pin 15.5; upgrade Q4/2026
2. Webhook: Route Handler wins over Edge Function (shared types, single Sentry project, single deploy)
3. FSRS-5: client compute + IndexedDB WAL + server projection (latency + durability + authoritative)
4. Simulado WAL: IndexedDB strict-durability primary; Postgres sync on submit only; multi-device is v2
5. Admin: single codebase route groups; no split deploy until 10k users

---

## Top Pitfalls per Phase

| Phase | Top Pitfalls | Prevention |
|---|---|---|
| **P0 Foundation** | Convention drift (P1); TS strict partial (P2); Free tier (P6); Middleware Node API (P18); Connection exhaustion (P19) | CI gates before commit 2; single strict tsconfig; Supabase Pro day 0; middleware does only 4 things; pooler URL port 6543 |
| **P1 Multi-tenant** | Cookie domain misconfig (P13); service_role leak (P11); hydration mismatch (P9); hardcoded UUID antipattern | `Domain=.flashcards.com.br`; `'server-only'` guard; single Supabase client factory; `getConcursoBySlug()` always |
| **P2 Auth + Access** | Hydration mismatch full coverage (P9); account deletion fake (P17); session not cross-subdomain (P13) | Playwright cross-subdomain login test; two-stage delete with `auth.admin.deleteUser()`; cookie domain E2E verified |
| **P3 Checkout + Webhook** | Webhook silent 200 (P3); double-grant idempotency (P14); boleto UX confusion (P20); fake refund CDC (P5) | 500 on transient errors; `webhook_events` PK on Asaas event_id; `expires_at = paid_at + 365d`; per-billing-type UX; real `refund_requests` |
| **P4 SRS Core** | Cards repeating same section (P7 / DI-01); non-atomic XP (P4 / DI-01); timezone drift (P7); Realtime RLS (P22) | Three pure separated functions + property tests; `fn_award_xp` RPC only; `timestamptz` + BRT midnight; RLS policies before Realtime |
| **P5 Simulado** | Client-side timer (P12); double-submit dual tab (P23); WAL not recovering | `expires_at` in DB; UNIQUE `(attempt_id, question_id)`; property test: write → kill → reload → recover |
| **P6 Cadernos + Dashboard** | Schema drift broken UI (P15); Recharts bundle balloon (P16); N+1 queries | Visual regression snapshots; `dynamic()` import Recharts; single RPC for aggregated counts |
| **P7 Admin Pipeline** | Zombie code (P10); admin AI leaking to student | `knip` in CI; `'server-only'`; every AI row enters `status='review'` requiring human approval |
| **P8 Marketing + SEO** | Subdomain SEO authority gap (P21); landing copy drift | Hub-and-spoke linking + GSC per subdomain; CODEOWNERS on `(marketing)/` |
| **P9 Polish + Launch** | LGPD soft-delete never hard-deletes (P17); PWA SW breaks auth (P24); production alert gaps | External cascade E2E; defer PWA until post-launch; Sentry alerts for every webhook/auth/DB concern |

---

## The 5 CRITICAL Legacy Concerns — Where Each Gets Solved

| Legacy Concern | Phase | Mechanism |
|---|---|---|
| **TD-05** `question_attempts.content_item_id` NOT NULL pointing to dropped column — silent insert failure | **P0** | Greenfield schema: no legacy column; generated types are source of truth; `as any` banned by ESLint `error` |
| **SEC-05** `asaas-webhook` returns 200 on failure + zero Sentry — silent payment loss | **P3** | Route Handler returns 500 on transient; Sentry.captureException every catch; `webhook_events` audits every delivery; alert on missing grants |
| **DI-01** `awardXp` non-atomic read-modify-write — XP lost under concurrency | **P4** | `fn_award_xp` Postgres fn: single `UPDATE col = col + N`; client calls `supabase.rpc()` only |
| **SEC-10** `/reembolso` writes to non-existent table — fake success UI, CDC art. 49 exposure | **P3** | Migration 0006 creates `refund_requests`; Server Action Zod-validates; integration test writes + reads back; `legal_audit_log` on every submission |
| **TEST-01** 1 test file for 190 source files (0.5%), main in RED | **P0** | Coverage gates in `vitest.config.ts` from commit 1; CI fails on regression; ≥90% on `lib/srs/` + `lib/queue/`; ≥50% global |

---

## Cross-Cutting Non-Negotiables

Every phase, every PR:

- TypeScript strict 100%: single `tsconfig.json`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no `any`
- Lint CI blocking: `pnpm lint` + `pnpm typecheck` + `pnpm format:check` on every PR
- Pre-commit hook: husky + lint-staged; `tsc --noEmit` before push
- Coverage gates: ≥50% global; ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`
- Sentry capture on all errors: every catch in Route Handlers + Server Actions
- Structured logs: pino on all Node routes; `correlationId` on every request
- Atomic Postgres functions for any read-modify-write (XP, access grant, progress batch, webhook)
- Supabase types regenerated in CI: migration + regen + commit in same PR
- RLS on every table: migration template includes `ENABLE ROW LEVEL SECURITY` + 4 default policies
- No hardcoded UUIDs or prices: DB-driven from day 1
- `service_role` key isolated: only `lib/supabase/admin.ts` with `'server-only'`; never `NEXT_PUBLIC_`
- ANTI-features enforced off: no AI visible to student, no Tiptap, no free tier, no auto-renew

---

## Recommended Phase Structure (for Roadmapper)

10 phases, fine granularity, each 5-10 plans. Parallel opportunity noted for P7.

### Phase 0 — Foundation

**Goal:** Zero-drift codebase from commit 1. CI gates, schema, Sentry, types pipeline in place before first feature.
**Key deliverables:** Next.js 15.5 + TS strict + shadcn + pnpm scaffold; Supabase Pro project + branching; CI pipeline (lint→typecheck→test→build→supabase-lint); Sentry + pino + correlation IDs from commit 1; schema migrations 0001-0008 (admin_concursos, admin_*, users/profiles, user_concurso_access, srs/progress/reviews, simulados, purchases/webhook_events, audit_log + RLS); types generation pipeline; husky + lint-staged pre-commit
**Key features (PROJECT.md):** OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-07, OPS-08
**Dependencies:** None
**Top risks:** Convention drift before gates (P1); TS strict partial (P2); free-tier infra (P6)
**Research flag:** Standard — no phase research needed

### Phase 1 — Multi-Tenant Skeleton

**Goal:** A request to `tjsp.flashcards.com.br` resolves concurso context, applies theme, routes correctly. No product features yet.
**Key deliverables:** `middleware.ts` (subdomain→headers→rewrite); route groups + layered layouts with guards; `lib/concurso/resolver.ts` + Edge Config cache; `<ThemeStyle>` inline CSS vars (zero FOUC); `lib/supabase/{server,browser,admin}.ts`; TJSP seed concurso
**Key features:** MULTI-01, MULTI-02, MULTI-03, MULTI-05
**Dependencies:** Phase 0
**Top risks:** Cookie domain misconfig (P13); service_role leak (P11); middleware Node API bleed (P18)
**Research flag:** Standard — Vercel Platforms Starter Kit + Supabase SSR docs

### Phase 2 — Auth + Access

**Goal:** Aluno creates account, verifies email, logs in (email or Google), hits paywall if unpaid.
**Key deliverables:** Auth pages (signup/login/forgot/verify/callback/onboarding); PrepPaywall component; LGPD account deletion endpoint + two-stage delete Postgres fn; HIBP on in Supabase Auth; Playwright: login → reload → navigate across subdomains → still authed
**Key features:** SALES-03, TS-04, TS-39, TS-40, OPS-06, OPS-07
**Dependencies:** Phase 1 (cookie domain + route groups)
**Top risks:** Hydration mismatch (P9); account deletion fake (P17); cross-subdomain session (P13)
**Research flag:** Standard — `@supabase/ssr` + Google OAuth well-documented

### Phase 3 — Checkout + Webhook

**Goal:** Full payment funnel: PIX/boleto/cartão → webhook grants access atomically → reembolso works → Sentry alerts on any failure.
**Key deliverables:** Checkout UI (per-billing-type UX, distinct boleto/PIX/cartão paths); `lib/asaas/` client wrapper; `/api/asaas/webhook/route.ts` (idempotent + re-fetch + 500-on-transient); `fn_process_webhook_event` Postgres fn; `refund_requests` table + admin queue; email at every state transition (Resend); E2E: signup → checkout → webhook → access → study
**Key features:** SALES-04 to SALES-08, TS-05 to TS-09, ADM-07, ADM-08
**Dependencies:** Phase 2 (authenticated user)
**Top risks:** Webhook silent 200 (P3/SEC-05); double-grant idempotency (P14/SEC-07); boleto UX (P20); CDC art. 49 fake refund (P5/SEC-10)
**Research flag:** Confirm Asaas webhook token complexity requirements (March 2026 change: 32-255 chars, no sequential digits) and retry policy edge cases (503 vs 500 behavior)

### Phase 4 — SRS Core

**Goal:** The study session is the product. Cards interleaved by disciplina, FSRS-5 scheduling correct, WAL survives loss, XP atomic. Fixes the bug that killed the legacy.
**Key deliverables:** `lib/srs/fsrs.ts` (≥95% coverage, property-based FSRS invariants); `lib/queue/builder.ts` + `interleaveQueue` (property tests: no disciplina 3x consecutive given 3+, stable seed `userId+brtDate+sessionId`); `lib/srs/wal.ts` (IndexedDB); `hooks/useReviewBatcher.ts` (batch flush + retry); `batchUpsertProgress` Server Action + Postgres fn; `fn_award_xp` Postgres fn; study session client component; `fn_xp_events` audit table with idempotency key
**Key features:** STUDY-01 to STUDY-06, DASH-03 (XP atomic), TS-11 to TS-18, TS-42, TS-45
**Dependencies:** Phase 3 (paid access entitlement)
**Top risks:** Cards repeating (P7/DI-01); non-atomic XP (P4/DI-01); timezone drift (P7); Realtime RLS bypass (P22)
**Research flag:** ts-fsrs library API should be validated against 19-weight FSRS-5 spec. Property-based test invariants for `interleaveQueue` may need a planning spike.

### Phase 5 — Simulado

**Goal:** A 5-hour simulado runs without data loss on crash, refresh, or dual-tab. Timer is server-authoritative. Distribution mirrors real banca.
**Key deliverables:** `lib/simulado/distribution.ts`; `lib/simulado/wal.ts` (strict-durability IndexedDB); `lib/simulado/scoring.ts` (pure + tested); simulado run client component (server-authoritative timer + WAL + grid navigator + mark-and-return); submit endpoint with server-side expiry check (`expires_at + 30s` tolerance); result page + review answers; UNIQUE `(attempt_id, question_id)` enforced
**Key features:** SIM-01 to SIM-04, TS-19 to TS-27, DIFF-11 (WAL as marketing hook)
**Dependencies:** Phase 4 (SRS core, question database)
**Top risks:** Client-side timer (P12); double-submit dual tab (P23)
**Research flag:** Standard — IndexedDB strict-durability + Dexie well-documented

### Phase 6 — Cadernos + Dashboard Premium

**Goal:** The painel feels premium and distinct. Three curated cadernos, stats-rich dashboard, edital coverage map, design identity is Flashcards — not shadcn defaults.
**Key deliverables:** Caderno de Erros (auto-populated + "praticar erros"); Caderno de Questões (filtered query, saved); Cards Marcados; Dashboard widgets (due count, streak, heatmap, edital progress, `daysToReady()` projection); Statistics page (Recharts, `dynamic()` lazy-loaded); Mapa do Edital (visual coverage, click → cards do tópico); design tokens finalized (typography, colors, concurso sub-themes as CSS var overrides)
**Key features:** NB-01 to NB-03, DASH-01 to DASH-04, TS-28 to TS-38, DIFF-03, DIFF-04, DIFF-10
**Dependencies:** Phase 4 (SRS data), Phase 5 (simulado data)
**Parallelization:** Design system work can begin alongside Phase 4/5.
**Top risks:** Schema drift broken UI (P15); Recharts bundle balloon (P16); "0/0 Tópicos" pattern
**Research flag:** `daysToReady()` algorithm may need a brief planning spike. Standard otherwise.

### Phase 7 — Admin Pipeline

**Goal:** Cowork can import an edital, bulk-import cards, review via keyboard shortcuts, approve to active, and monitor coverage. Runs in parallel with P5/P6.
**Key deliverables:** Review queue UI (A=approve, E=edit, R=reject, S=skip keyboard shortcuts); concurso CRUD + theme editor (admin creates new concurso, no code deploy); edital parser pipeline (`source_pipeline='ai-parsed'`, every row enters `status='review'`); bulk import questões; refund admin queue; internal metrics dashboard; curator audit log (who approved what when)
**Key features:** ADM-01 to ADM-12, ADMIN-01 to ADMIN-06
**Dependencies:** Phase 3 (purchases + refund table), Phase 4 (flashcard schema active)
**Parallelization:** Runs alongside Phase 5/6 once Phase 4 is done.
**Top risks:** Zombie code (P10); admin AI tools leaking to student surface
**Research flag:** Edital parser tooling (PDF → structured disciplinas/tópicos) needs a planning decision: pdfjs + LLM? manual with AI assist? Confirm toolchain before implementation.

### Phase 8 — Marketing + SEO

**Goal:** Hub and per-concurso landings are indexable, fast, SEO-optimized, and convert. TJSP long-tail established.
**Key deliverables:** Hub landing (RSC, metadata API, OG); per-concurso landing chassis (reusable, sub-theme applied); OG image generation Route Handler; sitemap (per subdomain + master at `flashcards.com.br/sitemap.xml`); robots.txt; metadata API per route; demo cards on landing (TS-03); Termos + Privacidade final copy (zero "planos gratuitos", zero "caderno digital", zero "chat IA")
**Key features:** SALES-01, SALES-02, TS-01, TS-02, TS-03, TS-10, DIFF-12, DIFF-13
**Dependencies:** Phase 1 (subdomain routing), Phase 6 (design system for visual)
**Top risks:** Subdomain SEO authority gap (P21); landing copy advertising non-existent features; Terms drift
**Research flag:** Standard — RSC + metadata API + dynamic OG well-documented. GSC setup is operational.

### Phase 9 — Polish + Launch

**Goal:** First paying cohort. LGPD compliant, observability complete, production checklist passed, PostHog funnel wired.
**Key deliverables:** PostHog funnel events (signup → checkout → access → first session → simulado start); LGPD deletion finalized (external cascade: Resend audience + PostHog person + Sentry user via API); production Sentry alerts (webhook 5xx, auth failures, DB connection errors, payload mismatch); performance budgets verified (landing <150KB gzipped, app pages <250KB); Supabase Pro confirmed (PITR 7d, HIBP on, connections monitored); Vercel Pro wildcard SSL verified; soft launch with small cohort
**Key features:** OPS-06, OPS-09, OPS-10, TS-10 (final)
**Dependencies:** All prior phases
**Top risks:** LGPD soft-delete never hard-deletes (P17); PWA SW prematurely shipped (P24); Sentry alert gaps
**Research flag:** PostHog LGPD compliance + data residency should be confirmed before Phase 9 wiring.

---

## Open Questions for Rafael

1. **Next.js 15.5 vs 16** — Go conservative (15.5, upgrade Q4/2026) or greenfield-native (16 from day 1 with `proxy.ts`)? Recommendation: 15.5.x. Decision needed before Phase 0.

2. **Supabase branching** — Enable from day 1 (each PR gets isolated DB)? Pro plan supports it; adds P0 setup cost but eliminates shared-dev-DB conflicts. Yes or No?

3. **PostHog vs alternative** — ARCHITECTURE.md lists PostHog for product analytics. Is this confirmed, or does Rafael have a preference? Affects Phase 9 wiring.

4. **Admin AI tools in v1** — Edital parser uses AI internally (Cowork-side, never student-visible). In scope for Phase 7 v1, or manual import first with AI-parser as v1.5? Affects Phase 7 scope.

5. **Asaas sandbox credentials** — Does Rafael have Asaas sandbox API key and webhook endpoint configured? Needed to unblock Phase 3 before production keys.

6. **Design system timing** — Design sprint before Phase 1 (design-first), or design evolves alongside the build (design-as-built)? Affects Phases 1-6 visual consistency.

7. **Cowork timeline** — When does Rafael expect Cowork to start importing TJSP content? Phase 7 can run in parallel with Phase 5/6, but the timing determines whether admin pipeline is a soft-launch blocker.

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | All choices verified against official docs; version pins confirmed for 2026-Q2; trade-offs documented |
| Features | HIGH | PRODUTO.md is gospel + 18 months legacy signal + BR concurso ecosystem deeply mapped |
| Architecture | HIGH | All 9 patterns verified; 5 CRITICAL legacy concerns have explicit architectural prevention |
| Pitfalls | HIGH | Legacy 72 concerns + external ecosystem; pitfall-to-phase mapping covers all 25 pitfalls |

**Overall confidence:** HIGH

### Gaps to Address During Planning

- **FSRS-5 property-based test invariants** — ts-fsrs library API should be validated against 19-weight spec. The pure function separation is clear; exact `interleaveQueue` invariants may need a Phase 4 planning spike.
- **Edital parser tooling** — PDF-to-structured-data approach (pdfjs + LLM? manual?) needs a Phase 7 planning decision.
- **Asaas webhook retry edge cases** — Exact behavior on 503 vs 500 vs 4xx retry needs validation against March 2026 Asaas API docs during Phase 3 planning.
- **Supabase Realtime quotas** — Usage quotas on Supabase Pro need to be checked before Realtime features are planned (Phases 4/5).
- **PostHog LGPD compliance** — Data residency + person deletion API should be confirmed LGPD-safe before Phase 9 wiring.

---

## Sources

- `.planning/research/STACK.md` (2078 lines, 2026-05-21)
- `.planning/research/FEATURES.md` (459 lines, 2026-05-21)
- `.planning/research/ARCHITECTURE.md` (1522 lines, 2026-05-21)
- `.planning/research/PITFALLS.md` (1083 lines, 2026-05-21)
- `.planning/codebase/CONCERNS.md` (72 concerns, 2026-05-21)
- `.planning/PROJECT.md`

---

*Research completed: 2026-05-21*
*Ready for roadmap: yes*
