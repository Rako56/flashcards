# Pitfalls Research

**Domain:** BR concurso prep marketplace — paid SaaS (R$ 297/yr), multi-tenant via subdomain, Next.js 15 App Router + Supabase Pro + Asaas + Vercel
**Researched:** 2026-05-21
**Confidence:** HIGH (legacy concerns sourced from `.planning/codebase/CONCERNS.md`); HIGH on Next.js / Supabase / Asaas (Context7-equivalent official docs + verified WebSearch); MEDIUM on FSRS-5 / Brazilian-specific timezone gotchas (single canonical sources)

> **Reading the legacy.** This file leans heavily on the 72 documented concerns in `.planning/codebase/CONCERNS.md` (5 CRITICAL, 19 HIGH, 18 MEDIUM, 30 LOW) and the `CONVENTIONS.md` / `TESTING.md` gap audits. Every legacy concern marked CRITICAL gets an explicit prevention entry below, plus 40+ more pitfalls that ecosystem research surfaced even though the legacy never hit them yet.
>
> **How to use this.** During roadmap synthesis: pick one or more pitfalls per phase that the phase must *prevent*. Phase success criterion = "[pitfall] cannot recur because [prevention] is in place and verified". The "Pitfall-to-Phase Mapping" table at the bottom is the index.

---

## Critical Pitfalls

### Pitfall 1: "Documented but not enforced" conventions — the convention drift trap

**What goes wrong:**
A team writes `CLAUDE.md` / `CONTRIBUTING.md` that declares "we use React Hook Form + Zod for all forms", "TypeScript strict everywhere", "lint must pass before merge". Code then diverges silently because no automated gate verifies. After 6 months: the docs say one thing, the code does another. Legacy (`CONVENTIONS.md`): RHF + Zod listed as canonical, **zero usage** in code (dependencies installed but never imported outside the shadcn `form.tsx` primitive). Lint reports 435 problems with zero CI gate. The reboot will repeat this unless gates exist *before* the first feature commit.

**Why it happens:**
- Conventions are aspirational without enforcement; new contributors copy patterns from the code they see, not from docs they never read.
- No CI gate = "I'll fix it later" becomes "I forgot".
- Senior reviewers don't gatekeep on patterns when business pressure is high.

**How to avoid:**
1. **Gates before code.** Before *any* feature commit lands, set up: GitHub Actions running `npm run lint`, `npm run typecheck` (strict 100%), `npm run test`, branch protection blocking merge on failure.
2. **Pre-commit hook (lint-staged + Husky)** running ESLint + Prettier + typecheck on changed files. Slow ≠ skip — kills bad commits before push.
3. **ESLint rules with severity `error` for the things that matter:** `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars` (with `argsIgnorePattern: '^_'`), `react-hooks/exhaustive-deps`, `@typescript-eslint/no-unnecessary-type-assertion`. No `warn` for things that cause prod bugs — `warn` = "we lied about caring".
4. **CODEOWNERS** for `src/lib/{srs,access,payments}` and `supabase/migrations/**` — anything money/correctness-critical requires Rafael's review.
5. **Documentation lives next to code** as JSDoc; if a convention isn't in CI and isn't in the linter, it's not a convention.

**Warning signs:**
- Any PR merges with lint warnings.
- Any PR merges without a green CI badge.
- Reviewers approve with "fix in follow-up" instead of "fix this PR".
- `CLAUDE.md` mentions a library not in the last 30 days of `git log -- "*.tsx"` imports.

**Phase to address:**
**Phase 1 (Foundation).** Gates exist before commit 2. After commit 50 the cost to retrofit is 10x.

---

### Pitfall 2: TypeScript strict adopted "partially" → 30%-then-stalled

**What goes wrong:**
The legacy team enabled `strict: true` in a `tsconfig.strict.json` covering `src/lib/**`, `src/hooks/**`, `src/components/ui/**`, `src/types/**` — about 30% of source. The other 70% (pages, feature components, integrations) ran under `strict: false`. Result: **297 `no-explicit-any` errors, 166 `as any` casts, 136 `: any` annotations**. Type safety became theater. The reboot promises "TS strict 100%" — but if the team accepts the first `: any` ("just to ship"), the rest follow in 3 months.

**Why it happens:**
- Supabase generated types lag behind migrations → developer hits a type error → `as any` to ship → never regenerated.
- Pages-folder types are deep and intertwined with React state → strict-null adds 50 errors per page → "later".
- No lint rule blocks `any`, so it accumulates invisibly.

**How to avoid:**
1. **Single `tsconfig.json` with `strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true` from commit 1.** No `tsconfig.strict.json` parallel file. If strict fails CI, the PR doesn't merge.
2. **ESLint blocks `any` and `as any`:**
   ```js
   "@typescript-eslint/no-explicit-any": "error",
   "@typescript-eslint/no-unsafe-assignment": "error",
   "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as", objectLiteralTypeAssertions: "never" }]
   ```
3. **Auto-regenerate Supabase types in CI** on every migration. `supabase gen types typescript --project-id $PROD_REF > src/lib/supabase/database.types.ts`. Commit must include both the migration + the regenerated types. CI fails if `git diff` after `gen types` is non-empty.
4. **Escape hatch ONLY via `// eslint-disable-next-line ... -- REASON: ticket/PR link`.** Reviewer rejects without the reason. Quarterly count audit — if disabled lines grow >10%/quarter, retrospective.
5. **Generate Zod schemas from DB types** (e.g., `supazod` or hand-written wrappers) so the boundary input matches the row shape.

**Warning signs:**
- First `: any` cast in a PR; PR didn't block in CI.
- Supabase `as any` cast (legacy had `(supabase as any).from('admin_concursos')` — DI-09).
- "I'll fix the types later" appears in PR descriptions.
- `git grep -E ': any|as any' src/ | wc -l` exceeds 5.

**Phase to address:**
**Phase 1 (Foundation).** Make `: any` impossible to ship from commit 1.

---

### Pitfall 3: Webhook silent failure — "200 OK" on error path

**What goes wrong:**
The legacy `asaas-webhook` returned `{ received: true }` HTTP 200 even when the DB write to `user_concurso_access` failed. Asaas saw "OK", never retried. The paying user got no access. Support email arrives 2 hours later: "I paid, where is my access?". With no Sentry (`SEC-05` CRITICAL), the team only finds out via complaints. For a paid product, this is the **#1 trust-killer** — Rafael takes money but the product doesn't unlock.

**Why it happens:**
- Returning non-200 from a webhook handler "feels wrong" — devs default to 200 to avoid Asaas re-delivery spam.
- Without an alert pipeline, console.error in an edge function is invisible.
- Idempotency code is written for the happy path; the unhappy path leaks.

