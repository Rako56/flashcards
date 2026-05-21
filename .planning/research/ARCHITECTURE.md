# Architecture Research

**Domain:** Multi-tenant SaaS marketplace (Brazilian concurso prep) — Next.js 15 App Router + Supabase + Asaas + Vercel
**Researched:** 2026-05-21
**Confidence:** HIGH (all critical claims verified against official Next.js docs, Supabase SSR docs, Asaas docs, and legacy `.planning/codebase/` analysis)

> **Scope.** This document describes the **system structure** for the Flashcards reboot. It is NOT a how-to. It defines component boundaries, data flow, build-order dependencies, and trade-off notes that feed Phase 1 of the roadmap. The 15 architectural questions raised in the milestone context are all answered (see Patterns + Decisions sections).

---

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                BROWSER (Client)                                  │
│  flashcards.com.br | app.flashcards.com.br | tjsp.flashcards.com.br | admin.…   │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ RSC pages    │  │ Client comps │  │ Server Acts  │  │ Service Workers   │   │
│  │ (marketing,  │  │ (study loop, │  │ (forms,      │  │ (optional, PWA    │   │
│  │  dashboard)  │  │  simulado)   │  │  mutations)  │  │  shell only)      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬───────┘   │
│         │                 │                 │                      │            │
│         │                 ▼                 │                      │            │
│         │     ┌──────────────────────┐     │                      │            │
│         │     │ TanStack Query v5    │     │                      │            │
│         │     │ + Zustand (local UI) │     │                      │            │
│         │     │ + IndexedDB WAL      │     │                      │            │
│         │     └──────────┬───────────┘     │                      │            │
│         │                │                 │                      │            │
└─────────┼────────────────┼─────────────────┼──────────────────────┼────────────┘
          │                │                 │                      │
          ▼                ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE / NODE (Server)                              │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │  middleware.ts  (Edge runtime — runs FIRST on every request)            │    │
│  │  1. Parse Host header → resolve concurso slug → fetch theme/config     │    │
│  │  2. Validate Supabase session cookie (refresh if needed)               │    │
│  │  3. Inject `x-concurso-id`, `x-concurso-slug`, `x-surface` headers     │    │
│  │  4. Rewrite to route group: (marketing) | (app) | (admin) | (auth)    │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │  App Router (Node runtime by default, Edge for select routes)          │    │
│  │  app/                                                                   │    │
│  │  ├── (marketing)/   — RSC, SEO-first, public                           │    │
│  │  ├── (app)/         — Hybrid RSC + client islands, auth-gated         │    │
│  │  ├── (admin)/       — RSC + Server Actions, role-gated                 │    │
│  │  ├── (auth)/        — Server Actions for signup/login                  │    │
│  │  └── api/           — Route Handlers (webhook, healthz, public APIs)  │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│  ┌──────────────────────────┐    ┌───────────────────────────────────────┐    │
│  │ Server Actions           │    │ Route Handlers                         │    │
│  │ (internal mutations)     │    │ (webhooks, public APIs, large I/O)    │    │
│  │ — checkout submit        │    │ — POST /api/asaas/webhook             │    │
│  │ — profile update         │    │ — GET /api/healthz                    │    │
│  │ — admin approve card     │    │ — GET /api/og/[slug] (OG images)      │    │
│  │ — batch SRS write        │    │ — POST /api/upload (large files)      │    │
│  └────────────┬─────────────┘    └─────────────────┬─────────────────────┘    │
└───────────────┼─────────────────────────────────────┼───────────────────────────┘
                │                                     │
                ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Single Project, Pro tier)                      │
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐   │
│  │  Postgres (auth-     │  │  Auth (cookies via   │  │ Storage             │   │
│  │  oritative)          │  │  @supabase/ssr)      │  │ (avatars, OG, edit) │   │
│  │                      │  │                      │  │                     │   │
│  │  - admin_concursos   │  │  - email/password    │  │ - public buckets    │   │
│  │  - admin_disciplinas │  │  - Google OAuth      │  │ - signed URLs       │   │
│  │  - admin_topicos     │  │  - HIBP enabled      │  │                     │   │
│  │  - admin_flashcards  │  └──────────────────────┘  └────────────────────┘   │
│  │  - admin_questoes    │                                                       │
│  │  - user_concurso_    │  ┌──────────────────────────────────────────────┐   │
│  │    access (junction) │  │  Edge Functions (Deno) — minimal set         │   │
│  │  - user_flashcard_   │  │  - process-leagues (cron weekly)             │   │
│  │    progress          │  │  - send-welcome-email (Resend)               │   │
│  │  - srs_reviews       │  │  - (NO asaas-webhook here — moved to        │   │
│  │  - simulado_runs     │  │     Next.js Route Handler for type safety)  │   │
│  │  - webhook_events    │  └──────────────────────────────────────────────┘   │
│  │    (idempotency)     │                                                       │
│  │  - purchases         │  ┌──────────────────────────────────────────────┐   │
│  │  - audit_log         │  │  Realtime (selective use)                    │   │
│  │  - RLS everywhere    │  │  - admin review queue notifications          │   │
│  │  - Postgres fns for  │  │  - simulado progress sync (multi-device)     │   │
│  │    atomic ops        │  └──────────────────────────────────────────────┘   │
│  └──────────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                        │
│  ┌────────────────────┐  ┌─────────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Asaas API          │  │ Sentry          │  │ Resend   │  │ PostHog       │  │
│  │ - Customer create  │  │ - Frontend +    │  │ - Tx     │  │ - Product     │  │
│  │ - Payment create   │  │   Server +      │  │   email  │  │   analytics   │  │
│  │ - Webhook POST →   │  │   Edge errors   │  │          │  │ - Funnel +    │  │
│  │   /api/asaas/      │  │ - Source maps   │  │          │  │   retention   │  │
│  │   webhook          │  │ - PII scrubbed  │  │          │  │               │  │
│  └────────────────────┘  └─────────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Subdomain Resolver (`middleware.ts`)** | Parse `Host`, lookup concurso, refresh Supabase session, set request headers, rewrite to route group | Next.js middleware on Edge runtime, single function, <30ms p95 |
| **Concurso Context Provider** | Make `concurso_id`, `concurso_slug`, `theme`, `surface` available to RSC tree | RSC reads headers via `headers()` in root layout; React Context for client comps |
| **Route Group: `(marketing)`** | Public-facing landings, SEO, OG metadata, no auth | RSC-heavy. `generateMetadata` per route. Cached `revalidate: 3600` |
| **Route Group: `(app)`** | Authenticated student surfaces (dashboard, study, simulado, profile) | Hybrid: RSC shell + client islands for interactive parts |
| **Route Group: `(admin)`** | Cowork review queue, edital management, metrics | RSC + Server Actions. Gate via `requireAdmin()` in layout |
| **Route Group: `(auth)`** | Signup, login, forgot password, email verification | Server Actions for mutations; client UI for form interactivity |
| **Supabase SSR Client (server)** | Server-side Supabase access with user JWT via cookies | `@supabase/ssr` `createServerClient`. New instance per request. |
| **Supabase Browser Client** | Client-side reads/writes (for realtime, optimistic UI) | `@supabase/ssr` `createBrowserClient`. Singleton per session. |
| **Supabase Service Client** | Privileged writes (only inside webhooks/cron/admin actions) | `createClient` with `SUPABASE_SERVICE_ROLE_KEY`. NEVER imported in client code. Lives in `lib/supabase/admin.ts` with a runtime guard. |
| **Webhook Handler (`/api/asaas/webhook`)** | Validate token, persist event (idempotent), grant access, log audit | Next.js Route Handler (Node runtime), Postgres `webhook_events` UNIQUE on `event_id` |
| **Server Action: Checkout Submit** | Validate input (Zod), create Asaas customer/payment, return payment URL | `'use server'` function called from client form |
| **SRS Engine (`lib/srs/`)** | FSRS-5 pure functions: `calculateNextState(state, rating)` → new state | Pure TS, zero deps, fully tested (≥95% coverage) |
| **Queue Builder (`lib/queue/`)** | Build deterministic study queue: interleave disciplines, honor budget, prevent same-section repeats | Pure TS, fully tested. **Replaces legacy bug.** |
| **SRS WAL (`lib/srs/wal.ts`)** | In-session write-ahead log: `IndexedDB` mirror of `user_flashcard_progress` | Dexie or raw IndexedDB. Reconciles on session start. |
| **Batch Sync (`hooks/useReviewBatcher.ts`)** | Flush WAL → Server Action (`batchUpsertProgress`) every N reviews or on unload | React hook; Server Action calls Postgres `fn_batch_upsert_progress` |
| **Simulado WAL** | Per-question state (answer, time spent) persisted to IndexedDB on every keystroke; reconciled to Postgres on submit | IndexedDB strict-durability writes; full state recoverable on crash |
| **Theme Engine** | Read `admin_concursos.theme` → emit inline `<style>` in root layout, no FOUC | RSC layout fetches theme, emits CSS variables, client components consume |
| **RLS Enforcer (Postgres policies)** | Authoritative authorization: deny by default, allow by `concurso_id` + access junction | Single helper SQL function `fn_user_has_access(p_concurso_id)` reused in every policy |
| **Atomic Mutation Functions (Postgres)** | `fn_award_xp`, `fn_grant_access`, `fn_approve_card`, `fn_batch_upsert_progress` | SQL functions with explicit `SECURITY DEFINER` or `INVOKER`, called via RPC |
| **Audit Log** | Append-only `audit_log` table: who, what, when, before/after | Postgres trigger on key tables + explicit inserts from Server Actions |
| **Observability Stack** | Frontend errors, server errors, structured logs, correlation IDs | Sentry SDK (browser + server + edge), structured JSON via Pino on server |

