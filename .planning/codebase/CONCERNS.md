# Codebase Concerns

**Analysis Date:** 2026-05-21

> **Reboot priority document.** Inventory of every problem found in the
> codebase that should be considered when planning the rewrite. Items
> are graded by severity (CRITICAL / HIGH / MEDIUM / LOW), category
> (bug / security / data-integrity / tech-debt / UX / performance /
> operational / build-ci), and tagged with a recommended action:
> **Fix** (keep behavior, repair), **Drop** (delete entirely),
> **Accept** (note but don't change), **Rewrite** (replace approach
> on reboot).
>
> Cross-references `PENDENCIAS-2026-05-16.md` but adds severity,
> validates against current code, and surfaces ~30 adjacent concerns
> the user hadn't flagged. Where Pendências says something is "to
> do", this doc tells you whether the related code is still around
> and what risk it carries today.

---

## Tech Debt — Pivot Leftovers (AI-gen / Tiptap / Stripe / idioma)

### TD-01 Edge function zombies live only in Supabase deploy, not in repo

**Severity:** HIGH
**Category:** tech-debt / operational
**Location:** `supabase/functions/` (local) vs Supabase remote deploy
**Evidence:** Local repo contains only 8 canonical functions
(`asaas-webhook`, `create-asaas-payment`, `grant-access`,
`parse-edital`, `parse-questions-bulk`, `process-leagues`,
`send-support-ticket`, `send-welcome-email`). PENDENCIAS-2026-05-16.md
§1 lists 12 zombies to delete via CLI from the remote project:
`generate-deck`, `generate-language-flashcards`,
`classify-content-items`, `generate-study-material`,
`generate-flashcards-premium`, `classify-flashcards-bulk`,
`questions-to-flashcards`, `ai-study-action`, `stripe-webhook`,
`create-checkout`, `customer-portal`, `check-subscription`. No
`src/` file calls any of them today. They burn quota and widen the
public attack surface.
**Recommended action:** **Drop** — run the 12 `supabase functions delete`
commands in PENDENCIAS §1.

### TD-02 `audit-flashcards-validator` and `debug-asaas` removed locally but `CLAUDE.md` still lists them as canonical

**Severity:** LOW
**Category:** tech-debt / docs-drift
**Location:** `CLAUDE.md:88-95`
**Evidence:** `CLAUDE.md` lists `audit-flashcards-validator` and
`debug-asaas` in the canonical edge function set, but neither directory
exists in `supabase/functions/`. Means CLAUDE.md disagrees with the
filesystem and any agent reading it as the source of truth gets
misled.
**Recommended action:** **Fix** — update CLAUDE.md to match the
current 8-function set, or restore the two functions if intentional.

### TD-03 `user_notes` table still in schema, no UI uses it, contradicts thesis

**Severity:** HIGH
**Category:** tech-debt / data-integrity
**Location:** `src/integrations/supabase/types.ts:1605-1648`,
migration `20260403020746_de683df8…sql`
**Evidence:** Table for arbitrary rich-text notes (with `content`,
`content_json`, `tags`, `type`) — directly contradicts PRODUTO.md §5
("❌ Não somos editor de notas"). No `src/` file queries it. The
schema is the surface area an attacker / curious user could exploit
to dump data.
**Recommended action:** **Drop** — add `DROP TABLE public.user_notes
CASCADE;` to the next post-pivot cleanup migration. Already covered
implicitly by §5.1 of the pivot doc but not in PENDENCIAS.

### TD-04 4 zombie tables / columns from PENDENCIAS §4 still alive

**Severity:** HIGH
**Category:** tech-debt / data-integrity
**Location:** `src/integrations/supabase/types.ts:577-630` (content_items),
`1262-1320` (study_sessions), `1522-1556` (user_flashcard_reviews),
`279-322` (admin_import_logs); also `mistake_notebook.content_item_id`,
`question_attempts.content_item_id`.
**Evidence:** PENDENCIAS-2026-05-16.md §4 has the DROP SQL ready but
not yet applied. The Supabase generated types **still** reference
all four tables, meaning frontend can accidentally re-introduce
queries via auto-complete.
**Recommended action:** **Drop** — apply the migration from
PENDENCIAS §4, then re-run `supabase gen types typescript` so the
ghost types disappear from `types.ts`.

### TD-05 `question_attempts.content_item_id` is NOT NULL, but insert path passes UUID of `admin_questoes` row

**Severity:** CRITICAL
**Category:** bug / data-integrity
**Location:** `src/components/questions/QuestionCard.tsx:114-123`,
`src/pages/SimuladoRun.tsx:230-240`, `src/components/questions/SimuladoResult.tsx:84`
**Evidence:** After `content_items` was dropped (per
20260423000000), the `content_item_id` column kept its NOT NULL
constraint but lost the FK (per 20260512001000). Frontend inserts
`content_item_id: question.id` where `question.id` is an `admin_questoes`
row id. **This is misleading data** — the column name lies about
what it references. Worse: if the migration in PENDENCIAS §4 drops
this column, every question-attempt insert breaks silently in
production until QuestionCard / SimuladoRun / SimuladoResult are
patched.
**Recommended action:** **Fix** before dropping the column. Step 1:
patch the 4 call sites to write `admin_questao_id` only. Step 2:
back-fill `admin_questao_id` from `content_item_id` for legacy rows.
Step 3: ALTER COLUMN DROP NOT NULL, then DROP COLUMN. Otherwise
you'll log attempts as failed silently and corrupt simulado stats.

### TD-06 `focus_sessions` table has dead `subject_id` + `topic_id` columns referenced in inserts

**Severity:** MEDIUM
**Category:** tech-debt / data-integrity
**Location:** `src/pages/FocusMode.tsx:90-91`,
`src/integrations/supabase/types.ts:691-695`
**Evidence:** Migration 20260512001000 dropped the FK to `subjects`
and `topics` but kept the orphan UUID columns. FocusMode.tsx still
inserts `subject_id: context.subjectId` even though the `subjects`
table no longer exists. Inserts succeed (column is nullable, no FK),
but `subject_id` is now dead data nobody can use.
**Recommended action:** **Fix / Drop** — either remove the column
entirely + drop the input from FocusMode + FocusContextSelector, or
admit it's dead and stop populating it.

### TD-07 `useStatistics` returns hardcoded empty `subjects` + `topicProgress` → "0/0 Tópicos" in UI

**Severity:** HIGH
**Category:** bug / UX
**Location:** `src/hooks/useStatistics.ts:99-108`,
consumed by `src/pages/Statistics.tsx:264`
**Evidence:** The hook explicitly sets `setSubjects([])` and
`setTopicProgress([])` after the legacy tables were dropped, but
still **returns** `topicsCompleted: 0`, `topicsTotal: 0`, and
`disciplineStats: []`. Statistics.tsx then renders
`{stats.topicsCompleted}/{stats.topicsTotal}` → user sees "0/0
Tópicos" forever. Same with `disciplineStats` (always empty).
**Recommended action:** **Rewrite** — derive disc/topic counts from
`admin_disciplinas` / `admin_topicos` joined with
`user_flashcard_progress` (the same pattern `useExamTarget` already
uses). Remove the dead fields from the returned object so existing
consumers fail loud and get migrated.

### TD-08 Landing.tsx and LandingTJSP.tsx still advertise "Caderno digital" / "Resumos" / Tiptap-editor mock

**Severity:** HIGH
**Category:** UX / product-fit
**Location:** `src/pages/Landing.tsx:96-97`,
`src/pages/LandingTJSP.tsx:359-382`,
`src/components/landing/MarqueeStrip.tsx:8`
**Evidence:** Top of the funnel still lies about the product:
- `Landing.tsx:96`: `{ Icon: SiBrain, title: 'Caderno digital', desc: 'Organize suas anotações por disciplina.', size: 'cell' }`
- `Landing.tsx:97`: `{ Icon: SiDocument, title: 'Resumos', desc: 'Organize suas anotações por disciplina.', size: 'wide' }`
- `LandingTJSP.tsx:359-382`: full "Caderno Digital" mockup card showing rich-text editor with bold/italic, "Tire dúvidas com a IA direto nas suas anotações", and the text "Faça anotações durante o estudo e tire dúvidas com o chat IA integrado".
- `MarqueeStrip.tsx:8`: "Caderno digital" is one of the rotating method words.