**How to avoid:**
1. **Return 500 on transient errors (DB down, network error, unexpected exception)** so Asaas retries. Asaas retry policy: exponential backoff for up to ~24h.
2. **Return 200 ONLY for:** (a) successful processing, (b) **definitively unrecoverable** payloads (malformed JSON, missing required fields, unknown event types we explicitly don't handle). Document each 200 case with a comment block.
3. **Wire Sentry/Logflare/Datadog from commit 1**, not Phase 2. Every `console.error` in an edge function becomes a Sentry capture with payload (PII-scrubbed: redact CPF, full email).
4. **Alert on the symptom, not the cause.** Slack/Discord/email alert if `purchases.created_at > NOW() - INTERVAL '1 hour'` count is **lower than expected** (or, if a `PAYMENT_RECEIVED` event arrived but the corresponding `user_concurso_access` write never landed within 60s). The DB is the source of truth — alert on the DB.
5. **Integration tests for the webhook against a local Supabase** + mock-Asaas signature. Cases: happy path, DB-down, idempotent re-delivery, signature mismatch, unknown event, payload schema drift. CI runs these. The legacy had **zero** webhook tests.
6. **Re-fetch the payment from Asaas** (`GET /payments/{id}`) inside the webhook to verify the event actually happened. Token alone is not a security boundary (legacy `SEC-08`).

**Warning signs:**
- "We return 200 to prevent retries" anywhere in webhook code.
- No `Sentry.captureException` in any edge function.
- A payment exists in `purchases` table but `user_concurso_access` does not, for the same `user_id × concurso_id`.
- The number of `purchases.PAYMENT_RECEIVED` events / day diverges from Asaas dashboard reporting.

**Phase to address:**
**Phase 2 (Payment Funnel).** Webhook is the heart of the funnel; it must be bulletproof before Asaas goes live.

---

### Pitfall 4: Non-atomic counter increment — read-modify-write race lost XP

**What goes wrong:**
Legacy `useGamification.awardXp` did: read existing total_xp → compute `currentXp + amount` → upsert. Two concurrent triggers (daily challenge + topic mastery + session-end) read the same N, compute N + their amount, both write. Second write wins, first amount **silently lost**. User sees the XP appear in optimistic UI then disappear on next page load. (Legacy `DI-01` HIGH; `FRAG-04` MEDIUM — no retry on upsert failure either.)

**Why it happens:**
- "Read row, compute, write row" feels natural in client code.
- Optimistic UI hides the bug — local state updates immediately, the DB reflects 1 minute later, by which time the user moved on.
- Postgres default isolation `READ COMMITTED` lets both transactions see the stale value.

**How to avoid:**
1. **Push the increment into a Postgres function (or single UPDATE) with atomic increment:**
   ```sql
   CREATE FUNCTION public.award_xp(p_user_id uuid, p_amount int)
   RETURNS user_gamification AS $$
     UPDATE public.user_gamification
        SET total_xp = total_xp + p_amount,
            updated_at = NOW()
      WHERE user_id = p_user_id
   RETURNING *;
   $$ LANGUAGE sql SECURITY DEFINER SET search_path = '';
   ```
   `UPDATE ... SET col = col + N` is **atomic at any isolation level** because Postgres acquires the row lock during the update.
2. **Call only via `supabase.rpc('award_xp', { p_user_id, p_amount })`.** Never read-then-write from client.
3. **Audit XP events table** (`xp_events { user_id, source, amount, idempotency_key, created_at }`) with **unique constraint on `(user_id, idempotency_key)`** so the same award can't double-count if the client re-fires.
4. **Tests** (legacy had zero):
   - Unit: `award_xp` is monotonic — calling it 10x with 10 each gives 100.
   - Concurrency: spawn 10 parallel calls from a test runner, assert final value is sum.
   - Idempotency: same `idempotency_key` twice → second is a no-op.

**Warning signs:**
- Any client-side `.select().then(... .upsert({ totalXp: current + amount }))` pattern.
- `UPDATE ... SET total_xp = $1 WHERE user_id = $2` (passing a computed value) instead of `total_xp = total_xp + $1`.
- User reports "XP went up then went back down".
- Daily challenges fired in parallel show different totals on refresh.

**Phase to address:**
**Phase 4 (Study Core).** XP/gamification ships with study session in Phase 4 — Postgres function must exist before first commit of `awardXp`.

---

### Pitfall 5: Tables that don't exist but the code thinks they do — silent legal exposure

**What goes wrong:**
Legacy `/reembolso` page wrote to a `refund_requests` table that **never had a migration**. Every form submission threw `relation does not exist`, but the UI showed success toast (`setSubmitted(true)` ran before the catch block). Months of refund requests vanished. CDC art. 49 (mandatory 7-day refund) violations because Rafael never received the requests. (Legacy `SEC-10` HIGH.) Same pattern: `mistake_notebook.content_item_id` NOT NULL but inserts pass an `admin_questoes.id` — type/schema drift silently corrupts data (`TD-05` CRITICAL).

**Why it happens:**
- DB types regenerated infrequently — `as any` cast lets a "ghost table" reference compile.
- Manual testing skips the error path — happy path shows success.
- No integration test exercises the full "form → DB → admin queue" loop.

**How to avoid:**
1. **Generated DB types are the contract.** Migration runs in CI → `supabase gen types typescript` runs → if types don't match committed `database.types.ts`, CI fails. Code that references `supabase.from('refund_requests')` *cannot compile* unless the migration that creates the table is merged.
2. **Integration test for every CDC/LGPD-touching path.** Refund request, account deletion, data export — each gets a Playwright test that simulates the user action and **reads the DB to verify the row exists**. Not just "did the UI show success".
3. **Forbid `as any` for `.from('...')` calls** via ESLint custom rule or `eslint-plugin-supabase` (or hand-rolled): `no-restricted-syntax` matching `CallExpression[callee.name='from'][arguments.0.type='TSAsExpression']`.
4. **Audit log for legal actions** — `legal_audit_log { id, user_id, action, payload, created_at }`. Every refund request, every account deletion, every data export gets a row. If `refund_requests` is broken, `legal_audit_log` catches the request anyway.
5. **Manual end-to-end smoke before each release**: open the staging URL, submit refund, check DB, check admin queue, check email. Cheap but catches Class-5 bugs.

**Warning signs:**
- Migration referenced in a comment but no file in `supabase/migrations/`.
- `(supabase as any).from('table_x')` in `git log` (TD-05 style — DI-09: 166 `as any` casts).
- UI says "Pedido recebido" but no `refund_requests`-equivalent rows for the past week.
- Customer support tickets mention "I asked for a refund and never heard back".

**Phase to address:**
**Phase 1 (Foundation)** for type-generation gate; **Phase 2 (Payment Funnel)** for refund integration test.

---

### Pitfall 6: Free-tier infrastructure on paid product

**What goes wrong:**
Legacy ran on **Supabase free tier** (`OBS-05` HIGH). Free tier auto-pauses projects after 7 days of inactivity. For a B2C paid product where a casual user might pay R$ 297 today and not log in for 10 days, **their next login times out** with `Connection terminated` errors. Rafael wakes up to 30 angry emails. Same applies to Vercel free, Resend free below scale, Sentry free below event volume.

**Why it happens:**
- Reboots happen pre-revenue; the team naturally picks free tiers.
- "We'll upgrade when we have users" — but the upgrade triggers project pause/migration that costs hours.
- Cost feels speculative; users feel real.

**How to avoid:**
1. **Provision Supabase Pro ($25/mo) before the first paid user.** Day zero of taking money = Pro plan.
2. **Vercel Hobby is fine for staging**; **Vercel Pro ($20/mo)** for prod (custom domain SSL, no anonymous deployments, analytics). Sentry Team ($26/mo) once volume justifies.
3. **Resource budget in `PROJECT.md`:** $50-100/mo infra is a normal opex for a paid product. Don't optimize this in V1.
4. **Backups + point-in-time recovery (PITR)** are Pro-tier features. Without them, a `DELETE FROM users WHERE id = 'x'` accident is permanent. Enable PITR with 7-day retention minimum.
5. **Monitor auto-pause flag.** Pro doesn't auto-pause, but cron a daily `supabase projects list --output json` and alert if `status != 'ACTIVE_HEALTHY'`.

**Warning signs:**
- `Connection terminated` errors in logs.
- Email from Supabase: "Your project will auto-pause".
- "Why is the dashboard slow?" — free tier shares compute.
- Customer reports first login of the week fails.

**Phase to address:**
**Phase 0 (Pre-foundation).** Provision Pro tiers before first migration runs.

---

### Pitfall 7: SRS algorithm bug — "cards repetindo na mesma seção"

**What goes wrong:**
Rafael's stated #1 pain (`PROJECT.md`): "os flashcards ficavam se repetindo sempre na mesma seção, o Claude nunca conseguia resolver isso." The legacy `buildStudyQueue` had a deterministic bug: cards from one disciplina cluster appearing consecutively because the round-robin interleaving was wrong (or absent). Symptoms: user studies for 30 minutes, sees Constitucional → Constitucional → Constitucional → Constitucional, never the promised interleaving. SRS reviews drift to the wrong intervals because the user fatigues on one disciplina, rates Errei when they actually understood. **This is the product.** If SRS is wrong, R$ 297 is theft.

**Why it happens:**
- FSRS-5 has 19 weight parameters; getting them right requires *test data* not just *unit tests*.
- Queue interleaving (round-robin by disciplina without starving any disciplina) is a separate problem from FSRS scheduling. Legacy mixed them.
- Date math + timezone (`America/Sao_Paulo`, UTC-3 year-round since 2019) errors push cards in/out of "due" by ±24h.
- Random shuffle without a stable seed → reload re-shuffles → user sees a different order, can't trust the system.

**How to avoid:**
1. **Separate concerns. Three pure functions:**
   - `scheduleCard(card, rating, now)` → returns new `due_at` (FSRS-5 math, no DB).
   - `selectDueCards(allCards, now, limits)` → returns the set of cards due to study right now (filter by `due_at <= now`).
   - `interleaveQueue(dueCards, seed)` → returns ordered queue with round-robin by disciplina and stable randomization by `seed = userId + dateInBrtMidnight + sessionId`.
2. **Property-based tests** (fast-check) for `scheduleCard`:
   - Rating Easy on a new card → `due_at` is *strictly later* than rating Hard.
   - The FSRS-5 invariants from the official spec (stability monotonically increases under correct reviews).
   - Idempotency: scheduling the same (card, rating, time) twice gives the same result.
3. **Property-based tests** for `interleaveQueue`:
   - Output length = input length.
   - For any two consecutive cards `a, b` where 3+ disciplinas exist with due cards, `a.discipline != b.discipline`. (Round-robin invariant.)
   - Stable: same `(cards, seed)` → same order.
4. **Timezone discipline.** All `due_at` stored as `timestamptz` in DB. Client computes "is this due *today* in BRT" with `toZonedTime(dueAt, 'America/Sao_Paulo')` (date-fns-tz) and a stable "BRT midnight" calculation. **Never** `new Date().toISOString().split('T')[0]` because that returns UTC date.
5. **Stable seed:** `seed = sha256(userId + brtDateString + (sessionId ?? '0'))`. Reload = same seed = same order. Different day = different seed. Manual "shuffle" button generates a new sessionId.
6. **Manual QA fixture:** Cowork uploads a "test concurso" with 200 cards across 8 disciplinas; the dev script runs `interleaveQueue` and checks no disciplina appears 3 times in a row in the first 50 cards.

**Warning signs:**
- User feedback "vi 5 cards de Português seguidos."
- `scheduleCard` test that's "skipped" or "todo".
- Any `Math.random()` in queue ordering (instead of seeded PRNG).
- `due_at` stored as `text` or `date` (must be `timestamptz`).
- The phrase "FSRS é difícil de testar" anywhere in code comments.

**Phase to address:**
**Phase 4 (Study Core).** Three pure functions with property tests *before* any UI calls them. Legacy bug is the central reason Rafael trusts none of the legacy code.

---

### Pitfall 8: Test coverage gates that never gate anything (CI theater)

**What goes wrong:**
Legacy: **1 test file for 190 source files (~0.5%).** The single test had `1 of 4 cases failing` on `main`. `npm test` exited red, nobody noticed because there was no CI. The reboot promises ≥50% core coverage but **without an actual numeric threshold blocking PRs, the 50% target erodes to 20% in 90 days** (this is the law of every coverage promise without a gate).

**Why it happens:**
- Tests are the first thing cut under deadline pressure.
- "We'll write tests in Phase 2" — Phase 2 has its own pressure.
- Test files require fixtures; fixtures require effort; effort is invisible to product manager.

**How to avoid:**
1. **`@vitest/coverage-v8` installed and configured from day 1.**
   ```js
   // vitest.config.ts
   test: {
     coverage: {
       provider: 'v8',
       thresholds: {
         lines: 50, functions: 50, branches: 50, statements: 50,
         // Per-file overrides for the critical core:
         'src/lib/srs/**': { lines: 90, branches: 85 },
         'src/lib/queue/**': { lines: 90, branches: 85 },
         'src/lib/access/**': { lines: 80, branches: 75 },
         'src/lib/webhook/**': { lines: 85, branches: 80 },
       }
     }
   }
   ```
2. **CI runs `vitest run --coverage` and exits non-zero if thresholds fail.** No "I'll add tests later" — PR doesn't merge.
3. **Per-module thresholds for the money paths** (90% on SRS, queue, webhook handler, paywall guard, CPF validator) higher than global.
4. **Edge functions get their own test runner.** `deno test supabase/functions/asaas-webhook/test.ts` runs in CI. Mock fetch to simulate Asaas re-fetch.
5. **Mutation testing once per quarter** with Stryker/Mutest to verify the tests are doing real work, not just executing lines.

**Warning signs:**
- Coverage threshold = 0.
- `vitest run` not in CI.
- A test file with `.skip` or `.todo` that's been there >2 weeks.
- A single test in a `describe` for a 200-line module.

**Phase to address:**
**Phase 1 (Foundation).** Coverage gates exist before the first feature test. Then every phase ships with the tests it needs.

---

### Pitfall 9: Hydration mismatches from Supabase Auth cookies in App Router

**What goes wrong:**
Next.js App Router renders Server Components with cookies on the server, then sends HTML + serialized RSC to the client. If the client's auth state (from a parallel client-side fetch) differs from what the server rendered (because the access token refreshed in a race), React throws "hydration mismatch" warnings and the UI flickers between authed/unauthed UI. Worse: with `@supabase/ssr`, mishandling the cookie chain (missing `getAll`/`setAll`, or not propagating `Set-Cookie` from middleware) causes the user to be logged out on every refresh.

**Why it happens:**
- `@supabase/ssr` requires specific cookie passing patterns; copy-pasting old `@supabase/auth-helpers-nextjs` examples is wrong.
- Middleware refreshes the token but the Server Component reads it before the refresh propagates.
- Server Components and Client Components both build a Supabase client — but with different cookie state.

**How to avoid:**
1. **Single source of truth for Supabase clients:**
   - `src/lib/supabase/server.ts` — `createServerClient` for RSC + Server Actions + Route Handlers (using `cookies()` from `next/headers`).
   - `src/lib/supabase/client.ts` — `createBrowserClient` for Client Components only.
   - `src/lib/supabase/middleware.ts` — `updateSession` that re-issues cookies in middleware.
   - **No Supabase client constructed inline anywhere else.**
2. **Middleware MUST call `supabase.auth.getUser()` and propagate `Set-Cookie` to the response** (see Supabase official `@supabase/ssr` docs). Skipping this is the #1 cause of "logged out on refresh".
3. **Never read auth state in Server Component then re-read in Client Component for the same render** — pass user as a prop. This avoids divergence.
4. **`suppressHydrationWarning` is a smell, not a fix.** Investigate the divergence.
5. **Test login persistence across navigation** (Playwright): login → navigate to /dashboard → reload → expect still authed.

**Warning signs:**
- "Hydration failed because the initial UI does not match" in browser console.
- Login works on first load but user is logged out after a soft navigation.
- `document.cookie` shows Supabase tokens, but server-side `cookies().get('sb-...')` returns undefined.
- Sentry sees `AuthApiError: invalid refresh token` spikes after deploy.

**Phase to address:**
**Phase 1 (Foundation)** for the canonical Supabase client setup; **Phase 3 (Auth + Onboarding)** for full session test coverage.

---

### Pitfall 10: Pivot leftovers accumulating as zombie code

**What goes wrong:**
Legacy had 4 pivots (Lovable → Vite, AI-gen → curated, Tiptap → cadernos, Stripe → Asaas). Each left:
- **12 zombie edge functions** still deployed (Stripe, AI generation).
- **4 zombie tables** in DB + Tiptap `user_notes` + bucket `notebook-media` (PENDENCIAS §1-4).
- **Landing copy advertising features that no longer exist** ("Caderno digital", "chat IA integrado" — TD-08 HIGH; UX-01 HIGH).
- **Terms of service referencing "planos gratuitos"** when there's no free tier (UX-02 HIGH).
- 187 lines of `src/lib/ecosystem.ts` typing dead routes nobody calls (TD-10).

The pattern: each pivot was "ship the new thing", never "delete the old thing". After 4 pivots, the codebase is mostly old things.

**Why it happens:**
- Deletion feels risky; addition feels productive.
- "What if we need it later?" — answer: git history exists.
- New routes don't crash with old routes still present, so the bug is invisible.

**How to avoid:**
1. **Pivot = delete-first PR + add-second PR.** Two separate commits. The deletion PR has its own review; doesn't merge unless reviewer confirms the rip-out is total. Add CODEOWNERS for `supabase/migrations/**` and `src/app/(marketing)/**` so a deletion review is mandatory.
2. **Dead-code linting:**
   - `ts-prune` weekly in CI (or `knip`) → flags unused exports.
   - ESLint rule `no-restricted-imports` blocks imports from "deprecated/" folder if it exists (rename to `deprecated/` while planning removal).
3. **DB cleanup migration cadence:** every quarter, run a "schema audit" — find tables with 0 rows + 0 query references in the last 30 days → schedule drop.
4. **Landing/Terms/Privacy pages are part of the product surface.** They live in `src/app/(marketing)/**` with CODEOWNERS = legal/product. Changing the product without updating these is a PR blocker.
5. **No "kill switch" feature flags older than 90 days.** Flags rot; either remove the flag or commit to the path.

**Warning signs:**
- `supabase functions list` returns more functions than `ls supabase/functions/`.
- A table in `database.types.ts` has zero `git grep` references in `src/`.
- Terms of service or Landing references a feature not in `PROJECT.md` Active section.
- A migration in `git` creates a table dropped by a later migration → squash candidates that didn't get squashed.

**Phase to address:**
**Phase 0/1 (Foundation).** Set up `knip` and CODEOWNERS day one. The reboot is greenfield, so prevention here is *not letting zombies appear* in the first place.

---

### Pitfall 11: Postgres RLS bypass via misuse of `service_role` key

**What goes wrong:**
The `service_role` key in Supabase bypasses **all** RLS. If it's accidentally exposed in: (a) a Server Component that gets bundled to client, (b) an environment variable served from `.env` to the browser, (c) a logging statement that ships to Sentry, (d) a poorly-scoped admin RPC — any user can read/write any row. CVE-2025-48757 affected 170+ Lovable-generated apps for exactly this reason.

**Why it happens:**
- `service_role` is convenient for admin scripts and edge functions; devs put it in `.env` next to anon key.
- "Server only" is enforced by convention, not by structure — easy to import a server module from a client one.
- AI-coding assistants with `service_role` access have been documented to leak data via prompt injection.

**How to avoid:**
1. **Three keys, three places:**
   - **`anon` (publishable)** — `NEXT_PUBLIC_SUPABASE_ANON_KEY`, in client bundle, RLS-protected.
   - **`service_role`** — Vercel env (server-only, not `NEXT_PUBLIC_*`), accessible only in Route Handlers and edge functions. **Never** in any file under `app/` that doesn't import `'server-only'`.
   - **No third key.** No "admin key" hand-rolled.
2. **`'server-only'` package** at the top of every module that uses `service_role`. Bundler errors if a Client Component imports it.
3. **Edge functions store `service_role` in Supabase secrets**, never in code or env vars committed to git.
4. **Audit before every release:** `grep -r SUPABASE_SERVICE_ROLE_KEY src/` should only match `src/lib/supabase/admin.ts` (or equivalent). Any other match = security incident.
5. **RLS test for every table.** Migration adds a test that asserts: anon can't SELECT, authenticated user X can only SELECT rows where `user_id = auth.uid()`, service_role can do everything. Use `pgTAP` or Supabase's `supabase test db`.

**Warning signs:**
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` anywhere (the prefix means it ships to client).
- `service_role` key used in any function in `src/app/(public)/**`.
- A Sentry breadcrumb shows the service_role key value (PII leak).
- A new table without an RLS policy (Supabase advisor flags this).

**Phase to address:**
**Phase 1 (Foundation).** Three-key separation must be in place before any RLS table exists.

---

### Pitfall 12: Server time vs client time for the simulado timer

**What goes wrong:**
A 5-hour simulado with 70 questions. Client computes time remaining from `Date.now() - startedAt`. User opens dev tools, sets system clock back 2 hours, gets "infinite time". Or browser tab in background freezes the JS timer (DI-02 in legacy: `setInterval` drift in `useFocusTimer`), user sees timer paused but server still ticking → mismatch.

**Why it happens:**
- Client-side timers are the easy default.
- Trust user not to cheat in solo studying — but simulado scores are *compared to other users* (SIM-04 in PROJECT.md), so cheating matters.
- Browser background-tab throttling is invisible until a user complains.

**How to avoid:**
1. **Server is authoritative.** Simulado start writes `simulado_attempt { id, user_id, started_at: NOW(), expires_at: NOW() + INTERVAL '5 hours', ... }`. Client computes remaining from `expires_at` it fetches on start.
2. **Client recomputes on every focus + every navigation** by hitting `GET /api/simulado/{id}/state` → `{ remaining_seconds, server_now }`. Reduces drift to <500ms.
3. **Server-side reject on submit** if `NOW() > expires_at + tolerance_seconds`. Tolerance = 30s for network grace.
4. **`Date.now()` is forbidden in any code path that decides expiry.** Use `serverNow` shipped from the API. Use `performance.now()` for UI countdown smoothness only.
5. **WAL pattern** for simulado: client posts answer events to a buffered endpoint; server appends to log; on submit, server reconstructs the score. Reload → recover from log. No data loss.

**Warning signs:**
- `setInterval(updateTimer, 1000)` is the only timer in code.
- Submission accepted with no server-side time check.
- Two browser tabs both running the same simulado, both submit different answers.
- `Date.now()` used to compute "is this still valid".

**Phase to address:**
**Phase 5 (Simulado).** Server-side time enforcement before any UI ships.

---

### Pitfall 13: Cookie domain misconfiguration for multi-subdomain auth

**What goes wrong:**
Multi-concurso means cookies for `flashcards.com.br`, `app.flashcards.com.br`, `tjsp.flashcards.com.br`, `pf.flashcards.com.br`, `admin.flashcards.com.br`. If the auth cookie is scoped to `app.flashcards.com.br`, then navigating to `tjsp.flashcards.com.br` looks like a fresh visitor → login screen. If scoped to `.flashcards.com.br` without `SameSite=None; Secure`, modern browsers strip it on cross-subdomain navigation. Wrong setup = users login 5 times, churn.

**Why it happens:**
- `@supabase/ssr` doesn't know about your custom domain structure; default cookie setup is host-scoped.
- Browser cookie behavior changed multiple times since 2020 (`SameSite=Lax` default, Chrome 3PCD, Safari ITP).
- Apex (`flashcards.com.br`) + wildcard (`*.flashcards.com.br`) interaction on Vercel SSL is non-obvious.

**How to avoid:**
1. **Set cookie domain explicitly** in `@supabase/ssr` config:
   ```ts
   createServerClient(url, anonKey, {
     cookies: { /* getAll/setAll */ },
     cookieOptions: {
       domain: process.env.NODE_ENV === 'production' ? '.flashcards.com.br' : undefined,
       sameSite: 'lax', // 'none' if you need cross-site, then secure: true
       secure: true,
       path: '/',
     }
   })
   ```
2. **Use a custom domain on Vercel for `*.flashcards.com.br`** (wildcard SSL auto-provisioned). Apex `flashcards.com.br` added as a separate domain. Verify both are HTTPS.
3. **Test cookie domain in Playwright:** login on `app.flashcards.com.br`, navigate to `tjsp.flashcards.com.br`, expect to still be logged in.
4. **`admin.flashcards.com.br` should NOT share cookies with public subdomains.** Different cookie name (e.g., `sb-admin-...`) or different Supabase project. Otherwise an admin who signs out of `/admin` is also logged out of the alunos area, which is fine, but a regular user with a path-traversal XSS could capture the admin's cookie.
5. **CORS: prefer same-origin calls.** Don't fetch from `tjsp.flashcards.com.br` to `api.flashcards.com.br`; let `tjsp.flashcards.com.br/api/...` proxy server-side. Avoids CORS preflight + cookie domain edge cases.

**Warning signs:**
- User logs in on subdomain A, navigates to subdomain B, sees login screen again.
- Safari users complain more than Chrome users about being logged out.
- `document.cookie` in browser dev tools shows `Domain=app.flashcards.com.br` instead of `.flashcards.com.br`.
- Vercel custom domain dashboard shows the wildcard with "no SSL".

**Phase to address:**
**Phase 1 (Foundation)** for the cookie-domain decision + middleware config; **Phase 2 (Multi-Concurso)** for wildcard SSL provisioning.

---

### Pitfall 14: Asaas webhook idempotency wrong — duplicate access grants extending expires_at

**What goes wrong:**
Legacy `SEC-07`: webhook upserts `user_concurso_access` with `expires_at = NOW() + INTERVAL '365 days'` on every `PAYMENT_RECEIVED`. Asaas retries on network blips. Same payment delivered 3 times → `expires_at` extended 3 years. Or `PAYMENT_RECEIVED` + `PAYMENT_CONFIRMED` for the same `paymentId` → 2 years.

**Why it happens:**
- Idempotency feels like "the same event arrives twice, write the same row" — true if the row write is itself idempotent.
- `expires_at = NOW() + 365d` is not deterministic; `expires_at = paid_at + 365d` (computed from the immutable payment) is.

**How to avoid:**
1. **Use Asaas event id as the idempotency key.** Asaas guarantees unique `id` per event. Store `webhook_events { id PRIMARY KEY, payload jsonb, processed_at }` — primary key prevents duplicate insert. Only process if insert succeeds.
2. **Deterministic `expires_at`:** computed from immutable input (`paid_at`), not from `NOW()`. If reprocessed, same value.
3. **Re-fetch the payment from Asaas** (`GET /v3/payments/{id}`) to confirm status before granting. Token alone is insufficient (legacy `SEC-08`).
4. **For multi-event flows** (`PAYMENT_CONFIRMED` → later `PAYMENT_RECEIVED`), treat the **payment id** as the access key, not the event id. Access granted ONCE per payment.
5. **Test:** fire the same event 10× → final state identical to firing it once. (Legacy had zero webhook tests.)

**Warning signs:**
- A user has `expires_at > granted_at + 365 days` (>1 year).
- The `purchases` table has multiple rows for the same `asaas_payment_id`.
- Asaas dashboard shows the same payment delivered 3 times in 60 seconds.

**Phase to address:**
**Phase 2 (Payment Funnel).** Idempotency + re-fetch in the same PR as the webhook handler.

---

### Pitfall 15: Schema drift creates "looks done but broken" UI

**What goes wrong:**
Legacy `TD-07`: `useStatistics` returns hardcoded `topicsCompleted: 0, topicsTotal: 0` after the legacy `topics` table was dropped. UI shows "0/0 Tópicos" forever. The Statistics page *looks* like it works — no errors thrown, no toast — but every user sees `0/0` and the team didn't notice for weeks.

Same family: `UX-08` (statistics broken), `UX-04` (Settings UI says "novos decks" when decks no longer exist), `MarqueeStrip` advertising "Caderno digital" (TD-08).

**Why it happens:**
- A schema migration drops a table → frontend hardcodes empty arrays as a workaround → workaround becomes permanent.
- No visual regression test catches "the page renders but shows zeroes".
- Stakeholders don't notice because they're not power users of every screen.

**How to avoid:**
1. **Visual regression tests** for every authenticated page. Playwright + `playwright-test-snapshot` for screenshot comparison on PRs. If "0/0 Tópicos" appears in a snapshot where the fixture has 100 cards completed, CI fails.
2. **Smoke test per page** that asserts non-empty data. E.g., `/statistics` test seeds 10 cards, completes 5, expects "5/10".
3. **"Empty state" vs "broken state" distinction.** Empty state = "you haven't studied yet, here's the call to action" (explicit). Broken state = "this number should be non-zero but is zero" (latent bug). Empty state is a designed component; broken state is an absence.
4. **Code review for migrations**: when dropping a column/table, grep for all consumers and update in the same PR. CODEOWNERS for `src/integrations/supabase/types.ts` so regeneration mismatches catch attention.

**Warning signs:**
- Hardcoded `0`, `[]`, or `'N/A'` returns in a hook that used to return real data.
- "Mock the response" comments in production code.
- A page that renders successfully with zero queries (because the queries got removed but the page didn't).

**Phase to address:**
**Phase 6 (Polish)** for visual regression infrastructure; ongoing review pattern from Phase 1.

---

### Pitfall 16: Bundle size balloon — Recharts, Framer Motion, shadcn

**What goes wrong:**
Legacy: `vendor-charts 404 KB`, `vendor-ui 236 KB`, `index 412 KB` → ~1 MB JS on landing (`PERF-07`). Recharts only used in `/statistics` but bundled with marketing landing because `manualChunks` in vite.config grouped everything upfront. Mobile LCP on 3G: 6+ seconds. Conversion drops.

**Why it happens:**
- shadcn/ui is opinionated about Radix primitives; importing one means tree-shaking Radix transitively.
- Framer Motion is one big package; importing `<motion.div>` brings the whole engine.
- Recharts is heavy by design (SVG + math).
- "Configure manual chunks" advice from old Vite blogs creates the opposite of the intent.

**How to avoid:**
1. **Default Next.js code-splitting is correct.** Don't `manualChunks` unless you have a measured bottleneck. Let the bundler split per route.
2. **Lazy import heavy components on heavy pages:**
   ```tsx
   const Chart = dynamic(() => import('@/components/Chart'), { ssr: false });
   ```
   Only `/statistics`, `/admin/metricas` pages load Recharts.
3. **`framer-motion` → consider `motion/react` (the slim core) or use CSS transitions for landing** where animation is cosmetic. Save Framer for the in-product micro-interactions.
4. **shadcn primitives are tree-shakable** if imported individually (`import { Button } from '@/components/ui/button'`). Avoid barrel imports (`import { Button, Card, Dialog } from '@/components/ui'`) — those defeat tree-shaking with Vite's older split logic.
5. **`@next/bundle-analyzer` in CI** as a non-blocking comment on PRs. Surface bundle deltas per route.
6. **Performance budget per route:** Landing < 150 KB JS gzipped. App pages < 250 KB. Set thresholds, fail CI if exceeded.

**Warning signs:**
- Landing page LCP > 2.5s on a 3G Lighthouse audit.
- A single chunk over 300 KB gzipped.
- `vendor-*.js` chunks in production build (you've manualChunked things back into giant blobs).
- A non-statistics page imports `recharts`.

**Phase to address:**
**Phase 1 (Foundation)** for bundle analyzer + performance budget; **Phase 6 (Polish)** for ongoing measurement.

---

### Pitfall 17: Account deletion that doesn't actually delete (LGPD violation)

**What goes wrong:**
Legacy `MISS-05` HIGH: no DELETE /account flow at all. LGPD art. 18-VI: user has right to deletion within reasonable time. Common mistake: implement deletion as a soft-delete (set `deleted_at`) and forget the hard-delete pipeline → user's data sits in DB forever, indexed by analytics, restorable. Worse: cascade chains miss `srs_reviews`, `simulado_attempts`, `purchases.user_id` → orphan data with PII (CPF, full_name, phone).

**Why it happens:**
- "Real delete" feels scary (no recovery if user changes mind).
- Cascade chains are easy to miss when tables grow.
- The team has 1 day to ship; they `UPDATE users SET email = NULL` instead of cascading.
- Supabase auth has its own `auth.users` table — deleting from `public.user_profiles` doesn't delete from `auth.users` unless you use `supabase.auth.admin.deleteUser()`.

**How to avoid:**
1. **Two-stage deletion:**
   - Stage 1: User requests → status `pending_deletion` + 30-day grace period (so user can reverse). Email confirmation.
   - Stage 2: Cron job runs `delete_user_completely(user_id)` Postgres function that: cascades `public` schema → calls `auth.admin.deleteUser` for `auth.users` → wipes Sentry / PostHog / email lists (Resend audience).
2. **Test the deletion path.** Playwright: signup → delete account → 30 days later (mock cron) → expect zero rows in all PII-bearing tables.
3. **Audit log** (`legal_audit_log`) of the deletion request + completion, retained as required (LGPD doesn't explicitly mandate retention period for deletion records, but courts will look for proof you complied).
4. **Backups: PITR retention is an LGPD nuance.** A user's data deleted today still exists in backups from yesterday. Document this in the privacy policy (it's allowed if disclosed). Practical: PITR retention is 7 days on Supabase Pro by default; user deletion is "completed" after that grace period.
5. **External services**: Resend audience, PostHog person, Sentry user — each needs an API call to delete. Write a `cascadeExternalDeletion(userId, email)` that's tested.

**Warning signs:**
- `DELETE /account` endpoint does only `UPDATE users SET deleted_at = NOW()`.
- `srs_reviews` and `simulado_attempts` for a "deleted" user still queryable.
- `auth.users` still has the row.
- Resend dashboard shows "deleted" user's email still subscribed.

**Phase to address:**
**Phase 3 (Auth + Onboarding)** for the delete endpoint + Postgres function; **Phase 6 (Polish)** for external-service cascading.

---

### Pitfall 18: Middleware running on Edge Runtime tries to use Node APIs

**What goes wrong:**
Next.js 15 `middleware.ts` runs on **Edge Runtime** (V8 isolates, not Node). Common mistakes: importing `crypto`, `fs`, `path`, `bcrypt`, large npm packages with Node deps. Build fails or runtime errors only in production. Or worse: build passes because middleware is small but a transitive dep breaks at runtime.

**Why it happens:**
- Edge Runtime restrictions are documented but not enforced by TypeScript.
- A "shared util" file imports Supabase client config that imports a Node-only library.
- "It works in dev" — Vercel's dev server is less strict than the Edge Runtime sandbox.

**How to avoid:**
1. **Middleware does ONE thing: refresh Supabase session, set cookies, rewrite request based on subdomain.** That's it. No DB queries, no heavy crypto, no third-party SDKs.
2. **Use `runtime = 'edge'` in `middleware.ts` and confirm size budget**: Edge functions max 1 MB. `next build` warns; CI fails on warning.
3. **`@supabase/ssr` is edge-compatible**; don't import from `@supabase/supabase-js` directly in middleware (older versions had Node deps).
4. **Test middleware logic in isolation.** `vitest` with a mocked `NextRequest`/`NextResponse`. Cases: each subdomain → expected rewrite + cookie set.
5. **No `process.env` access for secrets in middleware** — middleware should only read public env vars (anon key, base URL).

**Warning signs:**
- `Build error: Module not found: Can't resolve 'fs'` in middleware.
- `next build` output: "Middleware size 1.2 MB (over budget)".
- Middleware imports anything from `node:*`.
- Middleware does a DB query.