---

## Recommended Project Structure

```text
flashcards/                                  # New repo
├── .github/
│   └── workflows/
│       ├── ci.yml                            # lint → typecheck → test → build
│       └── e2e.yml                           # Playwright on Vercel preview
├── .planning/                                # GSD docs (research, roadmap, etc.)
├── app/                                      # Next.js App Router
│   ├── (marketing)/                          # Public, SEO-first, no auth
│   │   ├── layout.tsx                        # Marketing-only chrome (header/footer)
│   │   ├── page.tsx                          # Hub landing (flashcards.com.br/)
│   │   ├── concursos/[slug]/page.tsx         # Per-concurso landing
│   │   │                                     # (resolved by middleware rewrite)
│   │   ├── termos/page.tsx
│   │   ├── privacidade/page.tsx
│   │   └── reembolso/page.tsx                # Form → Server Action → audit_log
│   ├── (app)/                                # Auth-gated student surfaces
│   │   ├── layout.tsx                        # Sidebar + theme + access guard
│   │   ├── dashboard/page.tsx
│   │   ├── estudar/
│   │   │   ├── page.tsx                      # Session config (RSC)
│   │   │   └── sessao/page.tsx               # Client component (study loop)
│   │   ├── simulado/
│   │   │   ├── page.tsx                      # List + config
│   │   │   ├── [id]/run/page.tsx             # Client component (timed)
│   │   │   └── [id]/resultado/page.tsx       # RSC
│   │   ├── cadernos/
│   │   │   ├── erros/page.tsx
│   │   │   └── marcados/page.tsx
│   │   ├── edital/page.tsx                   # Coverage map
│   │   ├── estatisticas/page.tsx
│   │   ├── perfil/page.tsx
│   │   ├── configuracoes/page.tsx
│   │   └── trocar-preparacao/page.tsx        # Multi-concurso switcher
│   ├── (admin)/                              # Cowork-only
│   │   ├── layout.tsx                        # requireAdmin() guard
│   │   ├── page.tsx                          # Admin dashboard
│   │   ├── revisao/
│   │   │   ├── page.tsx                      # Review queue list
│   │   │   └── [id]/page.tsx                 # Single card review
│   │   ├── concursos/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── novo/page.tsx
│   │   ├── editais/[id]/page.tsx
│   │   ├── questoes/page.tsx
│   │   ├── reembolsos/page.tsx
│   │   ├── alunos/page.tsx
│   │   └── metricas/page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx                        # Centered card chrome
│   │   ├── entrar/page.tsx
│   │   ├── criar-conta/page.tsx
│   │   ├── recuperar/page.tsx
│   │   ├── verificar/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── callback/route.ts                 # OAuth + email verify callback
│   ├── api/                                  # Route Handlers only
│   │   ├── asaas/
│   │   │   └── webhook/route.ts              # POST — idempotent, audit_log
│   │   ├── healthz/route.ts                  # GET — supabase/asaas reachability
│   │   ├── og/[slug]/route.ts                # Dynamic OG image generation
│   │   └── revalidate/route.ts               # On-demand ISR invalidation
│   ├── layout.tsx                            # Root: HTML shell, fonts, theme inline
│   ├── error.tsx                             # Global error boundary
│   ├── not-found.tsx
│   └── global-error.tsx                      # Boundary for root layout errors
├── middleware.ts                             # Subdomain + auth + headers + rewrite
├── lib/
│   ├── supabase/
│   │   ├── server.ts                         # createServerClient (per-request)
│   │   ├── browser.ts                        # createBrowserClient (singleton)
│   │   ├── admin.ts                          # service-role client (server-only!)
│   │   ├── types.ts                          # Generated types (DO NOT EDIT)
│   │   └── helpers.ts                        # requireUser, requireAdmin, requireAccess
│   ├── srs/
│   │   ├── fsrs.ts                           # FSRS-5 pure functions
│   │   ├── fsrs.test.ts                      # Comprehensive tests (≥95%)
│   │   ├── types.ts                          # SRSState, Rating, CardScheduling
│   │   └── wal.ts                            # IndexedDB WAL
│   ├── queue/
│   │   ├── builder.ts                        # buildStudyQueue (pure)
│   │   ├── builder.test.ts                   # Tests for round-robin, budget, no-repeat
│   │   ├── interleave.ts                     # Discipline interleaving algorithm
│   │   └── types.ts
│   ├── simulado/
│   │   ├── distribution.ts                   # Pick questions per discipline per banca
│   │   ├── wal.ts                            # Strict-durability IndexedDB WAL
│   │   ├── scoring.ts                        # Pure: compute %, per-discipline stats
│   │   └── scoring.test.ts
│   ├── concurso/
│   │   ├── resolver.ts                       # slug → concurso (cached in middleware)
│   │   ├── theme.ts                          # admin_concursos.theme → CSS vars
│   │   └── access.ts                         # Check user_concurso_access
│   ├── asaas/
│   │   ├── client.ts                         # Asaas API wrapper
│   │   ├── webhook.ts                        # Validate token, parse event, idempotency
│   │   ├── types.ts                          # Asaas API types
│   │   └── refetch.ts                        # Re-fetch payment to verify (SEC-08 fix)
│   ├── observability/
│   │   ├── sentry.ts                         # SDK init (browser/server/edge)
│   │   ├── logger.ts                         # Pino structured logger
│   │   └── correlation.ts                    # Request ID generation/propagation
│   ├── cpf.ts                                # CPF validation (BR)
│   ├── auth-errors.ts                        # Translate Supabase errors → human PT
│   ├── time.ts                               # BRT timezone helpers
│   └── utils.ts                              # cn() = clsx + twMerge
├── components/
│   ├── ui/                                   # shadcn/ui primitives (kept thin)
│   ├── marketing/                            # Hero, pricing, FAQ, etc.
│   ├── app/
│   │   ├── layout/                           # Sidebar, BottomNav, Topbar
│   │   ├── dashboard/                        # Widgets
│   │   ├── study/                            # Card display, rating bar
│   │   ├── simulado/                         # Question UI, timer
│   │   └── gamification/                     # XP toast, combo, badges
│   ├── admin/
│   ├── paywall/                              # PrepPaywall, AccessGate
│   ├── concurso/                             # ConcursoCard, SwitchPicker
│   └── theme/                                # ThemeProvider, ThemeScript
├── styles/
│   ├── globals.css                           # Tailwind layers + base tokens
│   └── tokens.css                            # Base CSS variables (overridden by theme)
├── supabase/
│   ├── config.toml                           # Local dev config
│   ├── migrations/                           # New, clean. No legacy.
│   │   ├── 0001_init.sql                     # Core schema
│   │   ├── 0002_concursos.sql                # admin_* tables
│   │   ├── 0003_users.sql                    # profiles, access junction
│   │   ├── 0004_srs.sql                      # progress, reviews
│   │   ├── 0005_simulados.sql
│   │   ├── 0006_purchases.sql                # webhook_events idempotency
│   │   ├── 0007_audit.sql                    # audit_log
│   │   └── 0008_rls.sql                      # All RLS policies (one file)
│   ├── functions/                            # Minimal Deno edge functions
│   │   ├── process-leagues/index.ts          # Cron only — Deno required
│   │   └── send-welcome-email/index.ts       # Resend integration
│   └── seed.sql                              # Local dev seed only (never prod)
├── tests/
│   ├── e2e/                                  # Playwright
│   │   ├── signup-checkout-study.spec.ts     # OPS-10
│   │   └── admin-review.spec.ts
│   ├── unit/                                 # Vitest (co-located preferred)
│   └── fixtures/
├── scripts/                                  # Build-time + admin scripts
│   ├── generate-types.ts                     # npm run db:types
│   ├── seed-tjsp.ts                          # Local seed for TJSP
│   └── audit-content.ts                      # Quality gate before publish
├── public/
│   ├── favicon.ico, favicon.svg
│   ├── apple-touch-icon.png
│   ├── og/                                   # Static OG fallbacks
│   ├── robots.txt
│   └── sitemap.xml                           # Generated at build time
├── .env.local.example                        # Documented env vars
├── .gitignore
├── biome.json                                # Or eslint + prettier configs
├── components.json                           # shadcn config
├── next.config.ts                            # Headers, redirects, images
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json                             # strict: true
├── vercel.json                               # CSP, HSTS, cache headers
├── vitest.config.ts
└── README.md
```

### Structure Rationale

