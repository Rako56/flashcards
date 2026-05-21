# External Integrations

**Analysis Date:** 2026-05-21
**Project:** Sparkle Flashcards (`sparkle-study-scape`)
**Status:** Post-pivot. Active integrations are minimal (Supabase + Asaas + Resend + Google AI + Google OAuth + Vercel + Google Fonts). The **deployed** edge function surface includes ~12 zombie functions from the pre-pivot era (Stripe stack + AI generation suite) that the source tree has already moved past — `supabase/functions/` locally has 8 functions, but per `PENDENCIAS-2026-05-16.md` the project deployment also still has the 12 zombies waiting to be `supabase functions delete`-d.

---

## APIs & External Services

### Payments — Asaas (ACTIVE, LOAD-BEARING)

- **Service:** Asaas (Brazilian payment processor — PIX, boleto, cartão)
- **Base URL:** `https://api.asaas.com/v3` — hardcoded at `supabase/functions/create-asaas-payment/index.ts:4` (**PRODUCTION endpoint**, not sandbox)
- **SDK/Client:** None. Raw `fetch()` calls via custom `asaasFetch<T>` helper in `create-asaas-payment/index.ts:30-56`
- **Auth header:** `access_token: <ASAAS_API_KEY>` (Supabase secret)
- **Webhook auth header (incoming):** `asaas-access-token` (validated against `ASAAS_WEBHOOK_TOKEN` secret at `asaas-webhook/index.ts:65-73`)
- **Called from src/:** `src/pages/Checkout.tsx:196` invokes `supabase.functions.invoke('create-asaas-payment', ...)`
- **Called from edge functions:** `create-asaas-payment` calls `/customers`, `/customers/{id}`, `/customers?cpfCnpj=...`, `/payments`, `/payments?externalReference=...`, `/payments/{id}/pixQrCode`
- **Webhook endpoint:** `POST https://zjyogswbgcauwqisvuyq.supabase.co/functions/v1/asaas-webhook`
- **Events handled:** `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` (grant access) | `PAYMENT_REFUNDED`, `PAYMENT_DELETED` (revoke)
- **Externally referenced flow:** `externalReference = "${userId}:${concursoId}"` — parsed at `asaas-webhook/index.ts:50-53`
- **Product mapping:** Hardcoded in `create-asaas-payment/index.ts:6-11`:
  - `e08f8a46-3a1f-4414-ae34-6d29c1091c74` → "Preparação TJSP Escrevente — Acesso 1 ano" R$ 297,00
- **What breaks if removed:** Entire purchase funnel + revenue flow. No fallback.

**HEALTH: GOOD but FRAGILE.**
- Hardcoded product table (one entry) — must be DB-driven before launching the second concurso (Q3 2026 per PRODUTO.md §9).
- Hardcoded production URL — no sandbox toggle. To test against sandbox, code changes required.
- `verify_jwt = false` on webhook is correct (Asaas auths via its own header), but documented in `supabase/config.toml`.
- Function returns 200 even on internal errors (line 207) to prevent Asaas retry storms — defensible but masks observability gaps. No alert wired.

### Email — Resend (ACTIVE)