PRODUTO.md §5: "❌ Não somos editor de notas." §12: "❌ Sem IA visível
ao aluno — pra sempre." Customer pays R$297 expecting these features
and finds neither. This is **legal exposure** under CDC art. 30
(publicidade vinculante) plus a churn vector.
**Recommended action:** **Fix immediately** — strip the Caderno digital
card from LandingTJSP, remove the feature entries from Landing.tsx, drop
"Caderno digital" from MarqueeStrip. Replace with truthful "Caderno de
Erros" (auto-populado) which actually exists.

### TD-09 LandingPRF.tsx promises 4,520 flashcards + 500+ CEBRASPE questions for non-existent PRF product at R$397 price

**Severity:** HIGH
**Category:** UX / legal
**Location:** `src/pages/LandingPRF.tsx` (entire file, 422 lines),
exposed at `/prf` per `src/App.tsx:97`
**Evidence:** PRF is "coming-soon" in Landing.tsx but is publicly
SEO-indexable at `/prf` with detailed pricing (R$ 33,08 x12 = R$397
to view, but R$397/yr is wrong per PRODUTO.md anyway — TJSP is R$297).
"EM PRODUÇÃO" button is disabled but landing is otherwise live, lures
search traffic + collects no email/lead.
**Recommended action:** **Drop or rewrite** — either delete
LandingPRF.tsx entirely + the route, or restrict it to an internal
preview behind admin auth. If kept as a waitlist page, add real
email capture and remove the false stats.

### TD-10 `src/lib/ecosystem.ts` — 187-line god module from pre-pivot era is imported but mostly dead

**Severity:** MEDIUM
**Category:** tech-debt
**Location:** `src/lib/ecosystem.ts`
**Evidence:** Defines `MaterialType` ('flashcards' | 'mindmap' |
'exercises' | 'notes'), `SourceType` ('topic' | 'text' | 'youtube' |
'pdf' | 'audio'), `OBJECTIVE_TYPES`, `NAV_STRUCTURE` (with `/acervo`,
`/decks`, `/library`, `/progress` paths none of which are routed),
and `ROUTES` (with `studySessions`, `sessionDetail(id)`,
`sessionOutput(...)`, `libraryDeck(id)` — all dead). Imported by
`FocusMediaPanel.tsx` (only consumes the YouTube ambient sounds
config, ignores the rest) and `FlashcardStudy/useStudySession.test.ts`.
Notes type description is "Resumos e notas editáveis" — back-door
references the killed feature.
**Recommended action:** **Rewrite** — extract the YouTube ambient
sound list into `src/components/focus/ambient-sounds.ts`, then
delete `ecosystem.ts`. It's a pre-pivot architectural sketch that
no longer matches reality.

### TD-11 `apply_audit_suggestion`, `reject_audit_suggestion`, `flashcard_heuristic_flags`, `run_flashcard_heuristic_audit` RPCs typed but never called from `src/`

**Severity:** LOW
**Category:** tech-debt
**Location:** `src/integrations/supabase/types.ts:1789-1898`
**Evidence:** 4 RPC functions still in DB + type defs but no
`src/` file invokes them. Confirmed via grep — only
`triage_flagged_card` is live (in `AdminFlashcardsBanco.tsx:149`).
The audit pipeline these used (`audit-flashcards-validator` edge
function) is also deleted.
**Recommended action:** **Drop** — `DROP FUNCTION apply_audit_suggestion`,
`reject_audit_suggestion`, `delete_audit_card`, `flashcard_heuristic_flags`,
`run_flashcard_heuristic_audit` via migration. Reduces RPC surface
shown to a curious anon caller.

### TD-12 `spend_flashs_ai`, `spend_flashs_clone_deck`, `ensure_flash_balance` — currency RPCs from killed AI feature

**Severity:** LOW
**Category:** tech-debt / security
**Location:** `src/integrations/supabase/types.ts:1827-1894`
**Evidence:** Pre-pivot "Flashs" was the in-app currency users
spent on AI generation. Migration 20260423000000 dropped
`flash_balance`, `flash_transactions`, `flash_usage_log` tables.
But the RPCs that mutated them remain. Calling them now would
either crash (table not found) or worse, succeed against a
phantom row. `clone_deck` was already dropped per CLAUDE.md
checklist.
**Recommended action:** **Drop** — same SQL as TD-11.

### TD-13 `study_logs` table actively used but contains 5 dead columns (subject_id, topic_id, focus_session_id, material_type, material_ref, theory_completed)

**Severity:** LOW
**Category:** tech-debt
**Location:** `src/hooks/useStudyLogSaver.ts:31-52`, `study_logs` table
schema
**Evidence:** Hook still INSERTS into the 5 dead columns + 3 zombie
fields (theory_completed, schedule_review, count_in_plan). These are
artifacts of the old pre-pivot "study with rich materials" feature.
**Recommended action:** **Fix** — slim StudyLogInput to just
`{ goalId, durationMinutes, source, questionsDone?, questionsCorrect? }`,
drop the dead columns via migration, regenerate types.

### TD-14 `study_sessions_rich` insert in useRatingHandler casts entire payload as `any`

**Severity:** LOW
**Category:** tech-debt
**Location:** `src/pages/FlashcardStudy/useRatingHandler.ts:338-354`
**Evidence:** `supabase.from('study_sessions_rich' as any).insert({...} as any)`.
Hides any future schema drift; the insert could silently fail. The
table IS in `types.ts` so the cast isn't strictly needed — likely
a residue from when it was new.
**Recommended action:** **Fix** — drop both `as any` casts.

### TD-15 `notebook_page_strokes` + `notebook_pages` + `notebooks` already dropped, but migration 20260411170000 is still in repo committing those CREATE TABLE statements

**Severity:** LOW
**Category:** tech-debt / docs
**Location:** `supabase/migrations/20260411170000_notebook_page_strokes.sql`,
plus 4 other notebook migration files
**Evidence:** Migrations form a stack of "create then drop in 20260423"
operations. Cumulative migration history is bloated with the
pre-pivot story. For replays in a fresh DB this is wasteful but
correct.
**Recommended action:** **Accept** — too risky to squash migration
history. Just note for the reboot: if you do a clean DB, you can
start from the post-pivot schema directly.

---

## Stripe Leftovers (post-Asaas pivot)

### TD-16 Stripe references — only in PENDENCIAS file + CLAUDE.md, no live code

**Severity:** LOW
**Category:** tech-debt
**Location:** None in `src/`
**Evidence:** Grep `stripe|STRIPE` returns zero matches in
`src/` and zero in `supabase/functions/`. Frontend is fully on
Asaas via `create-asaas-payment` and `asaas-webhook`. Remaining
Stripe surface is the 4 zombie edge functions in TD-01.
**Recommended action:** **Drop** with TD-01.

---

## Security Concerns

### SEC-01 HIBP password protection NOT enabled in Supabase

**Severity:** HIGH
**Category:** security
**Location:** Supabase dashboard / `supabase/config.toml` (not configurable here)
**Evidence:** PENDENCIAS-2026-05-16.md §3 — toggle is OFF, must be
set via dashboard. Without it, users can sign up with passwords like
"123456" or any leaked password from haveibeenpwned. Combined with
Supabase's default rate limit (very lenient on signup), this is a
near-zero-cost credential stuffing attack vector.
**Recommended action:** **Fix immediately** — Auth → Providers →
Email → "Leaked password protection" → ON.

### SEC-02 `Signup.tsx` confirmPassword has `minLength={6}` but password has `minLength={8}`

**Severity:** LOW
**Category:** bug / security
**Location:** `src/pages/Signup.tsx:335`
**Evidence:** Line 323 main password input: `minLength={8}`. Line 335
confirm password input: `minLength={6}`. Functionally still fine
because line 46 enforces `password.length < 8` JS-side before submit,
but the HTML attribute lies to assistive tech and password managers.
**Recommended action:** **Fix** — change to `minLength={8}`.

### SEC-03 `.env` file present at repo root with VITE_SUPABASE_PUBLISHABLE_KEY hardcoded

**Severity:** LOW
**Category:** security
**Location:** `.env`
**Evidence:** File exists at repo root containing the anon publishable
key. `.gitignore:19-21` covers `.env*`, so it's not in git, but
visual inspection confirms it's only the anon (publishable) key —
not the service role. Safe.
**Recommended action:** **Accept** — anon key is meant to be public.
But verify `.env` is never committed in any branch.

### SEC-04 ErrorBoundary swallows errors to console only — no Sentry or remote error tracking