- **`app/(marketing)`, `app/(app)`, `app/(admin)`, `app/(auth)`:** Route groups don't change URLs; they isolate **layouts, chrome, and middleware behavior**. Each group has its own `layout.tsx` with appropriate guards. Marketing has no auth check; `(app)` redirects to `/entrar` if unauthenticated; `(admin)` redirects + role-checks; `(auth)` redirects authenticated users out.
- **`middleware.ts` at root:** Required location. Runs on Edge. Single responsibility: subdomain → concurso resolution + session refresh + header injection + rewrite. Everything else (RLS, business logic) happens downstream.
- **`lib/supabase/{server,browser,admin}.ts`:** Three distinct clients with different threat models. `admin.ts` MUST NEVER be imported from a Client Component — enforce via lint rule `no-restricted-imports` + a runtime `if (typeof window !== 'undefined') throw` guard.
- **`lib/srs/`, `lib/queue/`, `lib/simulado/`:** Pure logic, no React, no Supabase, no I/O. Each has co-located tests. **This is where the legacy "cards repeat in same section" bug gets fixed by testing.** Testable in isolation = fixable.
- **`supabase/functions/` minimal:** Move `asaas-webhook` to `app/api/asaas/webhook/route.ts` for type safety + single deploy artifact + structured error visibility in the same Sentry project. Keep Deno edge functions ONLY for things Deno requires (cron schedulers, Deno-specific runtime needs).
- **`supabase/migrations/` clean slate:** 0001-0008 organized by domain. **No legacy migrations carried over.** Squashing is impossible only when restoring an existing DB — greenfield is the right time to start clean.
- **`tests/e2e/` separate from `tests/unit/`:** E2E is Playwright (heavy, slow, signal). Unit is Vitest (co-located preferred for clarity, in `tests/unit/` only when fixtures are shared).
- **`components/` mirrors `app/` groups:** `components/marketing/`, `components/app/`, `components/admin/` — discourages cross-group leakage. `components/ui/` is the shared shadcn primitive layer.

---

## Architectural Patterns

### Pattern 1: Subdomain Resolution in Middleware

**What:** Edge middleware parses the `Host` header, extracts the subdomain, resolves it to a concurso via a cached lookup, and rewrites the request to the appropriate route group with context injected via request headers.

**When to use:** This is the **mandatory entry point** for every request. No request reaches a route handler before the middleware decides which surface it belongs to.

**Trade-offs:**
- **Pro:** Single source of truth for "which concurso is this?" + "is user logged in?" decided once per request. RSC pages downstream just `headers().get('x-concurso-id')` — zero re-lookup.
- **Pro:** SEO long-tail per concurso via dedicated subdomain (`tjsp.flashcards.com.br` indexes independently from hub).
- **Con:** Middleware adds 5-30ms per request (Edge runtime cold start considerations). Mitigation: keep middleware code small, use Edge Config or KV for the slug→concurso map (avoid Supabase round-trip in hot path).
- **Con:** Edge runtime cannot use the full `node:*` API set. Be conservative with deps.
- **Con (Next.js 16 caveat):** In v16, `middleware.ts` is being renamed to `proxy.ts` and the file runs on Node by default. The functionality is preserved; only the name and runtime default changes. Pin to Next.js 15.4+ to avoid mid-flight rename pressure, OR adopt Next 16 from day 1 and use `proxy.ts` — but DO NOT mix.

**Example (Next.js 15 style — still works in 16 with deprecation):**

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'flashcards.com.br'
const COMBO_HOST = `app.${ROOT_DOMAIN}`
const ADMIN_HOST = `admin.${ROOT_DOMAIN}`

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0]

  // Build response we can mutate
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  // --- 1. Supabase session refresh (must happen on every request) ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  // CRITICAL: getUser() NOT getSession() — getSession trusts the JWT, getUser verifies it.
  const { data: { user } } = await supabase.auth.getUser()

  // --- 2. Resolve surface from hostname ---
  let surface: 'hub' | 'concurso' | 'combo' | 'admin'
  let concursoSlug: string | null = null

  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    surface = 'hub'
  } else if (hostname === COMBO_HOST) {
    surface = 'combo'
  } else if (hostname === ADMIN_HOST) {
    surface = 'admin'
  } else if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    surface = 'concurso'
    concursoSlug = hostname.slice(0, -`.${ROOT_DOMAIN}`.length)
  } else {
    // Local dev: app.localhost, tjsp.localhost, etc.
    surface = parseDevHost(hostname) // returns same shape
  }

  // --- 3. Inject context headers (RSC reads via `headers()`) ---
  response.headers.set('x-surface', surface)
  if (concursoSlug) response.headers.set('x-concurso-slug', concursoSlug)
  if (user) response.headers.set('x-user-id', user.id)

  // --- 4. Rewrite to route group (URL stays the same; internal path changes) ---
  // Concurso landing: tjsp.flashcards.com.br/  →  /(marketing)/concursos/tjsp
  if (surface === 'concurso' && url.pathname === '/') {
    return NextResponse.rewrite(
      new URL(`/concursos/${concursoSlug}`, request.url),
      { headers: response.headers }
    )
  }

  // Admin: redirect to /entrar if not authed
  if (surface === 'admin' && !user) {
    return NextResponse.redirect(new URL('/entrar', request.url))
  }

  // App: redirect to /entrar for protected paths if not authed
  if (surface === 'combo' && !user && !PUBLIC_APP_PATHS.includes(url.pathname)) {
    return NextResponse.redirect(new URL('/entrar', request.url))
  }

  return response
}

export const config = {
  // Skip static assets and Next internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/healthz).*)'],
}
```

**Key decisions inside this pattern:**
- **`getUser()` not `getSession()`** — the difference matters: `getSession` reads the cookie at face value; `getUser` makes an Auth API call to verify. In middleware we MUST verify because we're making auth decisions.
- **Concurso lookup caching:** First request lookups slug → concurso UUID from Postgres; cache in Vercel Edge Config (or Redis) for fast subsequent requests. TTL 5 minutes. Invalidate on admin write to `admin_concursos`.
- **Rewrite vs redirect:** Use **rewrite** for surface→route-group mapping (URL stays). Use **redirect** for auth gates (URL changes).

### Pattern 2: Surface-Based Route Groups with Layered Layouts

**What:** Each route group has its own `layout.tsx` that fetches the concurso (from header), validates access, and provides chrome. Pages below stay focused on content.

**When to use:** Whenever a set of pages shares chrome, guards, or context fetches. App Router's route groups + layout composition is the right primitive.

**Trade-offs:**
- **Pro:** Auth/access guards live in **one place** per surface, not repeated per page.
- **Pro:** Theme injection happens once at the layout boundary. Pages just consume.
- **Con:** Layouts fetch on every navigation within the group (cached by RSC tree, but new entries trigger fetch). Mitigate with `cache()` wrappers on common reads (concurso, user profile).

**Example:**

```typescript
// app/(app)/layout.tsx — runs for every (app)/* route
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireUser, requireAccess } from '@/lib/supabase/helpers'
import { getConcursoBySlug } from '@/lib/concurso/resolver'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AppShell } from '@/components/app/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const surface = h.get('x-surface')
  const concursoSlug = h.get('x-concurso-slug')

  const user = await requireUser()           // redirects to /entrar if not authed
  const concurso = await getConcursoBySlug(concursoSlug ?? 'tjsp')
  await requireAccess(user.id, concurso.id)  // PrepPaywall if no access

  return (
    <ThemeProvider theme={concurso.theme}>
      <AppShell concurso={concurso} user={user}>
        {children}
      </AppShell>
    </ThemeProvider>
  )
}
```

### Pattern 3: Server vs Client Component Boundaries

**What:** Default to RSC; promote to client only when the page needs interactivity (state, effects, browser APIs). The boundary is explicit via `'use client'` at the top of a file.

**When to use:**
- **RSC heavy:** marketing landings, dashboard widgets that just display, admin tables (with Server Action mutations).
- **Hybrid:** dashboard (RSC shell + client widgets for due-counters, gamification toast), checkout (RSC fetches plan, client form, Server Action submit).
- **Client heavy:** study session loop (animation, audio, haptic, IndexedDB), simulado (timer, WAL, navigation), focus mode (timer).

**Trade-offs:**
- **Pro:** RSC means smaller JS bundles (the legacy ships ~1MB; RSC ones can be <200KB for the same content).
- **Pro:** SEO meta + initial paint correct on first byte.
- **Con:** Crossing the boundary has rules (Server Actions can be passed to client, but server-only types like `cookies` cannot).
- **Con:** Real-time interactive states (study queue progression) MUST be client. Don't try to RSC-ify the study loop.

**Decision table:**

| Surface | RSC | Client | Server Action | Route Handler |
|---------|-----|--------|---------------|---------------|
| Marketing landing | ✅ All content | Marquee, accordion | — | — |
| Auth pages | ✅ Layout | Form interactivity | ✅ signup/login | — |
| Checkout | ✅ Plan fetch | Form, polling | ✅ Create payment | — |
| Dashboard | ✅ Shell, hero | Due counter, toasts | ✅ Profile edits | — |
| Study session | Shell only | ✅ Whole loop | ✅ Batch flush | — |
| Simulado run | Shell only | ✅ Whole loop | ✅ Submit | — |
| Simulado result | ✅ All | Chart hover | — | — |
| Admin queue | ✅ List | Keyboard shortcuts | ✅ Approve/reject | — |
| Asaas webhook | — | — | — | ✅ POST |
| OG images | — | — | — | ✅ GET |
| Health check | — | — | — | ✅ GET |

### Pattern 4: Server Actions vs Route Handlers — Picking the Right One

**What:** Server Actions are first-class for in-app form submissions and mutations. Route Handlers are for HTTP endpoints called from outside the app or that need non-form semantics.

**When to use:**
- **Server Actions:** Any mutation triggered from your own React tree (form submit, button click). Progressive enhancement (works without JS). Type-safe args.
- **Route Handlers:** Webhooks (external POST), public APIs, large uploads (>1MB body), streaming responses, OG image generation, cron-callable endpoints.

**Trade-offs:**
- **Pro Server Actions:** Single roundtrip + revalidation, type safety, less boilerplate.
- **Con Server Actions:** POST-only, 1MB body limit, no GET caching.
- **Pro Route Handlers:** Full HTTP semantics, external-callable, streaming, custom headers.
- **Con Route Handlers:** Manual validation, more code, no automatic revalidation.

**Example boundary:**

```typescript
// app/(app)/checkout/actions.ts
'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/supabase/helpers'
import { createAsaasPayment } from '@/lib/asaas/client'
import { revalidatePath } from 'next/cache'