- **Service:** Resend (transactional email)
- **Endpoint:** `https://api.resend.com/emails` — used in `send-welcome-email/index.ts:107` and `send-support-ticket/index.ts:87`
- **Auth:** `Authorization: Bearer ${RESEND_API_KEY}` (Supabase secret)
- **From address:** `${FROM_EMAIL}` env var, default `no-reply@auth.flashcards.com.br`
- **From name:** `StudyOS <${FROM_EMAIL}>` — **NOTE**: still says "StudyOS", an old brand name; the product is now Sparkle Flashcards. Cosmetic inconsistency.
- **Called from src/:** `src/pages/Signup.tsx:118` (welcome email, fire-and-forget after signup) | `src/pages/Support.tsx:39` (support ticket form)
- **Inbound support email destination:** Hardcoded `SUPPORT_EMAIL = 'rafanunes23rj@gmail.com'` at `send-support-ticket/index.ts:12` — single point of failure (user's personal Gmail)
- **What breaks if removed:** Welcome emails stop (function returns `{skipped: true}` if `RESEND_API_KEY` is unset — graceful). Support tickets stop (500 error returned to user).

**HEALTH: OK.** "StudyOS" brand drift in template should be fixed. Support email should be moved off personal Gmail and onto a `support@flashcards.com.br` mailbox or ticket system before launching.

### AI — Google Generative Language (Gemini) — ADMIN-ONLY, ACTIVE

- **Service:** Google AI Studio / Gemini via OpenAI-compatible endpoint
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- **Auth:** `Authorization: Bearer ${GOOGLE_AI_API_KEY}` (Supabase secret)
- **Models used:** `gemini-2.5-flash` (in `parse-questions-bulk`)
- **Called from edge functions:**
  - `parse-edital/index.ts:75` — admin-only (gated by `user_roles.role = 'admin'`). Generates disciplina/topic structure from edital metadata. Admin clicks "gerar estrutura" in `AdminConcursoDetail.tsx`.
  - `parse-questions-bulk/index.ts:73` — admin-only (same gate). Bulk-parses pasted question text into structured records. Admin uses in `AdminImportar.tsx`.
- **Called from src/:** `src/pages/admin/AdminConcursoDetail.tsx:173` and `src/pages/admin/AdminImportar.tsx:154` — both admin pages only
- **What breaks if removed:** Admin productivity tools break. Cowork team would parse editais and questions manually. No impact on student-facing experience (PRODUTO.md §1: "Zero IA visível ao aluno").

**HEALTH: GOOD.** Properly gated to admin role via `user_roles` table check. Internal tool — fits the PRODUTO.md §5.1 "primeira passada pode usar scripts" carve-out.

### Authentication — Supabase Auth + Google OAuth (ACTIVE, LOAD-BEARING)

- **Provider:** Supabase Auth (email/password + Google OAuth)
- **Client:** `@supabase/supabase-js` v2.98 — singleton in `src/integrations/supabase/client.ts`
- **Storage:** `localStorage` (line 13 of client.ts), `persistSession: true`, `autoRefreshToken: true`
- **OAuth flow:** `supabase.auth.signInWithOAuth({ provider: 'google' })` at `src/pages/Login.tsx:65-66`
- **Session management:** `src/hooks/useAuth.tsx` (an `AuthProvider` context) — tracks `SESSION_VERSION` for forced logout on schema/auth changes (per CLAUDE.md §"Routing & Auth")
- **Route guards (in `src/App.tsx`):**
  - `ProtectedRoute` — needs auth + completed `user_profiles`
  - `AuthOnlyRoute` — needs auth, allows onboarding
  - `AdminRoute` — checks `user_roles.role = 'admin'` (via `useAdmin` hook)
- **HIBP password protection:** **NOT ENABLED** per `PENDENCIAS-2026-05-16.md` §3 — must be toggled in Supabase Auth dashboard (not configurable via `config.toml`). Signups currently accept known-leaked passwords.
- **What breaks if removed:** No login. Everything dies.

**HEALTH: GOOD, but with a hole.** HIBP toggle should be flipped before launch. The auth flow itself is clean and standard.

---

## Data Storage

### Database — Supabase Postgres (LOAD-BEARING, DIRTY SCHEMA)

- **Provider:** Supabase managed Postgres (per Database type: `PostgrestVersion: "14.5"`)
- **Project ref:** `zjyogswbgcauwqisvuyq`
- **URL:** `https://zjyogswbgcauwqisvuyq.supabase.co`
- **Connection:** `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) in client
- **ORM/client:** `@supabase/supabase-js` v2.98 + auto-generated TypeScript types at `src/integrations/supabase/types.ts` (≥ 2000 lines)
- **Schema source of truth:** `supabase/migrations/*.sql` — 145 migration files since 2026-03-02
- **Migration cadence:** Per `ls supabase/migrations/` — heavy churn in 2026-03 to 2026-05. Recent migrations are content imports (`import_lote_X.sql`) rather than schema changes — typical post-stabilization pattern.
- **Tier:** **Free tier** (per CLAUDE.md). Auto-pauses after ~7 days of inactivity. Pro tier strongly recommended before launch.
- **Tables (canonical, post-pivot):**
  - `auth.users` (Supabase managed)
  - `user_profiles` (CPF, name, `asaas_customer_id`)
  - `user_concurso_access` (purchase grant, 1y expiry)
  - `user_roles` (role: 'admin' | ...)
  - `admin_concursos` → `admin_disciplinas` → `admin_topicos` → `admin_flashcards`
  - `admin_questoes`, `admin_midias`
  - `mistake_notebook`, `simulados`, `question_attempts`
  - `srs_state`, `srs_reviews`, `user_flashcard_progress` (FSRS-5 engine)
  - `user_gamification`, `user_leagues`, `weekly_scores`, `daily_challenges`
  - `goals`, `study_logs`, `study_plans`, `focus_sessions`
  - `purchases` (Asaas payment log)
- **Tables marked for DROP (per PENDENCIAS §4, awaiting Rafael's manual exec):**
  - `content_items` (zombie from pre-pivot)
  - `study_sessions` (zombie)
  - `user_flashcard_reviews` (zombie — superseded by `srs_reviews`)
  - `admin_import_logs` (zombie)
  - Plus `mistake_notebook.content_item_id` + `question_attempts.content_item_id` columns
- **What breaks if removed:** Everything. Single source of truth.

**HEALTH: LOAD-BEARING, SCHEMA DIRTY.** Active tables are clean and recently audited. 4 zombie tables + 2 dead columns are waiting for Rafael to execute. The 145-migration count is normal but signals heavy churn — reboot may want to flatten to a single baseline schema dump and start fresh migrations.

### Storage — Supabase Storage (PARTIALLY ACTIVE, ONE ZOMBIE BUCKET)

- **Buckets in use by `src/`:**
  - `avatars` — used in `src/pages/Profile.tsx:47,51` for user profile avatars
  - `admin-files` — used in `src/pages/admin/AdminMidias.tsx` (compressed images) and `src/pages/admin/AdminConcursoDetail.tsx:132,135` (edital PDFs/covers)
- **Zombie bucket:**
  - `notebook-media` — 0 files, was used by the killed Tiptap caderno. **Cannot be deleted via SQL (trigger protection)** — per PENDENCIAS §2, must be deleted in dashboard manually.
- **What breaks if removed:**
  - Avatars: profile photos break (graceful — UI falls back to initials).
  - admin-files: admin can't upload media. Student-facing OK because URLs are already stored as `cover_url`/etc.
  - notebook-media: nothing — it's empty.

**HEALTH: OK.** Avatars + admin-files are clean. The notebook-media zombie needs a 30-second cleanup.

### Caching — None

No Redis, no Memcached, no edge KV. Server state caching is **client-side only**, via TanStack React Query (configured for 2min staleTime + 10min gcTime + no refetchOnWindowFocus).

There is a custom WAL (write-ahead log) for simulado runs (per CLAUDE.md / PRODUTO.md §7) that survives refresh/disconnect, but that's session-local storage, not infrastructure caching.

---

## Authentication & Identity

**Auth Provider:** Supabase Auth (see above).

**Identity model:**
- One `auth.users` row per user (email + optional Google OAuth identity).
- One `user_profiles` row (CPF, name, phone, `asaas_customer_id`).
- Onboarding flow at `src/pages/Onboarding.tsx` handles the gap when Google OAuth users land without CPF/phone (per inline comment at line 25).

**Admin authorization:**
- `user_roles` table, role = 'admin'. Checked in `useAdmin` hook + edge functions (`grant-access:48-53`, `parse-edital:38-49`, `parse-questions-bulk:135-141`).
- Single source of truth post-pivot. Per `grant-access` comment, an older bug used `user_profiles.role` (non-existent column) — fixed.

**HEALTH: GOOD.**

---

## Monitoring & Observability

**Error Tracking:**
- **None.** No Sentry, no Bugsnag, no Rollbar.
- Local `ErrorBoundary` at `src/components/ErrorBoundary.tsx` — catches React render errors, shows fallback UI. In dev mode shows stack; in prod swallows them silently.

**Logs:**
- Edge functions log via `console.log` with `[FUNCTION-NAME]` prefix (e.g., `logStep` helper in `asaas-webhook` and `create-asaas-payment`). Visible only in Supabase dashboard log viewer.
- Frontend uses no centralized logging. Toast notifications via `sonner` for user-facing errors.

**Health checks:**
- None.

**HEALTH: WEAK.** Selling at R$ 297/year with no error tracking is irresponsible. Reboot should wire up Sentry (or equivalent) on day one — both for the React app and edge functions. Cost: ~$26/mo for Sentry Team plan.

---

## CI/CD & Deployment

**Hosting:**
- **Vercel** for frontend (`https://flashcards.com.br`). Auto-deploy on push to `main`. Config in `vercel.json` (SPA rewrite only, no other settings).
- **Supabase** for backend (Postgres + Auth + Edge Functions + Storage).

**CI Pipeline:**
- **None.** No `.github/workflows/`, no GitLab CI, no Vercel pre-deploy checks visible.
- `npm run lint`, `npm run test`, `npm run typecheck` are available but not enforced.

**Edge function deployment:**
- Manual: `supabase functions deploy <name>` or via dashboard.
- Not version-controlled to a deploy hook — meaning local `supabase/functions/` may drift from what's actually deployed (see "Phantom deployed functions" below).

**Migration deployment:**
- Manual: paste SQL into editor or `supabase db push` (per README).

**HEALTH: WEAK.** No CI = no automated guard against regressions. The whole deploy story is "push to main and pray." For a paid product, this is sub-minimum-viable.

---

## Phantom Deployed Functions (CRITICAL)

`supabase/functions/` locally has **8 functions**:
1. `asaas-webhook` ✅ active
2. `create-asaas-payment` ✅ active
3. `grant-access` ✅ active
4. `parse-edital` ✅ active (admin AI tool)
5. `parse-questions-bulk` ✅ active (admin AI tool)
6. `process-leagues` ✅ active (cron)
7. `send-support-ticket` ✅ active
8. `send-welcome-email` ✅ active

**Per PENDENCIAS-2026-05-16.md and CLAUDE.md, deployed Supabase also has ~12+ ZOMBIES that the local tree no longer references:**

| Function | Status | Pre-pivot purpose | Risk if left deployed |
|----------|--------|-------------------|----------------------|
| `generate-deck` | **ZOMBIE** | AI flashcard generation | Surface area, ANY anon key could invoke; if billing-attached, can burn credits |
| `generate-language-flashcards` | **ZOMBIE** | Idioma module | Same |
| `classify-content-items` | **ZOMBIE** | AI tagging | Same |
| `generate-study-material` | **ZOMBIE** | AI study aid | Same |
| `generate-flashcards-premium` | **ZOMBIE** | AI gen tier | Same |
| `classify-flashcards-bulk` | **ZOMBIE** | AI classifier | Same |
| `questions-to-flashcards` | **ZOMBIE** | AI converter | Same |
| `ai-study-action` | **ZOMBIE** | AI chat surface | Same |
| `stripe-webhook` | **ZOMBIE** | Stripe payment events | Could fire if Stripe still pings; misroutes to dead handler |
| `create-checkout` | **ZOMBIE** | Stripe checkout creation | Surface area only |
| `customer-portal` | **ZOMBIE** | Stripe billing portal | Surface area only |
| `check-subscription` | **ZOMBIE** | Stripe sub status | Surface area only |
| `debug-asaas` | Mentioned in CLAUDE.md but **NOT in local tree** | Asaas debug helper | If deployed, would expose customer/payment data — verify it's gated or delete |
| `audit-flashcards-validator` | Mentioned in CLAUDE.md but **NOT in local tree** | Pre-pivot validator | Verify and delete or commit local copy |

**Source of truth conflict:**
- `CLAUDE.md` lines 87-95 lists 10 canonical functions (includes `debug-asaas` + `audit-flashcards-validator`)
- Local `supabase/functions/` has 8 (no `debug-asaas`, no `audit-flashcards-validator`)
- `PENDENCIAS-2026-05-16.md` confirms 10 canonical
- The 2 "missing locally" functions are either (a) deployed but no source in repo (drift) or (b) listed aspirationally in CLAUDE.md but never created.

**Action for reboot:** Run the 12 `supabase functions delete ...` commands from PENDENCIAS §1. Verify whether `debug-asaas` + `audit-flashcards-validator` exist deployed — if yes, either pull their source down or delete them too.

**What breaks if removed (the 12 zombies):** Nothing. None are called by `src/`. Stripe is fully removed from frontend (grep for `stripe` in `src/` returns zero results). The pre-pivot AI generation surface is fully removed from frontend.

---

## Environment Configuration

**Client-side env vars (in `.env.example`):**

| Variable | Purpose | Required? |
|----------|---------|-----------|
| `VITE_SUPABASE_URL` | Project URL — read in `client.ts:5` | **YES** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key — read in `client.ts:6` | **YES** |
| `VITE_SUPABASE_PROJECT_ID` | Used by type-gen flow | Optional |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Legacy non-VITE | **UNUSED in code** — drop from `.env.example` |

**Server-side secrets (in Supabase Edge Functions secrets dashboard, NOT in `.env.example`):**

| Variable | Used by | Critical? |
|----------|---------|-----------|
| `ASAAS_API_KEY` | `create-asaas-payment` | **YES** — purchase funnel breaks |
| `ASAAS_WEBHOOK_TOKEN` | `asaas-webhook` | **YES** — webhook returns 503 if missing (line 67-69) |
| `SUPABASE_URL` | All edge functions | **YES** |
| `SUPABASE_SERVICE_ROLE_KEY` | `asaas-webhook`, `grant-access`, `parse-edital`, `parse-questions-bulk`, `process-leagues` | **YES** — admin DB writes |
| `SUPABASE_ANON_KEY` | `parse-questions-bulk`, `send-welcome-email`, `send-support-ticket` | YES (for user-context calls) |
| `GOOGLE_AI_API_KEY` | `parse-edital`, `parse-questions-bulk` | YES — admin tools fail without |
| `RESEND_API_KEY` | `send-welcome-email`, `send-support-ticket` | Recommended (graceful degradation in welcome) |
| `FROM_EMAIL` | `send-welcome-email`, `send-support-ticket` | Optional (default `no-reply@auth.flashcards.com.br`) |
| `APP_URL` | `send-welcome-email` (for links) | Optional (default `https://flashcards.com.br`) |
| `CRON_SECRET` | `process-leagues` (gate header `x-cron-secret`) | **YES** — without, cron is disabled/broken |

**Documentation gap:** None of the 10 server-side secrets are documented in `.env.example` or any `SECRETS.md`. A new dev or recovery from disaster has to read through every edge function to discover what secrets exist. **High brittleness.**

**Reboot action:** Create `SECRETS.md` (or expand `.env.example`) listing all required secrets and which functions consume each.

---

## Webhooks & Callbacks

**Incoming (we receive):**
- **Asaas → `POST /functions/v1/asaas-webhook`** — payment lifecycle events. Token auth via `asaas-access-token` header. JWT verification disabled (correct, per `config.toml:14-16`).
  - URL must be configured manually in Asaas dashboard (per PENDENCIAS §5).
  - Events to enable: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`, `PAYMENT_DELETED`.

**Outgoing (we send):**
- **→ Asaas API** (`api.asaas.com/v3`) — create customer, create payment, fetch PIX QR
- **→ Resend API** (`api.resend.com/emails`) — send transactional email
- **→ Google Gemini API** (`generativelanguage.googleapis.com/v1beta/openai/chat/completions`) — admin-only AI parsing

**No Stripe webhook handlers in active code.** The `stripe-webhook` deployed function is a zombie (PENDENCIAS §1) and should be deleted to prevent confused payment posting if anyone has lingering Stripe webhook config pointing at it.

---

## CDN & Public Assets

- **Vercel** serves the static build (`dist/`)
- **Google Fonts** (`fonts.googleapis.com`) — Fraunces + Inter + JetBrains Mono loaded via `@import` in `src/index.css:1`
- **Public folder** (`public/`) — static images and the `criativo-tjsp.html` marketing video source (rendered to MP4 via Playwright)

**No image CDN, no Cloudflare in front.** Vercel's default CDN handles static assets.

---

## Integration-Level Health Summary

| Integration | Status | Health | Risk |
|-------------|--------|--------|------|
| **Asaas** (PIX/boleto/cartão) | ✅ ACTIVE | LOAD-BEARING | Hardcoded product table — must be DB-driven for multi-concurso (Q3 2026) |
| **Supabase Postgres** | ✅ ACTIVE | LOAD-BEARING | Free tier auto-pauses — Pro needed before launch |
| **Supabase Auth + Google OAuth** | ✅ ACTIVE | GOOD | HIBP toggle off (PENDENCIAS §3) |
| **Supabase Storage** (`avatars`, `admin-files`) | ✅ ACTIVE | GOOD | — |
| **Supabase Storage** (`notebook-media`) | ❌ ZOMBIE | TRIVIAL | Delete via dashboard (PENDENCIAS §2) |
| **Resend** | ✅ ACTIVE | OK | Old "StudyOS" brand in template; support email is personal Gmail |
| **Google Gemini API** | ✅ ACTIVE (admin) | GOOD | Admin-gated, contained |
| **Stripe stack** (4 functions) | ❌ ZOMBIE deployed | DELETE | Per PENDENCIAS §1 |
| **AI generation suite** (7 functions) | ❌ ZOMBIE deployed | DELETE | Per PENDENCIAS §1 |
| **debug-asaas**, **audit-flashcards-validator** | ❓ UNKNOWN | INVESTIGATE | Listed in CLAUDE.md but no source in repo |
| **Vercel hosting** | ✅ ACTIVE | OK | No security headers configured |
| **Error tracking** (Sentry, etc.) | ❌ MISSING | LAUNCH-BLOCKER | None |
| **CI/CD** | ❌ MISSING | LAUNCH-BLOCKER | No automated lint/test/typecheck gates |
| **Asaas webhook config** | ⚠️ MANUAL | OK | URL must be set in Asaas dashboard (PENDENCIAS §5) |

---

## Reboot Reuse vs Replace Cheat Sheet

**KEEP AS-IS (load-bearing, healthy):**
- Supabase Postgres (just clean the schema per PENDENCIAS §4)
- Supabase Auth + Google OAuth (just flip HIBP per PENDENCIAS §3)
- Supabase Storage `avatars` + `admin-files`
- Asaas integration code (`asaas-webhook` + `create-asaas-payment`) — solid, just generalize the product table
- `grant-access` admin tool
- `process-leagues` cron
- `send-welcome-email`, `send-support-ticket`
- `parse-edital`, `parse-questions-bulk` (admin AI tools)

**REPLACE / FIX BEFORE LAUNCH:**
- Upgrade Supabase free → Pro
- Wire Sentry (or equivalent) for both frontend + edge functions
- Set up GitHub Actions CI (lint/test/typecheck on PR)
- Move support email off personal Gmail
- Fix "StudyOS" brand in welcome email template
- Document all server-side secrets

**DELETE (zombie surface area):**
- 12 zombie edge functions (PENDENCIAS §1)
- `notebook-media` storage bucket (PENDENCIAS §2)
- 4 zombie DB tables + 2 dead columns (PENDENCIAS §4)
- Frontend zombie deps: `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `@xyflow/react`, `@dagrejs/dagre`, `html-to-image`, `@types/dompurify`
- Move `ffmpeg-static` + `playwright` to a separate sub-project

**INVESTIGATE:**
- Whether `debug-asaas` is deployed (CLAUDE.md claims yes, repo says no)
- Whether `audit-flashcards-validator` is deployed (same)
- Whether anything (cron job, internal admin tool) is still pinging the zombie endpoints before deletion

---

*Integration audit: 2026-05-21*