**Severity:** HIGH
**Category:** operational / security
**Location:** `src/components/ErrorBoundary.tsx:25-27`
**Evidence:** `componentDidCatch` only does `console.error(...)`.
No Sentry, no Datadog, no LogRocket. When a paying user hits an
unhandled exception in production, **nobody knows**. The user sees
"Algo deu errado" and you have zero telemetry. For a paid product
this is a critical operational gap.
**Recommended action:** **Fix on reboot** — add Sentry (free tier
fits) with PII scrubbing, instrument `ErrorBoundary` +
`window.onerror` + `window.onunhandledrejection`.

### SEC-05 No Sentry / monitoring for the Asaas webhook either

**Severity:** CRITICAL
**Category:** operational
**Location:** `supabase/functions/asaas-webhook/index.ts`
**Evidence:** `console.error` everywhere. When the webhook fails
to grant access (DB down, wrong service-role key, payload schema
change), the user already paid but you have no alert. They wait,
get angry, and email support. Supabase keeps logs in the dashboard
but nobody is paged.
**Recommended action:** **Fix immediately** — wire a Sentry DSN
into all edge functions (Sentry has a Deno SDK), or at minimum
forward errors to a Resend email or webhook to your Discord/Slack.

### SEC-06 Webhook returns 200 on errors to prevent Asaas retries