const Schema = z.object({
  concursoId: z.string().uuid(),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']),
})

export async function submitCheckout(input: z.infer<typeof Schema>) {
  const user = await requireUser()
  const parsed = Schema.parse(input)
  const payment = await createAsaasPayment(user, parsed)
  revalidatePath('/dashboard')
  return { paymentUrl: payment.invoiceUrl, qrCode: payment.qrCode }
}

// app/api/asaas/webhook/route.ts
import { NextResponse } from 'next/server'
import { validateAsaasWebhook, processWebhookEvent } from '@/lib/asaas/webhook'

export async function POST(request: Request) {
  // 1. Validate token
  const token = request.headers.get('asaas-access-token')
  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  // 2. Persist event (idempotency)
  const payload = await request.json()
  const persisted = await persistWebhookEvent(payload) // INSERT … ON CONFLICT
  if (!persisted) {
    // Duplicate: already processed
    return NextResponse.json({ received: true, duplicate: true })
  }
  // 3. Re-fetch payment from Asaas to verify (anti-spoof)
  // 4. Process (grant access, log audit)
  try {
    await processWebhookEvent(payload)
    return NextResponse.json({ received: true })
  } catch (err) {
    // 500 = Asaas will retry. We persisted the event, so retries are idempotent.
    Sentry.captureException(err, { extra: { eventId: payload.id } })
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 })
  }
}
```

### Pattern 5: Multi-Tenant Data Model with `concurso_id` + Junction Access

**What:** Every content table carries `concurso_id`. Access is granted via the `user_concurso_access` junction. RLS policies reference both.

**When to use:** This IS the data model — applies to every read. Not optional.

**Trade-offs:**
- **Pro:** Single Postgres, single RLS layer, no cross-tenant data leak possible if policies are right.
- **Pro:** Junction table allows one user → N concursos cleanly; no JSONB hackery (legacy's `goals.exam_context.concurso_id` ditched).
- **Con:** Every query MUST filter by `concurso_id` OR rely on RLS. Forgetting is a bug. Mitigate with a typed helper: `from('admin_flashcards').forConcurso(id)`.
- **Con:** Multi-concurso users will run multiple queries (one per concurso). For aggregated dashboards (`app.flashcards.com.br`), need careful index design.

**Schema sketch:**

```sql
-- Concursos (admin-managed catalog)
CREATE TABLE admin_concursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,                 -- 'tjsp', 'pf-agente', etc.
  title text NOT NULL,
  banca text NOT NULL,                       -- 'VUNESP', 'CEBRASPE', ...
  price_cents int NOT NULL,
  duration_days int NOT NULL DEFAULT 365,
  theme jsonb NOT NULL DEFAULT '{}',         -- {colors:{...}, hero:{...}, fonts:{...}}
  simulado_config jsonb NOT NULL,            -- {hours, questions, distribution:{...}}
  status text NOT NULL DEFAULT 'draft',      -- draft, active, archived
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON admin_concursos (slug) WHERE status = 'active';

-- Content tables — concurso_id NOT NULL, FK, indexed
CREATE TABLE admin_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL REFERENCES admin_concursos(id) ON DELETE RESTRICT,
  disciplina_id uuid NOT NULL REFERENCES admin_disciplinas(id),
  topico_id uuid REFERENCES admin_topicos(id),
  question text NOT NULL,
  answer text NOT NULL,
  status text NOT NULL DEFAULT 'review',     -- review, active, flagged, archived
  -- ... etc
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON admin_flashcards (concurso_id, status, disciplina_id);

-- Access junction (paid entitlements)
CREATE TABLE user_concurso_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concurso_id uuid NOT NULL REFERENCES admin_concursos(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                    -- NULL = lifetime
  granted_by text NOT NULL,                  -- 'purchase' | 'admin_manual' | 'gift'
  purchase_id uuid REFERENCES purchases(id),
  PRIMARY KEY (user_id, concurso_id)
);
CREATE INDEX ON user_concurso_access (user_id) WHERE expires_at IS NULL OR expires_at > now();

-- Helper for RLS policies (single source of truth)
CREATE FUNCTION fn_user_has_access(p_concurso_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_concurso_access
    WHERE user_id = auth.uid()
      AND concurso_id = p_concurso_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- RLS example — students see active cards for concursos they paid for
ALTER TABLE admin_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_read_active_paid"
  ON admin_flashcards
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND fn_user_has_access(concurso_id)
  );
```

### Pattern 6: SRS State — Client Compute, Server Authoritative

**What:** FSRS-5 computes the new state in the client (latency-sensitive, no need for server round-trip per rating). The state is queued in IndexedDB WAL and flushed in batches to Postgres via Server Action. Postgres remains authoritative (next session reads from DB).

**When to use:** Any latency-sensitive interactive state where the client has all the inputs needed to compute the next state deterministically.

**Trade-offs:**
- **Pro:** Rating → next card transition is sub-50ms (no network in the hot path).
- **Pro:** Survives flaky networks: WAL persists in IndexedDB; flush retries.
- **Con:** If the client lies about the FSRS computation, only the client's stats are affected (per-user state). Acceptable.
- **Con:** Two clients (phone + laptop) studying same card simultaneously = last write wins. Mitigation: `srs_reviews` is immutable append-only; `user_flashcard_progress` is a denormalized projection that can be rebuilt from `srs_reviews` if conflicts surface.

**Architecture:**

```text
[User rates card 1-4]
       ▼
[lib/srs/fsrs.ts: calculateNextState(prevState, rating, now)]
       ▼
[New state in memory]
       ▼
[lib/srs/wal.ts: walPut(cardId, newState, reviewLog)]   ← IndexedDB sync
       ▼
[hooks/useReviewBatcher: queue, flush every N or on beforeunload]
       ▼
[Server Action: batchUpsertProgress(items)]
       ▼
[Postgres fn_batch_upsert_progress(jsonb)]
       ▼
[INSERT INTO srs_reviews (immutable)]
[UPSERT user_flashcard_progress (projection)]
```

**Crash recovery:**
- On session start, `loadQueue()` reads pending entries from WAL, applies them to in-memory state before building the queue.
- If WAL has entries that DB doesn't (network failed mid-batch), they replay automatically.
- WAL cleared only after successful DB confirmation.

### Pattern 7: Simulado Durability — Strict-Durability WAL

**What:** During a multi-hour simulado, every answer write goes to IndexedDB with **strict durability** (waits for disk fsync) before continuing. On crash/refresh, full state recovers from IndexedDB. On submit, full state syncs to Postgres atomically.

**When to use:** Any session lasting >5 minutes where partial work loss is unacceptable. Simulado (5h/70Q for TJSP) is the canonical case.

**Trade-offs:**
- **Pro:** Browser crash, tab close, power loss between answer and submit: all recoverable.
- **Pro:** Multi-tab safe: a `BroadcastChannel` notifies other tabs of WAL changes.
- **Con:** Strict durability is ~5× slower than relaxed. But answering a question every 10-30s is not a hot path; 50ms write latency is invisible.

**Schema:**

```typescript
// IndexedDB schema (Dexie style)
const db = new Dexie('flashcards-simulado')
db.version(1).stores({
  simulados: 'id, userId, concursoId, startedAt, status',  // 'in-progress' | 'submitted' | 'expired'
  answers: '[simuladoId+questionId], simuladoId, answeredAt',  // composite PK
})

// Write path
await db.transaction('rw', db.answers, async () => {
  await db.answers.put({
    simuladoId,
    questionId,
    selectedOption,
    timeSpentMs,
    answeredAt: Date.now(),
  })
}, { durability: 'strict' })  // wait for disk fsync