**Phase to address:**
**Phase 1 (Foundation)** for the middleware skeleton; **Phase 2 (Multi-Concurso)** for the subdomain rewrites.

---

### Pitfall 19: Supabase connection exhaustion in serverless

**What goes wrong:**
Vercel serverless functions don't maintain persistent DB connections. Every invocation opens a new connection to Postgres. Postgres on Supabase Pro Compute Add-On Micro has ~60 max connections. Under load (100 concurrent users on Concursos.tsx page render = 100 fn invocations × ~3 queries each), connections exhaust → `Connection terminated` errors → users see 500s.

**Why it happens:**
- Devs default to the direct connection string (port 5432) — works in dev with 1 client, fails in serverless.
- "We'll add pooling later" — never gets added until prod fires.
- Supabase has two pooler modes (transaction port 6543, session port 5432) with subtle differences; choosing wrong silently breaks prepared statements.

**How to avoid:**
1. **Use Supabase's pooler URL (port 6543, transaction mode) for ALL serverless calls.**
   ```
   postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   This is what Supabase client SDK uses by default. Don't override.
2. **Disable prepared statements in your DB client** if you write any direct Postgres queries (transaction-mode pooler doesn't support them):
   - Drizzle: `{ prepare: false }`.
   - Kysely with pg: `prepare: false`.
3. **For migrations + admin scripts**, use the direct connection (port 5432, session mode). Migrations need transactions across multiple statements.
4. **Monitor active connections.** Supabase Dashboard → Database → Connection pool. Alert if usage > 80%.
5. **N+1 query patterns** worsen exhaustion. Legacy `Concursos.tsx` (PERF-01) had 2 queries per concurso × 10 concursos = 21 queries. Single RPC fixes this.

**Warning signs:**
- `Connection terminated` in production logs.
- `remaining connection slots are reserved for non-replication superuser connections` Postgres error.
- Latency spikes correlated with traffic spikes.
- Connection pool dashboard at 90%+ utilization.

**Phase to address:**
**Phase 1 (Foundation)** for pooler URL setup; **Phase 6 (Polish)** for N+1 elimination.

---

### Pitfall 20: PIX vs boleto vs cartão UX differences ignored

**What goes wrong:**
PIX confirms in seconds. Boleto can take **3 business days** for the bank to settle. Cartão usually instant but can be held for fraud check. Legacy `Checkout.tsx` polls every 3s indefinitely (PAY-02) — works for PIX, useless for boleto (user gives up before 3 days). User pays boleto, comes back day 2, sees no access, panics, asks for refund, double-pays via PIX, complaint storm.

**Why it happens:**
- Devs test in sandbox with instant confirmation.
- "Pagamento confirmado" UX assumes synchronous flow.
- No email confirmation when the boleto is generated vs when it's paid.

**How to avoid:**
1. **Different post-checkout states per billing type:**
   - **PIX**: "Aguardando pagamento — quase instantâneo" + QR code + polling for 5 min, then "Atualize a página" CTA.
   - **Boleto**: "Boleto gerado. Pode levar até 3 dias úteis. Vamos avisar por email." + boleto download + **stop polling**, rely on email.
   - **Cartão**: "Processando..." → instant success or failure.
2. **Email at every state transition** (Resend):
   - Boleto generated → email with PDF + due date.
   - Payment confirmed → email "Acesso liberado".
   - Boleto overdue → email "Pagamento não recebido".
3. **`/conta/historico` page** showing all purchases with status — user has a place to check (legacy `MISS-02`).
4. **In-app banner** if user has any `pending` purchase → "Você tem um boleto pendente, vence em DD/MM".

**Warning signs:**
- Single checkout component with one polling loop, no per-billing-type branching.
- "Pagamento confirmado" toast for a boleto that was just generated (not paid).
- No email when boleto is created.
- Support tickets: "paguei o boleto mas não tenho acesso" (because user paid via boleto and Asaas hasn't sent webhook yet).

**Phase to address:**
**Phase 2 (Payment Funnel).** Each billing type needs its own UX path.

---

### Pitfall 21: Subdomain SEO — Google treats them as separate sites

**What goes wrong:**
PROJECT.md decides: `<concurso>.flashcards.com.br` per concurso for SEO long-tail. Google treats subdomains as separate sites for ranking purposes. **Link equity from `flashcards.com.br` does not automatically transfer.** Each subdomain has to earn its own backlinks. Without cross-linking discipline, `tjsp.flashcards.com.br` starts at zero authority while `flashcards.com.br` has whatever the team built. Subfolders (`flashcards.com.br/tjsp/`) would have shared link equity.

**Why it happens:**
- "Subdomain is technically cleaner" (separate Next.js deploys, separate themes) trumps SEO consideration.
- Decisions made by engineering, not by SEO.
- Google's official line is "we treat them equally" but real-world data (Backlinko's 11.8M result analysis) shows subdirectories rank faster.

**How to avoid:**
1. **Decision is locked, but execute SEO defensively:**
   - **Hub-and-spoke linking:** every concurso landing links back to `flashcards.com.br` (hub) in header/footer.
   - **`flashcards.com.br` aggregates** concursos with links to each subdomain (anchor text = "Flashcards TJSP Escrevente", etc.) — passes link juice down.
   - **Cross-subdomain canonicals** when content overlaps (e.g., shared FAQ).
2. **Sitemap per subdomain + master sitemap** at `flashcards.com.br/sitemap.xml` listing all subdomain sitemaps as `<sitemap>` children. Submit to Google Search Console as a single property.
3. **GSC: add property for each subdomain + the domain-level property** (`flashcards.com.br` with prefix `sc-domain:`). Track per-subdomain.
4. **Structured data** (Organization, Course schema) on each landing — gives Google explicit "these are related products".
5. **Backlinks campaign** in Phase 6 — concurso-specific guest posts on concurseiro blogs pointing to the subdomain.

**Warning signs:**
- 6 months in, `tjsp.flashcards.com.br` has 5 indexed pages and 0 from `flashcards.com.br/...`. Subdomain ranks page 3 for "flashcards tjsp" while a tiny competitor on subdirectory ranks page 1.
- GSC reports "Discovered, not indexed" for subdomain pages.
- The hub doesn't link to subdomains, OR subdomains don't link back to the hub.

**Phase to address:**
**Phase 2 (Multi-Concurso)** for routing/SEO basics; **Phase 6 (Polish)** for SEO campaign + GSC setup.

---

### Pitfall 22: Realtime channels bypass RLS by default

**What goes wrong:**
Supabase Realtime broadcast/presence channels don't apply table RLS by default. If you broadcast on a public channel name like `study-session-${userId}`, **any client that knows the channel name pattern can subscribe**. Imagine a leaderboard channel "league-1" — every user in that league sees every other user's live progress. Or worse, a card-rating channel that broadcasts user-specific data on a guessable channel name.

**Why it happens:**
- Realtime feels like just another pub/sub — devs forget the authorization step.
- The default Realtime setup (`public` channels) doesn't require any policy.
- `RLS works for Postgres CDC`, but **not for Broadcast/Presence** unless explicitly configured.

**How to avoid:**
1. **Disable "Allow public access"** in Realtime Settings.
2. **Set up RLS policies on `realtime.messages` table** to gate Broadcast/Presence:
   ```sql
   CREATE POLICY "users can subscribe to their own channel"
   ON realtime.messages FOR SELECT
   USING (
     realtime.topic() = 'user:' || auth.uid()::text
   );
   ```
3. **Channel naming convention:** include user_id or concurso_id, use uuid-only (no guessable patterns).
4. **For league/leaderboard** broadcasts (intentionally shared), aggregate server-side first; broadcast only public-safe data (rank + display name, never user_id).
5. **Test:** Playwright user A subscribes to channel "user:B-uuid", expects rejection.

**Warning signs:**
- A Realtime channel named after a guessable pattern (`league-1`, `study-room-tjsp`).
- "Allow public access" toggle is ON.
- A client subscribes to a channel without first checking authentication.
- `realtime.messages` has no RLS policies but Realtime is used.

**Phase to address:**
**Phase 4 (Study Core)** if Realtime is used for study sync; **Phase 5 (Simulado)** if leaderboards are live. Don't enable Realtime until policies exist.

---

### Pitfall 23: WAL pattern for simulado broken — double-submit on tab open

**What goes wrong:**
User opens two tabs of the same simulado attempt. Both tabs maintain their own client state. Both submit answers. Answers conflict — which is the "real" attempt? Worse: refresh during the simulado loses progress because state is in React state only.

**Why it happens:**
- Local-only state is the easy default.
- "User won't open two tabs" — power users do.
- Refresh = lose progress is acceptable in a 5-minute form, not a 5-hour exam.

**How to avoid:**
1. **Answers are append-only, server-side, per attempt:**
   - `simulado_attempts { id, user_id, started_at, expires_at, submitted_at, status }`
   - `simulado_answers { attempt_id, question_id, answer, answered_at, idempotency_key }`
   - Unique constraint on `(attempt_id, question_id)` — second tab's submit for the same question fails. First answer wins.
2. **Reload recovers state** from `GET /api/simulado/{id}/state` returning all answers so far + remaining time.
3. **One attempt per user per concurso at a time.** Trying to start a new attempt while one is `in_progress` → server returns 409 + UI: "Você já tem um simulado em andamento. Continuar ou abandonar?".
4. **Submit is idempotent.** `POST /api/simulado/{id}/submit` writes `submitted_at` only if null; otherwise returns the existing result.
5. **WebSocket / Realtime** broadcasts "attempt updated" so the second tab sees a stale state and prompts reload.

**Warning signs:**
- A user's simulado has duplicate answers for the same question.
- Refresh during simulado loses all progress.
- Two attempts with overlapping `started_at` / `submitted_at` for the same user_id × concurso_id.
- No `(attempt_id, question_id)` unique constraint.

**Phase to address:**
**Phase 5 (Simulado).** Append-only model is the architectural decision before any code.

---

### Pitfall 24: Service Worker for PWA breaks auth redirects

**What goes wrong:**
PWA adds a Service Worker that caches assets. Service Workers cache redirects (3xx) — but auth redirects (`/login → /dashboard` after Supabase callback) shouldn't be cached. Stale cached redirect = user logs in but lands on /login again. Service Worker also caches the old JS bundle → user installs PWA in week 1, code updates in week 2, user stuck on week 1 UI calling deleted APIs → 404s.

**Why it happens:**
- Service Workers cache aggressively by design — "offline support" goal trumps "fresh code" goal.
- `service-worker.js` itself is cached by the browser for ~24h by default → fix doesn't propagate.
- Auth redirects look like normal navigations to the SW.

**How to avoid:**
1. **PWA is Phase 7 (post-launch).** Don't ship a SW until the product is stable. The legacy never had one (UX-15 LOW); the reboot shouldn't rush this.
2. **`Cache-Control: no-cache` on `service-worker.js`** itself — fix propagates immediately.
3. **Workbox** patterns: `NetworkFirst` for HTML/JSON, `StaleWhileRevalidate` for static assets, **never cache 3xx redirects** or `/api/**` paths.
4. **Cache versioning by build SHA:** every deploy generates a new cache name (`v=abc123`); old caches deleted in `activate` event.
5. **"Update available" toast** with manual refresh button. SW announces new version, user opts in.
6. **Skip SW for auth callbacks:** `if (url.pathname.startsWith('/auth/')) return fetch(event.request);` in the SW.

**Warning signs:**
- Login redirects loop (user keeps landing on /login).
- After deploy, users report "the app shows old data / wrong button text".
- iOS Safari: PWA install fails or auth callback redirects to native browser.
- DevTools → Application → Service Workers shows "activated and is running" but URL hasn't been updated.

**Phase to address:**
**Phase 7 (Post-launch PWA).** Only consider after launch.

---

### Pitfall 25: Hardcoded business config (price, expiry) instead of DB-driven

**What goes wrong:**
Legacy `PAY-01` MEDIUM: `create-asaas-payment` has `PRODUCTS = { 'tjsp-uuid': { price: 297, ... } }` hardcoded as a Deno const. Every new concurso requires a redeploy of the edge function. PRODUTO.md §9: multi-concurso ships Q3 2026 — this hardcode is a blocker.

**Why it happens:**
- First concurso ships with one product; "we'll generalize later".
- Hardcoded config feels faster than a DB lookup.
- Edge function deploys are cheap; DB writes feel risky.

**How to avoid:**
1. **DB-first config from day 1:**
   - `admin_concursos { id, slug, title, price_cents, asaas_product_id, theme jsonb, ... }`.
   - Edge functions read price from DB on every call.
2. **Versioned pricing:** `admin_concurso_prices { concurso_id, price_cents, valid_from, valid_to }` so historical purchases retain their price.
3. **Currency in cents** (BIGINT). Never store `297.00` (float drift).
4. **Admin UI to create a new concurso** — no edge function deploy required.

**Warning signs:**
- A constant like `PRODUCTS` or `CONCURSO_CONFIG` in edge function code.
- "Add new concurso" requires a code change.
- Price change in admin UI doesn't reflect in checkout.
- Float math anywhere near money.

**Phase to address:**
**Phase 2 (Multi-Concurso architecture).** DB-driven before the first product launches.

---

## Technical Debt Patterns

Shortcuts that look reasonable but compound:

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `as any` to fight Supabase types | ships faster | 166 casts × 90s to fix each = 4hr re-typing on the day generated types finally regen | **Never** — generate types in CI on every migration |
| `console.error` instead of Sentry | one less dep | silent prod errors, can't reproduce user reports | Never — Sentry from commit 1, see Pitfall 3 |
| Hardcoded UUID for "the one concurso" | unblocks first sale | rewrite when 2nd concurso ships | Never — DB-driven from day 1 per Pitfall 25 |
| Soft-delete user (`deleted_at`) | reversible, "user might change mind" | LGPD violation, data persists forever | **Allowed for 30-day grace period**, then hard-delete |
| Polling every 3s for indeterminate time | simple webhook fallback | 28k DB reads/day per stuck tab | Cap at 60 retries (3 min) then surface CTA |
| `setInterval` for countdown timer | works in dev | drifts in inactive tabs, fails simulado | Never for anything authoritative |
| Hardcoded `expires_at = NOW() + 365d` | feels deterministic | re-deliveries extend access | Always derive from `paid_at`, not `NOW()` |
| Single hand-rolled CPF validator | one file | works until edge cases hit (lengths, all-same-digit, dot-strip) | Use battle-tested lib (e.g., `cpf-cnpj-validator`) + unit tests |
| Free tier infra "while we validate" | $0 | user-visible auto-pause once paying users exist | Move to Pro on Day 0 of taking money |
| `manualChunks` in bundler config | feels like optimization | breaks tree-shaking; sends Recharts to landing | Never — trust the bundler |
| RLS bypass via service_role in convenience | unblock admin task | 170-app CVE pattern | Only in dedicated server modules with `'server-only'` |
| Realtime channels without RLS policy | works in dev | data leak via channel name guess | Never — enforce policies before launching Realtime |
| Schema migration without regen types | one less step | code references ghost columns, silent insert failures | CI regen + commit in same PR |
| Documenting a convention without lint rule | feels professional | drift = 100% within 6 months | Convention = lint rule OR not a convention |

---

## Integration Gotchas

Common mistakes connecting to external services:

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Asaas webhook** | Verify only `asaas-access-token` header | Verify token (timing-safe `hash_equals`) **AND** re-fetch payment from `GET /v3/payments/{id}` to confirm status — token alone is not a security boundary (legacy SEC-08) |
| **Asaas webhook** | Return 200 on every event | Return 500 for transient errors so Asaas retries (Asaas guarantees at-least-once delivery via exponential backoff up to ~24h); 200 only for unrecoverable payloads |
| **Asaas webhook** | Idempotency via `onConflict` on access table | Idempotency via Asaas event id stored in `webhook_events` table with PK constraint; access `expires_at` deterministic from `paid_at`, not `NOW()` |
| **Asaas API** | Sandbox vs production URL confusion | Env-driven base URL: `process.env.ASAAS_BASE_URL` set per env (`https://sandbox.asaas.com/api/v3` vs `https://api.asaas.com/v3`) — never hardcoded |
| **Asaas customer dedup** | Create customer by email only | Customer key = CPF (mandatory in Brazil); dedup on CPF; email change doesn't create duplicate |
| **Supabase Auth** | `getSession()` in Server Component | Use `getUser()` in Server Components (verifies JWT against server); `getSession()` only in Client Components (faster but doesn't re-verify) |
| **Supabase Auth** | Mixing `auth-helpers-nextjs` and `@supabase/ssr` | `@supabase/ssr` is canonical for Next.js 15 App Router; auth-helpers-nextjs is deprecated |
| **Supabase Storage** | Public bucket for user uploads | Private bucket + signed URLs with TTL; RLS policies on `storage.objects` per user |
| **Supabase Realtime** | Public channels for user-specific events | RLS policies on `realtime.messages` + private channels — see Pitfall 22 |
| **Resend (email)** | Marketing list + transactional mixed | Separate API keys per purpose; transactional emails always; marketing requires opt-in (LGPD) |
| **Sentry** | Send raw request payloads | PII scrubbing via `beforeSend` hook strips CPF, full email, phone before transmission |
| **PostHog** | Identify users with CPF | Use `user_id` UUID; CPF stays in DB only |
| **Google AI / Gemini (admin only)** | Expose key in client bundle | Admin-only edge function; key in Supabase Secrets; pre-pivot AI features deleted (legacy TD-01) |
| **Vercel** | Use Vercel KV for session storage | Supabase Auth handles sessions; don't double-store |
| **Vercel Cron** | Replace Supabase pg_cron | Use Vercel Cron for Next.js API routes only; use Supabase pg_cron for DB-side scheduled tasks (cleanup, stats rebuild) |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows:

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **N+1 in React Query loops** | Page loads slowly with N items; network tab shows N+1 requests | Single RPC or view that aggregates; `Promise.all` is not a fix — it's still N requests | Legacy PERF-01: 21 queries for 10 concursos. Breaks at ~50 concursos |
| **`.in()` URL truncation** | Some items silently missing from results above ~30 ids | Server-side query via RPC for >30 ids; never client-side `.in(huge_array)` | 30-50 cards in scope per query |
| **Polling without max retries** | Idle tab consumes 28k DB reads/day | Cap polling at 60 retries (3 min); switch to Realtime channel listening | Any tab left open overnight |
| **Recharts on every page** | Landing TTI > 4s on 3G | Lazy import statistics-page-only; lighthouse budget | First mobile user on 3G |
| **Image not Next/Image** | LCP slow, layout shift | Always `<Image>` with explicit width/height; avoid raw `<img>` for above-fold | Mobile users on slow connections |
| **`useEffect` with stale closures** | Bug after navigation, props don't update | `exhaustive-deps` enforced; useEvent for callbacks | Days/weeks after deploy |
| **`getStaticProps`/`generateStaticParams` over user data** | Build time explodes; stale data | Static = marketing pages only; user data = dynamic | First 100 paying users |
| **No DB indices on `user_id`/`concurso_id`** | Slow page loads; sequential scans | Every FK gets an index; `EXPLAIN ANALYZE` in code review on new queries | ~1000 user_flashcard_progress rows |
| **Loading all flashcards into memory** | Memory pressure; OOM on mobile | Pagination + server-side filtering; never `.select('*').eq('user_id', x)` without limit | ~3000 cards per user |
| **No `staleTime` on React Query** | Refetch on every component mount | `staleTime: 60_000` default; longer for static data | Tab-heavy users (5+ tabs) |
| **Hydration: heavy interactive component above the fold** | LCP delayed by JS hydration | `loading.tsx` + `Suspense`; defer heavy components | Mobile users on 4G |
| **Edge Function cold start** | First request ~1.5s, subsequent ~100ms | Vercel keeps edge funcs warm with regular traffic; budget for cold start in webhook (Asaas retries 3x at minimum) | First user of the day |

---

## Security Mistakes

Domain-specific issues beyond OWASP basics:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service role key in client bundle | Total RLS bypass; 170-app CVE-2025-48757 pattern | `'server-only'` directive; `NEXT_PUBLIC_*` audit in CI |
| RLS policy missing on new table | Anonymous data access | Migration template requires `ENABLE ROW LEVEL SECURITY` + 4 default policies; Supabase advisor in CI |
| Webhook accepts forged payload (token-only) | Free product access via fake `PAYMENT_RECEIVED` | Re-fetch from Asaas to verify (Pitfall 14) |
| HIBP password protection OFF | Credential stuffing trivial | Enable in Supabase Auth → "Leaked password protection" (legacy SEC-01 HIGH) |
| Password `minLength` mismatch HTML vs JS | Confused validation; assistive tech misleads | Single source of truth via Zod schema |
| OAuth redirect with unsanitized origin | XSS-chain redirect to attacker host | Supabase Auth allowed redirect URLs configured at project level (legacy SEC-12) |
| `dangerouslySetInnerHTML` with DB content | Stored XSS — every aluno runs payload | `DOMPurify.sanitize()` always; sanitize at write time too (legacy SEC-13) |
| Insider admin write XSS to flashcards | Card content rendered as HTML — payload runs at study time | Sanitize on insert (admin path); render via Markdown processor, not raw HTML |
| Long-lived localStorage with PII | Browser extensions can read | Cache only non-PII fields; re-fetch CPF on demand (legacy AUTH-03) |
| `SESSION_VERSION` bump undocumented | Forgetting to bump = security fix doesn't take effect | Comment block on the const + changelog (legacy SEC-14) |
| Webhook signature validation with `===` | Timing attack on token | `timingSafeEqual` (Node) or `hash_equals` (PHP-style); never `===` for secrets |
| Cookie not `HttpOnly` / `Secure` / `SameSite` | XSS steals session; CSRF | `cookies().set()` with all three; default via `@supabase/ssr` config |
| `process-leagues` cron secret not rotated | Compromised secret = unauthorized league processing | Cron secret rotation runbook; document in OPS (legacy SEC-11 LOW) |
| CSP missing or too permissive | XSS injection via inline scripts | CSP via `next.config.js` headers — strict, no `'unsafe-inline'` |
| Supabase project URL hardcoded in client | Trivial recon | `NEXT_PUBLIC_SUPABASE_URL` is fine — it's public by design; just don't ship secrets adjacent |
| Audit log absent for admin actions | Insider abuse undetectable | `admin_audit_log { admin_user_id, action, target, payload, created_at }` write on every admin write |
| User can edit other user's profile via id-tampering | Vertical/horizontal privilege escalation | RLS policy: `WHERE user_id = auth.uid()` — test for every authenticated table |
| Public Supabase Storage bucket | Data leak via direct URL access | Private bucket; signed URLs with 5-min TTL |
| LGPD: marketing consent default ON | LGPD art. 8 — consent must be active | Checkbox unchecked by default; separate opt-in for marketing email |

---

## UX Pitfalls

Common UX mistakes in this domain:

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Landing copy advertises features that don't exist | Trust collapses on first paid login; CDC art. 30 (publicidade vinculante) exposure | Single source of truth for marketing claims (`PROJECT.md` Active); CI test parsing landing for promised features |
| Terms of Service mentions "planos gratuitos" when there's no free tier | Legal exposure + user confusion | Terms updated in same PR as product changes; CODEOWNERS = legal/product |
| "0/0 Tópicos" because schema migration broke the count | User thinks app is broken; lose trust | Visual regression tests; empty-state vs broken-state distinction (Pitfall 15) |
| "Pagamento confirmado" toast for boleto that was just generated | User refreshes, sees "no access", panics | Per-billing-type checkout UX (Pitfall 20) |
| Polling forever with no timeout CTA | User gives up; thinks payment failed | Cap polling at 3 min, show "Atualize a página" or "Confira por email" |
| Refund form submits to non-existent table, shows success | CDC art. 49 violations + refund requests lost | Integration tests for refund path (Pitfall 5) |
| Account deletion does soft-delete | User believes data deleted; LGPD violation | Two-stage delete with hard-delete after grace (Pitfall 17) |
| Onboarding asks for CPF before user sees value | Funnel drop-off | CPF only required at checkout, not signup |
| No "remember me" — session expires daily | User has to log in every morning | `@supabase/ssr` session refresh + 30-day cookie |
| Login screen on every subdomain visit | Cross-subdomain cookie misconfigured | Domain cookie set to `.flashcards.com.br` (Pitfall 13) |
| Theme flicker (FOUC) on subdomain navigation | "Old design then new design" jank | Theme injected server-side; CSS variables set on `<html>` before paint |
| Spaced repetition shuffles cards differently on every reload | User thinks app is buggy | Stable seed by `userId + brtDate + sessionId` (Pitfall 7) |
| 5 hours of simulado lost on browser crash | Catastrophic; refund-grade UX failure | WAL pattern, server-authoritative (Pitfall 23) |
| XP gained then disappears on refresh | Trust in gamification destroyed | Atomic increment via RPC (Pitfall 4) |
| "Caderno Digital" mockup on landing with Tiptap editor screenshot | User pays for editor, doesn't exist | Mockups must show real product; screenshots auto-generated from staging |
| User can't see purchase history | Confusion: "did my payment go through?" | `/conta/historico` from launch (legacy MISS-02) |
| No nota fiscal (invoice) for B2C purchase | Brazilian expectation; tax compliance gap | Asaas NF integration OR clear policy in Termos |
| Generic "Algo deu errado" without action | User stuck, no recovery path | Error UI with: error code, "tente novamente", contact support link |
| 24h profile cache after admin role change | New admin still sees old UI for a day | TTL on profile cache linked to SESSION_VERSION (legacy AUTH-02) |
| No keyboard shortcuts for SRS rating (1/2/3/4) | Power users frustrated; slow study sessions | Keybindings + visible hint on hover |
| Sidebar nav doesn't show active concurso | User confused which concurso they're studying | Sticky concurso indicator with switch action |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces:

- [ ] **Webhook handler:** Often missing **idempotency via event id** — verify `webhook_events` table with PK constraint and that re-sent events don't double-apply.
- [ ] **Webhook handler:** Often missing **Sentry integration** — verify `Sentry.captureException` is in every error path, not just `console.error`.
- [ ] **Webhook handler:** Often missing **payment re-fetch verification** — verify the handler calls `GET /v3/payments/{id}` before granting access (token alone is insufficient).
- [ ] **Refund flow:** Often missing **destination table** — verify `refund_requests` exists in `database.types.ts` and migration; integration test writes a row.
- [ ] **Account deletion:** Often missing **`auth.users` cleanup** — verify the deletion path calls `supabase.auth.admin.deleteUser()` not just `DELETE FROM user_profiles`.
- [ ] **Account deletion:** Often missing **external service cascading** — verify Resend audience, PostHog person, Sentry user are deleted.
- [ ] **SRS algorithm:** Often missing **timezone handling** — verify `due_at` comparisons use BRT date, not UTC date (`toZonedTime(..., 'America/Sao_Paulo')`).
- [ ] **SRS algorithm:** Often missing **property-based tests** — verify FSRS invariants under random ratings.
- [ ] **Queue interleaving:** Often missing **round-robin tests** — verify no disciplina appears 3x consecutively given 3+ disciplinas due.
- [ ] **Queue interleaving:** Often missing **stable seed** — verify reload returns same order; new day returns different order.
- [ ] **Auth middleware:** Often missing **cookie propagation** — verify middleware `setAll` reissues cookies on the response (Supabase docs canonical).
- [ ] **Auth middleware:** Often missing **session refresh** — verify `supabase.auth.getUser()` called in middleware before any DB query.
- [ ] **Subdomain routing:** Often missing **wildcard SSL** — verify Vercel issued cert for `*.flashcards.com.br`.
- [ ] **Subdomain routing:** Often missing **cookie domain** — verify cookies set with `Domain=.flashcards.com.br`.
- [ ] **Simulado timer:** Often missing **server-side expiry check** — verify submit endpoint rejects past `expires_at + 30s` tolerance.
- [ ] **Simulado answers:** Often missing **`(attempt_id, question_id)` unique constraint** — verify second submission for same question fails with 409.
- [ ] **Atomic XP:** Often missing **`UPDATE col = col + x`** pattern — verify no client-side read-modify-write.
- [ ] **Atomic XP:** Often missing **`xp_events` audit table** — verify every award is logged with idempotency key.
- [ ] **Type generation:** Often missing **CI step** — verify `supabase gen types` runs in CI and fails if `database.types.ts` is stale.
- [ ] **Lint enforcement:** Often missing **CI gate** — verify `npm run lint` exits non-zero on errors and CI blocks merge.
- [ ] **Coverage:** Often missing **thresholds** — verify per-module thresholds in `vitest.config.ts`.
- [ ] **Sentry:** Often missing **PII scrubbing** — verify `beforeSend` strips CPF, full_email, phone.
- [ ] **PWA service worker:** Often missing **`Cache-Control: no-cache` on SW file** — verify deploys propagate within minutes.
- [ ] **LGPD compliance:** Often missing **explicit consent storage** — verify a `user_consent { user_id, consent_type, granted_at, revoked_at, ip }` audit table exists.
- [ ] **LGPD compliance:** Often missing **data export endpoint** — verify `/api/lgpd/export` returns user's full data as JSON or CSV.
- [ ] **Terms/Privacy:** Often missing **alignment with product** — verify the text in Termos matches Active section of PROJECT.md (no "free tier" if no free tier).
- [ ] **Schema migrations:** Often missing **types regeneration in CI** — verify CI fails if migration runs without committing regenerated types.
- [ ] **Edge function size:** Often missing **bundle check** — verify middleware < 1 MB.
- [ ] **CSP headers:** Often missing **strict policy** — verify `next.config.js` `headers()` returns CSP; `'unsafe-inline'` absent.
- [ ] **Backups:** Often missing **PITR test** — verify a test restore from PITR succeeds on staging.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover:

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service role key leaked | HIGH | Rotate immediately in Supabase Dashboard → Settings → API; invalidate all sessions (force re-login by bumping `SESSION_VERSION`); audit logs for last 30 days; notify users if data exfiltrated (LGPD art. 48) |
| Webhook silent failure caused missed grants | MEDIUM | Reconcile via Asaas Dashboard CSV export → compare with `purchases` table → bulk-insert missing `user_concurso_access` rows + send "your access is now live" emails |
| User access expired wrongly due to idempotency bug | LOW | Manual `UPDATE user_concurso_access SET expires_at = ... WHERE user_id = ...` via dashboard; document the manual fix in `legal_audit_log` |
| Stale Supabase types breaking inserts (TD-05 style) | MEDIUM | Regenerate types; grep for the broken column; patch all call sites; deploy together; run integration test that exercises the path |
| Lost XP from race | LOW | XP audit log lets you replay events; or accept the loss and update the user-visible value via dashboard |
| SRS shuffler bug (cards repeating in same section) | HIGH (trust hit) | Hot-fix the shuffler; backfill any cards that got wrong intervals; communicate with apology + explanation |
| Refund table doesn't exist | HIGH (legal) | Create migration; restore lost requests from logs (Sentry, logs, support emails); honor all retroactively |
| LGPD deletion incomplete | HIGH (legal) | Re-run deletion completion; document gap + remediation; if ANPD inquiry, full disclosure |
| Cookie domain wrong → users logged out | LOW | Fix in middleware config; users re-login once; no data loss |
| Realtime channel data leak | HIGH | Disable Realtime; add RLS policies; deploy; check Realtime logs for abuse; notify users if PII leaked |
| Vercel deploy broken old SW cached | MEDIUM | Roll forward with fresh SW version; users with SW v1 will update on next visit; deploy "force update" banner in-app |
| Free tier paused production DB | HIGH (downtime) | Upgrade to Pro NOW; manually unpause; communicate downtime; postmortem and prevention |
| Bundle size regression | LOW | Revert PR that caused it; investigate manualChunks / heavy import |
| Test coverage gate disabled | LOW | Re-enable; backfill tests for current module |
| Schema drift between staging/prod | MEDIUM | Run `supabase db diff`; apply missing migrations; resync types; deploy |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address each pitfall. Phases are suggestive — final ordering is in `SUMMARY.md`.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Convention drift | Phase 1 (Foundation) | CI gates exist; lint blocks merge; pre-commit installed; CODEOWNERS in place |
| 2. TS strict partial adoption | Phase 1 (Foundation) | Single tsconfig with strict:true; `no-explicit-any` blocks merge; Supabase types regen in CI |
| 3. Webhook silent 200 failure | Phase 2 (Payment Funnel) | Webhook returns 500 on transient errors; Sentry capturing; alert on missing grants |
| 4. Non-atomic XP | Phase 4 (Study Core) | Postgres function `award_xp` exists; unit + concurrency tests pass; client only calls RPC |
| 5. Ghost-table refund_requests | Phase 1 (Foundation) for type gen; Phase 2 (Payment) for refund integration | Integration test writes refund + reads it back; types match schema |
| 6. Free-tier infra | Phase 0 (Pre-foundation) | Supabase Pro provisioned; Vercel Pro provisioned; budget docs |
| 7. SRS bug — cards repeating | Phase 4 (Study Core) | Property tests on `scheduleCard`, `interleaveQueue`; stable seed verified |
| 8. Test coverage theater | Phase 1 (Foundation) | Coverage thresholds in CI; per-module thresholds; CI fails on regression |
| 9. Hydration mismatch on auth cookies | Phase 1 (Foundation) for clients; Phase 3 (Auth) for full coverage | Playwright login + reload + nav remains authed |
| 10. Pivot zombie code | Phase 1 (Foundation) | `knip` in CI; CODEOWNERS on critical dirs; squash plan documented |
| 11. service_role RLS bypass | Phase 1 (Foundation) | `'server-only'` guards; three-key separation; RLS test per table |
| 12. Client-side simulado timer | Phase 5 (Simulado) | Server-authoritative; submit rejects past expiry; tests pass |
| 13. Cookie domain misconfig | Phase 1 (Foundation) + Phase 2 (Multi-Concurso) | Cross-subdomain Playwright login test passes |
| 14. Webhook double-grant | Phase 2 (Payment Funnel) | Replay 10x → access granted once; deterministic `expires_at` |
| 15. Schema drift → broken UI | Phase 1 (Foundation) for types; Phase 6 (Polish) for visual regression | Visual regression snapshots; smoke tests per page |
| 16. Bundle balloon | Phase 1 (Foundation) for budget; Phase 6 (Polish) for ongoing | Performance budget thresholds in CI; per-route bundle analyzer |
| 17. Soft-delete account | Phase 3 (Auth + Onboarding) | Two-stage delete + hard-delete cron + external cascade test |
| 18. Middleware Node API | Phase 1 (Foundation) | Build passes with `runtime = 'edge'`; bundle size <1MB |
| 19. Connection exhaustion | Phase 1 (Foundation) | Pooler URL configured; load test sustains target QPS |
| 20. Boleto UX | Phase 2 (Payment Funnel) | Per-billing-type UX; email at every state transition |
| 21. Subdomain SEO | Phase 2 (Multi-Concurso) + Phase 6 (Polish) | Hub-and-spoke linking; sitemaps; GSC properties |
| 22. Realtime RLS bypass | Phase 4 (Study Core) or Phase 5 (Simulado) — whenever Realtime ships | RLS policies on `realtime.messages`; private channels verified |
| 23. Simulado WAL broken | Phase 5 (Simulado) | Append-only model; unique constraint; reload recovers; concurrent tabs handled |
| 24. PWA Service Worker | Phase 7 (Post-launch) | Don't ship until product stable; cache-control on SW; versioning |
| 25. Hardcoded business config | Phase 2 (Multi-Concurso) | DB-driven prices; admin UI to create concurso; no edge function deploy for new concurso |

---

## Sources

**Legacy codebase concerns (authoritative — internal):**
- `.planning/codebase/CONCERNS.md` — 72 documented concerns from 2026-05-21 audit
- `.planning/codebase/CONVENTIONS.md` — convention drift inventory
- `.planning/codebase/TESTING.md` — test coverage gap audit
- `.planning/PROJECT.md` — reboot decisions and constraints
- `PENDENCIAS-2026-05-16.md` — Rafael's manual pending actions

**External authoritative sources (HIGH confidence):**
- [Asaas Webhook Idempotency Documentation](https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks) — Asaas official docs on at-least-once delivery and event id
- [Asaas Webhook Overview](https://docs.asaas.com/docs/about-webhooks) — `asaas-access-token` header authentication
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS canonical reference
- [Supabase Service Role Key Troubleshooting](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z) — service_role bypass
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) — Broadcast/Presence RLS via `realtime.messages`
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — production patterns
- [Supabase PgBouncer Connection Pooling](https://supabase.com/blog/supabase-pgbouncer) — transaction-mode pooler for serverless
- [Supabase Connection Pooling on Vercel Serverless Guide](https://www.iloveblogs.blog/guides/supabase-connection-pooling-vercel)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security) — Server Actions CSRF + Origin/Host check
- [Next.js Caching Documentation](https://nextjs.org/docs/app/guides/caching-without-cache-components) — `unstable_cache`, `use cache`, React `cache()`
- [Next.js Server Actions](https://nextjs.org/docs/13/app/building-your-application/data-fetching/server-actions-and-mutations)
- [FSRS-5 PyPI](https://pypi.org/project/fsrs/) — 19 weights, UTC requirement
- [FSRS Wiki — The Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) — canonical FSRS reference
- [PostgreSQL Race Conditions](https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view) — atomic UPDATE patterns
- [Atomic Increment Operations in SQL](https://blog.pjam.me/posts/atomic-operations-in-sql/) — `col = col + x` is safe at READ COMMITTED
- [LGPD Right to Erasure](https://jetico.com/blog/lgpd-right-erasure-how-comply/) — Brazilian compliance
- [LGPD SaaS Compliance Guide](https://complydog.com/blog/brazil-lgpd-complete-data-protection-compliance-guide-saas)
- [CDC Article 49 — Right of Withdrawal](https://www.acc.com/resource-library/right-regret-brazilian-consumer-protection-code) — 7-day refund right
- [PostgreSQL Timezone and Brazilian DST](https://www.postgresql.org/message-id/5630D418.60407@aklaver.com) — `America/Sao_Paulo` UTC-3 year-round since 2019
- [Backlinko: Subdomain vs Subdirectory SEO](https://backlinko.com/subdirectory-vs-subdomain) — 11.8M result analysis

**External MEDIUM confidence sources (WebSearch verified):**
- [Next.js 15 App Router Guide](https://dev.to/devjordan/nextjs-15-app-router-complete-guide-to-server-and-client-components-5h6k) — `use client` / `use server` boundaries
- [PWA Service Worker Cache Pitfalls](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [Multi-tenant Next.js Subdomain Cookies](https://medium.com/@fatih_erdogann/building-a-multi-tenant-saas-on-next-js-subdomains-sso-cookies-and-self-hosting-with-nginx-7149a13789e7)
- [Webhook Best Practices](https://boldsign.com/blogs/webhook-best-practices-retries-idempotency/) — general signature/idempotency
- [Lovable CVE-2025-48757 — 170 Apps Exposed](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — service_role accidental exposure pattern

---

*Pitfalls research for: Flashcards — BR concurso prep marketplace*
*Researched: 2026-05-21*