**Severity:** MEDIUM
**Category:** bug / data-integrity
**Location:** `supabase/functions/asaas-webhook/index.ts:139-141, 178-181, 202-209`
**Evidence:** Even when granting access FAILS, the function logs
the error then returns `{ received: true }` with HTTP 200. Asaas
won't retry. Coupled with SEC-05 this is a silent failure mode:
paying customer ends up with no access, you don't know.
**Recommended action:** **Fix** — return 500 for the **DB error**
case so Asaas retries. Only the "malformed externalReference" path
should be a true 200-no-op (because retrying won't help). Add the
Sentry capture from SEC-05.

### SEC-07 Webhook idempotency depends on `onConflict: 'asaas_payment_id'` on `purchases` table — but `user_concurso_access` upsert can extend `expires_at` on every redelivery

**Severity:** MEDIUM
**Category:** bug / data-integrity
**Location:** `supabase/functions/asaas-webhook/index.ts:121-135`
**Evidence:** Every `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` upsert
sets `expires_at = now + 365 days`. Asaas re-delivers webhooks on
network issues. If a user pays once but the webhook arrives 3
times, their `expires_at` advances 3 times. Net result: a paying
user can accidentally accumulate 3 years of access from one purchase.
Or worse, if `PAYMENT_RECEIVED` then `PAYMENT_CONFIRMED` arrive for
the same payment id, the second call extends again.
**Recommended action:** **Fix** — check existing `expires_at` first
and only extend if `expires_at - granted_at < 365 days`, OR base the
new `expires_at` on the **payment_id** (deterministic from
`purchases.paid_at + 365d`) instead of `Date.now() + 365d`. Idempotent.

### SEC-08 Webhook accepts ANY `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` payload that parses, without verifying the payment actually exists at Asaas

**Severity:** HIGH
**Category:** security
**Location:** `supabase/functions/asaas-webhook/index.ts`
**Evidence:** If `ASAAS_WEBHOOK_TOKEN` leaks (e.g., from a compromised
dev's machine), an attacker can POST a fake `PAYMENT_RECEIVED` for
any `userId:concursoId` pair and get free access granted. Token is
the entire security boundary — no fetch-back to
`https://api.asaas.com/v3/payments/<id>` to verify.
**Recommended action:** **Fix on reboot** — after token check,
re-fetch `/payments/{payment.id}` from Asaas to confirm
`status === 'CONFIRMED'` (or 'RECEIVED') and `value === product.price`.
Single extra HTTP call, removes the bearer-token-is-everything
fragility.

### SEC-09 Grant-access edge function uses `auth.admin.listUsers()` (fetches ENTIRE auth user list every call)

**Severity:** MEDIUM
**Category:** security / performance
**Location:** `supabase/functions/grant-access/index.ts:78-81`
**Evidence:** To resolve `email → user_id` it fetches all users
via `auth.admin.listUsers()` and `.find(u => u.email === email)`.
At 100 users this is fine, at 10k it's a 10-second roundtrip + a
default pagination cliff (Supabase listUsers paginates at 50/page
without explicit `perPage`, so you'd silently NOT find users beyond
the first page).
**Recommended action:** **Fix** — query `user_profiles` for the
email via `email` column if you store it there, or use
`auth.admin.getUserById` after resolving via your own profiles table.
Don't iterate the auth list.

### SEC-10 RLS for `refund_requests` insert from anon — table doesn't even exist

**Severity:** HIGH
**Category:** bug / security
**Location:** `src/pages/Reembolso.tsx:44-49`, no migration
**Evidence:** `Reembolso.tsx` does `supabase.from('refund_requests').insert(...)`.
**There is no migration creating this table** (grep across
`supabase/migrations` returns zero matches). The route at `/reembolso`
silently fails for every submission (Postgres returns "relation does
not exist"), but the UI shows success — `toast.success(...)` always
runs even if `error` is thrown, because the error is caught and
logged as `'refund insert failed'` but the user sees the success
toast on line 52... wait, re-reading: yes line 51 `setSubmitted(true)`
fires before the catch block on 53. So a user who clicks "send"
sees the success screen but no row is saved. Refund requests from
the legal/CDC art. 49 flow disappear into the void.
**Recommended action:** **Fix CRITICAL** — create the
`refund_requests` table via migration with proper RLS (anon can
INSERT, only admins can SELECT), or remove the form and route the
flow to email-only. Right now you're in **legal exposure** —
art. 49 CDC requires you to honor 7-day refund requests, and you're
losing those requests.

### SEC-11 `process-leagues` cron function gated by `CRON_SECRET` header but no documented rotation procedure

**Severity:** LOW
**Category:** security
**Location:** `supabase/functions/process-leagues/index.ts:39-46`
**Evidence:** Good that it has the secret. But no rotation cadence,
no break-glass plan if leaked. Scheduled jobs need lifecycle docs.
**Recommended action:** **Accept** for launch, but document
rotation in a runbook.

### SEC-12 OAuth Google redirect doesn't sanitize origin

**Severity:** LOW
**Category:** security
**Location:** `src/pages/Login.tsx:67`, `src/pages/Signup.tsx:147`
**Evidence:** `redirectTo: window.location.origin + redirectTo` —
`window.location.origin` is unsanitized. In normal deploys it's
`https://flashcards.com.br`, but in a XSS-chained attack on an
admin's localhost, this could redirect to attacker-controlled
host. Signup.tsx:31-33 sanitizes the URL path but not the origin
itself. Modest risk.
**Recommended action:** **Accept** — Supabase auth config
already restricts allowed redirect URLs at the project level. The
client-side concat is fine.

### SEC-13 `SpecialCardExtras.tsx` uses `dangerouslySetInnerHTML` with unsanitized DB content

**Severity:** MEDIUM
**Category:** security / XSS
**Location:** `src/pages/FlashcardStudy/SpecialCardExtras.tsx:166-169`
**Evidence:** `<div dangerouslySetInnerHTML={{ __html: display }} />`
where `display` is built from `extras.full_text` (raw from
`admin_flashcards.extras` JSONB) with replacements. If a malicious
Cowork insider or compromised admin account injects an `<img onerror>`,
every aluno who studies that card runs the payload.
**Recommended action:** **Fix** — wrap with `DOMPurify.sanitize(display)`
(DOMPurify is already a dep, used in QuestionCard table renderer).

### SEC-14 SESSION_VERSION = 2 — bump mechanism exists but no docs on when to bump

**Severity:** LOW
**Category:** operational / tech-debt
**Location:** `src/hooks/useAuth.tsx:14`
**Evidence:** Forces re-login on every user when bumped. Used to
nuke stale sessions after auth-related changes. Currently 2 — no
changelog. If you ever ship a fix that needs forced re-login,
remembering to bump this is the difference between security fix
and silent failure.
**Recommended action:** **Accept** — add a comment block listing
why each bump happened so the reboot keeps continuity.

---

## Auth / Profile Concerns

### AUTH-01 `useAuth.tsx` uses both `onAuthStateChange` AND `getSession()` — listener fires first, can race the resolution flag

**Severity:** MEDIUM
**Category:** bug
**Location:** `src/hooks/useAuth.tsx:39-56`
**Evidence:** Listener sets `loading = false` only **after**
`initialSessionResolvedRef.current = true`. But the listener's
condition for setting loading is `if (initialSessionResolvedRef.current)`
— meaning if the listener fires BEFORE `getSession().then`, `setLoading`
never runs from inside the listener. Then `getSession` sets it. Works
in practice (Supabase fires INITIAL_SESSION sync-ish), but the
boolean-ref check is fragile and a future Supabase change could break
it.
**Recommended action:** **Fix on reboot** — collapse into a single
state machine: only `getSession()` resolves the initial state;
listener only handles subsequent changes.

### AUTH-02 `useProfile.ts` cache has 24h TTL — admin gets stuck on outdated profile across days

**Severity:** LOW
**Category:** bug / UX
**Location:** `src/hooks/useProfile.ts:16, 95-104`
**Evidence:** Comment admits the issue: "admins from being stuck on
an old 'incomplete' snapshot across days." Fixed via 24h TTL, but
24h is still long. If you fix a profile RLS bug, every existing
session keeps painting from stale localStorage cache for up to 24h.
**Recommended action:** **Accept** — 24h is a reasonable compromise.
Could be tied to SESSION_VERSION-bump instead.

### AUTH-03 `useProfile` uses localStorage cache with no encryption — leaks full_name + cpf + phone to any extension

**Severity:** MEDIUM
**Category:** security / privacy
**Location:** `src/hooks/useProfile.ts:48-59`
**Evidence:** Profile cached as `user_profile_cache:<uuid>` →
JSON containing CPF, full_name, phone_e164. Any browser extension
with `storage` permission can read it. CPF is sensitive (LGPD
art. 5 §I). Minor in practice but a strict LGPD audit would flag
this.
**Recommended action:** **Fix** — cache only `full_name + avatar_url`
in localStorage; re-fetch CPF/phone from DB when needed (Profile/
Checkout pages only).

### AUTH-04 `useAccess.ts` reads goal.exam_context.concurso_id → user_concurso_access — 3 round-trips on every protected page

**Severity:** MEDIUM
**Category:** performance
**Location:** `src/hooks/useAccess.ts:42-96`
**Evidence:** 3 sequential Supabase queries: goals → admin_concursos →
user_concurso_access. With React Query's 5-min stale they cache, but
the **first** load of every protected route is 3 round-trips before
any page renders. Could be a single RPC.
**Recommended action:** **Fix on reboot** — create `get_user_access(p_user_id)`
RPC returning `{has_access, concurso_id, concurso_title, concurso_slug}`
in one call.

### AUTH-05 `useAdmin` doesn't cache → fires `user_roles` SELECT on every component mount

**Severity:** LOW
**Category:** performance
**Location:** `src/hooks/useAdmin.ts:7-25`
**Evidence:** `useQuery({ queryKey: ['user-role', user?.id] })` with
**no `staleTime`**. Default React Query staleTime is 0 (or whatever
QueryClient defines — App.tsx:64 sets it to 2min, so OK). But
`useAdmin` is called from at least 8 components and each instance
gets its own enabled flag; query dedupe works only within the same
queryKey. Acceptable.
**Recommended action:** **Accept**.

### AUTH-06 `AdminRoute.tsx` doesn't check if `isAdmin` is null vs false → user without role row passes through `roleLoading`

**Severity:** LOW
**Category:** bug
**Location:** `src/components/admin/AdminRoute.tsx:24-25`
**Evidence:** `useAdmin` returns `!!isAdmin`, which is fine. But
during `roleLoading` the spinner shows. If a non-admin user hits
`/admin` while authenticated, the experience is: spinner → redirect
to /dashboard. Acceptable.
**Recommended action:** **Accept**.

---

## Payment / Asaas Concerns

### PAY-01 `create-asaas-payment` hardcodes `PRODUCTS` dictionary with only TJSP UUID

**Severity:** MEDIUM
**Category:** tech-debt
**Location:** `supabase/functions/create-asaas-payment/index.ts:6-11`
**Evidence:** PRODUCTS is a Deno const. Every new concurso requires
a redeploy of this function. PRODUTO.md §9 says multi-concurso ships
Q3 2026 — this hardcode is a blocker for that roadmap.
**Recommended action:** **Rewrite on reboot** — read `price` and
`description` from `admin_concursos.price_cents` and
`admin_concursos.title` (add the column if missing).

### PAY-02 Polling for payment confirmation in `Checkout.tsx` polls every 3 seconds for the entire `setPayment` lifetime — no max retries

**Severity:** LOW
**Category:** performance
**Location:** `src/pages/Checkout.tsx:276-298`
**Evidence:** `setInterval(..., 3000)` checks `user_concurso_access`
forever. If the user opens the PIX modal, walks away, sleeps, comes
back next day → 28,800 needless DB reads happened. The component
unmounts via React Router will kill the timer eventually, but the
user could leave the tab open.
**Recommended action:** **Fix on reboot** — cap at 60 polls (3
minutes) then surface "Pagamento ainda não confirmado. Atualize a
página" CTA. Or migrate to Supabase Realtime channel listening on
`user_concurso_access`.

### PAY-03 `PAYMENT_DELETED` revokes access immediately — possible legitimate scenario gets shafted

**Severity:** LOW
**Category:** UX / data-integrity
**Location:** `supabase/functions/asaas-webhook/index.ts:169-194`
**Evidence:** Asaas sends `PAYMENT_DELETED` when a payment is voided
by support, often during a refund flow. The code revokes access
immediately. But "deleted" can also mean Asaas housekeeping wiped a
PENDING boleto that was never paid — but the upsert in
`asaas-webhook` only writes access on RECEIVED/CONFIRMED, so this
case is moot. Still worth a comment-level confirmation.
**Recommended action:** **Accept** — but document the policy
(refund = lose access immediately).

### PAY-04 Garantia 7 dias prominent in checkout copy but no automated refund flow

**Severity:** MEDIUM
**Category:** UX / operational / legal
**Location:** `src/pages/Checkout.tsx:474-478`, `src/components/paywall/PrepPaywall.tsx:153-159`
**Evidence:** Checkout promises "7 dias de garantia". Reembolso.tsx
form exists (SEC-10) but writes to non-existent table. So a user
who wants their refund within the 7-day window has no working
in-app path. Admin must reconcile manually.
**Recommended action:** **Fix** — combined with SEC-10. Build the
table, build an admin queue (`/admin/refund-requests`), automate
the Asaas refund call via API.

### PAY-05 `Checkout.tsx` 30-second timeout on `create-asaas-payment` — feeds the user a generic message but no error tracking

**Severity:** LOW
**Category:** UX / operational
**Location:** `src/pages/Checkout.tsx:181-193`
**Evidence:** Good defensive code. But on timeout there's no
`Sentry.captureException` (see SEC-04). User just sees a toast.
**Recommended action:** **Fix** with SEC-04 — capture timeouts +
billingType + concursoId.

### PAY-06 `purchases` table records every successful PAYMENT_RECEIVED but never the failed/cancelled ones

**Severity:** LOW
**Category:** data-integrity
**Location:** `supabase/functions/asaas-webhook/index.ts:146-166`
**Evidence:** Webhook only writes `purchases` on grant events. No
log of `PAYMENT_OVERDUE`, no log of unpaid boletos. Analytics will
struggle to compute conversion funnels because the denominator
(payments created) is in Asaas, the numerator (paid) is in `purchases`.
**Recommended action:** **Accept** for launch; **Fix on reboot** —
log every payment status transition with timestamp.

---

## Performance Concerns

### PERF-01 `Concursos.tsx` N+1 query — for each concurso, 1 query for disciplinas + 1 for topicos

**Severity:** MEDIUM
**Category:** performance
**Location:** `src/pages/Concursos.tsx:72-98`
**Evidence:** `await Promise.all(raw.map(async c => {...}))` runs
**2 queries per concurso**. With 10 concursos that's 21 queries
just to render the page. At 100+ this gets ugly.
**Recommended action:** **Fix on reboot** — single RPC or view that
returns `(concurso, discipline_count, topic_count)` aggregated.

### PERF-02 `useStudySession` fetches ALL user_flashcard_progress rows in 1 request without scoping by concurso

**Severity:** MEDIUM
**Category:** performance / data-integrity
**Location:** `src/pages/FlashcardStudy/useStudySession.ts:371-377`
**Evidence:** `supabase.from('user_flashcard_progress').select('...').eq('user_id', user.id)`
— no concurso scope. If user studied TJSP yesterday and is studying
something else today (when multi-concurso ships), this pulls the
union. Comment explains it's done deliberately to dodge URL truncation
on `.in()`, which is true, but it'll get expensive at thousands of
progress rows.
**Recommended action:** **Accept** for launch (single-concurso),
**Fix on reboot** — server-side filter via SQL function joining
admin_flashcards.concurso_id.

### PERF-03 `useScopedDueCount` fetches all admin_flashcards (up to 10k) then all user_flashcard_progress then filters client-side

**Severity:** MEDIUM
**Category:** performance
**Location:** `src/hooks/useScopedDueCount.ts:29-60`
**Evidence:** TJSP has ~3,463 cards. Pulling all card ids + all
progress rows on every dashboard render is 1 MB of data on the
wire. Cached 60s by React Query — OK for now but doesn't scale.
**Recommended action:** **Fix on reboot** — RPC
`get_scoped_due_count(p_concurso_id)` returns a single integer.

### PERF-04 `useExamTarget.ts` does two parallel sub-queries then a client-side `Set` dedupe for topicsSeen

**Severity:** LOW
**Category:** performance
**Location:** `src/hooks/useExamTarget.ts:142-160`
**Evidence:** Already deduped via Set. Acceptable for current scale.
**Recommended action:** **Accept**, mark for RPC migration if it
gets slow.

### PERF-05 `useReviewBatcher` has retry-from-localStorage on mount — but `useEffect` deps array is `[]`, never re-runs on subsequent mounts

**Severity:** LOW
**Category:** bug
**Location:** `src/hooks/useReviewBatcher.ts:108-116`
**Evidence:** Mount-only recovery is fine for the typical "open
tab → study → close" lifecycle. But if multiple tabs of the same
user are open, only the first tab to mount will drain localStorage.
**Recommended action:** **Accept** — multi-tab study is a rare
edge case.

### PERF-06 `useAchievements` fetches 5 parallel datasets (attempts, sessions, simulados, reviews, weekly_scores) with no caching

**Severity:** LOW
**Category:** performance
**Location:** `src/hooks/useAchievements.ts:131-159`
**Evidence:** Not wrapped in React Query → re-runs on every
component mount that uses it. Profile page in particular calls
this on mount. Acceptable for one-off pageload but should be
queryClient-cached.
**Recommended action:** **Fix on reboot** — migrate to React Query.

### PERF-07 Bundle: `vendor-ui` is 236 KB, `vendor-charts` 404 KB, `index` 412 KB — total ~1 MB JS for landing

**Severity:** MEDIUM
**Category:** performance
**Location:** `dist/assets/*.js`
**Evidence:**
```
412K dist/assets/index-D32YlcDO.js
404K dist/assets/vendor-charts-CGx7JIG6.js  (Recharts — only used in Statistics page)
236K dist/assets/vendor-ui-DRsGAMwQ.js
 64K dist/assets/index-ByX1Kl30.js
 56K dist/assets/LandingTJSP-NzikR6N.js
```
Landing visitor downloads vendor-charts even though Recharts only
appears in /statistics. Code-splitting via lazy import is there for
pages but `manualChunks` in vite.config groups everything heavy
upfront.
**Recommended action:** **Fix on reboot** — drop `vendor-charts` from
manualChunks; let Vite tree-shake Recharts into the Statistics page
chunk via the lazy import.

### PERF-08 `Statistics.tsx` `useStatistics` returns empty `subjects` + `topicProgress` but still re-runs all memo selectors

**Severity:** LOW
**Category:** performance
**Location:** `src/hooks/useStatistics.ts:127-249`
**Evidence:** Wasted CPU on empty-array reduces. Trivial.
**Recommended action:** **Fix** with TD-07.

---

## Data Integrity Concerns

### DI-01 `useGamification.awardXp` is a read-modify-write race — concurrent rates lose XP

**Severity:** HIGH
**Category:** bug / data-integrity
**Location:** `src/hooks/useGamification.ts:153-202`
**Evidence:** Sequence: read `existing.total_xp` → compute
`newXp = currentXp + amount` → upsert. If two `awardXp` calls fire
concurrently (which they CAN — daily challenges, topic mastery,
session-end XP all trigger awardXp), both read the same
`existing.total_xp = N`, both compute `N + their amount`, both write
back. **Second write wins, first amount is lost.**
**Recommended action:** **Fix CRITICAL on reboot** — replace with
`UPDATE user_gamification SET total_xp = total_xp + $1 WHERE user_id = $2`
RPC. The optimistic UI update is fine, but the persistence path
must be atomic increment.

### DI-02 `useFocusTimer` uses `setInterval(..., 1000)` for the pomodoro countdown — drifts under tab inactivity

**Severity:** MEDIUM
**Category:** bug / UX
**Location:** `src/hooks/useFocusTimer.ts:66-101`
**Evidence:** Browsers throttle inactive-tab timers to ≥1 second
(often more), and any time the JS thread is blocked the next tick
fires late. In a 50-minute pomodoro, drift of 30+ seconds is normal.
User sees timer say "00:00 — pomodoro done!" but actually 50min
of wall time has elapsed but only 47min ticked. `total_focus_seconds`
written to DB is also wrong.
**Recommended action:** **Fix on reboot** — store `startedAt` as a
timestamp, compute `secondsLeft = duration - (Date.now() - startedAt)/1000`
on each tick. Drift = 0.

### DI-03 Type mismatch — `useStudySession` declares `defaultMode: 'mixed' | 'new' | 'review'`, but `StudyMode` is `'advance' | 'review' | 'mix'`

**Severity:** MEDIUM
**Category:** bug
**Location:** `src/pages/FlashcardStudy/useStudySession.ts:34-37` vs
`src/lib/edital/types.ts:99-102`
**Evidence:** The interface for `useStudySession` accepts `'mixed' | 'new' | 'review'`
but `useStudyPreferences` returns `StudyMode = 'advance' | 'review' | 'mix'`.
At call site this works because TS strict isn't enabled for pages,
but `buildStudyQueue` ALSO accepts `'advance' | 'review' | 'mix'` →
when user passes `'mixed'` (typo or someone followed the bad
interface) the queue builder hits its default branch. Latent bug.
**Recommended action:** **Fix** — change `useStudySession` interface
to use `StudyMode` from `edital/types.ts`. One source of truth.

### DI-04 `srs_reviews` insert uses `flashcard_id` AND a removed `item_id` column

**Severity:** LOW
**Category:** bug (fixed)
**Location:** `src/hooks/useReviewBatcher.ts:75-82`
**Evidence:** Comment block at line 71-74 admits a past bug where
inserting `item_id: null` made Postgres reject the whole row. Fix is
in place. Verified.
**Recommended action:** **Accept**.

### DI-05 `mistake_notebook` insert in `SimuladoRun` and `QuestionCard` references content_item_id (TD-05 issue)

**Severity:** HIGH (covered by TD-05)
**Category:** bug
**Location:** `src/pages/SimuladoRun.tsx:256-268`, `src/components/questions/QuestionCard.tsx:126-135`
**Evidence:** Same dead-column issue as TD-05.
**Recommended action:** **Fix** with TD-05 — drop the field from
both inserts.

### DI-06 `question_attempts.content_item_id` IS NOT NULL but `topic_progress` (legacy) cascade behavior unknown

**Severity:** LOW
**Category:** data-integrity
**Location:** Schema
**Evidence:** Migration `20260512001000` says it dropped the FK
constraint, leaving the column an "inert orphan UUID". If the column
is still NOT NULL, every insert must pass a value — and TD-05
shows the value is misleadingly the `admin_questoes.id`. If
PENDENCIAS §4 drops the column, the inserts need to drop the field
too.
**Recommended action:** **Fix** in concert with TD-05.

### DI-07 `mistake_notebook` insert payload uses `admin_questao_id` + `content_item_id` simultaneously

**Severity:** MEDIUM
**Category:** bug / data-integrity
**Location:** `src/pages/SimuladoRun.tsx:230-240`,
`src/components/questions/QuestionCard.tsx:126-135`
**Evidence:** SimuladoRun line 233 only sets `admin_questao_id`
(missing `content_item_id` which is NOT NULL → insert fails!).
QuestionCard line 128 only sets `content_item_id` (no
`admin_questao_id`). Both write inconsistent shapes. The schema
should have ONE FK column post-pivot, not both.
**Recommended action:** **Fix CRITICAL** — pick one column
(`admin_questao_id`), drop the other from the schema and from all
insert call sites.

### DI-08 `goals.exam_context` is a JSON blob holding `concurso_id` — not normalized, not foreign-keyed

**Severity:** LOW
**Category:** data-integrity / tech-debt
**Location:** `src/integrations/supabase/types.ts:761`,
queried in `useAccess.ts:60-63`, `DashboardRouter.tsx:53`, ~5 other places
**Evidence:** `(goal.exam_context as any)?.concurso_id` is the
canonical way every consumer derives the active concurso. Free-form
JSON has no FK to `admin_concursos.id` — a typo or stale data leaves
the dashboard pointing at a non-existent UUID, paywall flips weird
ways, and Concursos.tsx can't deduplicate.
**Recommended action:** **Fix on reboot** — promote `concurso_id` to
a real `goals.concurso_id` UUID column with FK to `admin_concursos`.
Keep `exam_context` as a JSON metadata bucket if you want, but the
concurso pointer is structural.

### DI-09 Schema generated types are STALE — 166 `as any` casts in code

**Severity:** HIGH
**Category:** tech-debt / data-integrity
**Location:** `src/integrations/supabase/types.ts` (2033 lines, 64 KB),
166 `as any` occurrences across `src/`
**Evidence:** `grep -rn "as any" src/` returns 166 hits. Many are
`from('admin_flashcards' as any)` or `.upsert({...} as any)`. Means
the developer encountered a type error and silenced it instead of
regenerating types. Newer columns (`slug`, `review_status`,
`source_pipeline`, `data_prova`, `peso`, `concurso_id` on goals)
aren't typed. Risk: a column rename in the DB doesn't fail TS, just
returns `undefined` at runtime.
**Recommended action:** **Fix on reboot** — run
`supabase gen types typescript --project-id zjyogswbgcauwqisvuyq > src/integrations/supabase/types.ts`
then incrementally remove `as any` casts in `git`-grep order.

### DI-10 `useStudyLogSaver` populates 5 columns from inputs that no caller ever passes

**Severity:** LOW
**Category:** tech-debt
**Location:** `src/hooks/useStudyLogSaver.ts:31-52`
**Evidence:** `pages_read`, `theory_completed`, `schedule_review`,
`count_in_plan`, `material_type`, `material_ref` — all of these have
defaults but no caller in `src/` supplies them. Vestigial fields.
**Recommended action:** **Fix** with TD-13.

---

## UX / Product-Fit Concerns

### UX-01 Schema.org `Offer.description` in `index.html` claims "caderno digital" feature

**Severity:** HIGH
**Category:** UX / SEO / legal
**Location:** `index.html:40`
**Evidence:**
> "Acesso completo por 1 ano ao curso TJSP Escrevente Técnico
> Judiciário: 3.463 flashcards curados cobrindo as 11 disciplinas do
> edital, simulado cronometrado de 5 horas com 70 questões, banco de
> 212 questões reais VUNESP (2010-2025) e **caderno digital**."

Google indexes this. Prospects clicking from Google see "caderno
digital" as a featured snippet → expect a Tiptap editor. They don't
get one. Drives churn + legal exposure.
**Recommended action:** **Fix immediately** — replace "caderno
digital" with "caderno de erros automático".

### UX-02 `Termos.tsx` (Terms of Service) says "Plataforma oferece planos gratuitos e pagos"

**Severity:** HIGH
**Category:** legal
**Location:** `src/pages/Termos.tsx:40` (cláusula 3.1)
**Evidence:** Per PRODUTO.md §5: "Não temos free tier amplo. Talvez
5-10 cards de demo na landing, mas o produto é pago." Terms saying
"planos gratuitos" creates user expectation of a free tier, then
the actual product has none. Either grant a free tier (contradicts
strategy) or fix terms.
**Recommended action:** **Fix immediately** — strike "gratuitos e".

### UX-03 `Privacidade.tsx` mentions "caderno de erros automático" + other features correctly, but compounds with UX-01 mismatch

**Severity:** LOW
**Category:** UX
**Location:** `src/pages/Privacidade.tsx:94`
**Evidence:** Actually correct. Just inconsistent with landing copy.
**Recommended action:** **Accept** — Privacidade is correct.

### UX-04 `Settings.tsx` UI copy still references "novos decks"

**Severity:** LOW
**Category:** UX
**Location:** `src/pages/Settings.tsx:361, 378`
**Evidence:** "Aplicado automaticamente a todos os novos decks."
and "Máximo de cards por sessão em novos decks." But decks no
longer exist as a user-facing concept (PRODUTO.md §11 — the user
sees "Estudar" sessions, not decks).
**Recommended action:** **Fix** — rename "novos decks" → "novas
sessões" or "sua preparação".

### UX-05 Toast UX inconsistency — sometimes `toast.success`/`toast.error`, sometimes inline error blocks

**Severity:** LOW
**Category:** UX
**Location:** Multiple — `Checkout.tsx`, `Onboarding.tsx`, `Signup.tsx`
**Evidence:** Pattern mixed. Onboarding shows inline error block,
Checkout shows toast + retry button, Signup just toasts.
**Recommended action:** **Accept** — pre-launch consistency pass.

### UX-06 `/edital` page exists but `OnboardingPromptHome` is the empty-state for no-goal — what does `/edital` look like with no goal?

**Severity:** LOW
**Category:** UX
**Location:** `src/App.tsx:127`, `src/pages/EditalMap.tsx`
**Evidence:** Not reviewed in detail but likely the same issue as
useScopedDueCount — depends on goal.exam_context.concurso_id, so
shows empty / broken state for users without an active goal.
**Recommended action:** **Accept**, validate manually before launch.

### UX-07 Paywall escape hatch is "Sair" (sign out) — no "switch account" or "view another preparation" path

**Severity:** LOW
**Category:** UX
**Location:** `src/components/paywall/PrepPaywall.tsx:46-52`
**Evidence:** Once a user without paid access lands on a protected
study route, the only escape is full logout. They can't browse
other concursos (Q3 roadmap).
**Recommended action:** **Accept** for single-concurso launch.

### UX-08 `useStatistics` always shows `topicsCompleted/topicsTotal = 0/0`

**Severity:** HIGH (covered by TD-07)
**Category:** UX / bug
**Recommended action:** **Fix** with TD-07.

### UX-09 `weekly_podium` and `weekly_champion` achievements permanently locked

**Severity:** LOW
**Category:** UX / tech-debt
**Location:** `src/hooks/useAchievements.ts:218-226`
**Evidence:** Comment admits the inference was wrong, so the
honest fix is to leave them locked until a real rank RPC exists.
Means 2 out of 18 achievements are unwinnable today, capping
gamification at 16/18.
**Recommended action:** **Fix on reboot** — write the rank RPC
(`get_user_weekly_rank`) and unlock these two.

### UX-10 `LandingTJSP.tsx` is a 811-line monolith with inline mockups, no component extraction

**Severity:** LOW
**Category:** tech-debt
**Location:** `src/pages/LandingTJSP.tsx`
**Evidence:** Page does its own bento layout, FAQ, pricing, etc. all
inline. Hard to A/B test sections, hard to reuse for the
ConcursoLanding component PRODUTO.md §9 roadmap mentions.
**Recommended action:** **Rewrite on reboot** — extract
`<LandingHero>`, `<LandingFeatures>`, `<LandingPricing>`,
`<LandingFAQ>` so all concurso landings share the chassis.

### UX-11 Landing.tsx is 1,211 lines — same monolith problem

**Severity:** LOW
**Category:** tech-debt
**Recommended action:** **Rewrite** with UX-10.

### UX-12 `index.html` title is just "Flashcards" — bad SEO + brand confusion

**Severity:** MEDIUM
**Category:** UX / SEO
**Location:** `index.html:6`
**Evidence:** `<title>Flashcards</title>` and og:title same. Generic
keyword competing against literal `flashcard` Google searches. Brand
is "Sparkle Flashcards" per PRODUTO.md.
**Recommended action:** **Fix** — "Sparkle Flashcards | Preparação
TJSP Escrevente curada".

### UX-13 Schema.org price hardcoded "297.00" — when price changes (multi-concurso, R$397?), schema breaks

**Severity:** LOW
**Category:** UX / SEO
**Location:** `index.html:41`
**Recommended action:** **Accept**, manage with care.

### UX-14 No favicon variants for OS-level themes — single `/favicon.png` (likely small)

**Severity:** LOW
**Category:** UX
**Recommended action:** **Accept**.

### UX-15 No PWA manifest / service worker / offline support

**Severity:** LOW
**Category:** UX
**Evidence:** `public/` has no `manifest.json` or `sw.js`. App is
SPA-only, no install-to-home-screen, no offline study cache. Could
be a 2027-roadmap feature but worth noting.
**Recommended action:** **Accept**.

---

## Build / CI / Deployment

### CI-01 No CI pipeline configured

**Severity:** HIGH
**Category:** operational / build-ci
**Location:** No `.github/workflows/`, no `vercel.json` lint config
**Evidence:** No GitHub Actions, no GitLab CI, no Vercel preview
checks beyond build. Tests are run manually via `npm test`. ESLint
runs manually. No type-check gate before deploy.
**Recommended action:** **Fix on reboot** — `.github/workflows/ci.yml`:
`npm ci → npm run typecheck → npm run lint → npm run test`. Required
to merge any PR.

### CI-02 ESLint config disables `@typescript-eslint/no-unused-vars`

**Severity:** LOW
**Category:** tech-debt / build-ci
**Location:** `eslint.config.js:23`
**Evidence:** `"@typescript-eslint/no-unused-vars": "off"`. Allows
dead imports to accumulate forever.
**Recommended action:** **Fix** — enable with `argsIgnorePattern: '^_'`.

### CI-03 ESLint ignores `supabase/functions/**` and `scripts/**`

**Severity:** MEDIUM
**Category:** build-ci
**Location:** `eslint.config.js:8`
**Evidence:** Two of the most security-critical directories never
linted. `supabase/functions/asaas-webhook` has business logic the
entire payment flow depends on — and it's not even checked for
unused imports.
**Recommended action:** **Fix** — write a separate ESLint config for
Deno edge functions (with Deno globals + no-unused-vars enabled),
include them.

### CI-04 `tsconfig.app.json` has `strict: false, noImplicitAny: false`

**Severity:** HIGH
**Category:** tech-debt / data-integrity
**Location:** `tsconfig.app.json:25-26`
**Evidence:** Strict TS is off for the entire `src/` except the
allowlist in `tsconfig.strict.json` (lib, hooks, ui components).
Pages are non-strict. This is how the 166 `as any` casts crept in
plus the type mismatch in DI-03.
**Recommended action:** **Fix on reboot** — flip `strict: true` and
fix the cascade (probably 200+ errors). Worth it once and forever.

### CI-05 No type-check or build gate on PR merges

**Severity:** HIGH (covered by CI-01)
**Recommended action:** **Fix** with CI-01.

### CI-06 `vercel.json` is bare-minimum — only SPA rewrite

**Severity:** LOW
**Category:** build-ci / operational
**Location:** `vercel.json`
**Evidence:** Only sets up `(.*) → /index.html`. No security headers
(no CSP, no HSTS via header config), no caching policy for `/assets/*`,
no rate limiting.
**Recommended action:** **Fix on reboot** — add `headers` array with
CSP (block inline scripts, allow Supabase + Asaas + Resend),
HSTS, X-Frame-Options DENY, Referrer-Policy.

### CI-07 No `vercel.json` env var declaration → secrets live in Vercel dashboard only (not in repo for review)

**Severity:** LOW
**Category:** operational
**Evidence:** Acceptable practice. Just means new dev onboarding
requires Vercel dashboard access.
**Recommended action:** **Accept**.

### CI-08 No automated migration deploy — Supabase migrations applied via MCP `apply_migration` ad-hoc

**Severity:** MEDIUM
**Category:** operational
**Location:** Multiple migration files say "Applied via Supabase MCP
apply_migration on 2026-MM-DD"
**Evidence:** No `supabase db push` from CI; deploys happen manually.
Risk: a migration in the repo can drift from what's actually in prod.
**Recommended action:** **Fix on reboot** — CI step `supabase db push`
on main merge, behind environment lock.

---

## Operational / Observability

### OBS-01 No Sentry / Bugsnag / Datadog for frontend

**Severity:** HIGH (covered by SEC-04)
**Recommended action:** **Fix** with SEC-04.

### OBS-02 No Sentry / structured logging for edge functions

**Severity:** CRITICAL (covered by SEC-05)
**Recommended action:** **Fix** with SEC-05.

### OBS-03 No health-check endpoint

**Severity:** LOW
**Category:** operational
**Evidence:** Grep for `healthcheck|/api/health|ping` returns no
matches. No way to programmatically verify the Asaas webhook is
reachable + auth-protected.
**Recommended action:** **Fix on reboot** — `GET /healthz` edge
function returning `{ supabase: ok, asaas: ok, version: <git-sha> }`.

### OBS-04 No analytics — no PostHog, no Amplitude, no GA

**Severity:** MEDIUM
**Category:** operational / product-fit
**Evidence:** Grep returns no hits for any standard analytics SDK.
**Recommended action:** **Fix on reboot** — install PostHog (free
tier 1M events/mo). Critical for conversion + retention measurement
in PRODUTO.md §10.

### OBS-05 Supabase project is on free tier — auto-pauses after 7 days of inactivity

**Severity:** HIGH
**Category:** operational
**Location:** `CLAUDE.md:146-150`
**Evidence:** CLAUDE.md warns explicitly: "Free tier — auto-pauses
after ~7 days of inactivity. If queries start timing out with
Connection terminated, check dashboard and resume." For a paid
product this is a "user can't log in for a day" risk.
**Recommended action:** **Fix immediately before paid launch** —
upgrade to Pro ($25/mo). Listed in CLAUDE.md as "Strongly recommend
Pro tier before launch."

### OBS-06 `supabase/functions/process-leagues` is cron-driven — no monitoring of "did the job actually run last week"

**Severity:** MEDIUM
**Category:** operational
**Recommended action:** **Fix on reboot** — store
`last_processed_at` in DB after each successful run, alert if > 8d.

---

## Fragile Areas

### FRAG-01 The "concurso_id in JSON" pattern (DI-08) is referenced in 7+ places — refactor must touch all of them

**Severity:** HIGH (covered by DI-08)
**Files:**
- `src/hooks/useAccess.ts:61`
- `src/hooks/useScopedDueCount.ts:15`
- `src/pages/FlashcardStudy/useStudySession.ts:163, 331`
- `src/pages/DashboardRouter.tsx:53`
- `src/pages/Questions.tsx:52`
- `src/pages/Concursos.tsx:50`
- `src/components/dashboard/widgets/RecentActivityWidget.tsx` (probably)
**Risk:** Any reboot change to data model needs to fix all 7 in
lockstep. Easy to leave one stale.

### FRAG-02 The Cowork content pipeline (parse-edital + admin/AdminImportar) is admin-only AI — flagged in CLAUDE.md as OK but undermines "Zero IA visível ao aluno"

**Severity:** LOW
**Category:** product-fit / docs-drift
**Evidence:** PRODUTO.md §5.1 explicitly carves out "primeira passada
de produção pode usar scripts" as Cowork-internal tooling. Both
`parse-edital` (Google Gemini for edital → disciplinas/tópicos
generation) and `parse-questions-bulk` (Gemini for raw text →
parsed questions) fall under this carve-out. They are admin-only
(`user_roles.role = 'admin'` check). Safe per PRODUTO.md but worth
documenting that GOOGLE_AI_API_KEY exposure in Supabase secrets is
intentional, not a leak.
**Recommended action:** **Accept** + document in operational runbook.

### FRAG-03 React Query QueryClient with `retry: 1` — single retry, every transient Supabase blip = user-visible error

**Severity:** LOW
**Category:** UX
**Location:** `src/App.tsx:65`
**Evidence:** `retry: 1` is more conservative than React Query's
default (3). With Supabase free tier (OBS-05) being flaky, users see
errors that would have cleared on retry.
**Recommended action:** **Fix on reboot** — bump to 2 or 3 retries
with exponential backoff once Sentry is wired to see what's actually
failing.

### FRAG-04 No retry / backoff for the `awardXp` upsert path → XP loss on transient errors

**Severity:** MEDIUM
**Category:** UX / data-integrity
**Location:** `src/hooks/useGamification.ts:191-198`
**Evidence:** Single `upsert(...)`. If Supabase is briefly down,
the optimistic `setState(buildState(newXp, newShields))` already ran
— UI shows the new XP — but the DB doesn't persist it. Next refresh
the XP is gone.
**Recommended action:** **Fix on reboot** — retry with backoff or
batch via a queue similar to `useReviewBatcher`.

### FRAG-05 `useReviewBatcher` localStorage backup — quota exhaustion silently swallowed

**Severity:** LOW
**Category:** bug
**Location:** `src/hooks/useReviewBatcher.ts:85-90`
**Evidence:** Quota errors caught silently. If a user studies
intensively on a device with full localStorage, reviews lost.
**Recommended action:** **Accept** — rare edge case.

---

## Scaling Limits

### SCALE-01 `Concursos.tsx` N+1 (PERF-01) hits a wall around 50 concursos

**Severity:** MEDIUM (covered by PERF-01)
**Limit:** ~50 concursos = ~100 queries on page render.
**Recommended action:** **Fix** with PERF-01 before multi-concurso
launch.

### SCALE-02 `useStudySession` pulls 10k flashcards × user progress rows — RAM cost grows linearly

**Severity:** MEDIUM (covered by PERF-02, PERF-03)
**Limit:** ~30k cards before noticeable slowdown.

### SCALE-03 Single-tab study assumption (no real-time progress sync between devices)

**Severity:** LOW
**Category:** product
**Evidence:** User who studies on phone + laptop in parallel will
get duplicate progress writes. `useReviewBatcher` will eventually
flush, last write wins.
**Recommended action:** **Accept** for launch; **Fix on reboot** —
Supabase Realtime subscription to `user_flashcard_progress`.

---

## Dependencies at Risk

### DEP-01 `@xyflow/react` v12 — pulled in but unclear if used anywhere

**Severity:** LOW
**Category:** tech-debt
**Location:** `package.json:50`
**Evidence:** `react-flow` library for diagrams. Grep for "xyflow"
or "react-flow" usage in `src/` returns no hits. Possibly dead.
**Recommended action:** **Drop** — `npm uninstall @xyflow/react`
+ `@dagrejs/dagre` if confirmed unused.

### DEP-02 `playwright` in devDependencies — no Playwright config / tests anywhere

**Severity:** LOW
**Category:** tech-debt
**Location:** `package.json:91`
**Evidence:** Pulled in but no `playwright.config.ts`, no
`*.spec.ts` files. Dead.
**Recommended action:** **Drop** — `npm uninstall playwright`.

### DEP-03 `ffmpeg-static` in devDependencies — used only by `scripts/record-criativo.mjs`

**Severity:** LOW
**Category:** tech-debt
**Location:** `package.json:88`
**Evidence:** Marketing creative script. Keep.
**Recommended action:** **Accept**.

### DEP-04 `html-to-image` — unclear usage

**Severity:** LOW
**Category:** tech-debt
**Location:** `package.json:58`
**Recommended action:** Verify and drop if unused.

### DEP-05 No lockfile policy in CI

**Severity:** LOW
**Category:** build-ci
**Evidence:** `.gitignore:37-38` bans `bun.lock`. Only npm allowed.
But no CI step verifies `package-lock.json` matches `package.json`.
**Recommended action:** **Fix on reboot** — `npm ci` in CI.

---

## Missing Critical Features

### MISS-01 No admin refund queue — refund_requests doesn't even save (SEC-10)

**Severity:** HIGH (covered by SEC-10, PAY-04)
**Blocks:** Legal CDC art. 49 compliance.

### MISS-02 No order/purchase history page for users

**Severity:** MEDIUM
**Category:** UX
**Evidence:** `purchases` table exists. No `/conta/historico` page
to show "Acesso comprado em DATE, válido até DATE, R$297". When a
user wonders "did my payment go through?" they have no in-app proof.
**Recommended action:** **Fix on reboot** — add `/conta` page.

### MISS-03 No invoice / fiscal note download

**Severity:** MEDIUM
**Category:** UX / legal
**Evidence:** Brazilian B2C ed-tech is typically expected to email
a Nota Fiscal. Asaas can do this if configured. No UI to download.
**Recommended action:** **Fix on reboot** — Asaas NF integration or
clear policy in Termos.tsx.

### MISS-04 No password reset rate limit notice / lockout

**Severity:** LOW
**Category:** security / UX
**Evidence:** Supabase has built-in rate limits but no UI feedback
when user hits them.
**Recommended action:** **Accept**.

### MISS-05 No data deletion (LGPD art. 18-VI) — user can't delete account

**Severity:** HIGH
**Category:** legal / privacy
**Evidence:** No `DELETE /account` flow. LGPD says user has right
to deletion within reasonable time. Currently no path.
**Recommended action:** **Fix immediately before paid launch** —
even a "email contato@flashcards.com.br with subject DELETE_ACCOUNT"
mention in Privacidade.tsx + a manual admin script. Long-term, a
self-service flow.

### MISS-06 No email verification enforcement after signup

**Severity:** MEDIUM
**Category:** security
**Location:** `src/pages/Signup.tsx:123` toast "Conta criada! Verifique seu email"
**Evidence:** Toast says verify email but `ProtectedRoute` doesn't
check `user.email_confirmed_at`. User can buy + study with an
unverified email — and if it was a typo, they lose access via
the password reset link going to a non-existent address.
**Recommended action:** **Fix** — `ProtectedRoute` adds
`if (!user.email_confirmed_at) navigate('/verify-email')`.

---

## Test Coverage Gaps

### TEST-01 ONE test file exists in entire codebase

**Severity:** CRITICAL
**Category:** tech-debt / data-integrity
**Location:** `src/pages/FlashcardStudy/useStudySession.test.ts` is
the only `.test.ts` in `src/`.
**Evidence:** Vitest is set up, has 1 test file covering queue
building. **Zero tests for:**
- Asaas webhook (the entire payment correctness path)
- `grant-access` edge function
- `useRatingHandler` (SRS persistence)
- `useReviewBatcher` (the localStorage recovery + batching)
- `useGamification` (XP race in DI-01)
- `useAccess` paywall logic
- `Checkout.tsx` 30s timeout + 409 race
- `srs.ts` FSRS-5 algorithm
- `useFocusTimer` (DI-02 drift issue)
- Any UI component
**Recommended action:** **Fix on reboot** — minimum test
plan:
1. **Critical-path units**: `srs.ts` (FSRS algorithm), `asaas-webhook`
   (grant + revoke), `useGamification.awardXp` (race), `useReviewBatcher`
   (batch + fallback)
2. **Integration**: payment flow (PIX → webhook → access granted),
   signup flow (signup → onboarding → checkout)
3. **E2E with Playwright** (already a dep): one happy-path test of
   the full purchase → first session lifecycle.

### TEST-02 No mock service worker / MSW setup — frontend tests must mock Supabase manually each time

**Severity:** MEDIUM
**Category:** tech-debt
**Evidence:** `useStudySession.test.ts` has 40 lines of inline
supabase mock. Not reusable. New tests will copy-paste.
**Recommended action:** **Fix on reboot** — adopt MSW (Mock Service
Worker) and centralize fixtures.

### TEST-03 No tests for `Reembolso.tsx` form (would have caught SEC-10)

**Severity:** HIGH
**Category:** tech-debt
**Evidence:** A single test asserting `await screen.findByText('Pedido recebido')`
AND `expect(mockSupabase.from).toHaveBeenCalledWith('refund_requests')`
plus a check that the DB call resolved would have surfaced SEC-10
in CI. None of this exists.
**Recommended action:** Tests should be required for any form
writing to a new table.

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 5 (TD-05, SEC-05, DI-01, SEC-10, TEST-01) |
| HIGH | 19 |
| MEDIUM | 18 |
| LOW | 30 |
| **Total** | **72** |

## Recommended Reboot Order

**Phase 1 — Compliance + Money Safety (week 1)**
SEC-10 (refund_requests missing) → PAY-04 (refund flow), UX-02 (Terms
"free plans"), SEC-07 (webhook idempotency), DI-01 (awardXp race),
TD-08 (landing copy lies), UX-01 (schema.org "caderno digital"),
MISS-05 (LGPD deletion).

**Phase 2 — Observability + Hardening (week 2)**
SEC-04 / SEC-05 / OBS-01-04 (Sentry + analytics), SEC-01 (HIBP),
OBS-05 (Supabase Pro), CI-01 / CI-04 (CI + strict TS).

**Phase 3 — Schema Cleanup (week 3)**
TD-01-15 zombie cleanup, DI-05/06/07 (content_item_id renames),
TD-04 (4 dead tables), TD-13 (study_logs slim), DI-09 (regen types).

**Phase 4 — Performance + UX (week 4+)**
PERF-01-08, UX-04/12, TD-07 / UX-08 (statistics fix), DI-02 (focus
timer drift), TEST-01 (test suite), TD-09 (PRF landing decision).

---

*Concerns audit: 2026-05-21*