// Recovery
async function recoverSimulado(userId: string) {
  const inProgress = await db.simulados
    .where({ userId, status: 'in-progress' })
    .first()
  if (!inProgress) return null

  // Server check: does Postgres know about this simulado? (handle expired)
  const dbState = await fetchSimuladoState(inProgress.id)
  if (!dbState || dbState.status !== 'in-progress') {
    await db.simulados.update(inProgress.id, { status: dbState?.status ?? 'expired' })
    return null
  }

  const answers = await db.answers
    .where({ simuladoId: inProgress.id })
    .toArray()
  return { simulado: inProgress, answers }
}
```

### Pattern 8: Asaas Webhook — Idempotent, Verified, Audited

**What:** Webhook handler persists event with UNIQUE constraint on `event_id`, re-fetches payment from Asaas to verify, processes atomically inside Postgres function, returns 200 only on success (500 on transient error so Asaas retries).

**When to use:** Any external webhook handler — Asaas in our case, but pattern applies.

**Trade-offs:**
- **Pro:** Duplicate deliveries are no-ops (UNIQUE constraint).
- **Pro:** Spoofed payloads rejected (re-fetch verifies).
- **Pro:** Transient errors retry (return 500); permanent errors don't (return 200 with `error` field).
- **Pro:** Every event audited regardless of outcome.
- **Con:** Re-fetch adds a HTTP call. Asaas allows 10s response; ample budget.
- **Con:** Need to handle event ordering for the same payment (PAYMENT_RECEIVED before PAYMENT_CONFIRMED is fine; reverse is rare but possible).

**Schema + flow:**

```sql
CREATE TABLE webhook_events (
  event_id text PRIMARY KEY,                 -- Asaas-provided UUID
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_status text NOT NULL DEFAULT 'pending', -- pending, processed, failed
  attempt_count int NOT NULL DEFAULT 0,
  last_error text
);
CREATE INDEX ON webhook_events (processing_status) WHERE processing_status != 'processed';
```

```typescript
// app/api/asaas/webhook/route.ts
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID()
  logger.info({ correlationId }, 'webhook_received')

  // --- 1. Auth ---
  const token = request.headers.get('asaas-access-token')
  if (!token || !timingSafeEqual(token, process.env.ASAAS_WEBHOOK_TOKEN!)) {
    logger.warn({ correlationId }, 'webhook_unauthorized')
    return new NextResponse('Forbidden', { status: 403 })
  }

  // --- 2. Parse ---
  const payload = await request.json()
  if (!payload?.id || !payload?.event) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const supabase = createAdminClient()

  // --- 3. Idempotency: try INSERT, catch UNIQUE violation ---
  const { error: insertErr } = await supabase
    .from('webhook_events')
    .insert({ event_id: payload.id, payload })
  if (insertErr) {
    if (insertErr.code === '23505') {
      logger.info({ correlationId, eventId: payload.id }, 'webhook_duplicate')
      return NextResponse.json({ received: true, duplicate: true })
    }
    Sentry.captureException(insertErr, { extra: { correlationId } })
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }

  // --- 4. Re-fetch payment to verify (anti-spoof) ---
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(payload.event)) {
    const payment = await fetchAsaasPayment(payload.payment.id)
    if (!payment || !['CONFIRMED', 'RECEIVED'].includes(payment.status)) {
      await markEventFailed(payload.id, 'payment_not_confirmed')
      return NextResponse.json({ received: true, ignored: true })
    }
  }

  // --- 5. Process atomically (Postgres function) ---
  try {
    const { error } = await supabase.rpc('fn_process_webhook_event', {
      p_event_id: payload.id,
    })
    if (error) throw error

    logger.info({ correlationId, eventId: payload.id }, 'webhook_processed')
    return NextResponse.json({ received: true })
  } catch (err) {
    Sentry.captureException(err, { extra: { correlationId, eventId: payload.id } })
    // Return 500 → Asaas retries. Idempotent: the INSERT above already happened.
    // Future retry will hit the duplicate path; we need a separate retry worker.
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 })
  }
}
```

`fn_process_webhook_event` does:
1. Read `webhook_events.payload`.
2. Parse `externalReference` → `userId`, `concursoId`.
3. INSERT `purchases` (UNIQUE on `asaas_payment_id`).
4. UPSERT `user_concurso_access` with **deterministic** `expires_at` = `paid_at + interval '365 days'` (SEC-07 fix — not `now() + 365d`).
5. INSERT `audit_log`.
6. UPDATE `webhook_events.processing_status = 'processed'`.
All in one transaction.

### Pattern 9: Theme Injection from DB (SSR-Correct)

**What:** Root layout reads `concurso.theme` from headers context → emits inline `<style>` with CSS variables. Client components consume via standard `var(--color-primary)`. No FOUC.

**When to use:** Per-tenant theming where the theme is data-driven (not just dark/light).

**Trade-offs:**
- **Pro:** Zero FOUC — variables are in the first byte HTML.
- **Pro:** No client JS overhead for theme application.
- **Con:** Theme must be fetched server-side per request. Cache the concurso fetch.
- **Con:** Dynamic theme changes (e.g., color picker) require re-render — fine for our use case (theme set per concurso, not user-editable).

**Example:**

```typescript
// components/theme/ThemeScript.tsx (server)
import { headers } from 'next/headers'
import { getConcursoBySlug } from '@/lib/concurso/resolver'

export async function ThemeStyle() {
  const h = await headers()
  const slug = h.get('x-concurso-slug') ?? 'default'
  const concurso = await getConcursoBySlug(slug)
  const css = Object.entries(concurso.theme.colors)
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n')

  return (
    <style dangerouslySetInnerHTML={{ __html: `:root { ${css} }` }} />
  )
}

// app/layout.tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <ThemeStyle />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Pattern 10: Atomic Postgres Functions for Critical Mutations

**What:** Operations that must be atomic (XP increment, access grant, batch progress upsert) live in Postgres functions. Called via `supabase.rpc('fn_name', args)`. Single statement = ACID.

**When to use:**
- Counter increments where multiple sources can race (`fn_award_xp`).
- Multi-table mutations that must be all-or-nothing (`fn_grant_access` writing both `user_concurso_access` and `purchases`).
- Batch operations (`fn_batch_upsert_progress` taking JSONB array).

**Trade-offs:**
- **Pro:** Eliminates read-modify-write races (legacy DI-01 bug).
- **Pro:** Network round-trip × N batched into 1.
- **Con:** SQL is harder to test than TS. Use `pgTAP` or integration tests.
- **Con:** Schema migrations must include function updates.

**Example — atomic XP increment (replaces legacy non-atomic awardXp):**

```sql
CREATE FUNCTION fn_award_xp(p_user_id uuid, p_amount int)
RETURNS user_gamification
LANGUAGE plpgsql
SECURITY INVOKER       -- runs with caller's perms; RLS still applies
AS $$
DECLARE
  result user_gamification;
BEGIN
  -- Single statement: atomic UPDATE
  UPDATE user_gamification
  SET total_xp = total_xp + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO result;

  -- Row doesn't exist? Insert (also atomic via ON CONFLICT)
  IF NOT FOUND THEN
    INSERT INTO user_gamification (user_id, total_xp)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
      SET total_xp = user_gamification.total_xp + p_amount,
          updated_at = now()
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_award_xp FROM anon;
GRANT EXECUTE ON FUNCTION fn_award_xp TO authenticated;
```

### Pattern 11: Curation Pipeline — State Machine + Audit

**What:** Content lifecycle: `draft → review → active → archived` (with `flagged` as a side path). All transitions logged to `audit_log`. Only `active` reaches students (enforced via RLS).

**When to use:** Any content marketplace with editorial workflow. Our entire content pipeline.

**Trade-offs:**
- **Pro:** Single source of truth for "what students see" (the RLS policy).
- **Pro:** Audit trail for compliance, debugging, content quality reviews.
- **Pro:** State machine prevents invalid transitions (`archived → review` blocked).
- **Con:** Every transition needs a Server Action or Postgres function. More code than a free-for-all UPDATE.

**Flow:**

```text
[Cowork imports lote]                  status='draft'
       ▼
[Lote validator passes]                status='review', review_status='pending'
       ▼
[Admin opens review queue]
       ▼
[Approves]  ────►  fn_approve_card     status='active', review_status='approved'
[Rejects]   ────►  fn_reject_card      status='archived', review_status='rejected'
[Edits]     ────►  fn_edit_card        status='review' (re-enters queue)
       ▼
[Student studies]
       ▼
[Student reports]  ────► fn_flag_card  status='flagged' (back to admin)
       ▼
[Admin re-reviews]  ─►  back to start
```

### Pattern 12: Observability — Structured Logs + Correlation IDs + Sentry

**What:** Every request gets a correlation ID (set in middleware). Logs include it. Sentry captures with full context. Sentry breadcrumbs link client → server → webhook → external API.

**When to use:** Always. Day one. Not Phase 9.

**Trade-offs:**
- **Pro:** When a paying customer's checkout fails, you find the entire trace in seconds.
- **Pro:** Funnel analytics in PostHog complement Sentry's error focus.
- **Con:** Sentry free tier has limits; budget for paid tier post-launch.

**Setup:**

```typescript
// instrumentation.ts (Next.js convention for Sentry on Edge/Node)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// lib/observability/logger.ts
import pino from 'pino'
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'flashcards', env: process.env.VERCEL_ENV },
  redact: ['*.cpf', '*.password', '*.token', 'req.headers.authorization'],
})
```

---

## Data Flow

### Request Flow — Student studies a card

```text
[Browser: tjsp.flashcards.com.br/estudar/sessao]
   │
   │ HTTP GET (with sb-* cookie)
   ▼
[Vercel Edge: middleware.ts]
   │  1. Parse Host → surface=concurso, slug=tjsp
   │  2. supabase.auth.getUser() → verifies session
   │  3. Set x-concurso-slug, x-user-id headers
   │  4. (No rewrite — /estudar/sessao is already in (app))
   ▼
[Vercel Node: app/(app)/layout.tsx (RSC)]
   │  1. headers().get('x-concurso-slug') → 'tjsp'
   │  2. getConcursoBySlug('tjsp') [cached]
   │  3. requireAccess(userId, concursoId) [Postgres via RLS]
   │  4. Render ThemeProvider, AppShell, children
   ▼
[Vercel Node: app/(app)/estudar/sessao/page.tsx (RSC stub)]
   │  Returns <StudySessionClient initialConfig={…} />
   ▼
[Browser: StudySessionClient (client component)]
   │  1. Reads IndexedDB WAL → reconciles pending entries
   │  2. Fetches admin_flashcards via supabase.browser (RLS-filtered)
   │  3. Calls buildStudyQueue(cards, progress, config) [pure]
   │  4. Renders first card
   │
   │ [User rates 1-4]
   ▼
   1. calculateNextState(prev, rating, now)  [pure FSRS-5]
   2. walPut(cardId, newState, reviewLog)    [IndexedDB]
   3. useReviewBatcher.queue(item)
   4. Show next card (no network in hot path)
   │
   │ [After 5 ratings OR session ends OR beforeunload]
   ▼
[Server Action: batchUpsertProgress(items)]
   │  1. requireUser()
   │  2. Zod validate
   │  3. supabase.rpc('fn_batch_upsert_progress', items)
   ▼
[Postgres]
   │  1. INSERT INTO srs_reviews (immutable, atomic)
   │  2. UPSERT user_flashcard_progress (projection)
   │  3. INSERT INTO audit_log (subset, sampling)
   │  Transaction commits
   ▼
[Server Action returns]
   │
   ▼
[Client: WAL clears confirmed entries; PostHog event fires]
```

