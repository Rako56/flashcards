<!-- refreshed: 2026-05-21 -->
# Architecture

**Analysis Date:** 2026-05-21

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                  Browser (Vercel-served SPA)                     │
│  React 18 + Vite + TS, React Router v6 lazy routes               │
│  `index.html` → `src/main.tsx` → `src/App.tsx`                   │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Route guards    │  Pages (lazy)    │  Domain hooks             │
│  ProtectedRoute  │  src/pages/*     │  useAuth, useAccess,      │
│  AuthOnlyRoute   │  + dashboards/   │  useProfile, useAdmin,    │
│  AdminRoute      │  + admin/        │  useExamTarget, …         │
│  `src/components`│                  │  `src/hooks/`             │
└────────┬─────────┴────────┬─────────┴──────────┬────────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│         TanStack React Query v5 (server-state cache)             │
│  staleTime 2min, gcTime 10min, no refetchOnWindowFocus           │
│  Query keys: ['user-concurso-access', userId], …                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase JS client (singleton)                                  │
│  `src/integrations/supabase/client.ts`                           │
│  localStorage session, autoRefreshToken                          │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                   │
             ▼                                   ▼
┌──────────────────────────────┐   ┌───────────────────────────────┐
│  Postgres (Supabase, ref     │   │  Edge Functions (Deno)         │
│  `zjyogswbgcauwqisvuyq`)     │   │  `supabase/functions/*`        │
│  auth.users, user_profiles,  │   │  create-asaas-payment,         │
│  goals, admin_*, srs_*,      │   │  asaas-webhook (verify_jwt=    │
│  user_concurso_access, …     │   │  false), grant-access,         │
│  + 24 SECURITY DEFINER RPCs  │   │  parse-edital, process-leagues,│
│  RLS enforced everywhere     │   │  send-welcome-email, …         │
└──────────────────────────────┘   └──────────────┬────────────────┘
                                                  │
                                                  ▼
                                   ┌───────────────────────────────┐
                                   │  Asaas API (api.asaas.com/v3) │
                                   │  PIX, BOLETO, CREDIT_CARD     │
                                   │  PAYMENT_RECEIVED/CONFIRMED   │
                                   │   → webhook → access grant    │
                                   └───────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Router + global providers (Query, Tooltip, Toaster, Auth, ErrorBoundary) | `src/App.tsx` |
| `AuthProvider` | Supabase session state, `SESSION_VERSION` invalidation, signOut | `src/hooks/useAuth.tsx` |
| `ProtectedRoute` | Require auth + complete profile, else redirect | `src/components/ProtectedRoute.tsx` |
| `AuthOnlyRoute` | Require auth but allow incomplete profile (onboarding) | `src/components/AuthOnlyRoute.tsx` |
| `AdminRoute` | Require `user_roles.role = 'admin'` | `src/components/admin/AdminRoute.tsx` |
| `DashboardRouter` | Reads active goal, picks concurso or onboarding-prompt variant | `src/pages/DashboardRouter.tsx` |
| `ConcursoDashboardHome` | Student home: hero + due cards + widgets + edital progress | `src/pages/dashboards/ConcursoDashboardHome.tsx` |
| `FlashcardStudy` | Study loop composition root; SRS session + animation + paywall | `src/pages/FlashcardStudy/index.tsx` |
| `useStudySession` | Queue build, WAL refs, scope resolution, load | `src/pages/FlashcardStudy/useStudySession.ts` |
| `useRatingHandler` | Rating → FSRS update + combo + XP + telemetry | `src/pages/FlashcardStudy/useRatingHandler.ts` |
| `buildStudyQueue` | Pure-function queue brain (interleave, budget, pace-aware) | `src/lib/edital/queue.ts` |
| `calculateSRS` | FSRS-5 scheduler (19-weight model) | `src/lib/srs.ts` |
| `useReviewBatcher` | Buffers 5 reviews → batch RPC, fallback to per-card writes | `src/hooks/useReviewBatcher.ts` |
| `useAccess` | Reads active goal + `user_concurso_access` → hasAccess gate | `src/hooks/useAccess.ts` |
| `PrepPaywall` | Fullscreen modal blocking unpaid users from study | `src/components/paywall/PrepPaywall.tsx` |
| `Checkout` | 3-tab payment UI (PIX/BOLETO/CARD), invokes edge fn, polls access | `src/pages/Checkout.tsx` |
| `create-asaas-payment` | Edge fn: find/create Asaas customer, generate PIX/boleto/card link | `supabase/functions/create-asaas-payment/index.ts` |
| `asaas-webhook` | Edge fn: token-auth, parse externalReference, grant/revoke access | `supabase/functions/asaas-webhook/index.ts` |
| `grant-access` | Edge fn: admin-only manual access grant by email | `supabase/functions/grant-access/index.ts` |
| `AdminLayout` + `AdminReviewQueue` | Curation pipeline UI — approves `review` → `active` | `src/pages/admin/AdminReviewQueue.tsx` |

## Pattern Overview

**Overall:** Lazy-loaded React Router SPA + thin Supabase client + cached server-state via React Query + Deno edge functions for any operation that needs secrets (Asaas API key, service-role key) or external webhooks.

**Key Characteristics:**
- **Single-page app, no SSR** — `index.html` boots `src/main.tsx`, all routing client-side.
- **No global Redux/Zustand** — server state goes through React Query; user/session is a single React context (`AuthProvider`); component state is local. The legacy `decks/items/subjects` UI is gone; the curated `admin_*` tables don't need cross-cutting client state.
- **Lazy code-split per route** — every page in `App.tsx` is `lazy(() => import(...))`, with a single `Suspense` `PageLoader` fallback. Manual chunks split `vendor-react`, `vendor-ui`, `vendor-charts`, `vendor-query`.
- **Server-side authoritative** — RLS on all tables. Edge functions hold service-role key. Client never sees `ASAAS_API_KEY`.
- **Edge functions for write-heavy or secret operations**, REST for read-heavy queries.
- **FSRS-5 is computed client-side** in `src/lib/srs.ts`; the resulting `interval_days`, `stability`, `difficulty`, `due_at` are persisted via batch upsert into `srs_state` / `user_flashcard_progress`. No server-side SRS engine.

## Layers

**Browser shell (`src/App.tsx` + `src/main.tsx`):**
- Purpose: bootstrap providers, mount router.
- Location: `src/App.tsx`, `src/main.tsx`, `index.html`.
- Depends on: AuthProvider, QueryClientProvider, BrowserRouter.
- Used by: Vite build → `dist/index.html`.

**Routing + guards:**
- Purpose: gate access to authenticated/admin/onboarding zones.
- Location: `src/App.tsx` (Routes), `src/components/ProtectedRoute.tsx`, `src/components/AuthOnlyRoute.tsx`, `src/components/admin/AdminRoute.tsx`.
- Depends on: `useAuth`, `useProfile`, `useAdmin`.
- Used by: every protected page.

**Pages (one per route):**
- Purpose: route-level composition; owns page-scope state, side effects, and layout choice.
- Location: `src/pages/*.tsx` plus subdirectories `src/pages/admin/`, `src/pages/dashboards/`, `src/pages/FlashcardStudy/`.
- Depends on: hooks, components, supabase client.
- Used by: lazy imports in `App.tsx`.

**Domain hooks (`src/hooks/`):**
- Purpose: encapsulate a domain concern (auth, profile, access, exam target, due counts, gamification, study prefs, theme).
- Location: `src/hooks/`.
- Convention: one hook per file, named `useX.ts`/`useX.tsx`. Always returns `{ data/state, loading, ...mutators }`.
- Used by: pages + components.

**Pure business logic (`src/lib/`):**
- Purpose: side-effect-free functions usable in tests + outside React.
- Location: `src/lib/srs.ts`, `src/lib/edital/queue.ts`, `src/lib/edital/progress.ts`, `src/lib/gamification/combo.ts`, `src/lib/gamification/topicMastery.ts`, `src/lib/levels.ts`, `src/lib/cpf.ts`, `src/lib/utils.ts`, `src/lib/normalizeDiscipline.ts`, `src/lib/audio.ts`, `src/lib/haptic.ts`, `src/lib/time/brt.ts`, `src/lib/tipo-card-labels.ts`.
- Depends on: nothing app-specific (FSRS weights are constants).
- Used by: hooks + page logic.

**UI components (`src/components/`):**
- Purpose: visual primitives + domain components.
- Location: `src/components/ui/` (shadcn/Radix primitives — 48 files) and `src/components/<domain>/` for feature-specific UI.
- Depends on: Tailwind, Radix, lucide/StudyIcons, hooks.
- Used by: pages.

**Supabase client (`src/integrations/supabase/`):**
- Purpose: singleton typed client; auto-generated `Database` types.
- Location: `src/integrations/supabase/client.ts` (10 lines), `src/integrations/supabase/types.ts` (auto-generated, do not edit).
- Used by: every hook/page that touches the DB.

**Edge functions (`supabase/functions/`):**
- Purpose: server-only operations (secrets, webhooks, cross-table service-role writes).
- Location: `supabase/functions/asaas-webhook/`, `create-asaas-payment/`, `grant-access/`, `parse-edital/`, `parse-questions-bulk/`, `process-leagues/`, `send-support-ticket/`, `send-welcome-email/`.
- Runtime: Deno; imports `npm:@supabase/supabase-js@2.98.0`.
- Auth: `verify_jwt = false` for `asaas-webhook` (token-authenticated), `send-welcome-email`, `process-leagues` (cron), `grant-access` (service-role inside body). All others verify the user's JWT.

**Database (Postgres via Supabase):**
- Purpose: authoritative store.
- Location: schema lives in `supabase/migrations/*.sql` (145 migrations) — `admin_concursos`, `admin_disciplinas`, `admin_topicos`, `admin_flashcards`, `admin_questoes`, `admin_midias`, `user_profiles`, `user_concurso_access`, `user_roles`, `goals`, `srs_state`, `srs_reviews`, `user_flashcard_progress`, `mistake_notebook`, `simulados`, `user_gamification`, `weekly_scores`, `purchases`, etc.
- RLS: enforced everywhere; SECURITY DEFINER RPCs revoked from `anon` (since 2026-05-16 audit).

## Data Flow

### Primary flow: signup → checkout → access grant → study session

1. **Signup** (`src/pages/Signup.tsx`): user submits `full_name`, `email`, `cpf`, `phone`, `password`. `supabase.auth.signUp()` creates `auth.users` row; a DB trigger creates `user_profiles` row populated from `raw_user_meta_data`. UI honors `?redirect=/checkout/...` and forwards through onboarding.
2. **Onboarding** (`src/pages/Onboarding.tsx`): bootstraps in parallel — reads `user_profiles`, active `goals`, TJSP concurso meta, flashcard/discipline counts. On submit, upserts the `user_profiles` row and INSERTs a `goals` row with `status='active'`, `goal_type='concurso'`, `exam_context.concurso_id = TJSP_CONCURSO_ID` (hard-coded `e08f8a46-3a1f-4414-ae34-6d29c1091c74`). Redirects to `?redirect` target or `/dashboard`.
3. **Pre-checkout gate** (`src/pages/Checkout.tsx:136-169`): resolves slug → `concursoId` via `SLUG_MAP`. Two short-circuits: (a) admin → straight to `/dashboard`; (b) user already has live row in `user_concurso_access` → redirect to `/dashboard` with success toast. Otherwise sets `accessChecked=true`.
4. **Payment creation** (`src/pages/Checkout.tsx:175-261` → `supabase.functions.invoke('create-asaas-payment')`): edge fn at `supabase/functions/create-asaas-payment/index.ts` verifies JWT, re-checks `user_concurso_access` (returns 409 `ALREADY_HAS_ACCESS` if present), loads `user_profiles`, finds-or-creates Asaas customer (by stored ID, then by CPF, then create), reuses a PENDING payment if one exists with same `externalReference` + `billingType`, or creates a new one with `externalReference = "${userId}:${concursoId}"`. Returns invoice URL, PIX QR (`encodedImage`/`payload`) or boleto URL.
5. **User pays** at Asaas (PIX scan, boleto, or hosted-card page).
6. **Webhook** (`supabase/functions/asaas-webhook/index.ts`): Asaas POSTs `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` with `asaas-access-token` header. Function validates token vs `ASAAS_WEBHOOK_TOKEN`, parses `externalReference` → `{userId, concursoId}`, uses **service-role client** to upsert `user_concurso_access` with `expires_at = now + 365 days` and `granted_by = 'purchase'`, then upserts `purchases` row. Returns 200 quickly even on errors to prevent retries.
7. **Polling** (`src/pages/Checkout.tsx:276-298`): Checkout polls `user_concurso_access` every 3s while the user looks at the QR/boleto. When a row appears → `paid=true` → redirect to `/welcome`.
8. **Post-purchase** (`src/pages/PostPurchaseWelcome.tsx`): 3-slide intro carousel ("acesso ativo", "SRS", "vamos estudar"), then routes to `/dashboard`.
9. **Dashboard** (`src/pages/DashboardRouter.tsx`): reads active goal → picks `ConcursoDashboardHome` (`src/pages/dashboards/ConcursoDashboardHome.tsx`); paywall short-circuit if `useAccess` says no access (admin bypass).
10. **Study session** (`src/pages/FlashcardStudy/index.tsx` + `useStudySession.ts` + `useRatingHandler.ts`): `useAccess` gates again. `useStudySession.loadQueue()` reads `admin_flashcards` filtered by `concurso_id` + optional `disciplina_id`/`topicos`, joins `user_flashcard_progress`, applies in-memory WAL overlay, calls `buildStudyQueue` (pure function in `src/lib/edital/queue.ts`) which interleaves easy/hard + honors `daily_new`/`daily_review` budgets + pace-aware reordering. User rates 1-4 → `useRatingHandler.handleRate`: `calculateSRS` (FSRS-5) → upsert to `srs_state`/`user_flashcard_progress` (queued via `useReviewBatcher` flushing every 5 reviews via RPC) → award XP via `award_review_points` RPC → daily-challenge progress → audio/haptic. On `Errei`, card goes into `mistake_notebook` automatically.

### Secondary flow: manual admin access grant

1. Admin calls `supabase.functions.invoke('grant-access', { body: { email, concurso_id, days } })` from an admin script.
2. `supabase/functions/grant-access/index.ts` verifies caller is in `user_roles` with `role='admin'` (the canonical table since the 2026-05-16 fix that was looking at the non-existent `user_profiles.role`).
3. Resolves email → user_id via `auth.admin.listUsers()`, upserts `user_concurso_access` with `granted_by='admin_manual'`.

### Tertiary flow: content curation (`status='review'` → `status='active'`)

1. Cowork team or pipeline (`scripts/flashcard-pipeline/import.mjs`) inserts cards with `status='review'`, `review_status='pending'`, `source_pipeline='cowork-manual'`. Validation gates: `scripts/flashcard-pipeline/validate-lote.mjs` (fail-fast on jurisprudence allowlist + schema), then `build-chunks.mjs` produces ~15KB SQL chunks applied via MCP.
2. Admin opens `/admin/review-queue` (`src/pages/admin/AdminReviewQueue.tsx`), reviews each card with keyboard shortcuts (A=approve, E=edit, R=reject, S=skip).
3. Approval calls a `approve_flashcard_review` RPC that flips `status='active'` + `review_status='approved'`.
4. Students see only `status='active'` cards.

**State Management:**
- **Auth**: React Context (`AuthContext`) — only `user`, `loading`, `signOut`. Persists in `localStorage` via Supabase client.
- **Server state**: React Query. Keys include user id. `staleTime: 2min`, `gcTime: 10min`, `refetchOnWindowFocus: false`.
- **Study session local state**: heavy use of `useRef` (queue WAL, pending writes, topic snapshots, session start time) deliberately bypasses React commit-time so latency-sensitive operations (rating side effects) don't await re-render.
- **SRS write-ahead log**: an in-memory `progressWalRef` map mirrors `user_flashcard_progress` rows. Mutations write to WAL synchronously, then enqueue a batch flush via `useReviewBatcher`. Next `loadQueue()` reads the WAL to avoid re-fetching stale rows mid-session.

## Key Abstractions

**Concurso (preparação) = product unit:**
- Tables: `admin_concursos` → `admin_disciplinas` → `admin_topicos` → `admin_flashcards` (+ `admin_questoes`, `admin_midias`).
- Today: only TJSP Escrevente exists (UUID `e08f8a46-3a1f-4414-ae34-6d29c1091c74`). Hard-coded in `src/pages/Onboarding.tsx`, `src/pages/Checkout.tsx`, `supabase/functions/create-asaas-payment/index.ts:7`. The Q3 plan is to remove these hard-codes when concurso #2 ships.

**Active goal = "what the user is preparing for":**
- `goals` table; one row per user with `status='active'`. `exam_context` JSONB carries `{ concurso_id, banca, target_date, ... }`.
- `DashboardRouter` reads this to pick the dashboard variant. `useAccess` reads it to pick which concurso to gate on.

**Access = paid entitlement:**
- `user_concurso_access` table; PK `(user_id, concurso_id)`. `expires_at` nullable; null = lifetime, future date = active, past = expired. `granted_by` in `{purchase, admin_manual, ...}`.
- Read by `useAccess` (with admin bypass) and re-checked by `create-asaas-payment` to prevent double-purchase.

**Card progress = per-user FSRS state:**
- `user_flashcard_progress` (per-card state) + `srs_reviews` (immutable review log) + `srs_state` (legacy compat). `calculateSRS` in `src/lib/srs.ts` computes the next state given the current `(D, S, R, rating)`. `useReviewBatcher` batches 5 reviews into one RPC.

**Curation queue = `status='review'`:**
- `admin_flashcards.status` ∈ `{review, active, flagged, archived}`. Only `active` reaches students. New imports default to `review`. Approval flips to `active`. See `.claude/skills/tjsp-flashcards-producer/SKILL.md` for the pipeline.

## Entry Points

**`src/main.tsx`:**
- Location: `src/main.tsx` (5 lines).
- Triggers: `index.html` `<script type="module" src="/src/main.tsx">`.
- Responsibilities: mount `<App />` into `#root`, import global CSS (`./index.css`).

**`src/App.tsx`:**
- Location: `src/App.tsx`.
- Triggers: imported by `main.tsx`.
- Responsibilities: wrap children in `ErrorBoundary > QueryClientProvider > TooltipProvider > AuthProvider > BrowserRouter > Suspense > Routes`. Defines every route + guard.

**`asaas-webhook` edge fn:**
- Location: `supabase/functions/asaas-webhook/index.ts`.
- Triggers: HTTP POST from Asaas to `/functions/v1/asaas-webhook` with `asaas-access-token` header.
- Responsibilities: validate token, route on `event` (grant or revoke set), parse `externalReference`, mutate `user_concurso_access` + `purchases` via service-role client.

**`create-asaas-payment` edge fn:**
- Location: `supabase/functions/create-asaas-payment/index.ts`.
- Triggers: `supabase.functions.invoke` from `Checkout.tsx`.
- Responsibilities: verify JWT, re-check existing access (409 sentinel), find-or-create Asaas customer, reuse or create payment, fetch PIX QR if applicable.

**`grant-access` edge fn:**
- Location: `supabase/functions/grant-access/index.ts`.
- Triggers: admin script via `supabase.functions.invoke`.
- Responsibilities: verify caller is admin (`user_roles` table), resolve email → user_id, upsert `user_concurso_access`.

**`process-leagues` edge fn:**
- Location: `supabase/functions/process-leagues/index.ts`.
- Triggers: scheduled cron (`verify_jwt=false`).
- Responsibilities: weekly league scoring rollup.

## Architectural Constraints

- **Threading:** browser single-threaded JS event loop. Study-session UI uses refs aggressively to avoid React commit latency on rating side effects (audio/haptic/SRS upsert). Edge functions are single-threaded Deno isolates per request.
- **Global state:** `AuthContext` is the only global React context. Theme is persisted via `localStorage` + inline `<script>` in `index.html` (avoids FOUC). Profile cache lives in `localStorage` under `user_profile_cache:{userId}` with 24h TTL (`src/hooks/useProfile.ts`).
- **No service workers, no PWA install** — `index.html` only registers OG/Schema meta tags.
- **Hard-coded TJSP UUID** in 3 places (Onboarding, Checkout product map, edge fn product map). Documented as Q3 work in PRODUTO.md §9.
- **Supabase free-tier auto-pause** (~7d inactivity) will silently break logged-in queries with `Connection terminated`. Pro tier recommended pre-launch (CLAUDE.md §Supabase project).
- **Session version bump** (`SESSION_VERSION` const in `src/hooks/useAuth.tsx:14`): incrementing forces global logout on next visit.
- **No SSR / no edge SSR.** Vercel serves the static `dist/` build only. SEO meta lives in `index.html`.

## Anti-Patterns

### Reintroducing AI-generation features

**What happens:** any `generate-*`, `classify-*`, `ai-study-action` UI or edge function — the legacy pre-pivot AI deck-builder, language-flashcards, OCR, "explain with AI" buttons.
**Why it's wrong:** explicit anti-scope decision (`docs/PRODUTO.md` §12). Curated marketplace thesis only works if students believe content is human-vetted. 12 zombie edge functions are scheduled for deletion in `PENDENCIAS-2026-05-16.md`.
**Do this instead:** route any new content through the curation pipeline: `scripts/flashcard-pipeline/` → `admin_flashcards` with `status='review'` → `/admin/review-queue` approval → `status='active'`.

### Extending the Tiptap "caderno" editor

**What happens:** adding rich-text/notebook surface (NotebookView, PageEditor, paper styles like pautado/quadriculado/Cornell, stylus).
**Why it's wrong:** "Sparkle is not a Notion replacement" (PRODUTO.md §7). Tiptap is on the deletion path; only artifact left should be `bucket notebook-media` (now slated for delete in pendências).
**Do this instead:** the three replacement notebooks are `mistake_notebook` (auto), `Questions.tsx` filtered query saves (TODO), and bookmarked-cards (`is_bookmarked` column on `user_flashcard_progress`, TODO). See PRODUTO.md §7.

### Coupling to legacy `decks`/`subjects`/`topics`/`items` tables

**What happens:** new code that joins or writes to the pre-pivot self-curriculum tables.
**Why it's wrong:** dropped in `supabase/migrations/20260512001000_drop_legacy_decks_tables.sql`. Snapshot kept in `legacy/2026-05-12/subjects-dump.json` for audit only.
**Do this instead:** read from `admin_disciplinas` → `admin_topicos` → `admin_flashcards` for content; write per-user state to `user_flashcard_progress` + `srs_reviews`.

### Hard-coding the TJSP UUID in new code

**What happens:** copy-pasting `e08f8a46-3a1f-4414-ae34-6d29c1091c74` because "we only sell one product anyway".
**Why it's wrong:** multi-product is Q3 2026 (PRODUTO.md §9). Every new hard-code is debt the next concurso launch has to pay.
**Do this instead:** resolve via slug → DB lookup, like `Checkout.tsx`'s `SLUG_MAP` (which itself is debt — the proper fix is `admin_concursos.slug` column + query).

### Doing SRS writes individually inside the rating handler

**What happens:** awaiting one supabase upsert per rated card inside `handleRate`.
**Why it's wrong:** kills perceived responsiveness; the user feels the database. The session was already in flight before this rating mattered.
**Do this instead:** push into `progressWalRef` synchronously, queue via `useReviewBatcher.queueReview`, let the batcher flush every 5 cards or on session end. Per-card writes are the fallback only.

### Treating `status='review'` cards as visible

**What happens:** queries that filter `admin_flashcards` without an explicit `.eq('status', 'active')`.
**Why it's wrong:** unreviewed content reaches students; violates the curated-marketplace promise.
**Do this instead:** every student-facing query passes `status='active'`. The review queue (`/admin/review-queue`) is the only place `review` rows surface.

## Error Handling

**Strategy:** fail soft on UX, fail loud on developer errors.

**Patterns:**
- **`ErrorBoundary`** at the top of `App.tsx` (`src/components/ErrorBoundary.tsx`) catches uncaught render errors and shows a "Algo deu errado" screen with reset + reload buttons. Stack trace only in `import.meta.env.DEV`.
- **Edge function business-logic errors** use HTTP 4xx with `{ error, code: 'SENTINEL' }` bodies. Frontend parses `code` (e.g. `Checkout.tsx` handles `ALREADY_HAS_ACCESS` as success → redirect, not error).
- **Asaas webhook** returns 200 even on internal errors to prevent infinite Asaas retries (`supabase/functions/asaas-webhook/index.ts:198-210`). Errors are logged.
- **Toast notifications** via `sonner` (`toast.success`, `toast.error`) for user-facing transient feedback.
- **Timeouts** on critical user-facing calls — Checkout wraps `create-asaas-payment` in a 30s `Promise.race` so the user never spins forever (`Checkout.tsx:182-204`).
- **Retry-with-backoff** on profile fetch: 3 attempts with 150/300/450ms delays (`useProfile.ts:108-133`).

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` only. Edge functions use a `logStep` helper prefix (e.g. `[ASAAS-WEBHOOK]`, `[CREATE-ASAAS-PAYMENT]`) for grep-ability in Supabase dashboard logs.

**Validation:** Zod schemas on form inputs via `react-hook-form` + `@hookform/resolvers`. CPF validation in `src/lib/cpf.ts` (`isValidCPF`, `formatCPF`, `phoneToE164`).

**Authentication:** Supabase Auth (email/password + Google OAuth). Session stored in `localStorage` by the Supabase JS client. `AuthProvider` listens to `onAuthStateChange` and reacts to `INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED`, `SIGNED_OUT`. A `SESSION_VERSION` constant lets us force-logout everyone by bumping the integer.

**Authorization:** RLS on every public table. `useAdmin` reads `user_roles` (the canonical admin source post-2026-05-16). `AdminRoute` gates the `/admin/*` routes; service-role-key writes happen only inside edge functions.

**Sanitization:** DOMPurify (`dompurify`) used in `FormattedCardText` for student-visible markdown/HTML.

**Theming:** `useTheme` + inline `<script>` in `index.html` to apply `theme-dark` class pre-hydration (avoids flash). Three modes: `light` / `dark` / `system`.

**Mobile-first:** `useIsMobile` toggles `AppSidebar` (desktop) vs `BottomNav` (mobile) in `AppLayout`.

---

*Architecture analysis: 2026-05-21*