### Request Flow — Student pays

```text
[Browser: tjsp.flashcards.com.br/checkout/tjsp]
   │
   │ Submit form (PIX)
   ▼
[Server Action: submitCheckout({concursoId, billingType:'PIX'})]
   │  1. requireUser()
   │  2. Reject if user_concurso_access exists (409)
   │  3. lib/asaas/client.ts: findOrCreateCustomer + createPayment
   │  4. Return invoiceUrl, qrCode
   ▼
[Client: Display QR + poll user_concurso_access every 3s, max 60 polls]
   │
   │ [User scans PIX, pays]
   ▼
[Asaas → POST https://flashcards.com.br/api/asaas/webhook]
   │
   ▼
[Route Handler: /api/asaas/webhook]
   │  1. Validate token (timingSafeEqual)
   │  2. INSERT webhook_events (UNIQUE event_id) — duplicate? return 200
   │  3. Re-fetch /payments/{id} from Asaas to verify status + value
   │  4. supabase.rpc('fn_process_webhook_event', { p_event_id })
   ▼
[Postgres: fn_process_webhook_event]
   │  1. INSERT purchases (UNIQUE asaas_payment_id)
   │  2. UPSERT user_concurso_access (expires_at = paid_at + 365d)
   │  3. INSERT audit_log
   │  4. UPDATE webhook_events SET processing_status='processed'
   │  All in one transaction
   ▼
[Webhook returns 200]
   │
   │ (Asynchronously)
   ▼
[Client polling sees user_concurso_access row → redirect to /welcome]
```

### State Management

```text
                  ┌────────────────────┐
                  │ Supabase Postgres  │ ◄─── authoritative
                  └─────────┬──────────┘
                            │
              read/write    │    realtime (selective)
                  ▲         │           │
                  │         ▼           ▼
        ┌─────────┴─────────────────────────┐
        │ TanStack Query v5 (server-state)   │
        │ - staleTime: 30s default            │
        │ - per-key staleTime overrides       │
        │ - prefetched in RSC layouts        │
        └─────────┬───────────────────────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │ React Component state    │
        │ + Zustand for UI prefs   │
        │ + Context for theme/user │
        └─────────┬────────────────┘
                  │
                  ▼ (write-ahead, latency-sensitive)
        ┌─────────────────────────┐
        │ IndexedDB WAL            │
        │ - SRS pending writes     │
        │ - Simulado answers       │
        │ - Cleared on confirm     │
        └──────────────────────────┘
```

### Key Data Flows

1. **Auth refresh:** Every request → middleware → `supabase.auth.getUser()` → if token near expiry, refresh → set cookies on response.
2. **Concurso resolution:** Subdomain → middleware → Edge Config / DB lookup → cached for 5min → header injection → RSC layout reads.
3. **Access gate:** Layout calls `requireAccess(userId, concursoId)` → RLS-aware query → if no row, render `<PrepPaywall>` (replaces `children`).
4. **SRS write:** Rating → FSRS pure fn → IndexedDB WAL → batched Server Action → Postgres fn → audit_log.
5. **Simulado durability:** Each answer → strict-durability IndexedDB write → on submit, full state sync to Postgres in one transaction.
6. **Webhook processing:** External POST → idempotency INSERT → re-fetch verify → Postgres fn → audit_log → 200 or 500.
7. **Theme injection:** Slug → server fetch concurso → inline `<style>` in root layout → all components read CSS vars.
8. **Curation:** Lote import → `status='draft'` → admin approves via Server Action → Postgres fn → `status='active'` → RLS reveals to students.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 users (launch)** | Single Vercel deployment, Supabase Pro single project, Asaas standard. No Redis. Edge Config for concurso slugs. Vercel + Supabase preview branches per PR. |
| **100-1k users** | Add Vercel KV (or Upstash Redis) for concurso slug→id cache, hot pages (concursos list). Sentry paid tier. PostHog paid tier. Monitor DB connection pool (Supabase Pro = 200 max). |
| **1k-10k users** | Read replicas for analytics queries. PgBouncer transaction mode for serverless. Supabase Pro+ tier. Add Vercel Analytics. Multi-region read replicas for marketing. |
| **10k-100k users** | Partition hot tables (`srs_reviews` by month). Background workers for league processing. Dedicated database tier (Supabase team plan). |
| **100k+ users** | Split admin to separate deployment (lower priority). Consider sharding by `concurso_id` only if a single concurso has >50k users (no rush). |

### Scaling Priorities

1. **First bottleneck:** Supabase free tier auto-pauses → ALREADY decided: Pro from day 1.
2. **Second bottleneck:** Middleware Postgres lookup for slug → fix by Edge Config / KV caching (cheap, simple, day-1 ready).
3. **Third bottleneck:** `useScopedDueCount` query at scale (legacy PERF-03) → already designed out: single Postgres function returns int.
4. **Fourth bottleneck:** Concurrent webhook deliveries (Asaas can burst) → designed out via UNIQUE event_id.
5. **Fifth bottleneck:** Simulado writes in 5h windows → designed out via batch sync on submit (no per-answer DB write).

---

## Anti-Patterns

### Anti-Pattern 1: "We only have one concurso, hardcode TJSP UUID"

**What people do:** Reach for `e08f8a46-3a1f-4414-ae34-6d29c1091c74` because it's faster.
**Why it's wrong:** Multi-concurso is core thesis. Every hard-code creates a refactor cost. Legacy paid this 3× over.
**Do this instead:** Resolve via `getConcursoBySlug(slug)` ALWAYS, even when slug is hard-coded to `'tjsp'` in dev. The function call is the same; the value differs.

### Anti-Pattern 2: Mixing service-role key into client code

**What people do:** Import `lib/supabase/admin.ts` in a Client Component for "convenience".
**Why it's wrong:** Service role bypasses RLS → entire database compromised on page view.
**Do this instead:** `lib/supabase/admin.ts` MUST have a runtime guard: `if (typeof window !== 'undefined') throw new Error('admin client cannot run on client')`. ESLint `no-restricted-imports` to enforce.

### Anti-Pattern 3: Returning 200 silently on webhook errors (legacy)

**What people do:** Catch error, log to console, return `{ received: true }` 200. Asaas never retries. Customer loses access.
**Why it's wrong:** Silent failure = no Sentry alert + no Asaas retry. The legacy did this. Don't repeat.
**Do this instead:** Return 500 on transient errors (DB down, network, etc.) so Asaas retries. Return 200 only on permanent errors (malformed payload, never going to succeed). Always Sentry.captureException.

### Anti-Pattern 4: Read-modify-write for counters

**What people do:** `SELECT total_xp; UPDATE total_xp = X + amount;` in JS.
**Why it's wrong:** Two concurrent rates → lost update. Legacy DI-01 bug.
**Do this instead:** Postgres function with single UPDATE: `SET total_xp = total_xp + p_amount`. Atomic by default.

### Anti-Pattern 5: Storing typed reference as JSONB column

**What people do:** `goals.exam_context = { concurso_id: '...' }` (legacy DI-08).
**Why it's wrong:** No FK, no index, no schema enforcement. Typos silently break logic.
**Do this instead:** Promote to real column `goals.concurso_id uuid REFERENCES admin_concursos(id)`. Keep JSONB for genuinely unstructured metadata.

### Anti-Pattern 6: Trusting the client about FSRS state

**What people do:** Accept whatever `stability`, `difficulty`, `due_at` the client sends.
**Why it's wrong:** A malicious client can fake mastery. Not catastrophic (only affects own stats), but corrupts analytics.
**Do this instead:** Accept rating + previous state; Server Action re-computes server-side as a sanity check. OR keep client computation but mark these rows with a `client_computed=true` flag for analytics filtering.

### Anti-Pattern 7: Per-card DB write inside rating handler

**What people do:** `await supabase.upsert(...)` synchronously after each rating.
**Why it's wrong:** User feels DB latency. Legacy bug.
**Do this instead:** WAL pattern. Synchronous WAL write (IndexedDB, <5ms), async batch flush.

### Anti-Pattern 8: Letting types drift from DB schema

**What people do:** Generate types once, never again. Use `as any` to silence errors.
**Why it's wrong:** Types lie. Legacy DI-09 — 166 `as any` casts.
**Do this instead:** `npm run db:types` runs `supabase gen types typescript`. Pre-commit hook fails if `types.ts` is stale. CI runs typecheck against generated types.

### Anti-Pattern 9: Spinning a new Supabase client per RSC call

**What people do:** `createServerClient(...)` inside every Server Component.
**Why it's wrong:** Wasteful; also each call must wire cookies correctly or auth breaks.
**Do this instead:** Single helper `getServerSupabase()` in `lib/supabase/server.ts` that does the createServerClient + cookies wiring. Memoize per request via React `cache()`.

### Anti-Pattern 10: Reintroducing AI-generation features

**What people do:** "Just one button to generate cards from a paragraph."
**Why it's wrong:** Product thesis prohibits visible AI. Cowork curation IS the product.
**Do this instead:** Cowork admin scripts (server-side, never user-facing) can use AI. Student surface NEVER sees AI affordances.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Asaas** | Server Action calls REST (create payment); inbound webhook via Route Handler (`/api/asaas/webhook`); re-fetch on webhook to verify (SEC-08 fix) | Sandbox vs prod toggle via env var. ASAAS_API_KEY server-side only. Token-based webhook auth (no HMAC offered). |
| **Supabase Auth** | `@supabase/ssr` cookies pattern across middleware/RSC/Route Handler/Server Action | `getUser()` not `getSession()` in middleware (verification required). Session refresh handled automatically. |
| **Supabase Postgres** | Per-request server client (RLS); admin client for service-role ops; browser client for realtime | Connection pooler URL for serverless (`pgbouncer`). |
| **Supabase Storage** | Public buckets for OG/featured images; signed URLs for private (avatars) | Direct client uploads via signed URLs (no proxy through Next.js). |
| **Sentry** | `@sentry/nextjs` for browser+server+edge; PII scrubbing config | Wire instrumentation.ts (Next 15.4+ convention). |
| **PostHog** | Browser SDK + server-side capture for funnel events | Identify by user_id post-login. Track concurso context. |
| **Resend** | Edge function for transactional emails (welcome, password reset) | Deno-friendly SDK; can also call from Route Handler. |
| **Vercel KV / Edge Config** | Concurso slug → id cache for middleware hot path | Edge Config for read-mostly small datasets (<512KB). KV for larger or write-heavy. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **middleware ↔ RSC layout** | Request headers (`x-concurso-slug`, `x-user-id`, `x-surface`) | One-way. RSC reads, never writes. |
| **RSC ↔ Client Component** | Props (server → client serializable only) | No functions, no class instances. Server Actions are special-cased. |
| **Client Component ↔ Server Action** | Async function call; serializable args + return | Args/returns must be RSC-payload-friendly (JSON-equivalent). |
| **Server Action ↔ Postgres** | Per-request server client + RLS | All mutations through this path; service-role only for system ops. |
| **Webhook ↔ Postgres** | Admin client + Postgres function (transactional) | Service-role here is necessary — webhook is unauthenticated. |
| **lib/srs ↔ DB** | NEVER direct. SRS is pure. | Hooks compose pure SRS with DB I/O. |
| **lib/queue ↔ DB** | NEVER direct. Queue is pure. | Hook fetches cards, passes to builder. |
| **Realtime ↔ Client** | Selective: admin queue notifications, simulado multi-device sync | NOT used for SRS (causes cascading re-renders). |

---

## Suggested Build Order (Dependencies)

This is the topological order for Phase 1 (foundation) — each item blocks the next major work.

### P0 — Foundation (blocks everything)

1. **Repo scaffolding** — Next.js 15 (or 16) + TS strict + Tailwind + shadcn + Vitest + Playwright + Biome/ESLint+Prettier.
2. **Supabase project** — Pro tier, branching enabled. Two environments: prod + dev (preview branches automatic).
3. **CI gate** — `lint → typecheck → test → build` on every PR. Required to merge.
4. **Sentry + Pino + correlation IDs** — instrumented from commit 1.
5. **`lib/supabase/{server,browser,admin}.ts`** — three clients with proper SSR cookies + runtime guard.
6. **Schema migrations 0001-0008** — admin_concursos, admin_*, users/profiles, user_concurso_access, srs/progress/reviews, simulados, purchases/webhook_events, audit_log + RLS.
7. **Types generation pipeline** — `npm run db:types`, pre-commit hook.

### P1 — Multi-tenant skeleton (blocks all product features)

8. **`middleware.ts`** — subdomain resolution, session refresh, header injection, route group rewrite.
9. **Route groups + layouts** — `(marketing)`, `(app)`, `(admin)`, `(auth)` with guards.
10. **`lib/concurso/resolver.ts`** — slug → concurso (cached). Edge Config integration.
11. **`lib/concurso/theme.ts` + `<ThemeStyle />`** — DB theme → inline CSS variables.
12. **`lib/supabase/helpers.ts`** — `requireUser`, `requireAdmin`, `requireAccess`.
13. **TJSP seed data** — one concurso with placeholder theme to validate the pipeline.

### P2 — Auth + Access (blocks paid features)

14. **`(auth)` pages** — signup, login, forgot, verify, callback.
15. **Onboarding flow** — minimal profile + active goal.
16. **PrepPaywall component** — applied in `(app)/layout.tsx`.
17. **HIBP password protection** — toggle on in Supabase dashboard.

### P3 — Checkout + Webhook (blocks revenue)

18. **`lib/asaas/{client,types,refetch}.ts`** — Asaas API wrapper.
19. **Server Action: `submitCheckout`** — find/create customer, create payment.
20. **Route Handler: `/api/asaas/webhook`** — token validation, idempotent INSERT, re-fetch verify, Postgres fn.
21. **`fn_process_webhook_event`** — atomic Postgres function.
22. **`/reembolso` Server Action** — real table, real audit_log, admin queue page.
23. **E2E test: signup → checkout → webhook → access → study** — full happy path.

### P4 — SRS Core (blocks study product)

24. **`lib/srs/fsrs.ts`** — pure FSRS-5 implementation + ≥95% test coverage.
25. **`lib/srs/wal.ts`** — IndexedDB WAL.
26. **`lib/queue/builder.ts`** — pure queue construction with no-repeat guarantee + tests.
27. **`hooks/useReviewBatcher.ts`** — batch flush with backoff retry.
28. **Server Action: `batchUpsertProgress`** — Postgres function with single transaction.
29. **`(app)/estudar/sessao` client component** — composition of above.
30. **`fn_award_xp`** — atomic increment.

### P5 — Simulado (blocks high-value feature)

31. **`lib/simulado/distribution.ts`** — pick questions per banca.
32. **`lib/simulado/wal.ts`** — strict-durability IndexedDB WAL.
33. **`lib/simulado/scoring.ts`** — pure scoring + tests.
34. **`(app)/simulado/[id]/run/page.tsx`** — client component with WAL.
35. **Result + analytics page.**

### P6 — Cadernos + Dashboard (rounds out the product)

36. **Mistake notebook** (auto-populate via `srs_reviews` join).
37. **Custom notebook** (Questions filter → save → study).
38. **Marked cards** (`is_bookmarked` on progress).
39. **Dashboard widgets** — due count, streak, edital progress, gamification.
40. **Statistics page** — real disciplina/topic data (no 0/0 placeholders).

### P7 — Admin pipeline (blocks Cowork production)

41. **`(admin)/revisao/`** — review queue UI + keyboard shortcuts.
42. **`(admin)/concursos/`** — CRUD for concursos + theme editor.
43. **`(admin)/editais/`** — parser pipeline (admin-only AI OK per PRODUTO).
44. **`(admin)/questoes/`** — bulk import.
45. **`(admin)/reembolsos/`** — refund queue.
46. **`(admin)/metricas/`** — internal metrics.

### P8 — Marketing + SEO

47. **Hub landing** (`flashcards.com.br/`).
48. **Per-concurso landings** (component-based, reusable chassis).
49. **OG image generation route handler.**
50. **Sitemap + robots.**
51. **Metadata API per route.**

### P9 — Polish + Launch

52. **PostHog wiring** — funnel events.
53. **LGPD: account deletion endpoint.**
54. **Termos + Privacidade — final copy review** (no "planos gratuitos", no "caderno digital").
55. **Production checklist** — Supabase Pro, HIBP on, Sentry alerts, monitoring runbook.
56. **Soft launch with small cohort.**

---

## Trade-Off Notes on the Hardest Decisions

### Decision 1: Next.js 15 vs Next.js 16

**Context:** Project spec says Next.js 15. Next.js 16 (stable as of Oct 2026) renames `middleware.ts` → `proxy.ts`, makes Turbopack the default, and stabilizes React Compiler.

**Trade-offs:**
- **Stay on 15:** Battle-tested. Most tutorials/SO answers reference 15. Less migration risk.
- **Jump to 16:** Cleaner conceptual model (proxy ≠ Express middleware confusion), React Compiler memoization for free (relevant given heavy interactive surfaces), Turbopack faster dev.

**Recommendation:** **Next.js 16** for a greenfield project starting today. The migration cost of 15→16 mid-project (rename middleware.ts, possible API renames in 17) exceeds the cost of starting on 16. If Rafael wants conservative, pin Next.js 15.4 latest patch and freeze; you can upgrade later but don't be forced into it.

### Decision 2: Asaas Webhook — Edge Function vs Next.js Route Handler

**Context:** Legacy used Supabase Edge Function (Deno). Reboot can use Route Handler.

**Trade-offs:**
- **Edge Function (Deno):** Independent deploy lifecycle (can update without redeploying Next.js). Native Deno. Lives next to other Supabase stuff.
- **Route Handler (Next.js):** Same TypeScript types as the rest of the app (no Deno typing dance). Single deploy. Sentry + Pino + correlation IDs share the same stack. CI gates apply uniformly.

**Recommendation:** **Route Handler.** The single-deploy + shared-tooling wins outweigh the deploy-independence of an Edge Function. The legacy's "silent 200" bug was partly caused by it being a separate codebase with separate observability. Centralizing fixes that.

### Decision 3: FSRS-5 — Client vs Server compute

**Context:** Legacy did client-side. Could move to server.

**Trade-offs:**
- **Client compute:** Sub-50ms rating-to-next-card latency. Survives bad network. Battery cost trivial.
- **Server compute:** Authoritative state from minute 1. Cannot be lied to. Adds 100-300ms per rating.

**Recommendation:** **Client compute + WAL + server projection.** Best of both: fast UX + recoverable + authoritative store in DB. Add a Postgres function `fn_verify_srs_state(p_card_id, p_prev_state, p_rating)` that the server can use periodically to sanity-check (not in hot path). For abuse detection, sample 1% of writes for server re-compute and alert if drift exceeds threshold.

### Decision 4: Simulado WAL — IndexedDB vs Supabase Realtime

**Context:** 5-hour session must survive browser crash.

**Trade-offs:**
- **IndexedDB only:** Local durability. Restart on same device = fine. Different device = lost.
- **Realtime sync:** Multi-device durability. Adds network in hot path. Realtime quotas to watch.
- **Hybrid:** IndexedDB primary + periodic Realtime sync (every 30s, async).

**Recommendation:** **IndexedDB strict-durability primary; Postgres sync on submit only.** Multi-device simulado is a v2 feature. For v1, single-device durability covers 99% of cases at zero ongoing cost.

### Decision 5: Single Codebase vs Split (admin separate deploy)

**Context:** Should `admin.flashcards.com.br` be a separate Next.js deploy?

**Trade-offs:**
- **Single codebase:** Faster development, shared components, single CI. Larger bundles deployed everywhere.
- **Split deploys:** Admin can ship independently. Smaller student bundles. More infra complexity.

**Recommendation:** **Single codebase (route groups).** Bundles are already split per-route in Next.js. Admin code in `(admin)/` won't ship to students because it's never imported. Split-deploy is optimization-for-imagined-scale; keep simple until 10k users.

### Decision 6: How to handle the SESSION_VERSION re-login pattern

**Context:** Legacy had a `SESSION_VERSION` constant to force re-login on every user.

**Trade-offs:**
- **Keep it:** Convenient escape hatch for auth changes.
- **Drop it:** Force re-login is rarely needed; signals fragile auth design.

**Recommendation:** **Keep it as `lib/auth/session-version.ts`** with a `getRequiredSessionVersion()` server function read in middleware. Bump via env var or DB row (`app_config.session_version`). Document every bump in a CHANGELOG. Used sparingly.

### Decision 7: Where to put admin queue keyboard shortcuts

**Context:** Legacy used `A/E/R/S` shortcuts in review queue. Need to preserve.

**Trade-offs:**
- **Client component on full page:** Keyboard listener is straightforward.
- **Server-driven UI:** No good way to attach keyboard listeners.

**Recommendation:** **Client component for the review-card surface.** Page-level RSC fetches the queue, hands the active card to a client component that handles keyboard + Server Action calls for approve/reject/edit/skip.

### Decision 8: Theme injection — inline vs cookie+CSS-only

**Context:** Per-concurso theme from DB without FOUC.

**Trade-offs:**
- **Inline `<style>` in server-rendered HTML:** Zero FOUC, no client JS. Requires fetching theme server-side per page.
- **Cookie-based + static CSS variants:** Theme persisted in cookie; CSS file per theme loaded. Cheaper at scale.

**Recommendation:** **Inline for v1.** The fetch is cached, the cost is one DB row read. Cookie-based optimization is for later when we have 50+ concursos and the theme catalog is large.

### Decision 9: Curation pipeline — admin AI tool exception

**Context:** Cowork admin tools use AI (parse-edital, parse-questions-bulk) for productivity. Product thesis says "no AI visible to student."

**Trade-offs:**
- **Allow admin AI:** Cowork ships faster. Output still reviewed by human before going active.
- **No AI anywhere:** Slower content production. Cowork burns hours on rote parsing.

**Recommendation:** **Allow in admin-only routes, documented in operational runbook.** Service-role key + admin role gate. Never exposed to student surface. Every AI-generated row enters as `status='review', source_pipeline='ai-parsed'` and MUST be approved by a human. This is PRODUTO.md §5.1's documented carve-out.

### Decision 10: Supabase branching + Vercel preview environments

**Context:** Every PR should have its own preview deploy + isolated DB.

**Trade-offs:**
- **Enable Supabase branching:** Each PR gets a branch DB with migrations applied. Vercel preview gets that DB's URL. Real test isolation.
- **Shared dev DB:** Simpler. Migrations applied manually. Risk: one developer's WIP migration breaks others.

**Recommendation:** **Enable Supabase branching from day 1.** Pro tier supports it. Set it up in P0. The friction of forgetting an environment variable once is far less than the friction of shared-DB conflicts.

---

## How This Architecture Prevents the 5 CRITICAL Legacy Concerns

| Legacy CRITICAL | Architectural prevention |
|-----------------|--------------------------|
| **1. `/reembolso` writes to non-existent table → fake success UI** | Server Action with Zod validation; Postgres migration creates `refund_requests` table in schema 0007 (P0 build order); audit_log entry on every submit; admin queue page reads from same table. Drift impossible because the form references generated types. |
| **2. `awardXp` non-atomic read-modify-write** | `fn_award_xp` Postgres function with single UPDATE statement. `useGamification.awardXp` calls RPC only — no client-side accumulation. |
| **3. `question_attempts.content_item_id` NOT NULL pointing to wrong column** | Greenfield schema has `admin_questao_id` as the only FK on `question_attempts`. No legacy column. Generated types are the source of truth — `as any` is banned via ESLint rule. |
| **4. `asaas-webhook` silent 200** | Route Handler returns 500 on transient errors → Asaas retries. Sentry capture on every catch. `webhook_events` table audits every delivery with `processing_status`. Re-fetch verification prevents spoofed payloads (SEC-08 fix). |
| **5. Doc-code drift in general** | Types generated from DB (`supabase gen types typescript`). Pre-commit hook fails on stale types. CI typecheck. ESLint `no-restricted-imports` + `no-explicit-any`. `lib/supabase/admin.ts` runtime guard. RLS policies, not docs, enforce access. |

Bonus: every concern from the legacy that survived to the reboot context (DI-08 JSONB concurso pointer, PERF-02 no scoping, AUTH-04 3-roundtrip access check, OBS-05 free tier) is structurally prevented in the proposed architecture.

---

## Sources

**Official documentation (authoritative):**
- [Next.js — Guides: Multi-tenant](https://nextjs.org/docs/app/guides/multi-tenant)
- [Next.js — Route Handlers and Middleware (v15)](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)
- [Next.js — Server Actions and Mutations](https://nextjs.org/docs/13/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js — File-system conventions: proxy.js (v16)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js — Upgrading to v16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase — Branching: GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase — Branching: Integrations (Vercel)](https://supabase.com/docs/guides/deployment/branching/integrations)
- [Supabase SSR — createServerClient API reference](https://github.com/supabase/ssr/blob/main/_apirefdocs/api-reference/create-server-client.md)
- [Asaas Webhooks docs](https://docs.asaas.com/docs/webhooks-3)
- [Asaas — How to implement idempotency in Webhooks](https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks)
- [Vercel Platforms Starter Kit (canonical multi-tenant template)](https://vercel.com/templates/next.js/platforms-starter-kit)
- [MDN — Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [Chrome — IndexedDB durability mode now defaults to relaxed](https://developer.chrome.com/blog/indexeddb-durability-mode-now-defaults-to-relaxed)

**Authoritative community resources (high confidence):**
- [Brandur — How Postgres Makes Transactions Atomic](https://brandur.org/postgres-atomicity)
- [MakerKit — Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [MakerKit — Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions)
- [Achromatic — Multi-Tenant Architecture Patterns in Next.js](https://www.achromatic.dev/blog/multi-tenant-architecture-nextjs)
- [GSoft Consulting — Building a Multi-Tenant SaaS in 2026](https://gsoftconsulting.com/en/blog/building-multi-tenant-saas-2026)
- [TS-FSRS — official FSRS-5 TypeScript implementation](https://open-spaced-repetition.github.io/ts-fsrs/)
- [Open Spaced Repetition — free-spaced-repetition-scheduler](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)
- [Hookdeck — SHA256 Webhook Signature Verification](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification)
- [DEV — Webhook Security in Next.js: Signatures, Idempotency](https://dev.to/whoffagents/webhook-security-in-nextjs-signatures-idempotency-and-avoiding-common-mistakes-4g6)
- [OneUptime — How to Handle Race Conditions in PostgreSQL Functions](https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view)
- [DEV — Understanding & Fixing FOUC in Next.js App Router](https://dev.to/amritapadhy/understanding-fixing-fouc-in-nextjs-app-router-2025-guide-ojk)
- [Vercel Next.js GitHub Discussion — Light/dark mode toggle with app router + RSC](https://github.com/vercel/next.js/discussions/53063)

**Internal codebase (canonical for this project):**
- `.planning/PROJECT.md` — product thesis + decisions
- `.planning/codebase/ARCHITECTURE.md` — legacy architecture analysis
- `.planning/codebase/STRUCTURE.md` — legacy structure analysis
- `.planning/codebase/CONCERNS.md` — 72 concerns to design around

---

*Architecture research for: Flashcards multi-tenant SaaS marketplace*
*Researched: 2026-05-21*
*Confidence: HIGH — every critical claim verified against official Next.js, Supabase, and Asaas docs, plus legacy `.planning/codebase/` analysis.*
