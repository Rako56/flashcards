# Codebase Structure

**Analysis Date:** 2026-05-21

## Directory Layout

```
sparkle-study-scape/
├── .claude/
│   └── skills/
│       └── tjsp-flashcards-producer/   # Project-scoped Claude skill: lote pipeline
│           ├── SKILL.md
│           ├── workflow.md
│           ├── historico-lotes.md
│           ├── knowledge/              # 8 ref files (edital, wozniak, allowlists, …)
│           └── templates/              # JSON schema + SQL boilerplate
├── .planning/
│   └── codebase/                       # Output of /gsd:map-codebase (this doc)
├── docs/
│   ├── PRODUTO.md                      # CANONICAL product thesis — read first
│   ├── COWORK_BRIEFING.md              # Content production briefing for Cowork team
│   └── teste-e2e-flashcards-2026-05-18.md  # E2E test notes
├── legacy/
│   └── 2026-05-12/                     # Pre-pivot DB snapshot (subjects-dump.json)
├── public/                             # Static assets served verbatim by Vite
│   ├── favicon.png, logo.svg, og-image.jpg, prf-hero.png
│   ├── fonts/, images/
│   ├── criativo-tjsp.html, criativo-tjsp.mp4
│   ├── robots.txt, sitemap.xml
├── scripts/                            # Build-time + content-pipeline scripts
│   ├── flashcard-pipeline/             # Lote → JSON → validate → SQL chunks → MCP apply
│   │   ├── PROMPT_COWORK.md
│   │   ├── SCHEMA.md
│   │   ├── validate-lote.mjs           # Fail-fast quality gate
│   │   ├── build-chunks.mjs            # JSON → ~15KB SQL chunks
│   │   ├── build-review.mjs            # JSON → REVIEW.md per sub-tema
│   │   ├── tally-coverage.mjs          # DB coverage snapshot
│   │   ├── import.mjs                  # Cowork inbox → admin_flashcards (status=review)
│   │   ├── inbox/, processed/, chunks/, questoes/
│   │   └── lote-*.json + *-REVIEW.md   # Per-batch outputs (lotes 2–11 visible)
│   ├── residencia-multiplier/
│   └── record-criativo.mjs             # Generates the criativo-tjsp video assets
├── src/                                # React SPA source
│   ├── App.tsx                         # Router + global providers (lazy-loaded routes)
│   ├── main.tsx                        # ReactDOM.createRoot mount
│   ├── index.css                       # Tailwind layers + design tokens
│   ├── vite-env.d.ts
│   ├── pages/                          # Route-level components, one file per route
│   │   ├── Landing.tsx, LandingTJSP.tsx, LandingPRF.tsx
│   │   ├── Login.tsx, Signup.tsx, ForgotPassword.tsx
│   │   ├── Onboarding.tsx, PostPurchaseWelcome.tsx
│   │   ├── Checkout.tsx
│   │   ├── DashboardRouter.tsx
│   │   ├── dashboards/
│   │   │   ├── ConcursoDashboardHome.tsx
│   │   │   └── OnboardingPromptHome.tsx
│   │   ├── FlashcardStudy/             # Study loop (split into 7 files)
│   │   │   ├── index.tsx                # Composition root
│   │   │   ├── useStudySession.ts       # Queue + refs + load
│   │   │   ├── useRatingHandler.ts      # Rating → FSRS + combo + XP
│   │   │   ├── SessionHeader.tsx, RatingBar.tsx, SessionFinish.tsx
│   │   │   ├── SpecialCardExtras.tsx, types.ts
│   │   │   └── useStudySession.test.ts  # Vitest co-located
│   │   ├── SessionConfig.tsx, EditalMap.tsx, ExamTargetPicker.tsx
│   │   ├── Simulados.tsx, SimuladoConfig.tsx, SimuladoRun.tsx, SimuladoResult.tsx
│   │   ├── Questions.tsx, ErrorNotebook.tsx, Leaderboard.tsx, Statistics.tsx
│   │   ├── Concursos.tsx, Preparacoes.tsx, FocusMode.tsx
│   │   ├── Profile.tsx, Settings.tsx, Support.tsx
│   │   ├── Termos.tsx, Privacidade.tsx, Reembolso.tsx, NotFound.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminConcursos.tsx, AdminConcursoNovo.tsx, AdminConcursoDetail.tsx
│   │       ├── AdminQuestoes.tsx, AdminMidias.tsx
│   │       ├── AdminImportar.tsx           # Bulk question upload UI
│   │       ├── AdminFlashcardsBanco.tsx
│   │       └── AdminReviewQueue.tsx        # Curation queue (PRODUTO §5.1)
│   ├── components/                     # Feature components grouped by domain
│   │   ├── ProtectedRoute.tsx, AuthOnlyRoute.tsx, ErrorBoundary.tsx
│   │   ├── DailyChallenges.tsx, FormattedCardText.tsx
│   │   ├── ui/                         # 48 shadcn/ui primitives (Radix + Tailwind)
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx          # Admin sidebar + content shell
│   │   │   └── AdminRoute.tsx           # Admin auth guard
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx            # Sidebar (desktop) | BottomNav (mobile)
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── Topbar.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardShell.tsx, DashboardSection.tsx
│   │   │   ├── dashboardGoalType.ts
│   │   │   └── widgets/
│   │   │       ├── DueCardsCard.tsx, TodayFocusTime.tsx, AchievementStrip.tsx
│   │   │       ├── RecentActivityWidget.tsx, LastSimuladosWidget.tsx
│   │   │       ├── StudyHeatmap.tsx, ReviewForecast.tsx
│   │   │       └── index.ts
│   │   ├── flashcards/
│   │   │   ├── CardHistoryDialog.tsx
│   │   │   └── ReportCardButton.tsx
│   │   ├── questions/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── SimuladoMode.tsx
│   │   │   └── SimuladoResult.tsx
│   │   ├── paywall/
│   │   │   └── PrepPaywall.tsx          # Fullscreen modal for non-paying users
│   │   ├── landing/
│   │   │   ├── LandingHeader.tsx, LandingFooter.tsx
│   │   │   ├── HeroShowcase.tsx, TJSPShowcase.tsx, MarqueeStrip.tsx
│   │   ├── gamification/
│   │   │   ├── BadgeIcon.tsx, ComboCounter.tsx, EditalProgressBar.tsx
│   │   │   ├── FlowStateBackground.tsx, GamificationIndicator.tsx
│   │   │   ├── TopicMasteryCelebration.tsx, XpToast.tsx
│   │   ├── focus/
│   │   │   ├── FocusContextSelector.tsx, FocusMediaPanel.tsx
│   │   │   ├── FocusMetrics.tsx, FocusTimer.tsx
│   │   ├── stats/
│   │   │   ├── FlashcardStatsSection.tsx
│   │   │   └── TopicRetentionSection.tsx
│   │   ├── study/
│   │   │   └── PostFocusLog.tsx
│   │   ├── home/
│   │   │   └── RecentActivity.tsx
│   │   ├── concurso/                   # (empty post-pivot)
│   │   ├── concursos/
│   │   │   └── ConcursoCard.tsx
│   │   ├── brand/
│   │   │   └── Logo.tsx
│   │   └── icons/
│   │       ├── StudyIcons.tsx           # `Si*` icon set — single import surface
│   │       └── LineIcon.tsx
│   ├── hooks/                          # One hook per file (15 hooks)
│   │   ├── useAuth.tsx                  # AuthProvider + useAuth (session version)
│   │   ├── useProfile.ts                # user_profiles fetch + 24h localStorage cache
│   │   ├── useAdmin.ts                  # user_roles check
│   │   ├── useAccess.ts                 # Paid-access gate (goals + user_concurso_access)
│   │   ├── useExamTarget.ts             # Daily new/review budgets + pace
│   │   ├── useScopedDueCount.ts         # Cheap due-cards count for hero
│   │   ├── useReviewBatcher.ts          # 5-card batch flush + localStorage fallback
│   │   ├── useStudyLogSaver.ts          # study_logs writer
│   │   ├── useStudyPreferences.ts       # localStorage preferences
│   │   ├── useGamification.ts           # XP, level, tier, streak shields
│   │   ├── useAchievements.ts
│   │   ├── useFocusTimer.ts             # Pomodoro / focus mode
│   │   ├── useStatistics.ts
│   │   ├── useTheme.ts                  # light/dark/system + localStorage
│   │   ├── use-mobile.tsx, use-toast.ts # shadcn-style helpers
│   ├── lib/                            # Pure business logic (no React, side-effect free)
│   │   ├── srs.ts                       # FSRS-5 scheduler (19-weight model)
│   │   ├── edital/
│   │   │   ├── queue.ts                  # buildStudyQueue — interleaving + budget brain
│   │   │   ├── progress.ts
│   │   │   └── types.ts
│   │   ├── gamification/
│   │   │   ├── combo.ts                  # advanceCombo, tier lookup, bonus XP
│   │   │   └── topicMastery.ts           # didCardJustMaster + TopicMasteryEvent
│   │   ├── time/
│   │   │   └── brt.ts                    # Brasília TZ helpers
│   │   ├── audio.ts, haptic.ts          # Optional feedback
│   │   ├── auth-errors.ts               # Supabase error → human messages
│   │   ├── cpf.ts                       # CPF/phone validators + formatters
│   │   ├── levels.ts                    # XP → level/tier
│   │   ├── normalizeDiscipline.ts       # Disciplina canonical name lookup
│   │   ├── tipo-card-labels.ts          # Card type pt-BR labels (canonical map)
│   │   ├── ecosystem.ts
│   │   └── utils.ts                     # cn() = clsx + twMerge
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts                 # Singleton (createClient<Database>)
│   │       └── types.ts                  # AUTO-GENERATED — do not hand-edit
│   ├── test/
│   │   └── setup.ts                      # Vitest jsdom + Testing Library bootstrap
│   └── types/
│       └── radix-compat.d.ts             # Type shims for Radix
├── supabase/
│   ├── config.toml                     # verify_jwt overrides per function
│   ├── functions/                      # Deno edge functions (canonical set)
│   │   ├── asaas-webhook/index.ts        # Asaas → grant/revoke access
│   │   ├── create-asaas-payment/index.ts # Create PIX/boleto/card payment
│   │   ├── grant-access/index.ts         # Admin-only manual grant
│   │   ├── parse-edital/index.ts         # Admin: PDF edital parser
│   │   ├── parse-questions-bulk/index.ts # Admin: bulk question upload
│   │   ├── process-leagues/index.ts      # Cron: weekly league scoring
│   │   ├── send-support-ticket/index.ts
│   │   └── send-welcome-email/index.ts
│   ├── migrations/                     # 145 SQL files, ordered by timestamp
│   ├── mixed_study_sessions.sql        # Loose helper script (not a numbered migration)
│   └── user_gamification.sql           # Loose helper script
├── CLAUDE.md                           # Project guidance for Claude Code (read 1st)
├── README.md                           # Public-facing readme
├── PENDENCIAS-2026-05-16.md            # Manual ops Rafael owes (delete zombies, etc.)
├── components.json                     # shadcn/ui config
├── eslint.config.js                    # Flat ESLint config
├── index.html                          # Vite SPA shell + theme pre-hydration script
├── package.json                        # Vite + React 18 + TS deps
├── package-lock.json
├── postcss.config.js, tailwind.config.ts
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json, tsconfig.strict.json
├── vercel.json                         # Vercel rewrites for SPA fallback
├── vite.config.ts                      # Manual chunk splitting, @/ alias, dedupe
├── vitest.config.ts
└── dist/                               # Build output (gitignored)
```

## Directory Purposes

**`docs/`:**
- Purpose: canonical decisions + briefings (NOT generated API docs).
- Contains: product thesis, content briefings, test reports.
- Key files: `docs/PRODUTO.md` (every architectural decision is checked against this), `docs/COWORK_BRIEFING.md`.

**`src/pages/`:**
- Purpose: route-level page components. One file per route in `App.tsx`.
- Convention: page filename is the route's display purpose (e.g. `Checkout.tsx` for `/checkout/:slug`). Lazy-loaded.
- Special: `FlashcardStudy/` is a directory (not a file) because the study loop was split into 7 cohesive units. `dashboards/` holds the variants `DashboardRouter` picks. `admin/` is reserved for `/admin/*` routes (gated by `AdminRoute`).

**`src/components/`:**
- Purpose: UI grouped by domain.
- Convention: `<domain>/` for feature components, `ui/` for shadcn/Radix primitives, top-level for cross-cutting (`ErrorBoundary.tsx`, `ProtectedRoute.tsx`).
- Key files: `layout/AppLayout.tsx` (responsive shell), `ui/button.tsx` (shadcn baseline).

**`src/hooks/`:**
- Purpose: encapsulate a single domain concern. One hook per file.
- Naming: `useThing.ts` (or `.tsx` if it returns JSX/context). `use-mobile.tsx` and `use-toast.ts` keep kebab-case because they came from shadcn templates.
- Pattern: hook returns `{ data/state, loading, ...mutators }`. Most use React Query under the hood.

**`src/lib/`:**
- Purpose: pure, framework-agnostic business logic. Importable from anywhere; trivially unit-testable.
- Key files: `srs.ts` (FSRS-5), `edital/queue.ts` (the study queue brain), `gamification/combo.ts`, `levels.ts`, `cpf.ts`, `utils.ts` (`cn()`).
- Convention: no React imports, no Supabase imports. (`useAuth.tsx` lives in `hooks/`, not here.)

**`src/integrations/supabase/`:**
- Purpose: hold the Supabase client + auto-generated DB types.
- `client.ts` is a 10-line singleton; `types.ts` is regenerated via Supabase CLI and MUST NOT be hand-edited.

**`src/test/`:**
- Purpose: Vitest global setup (jsdom + Testing Library matchers).
- Convention: per-feature tests live next to the file (`useStudySession.test.ts` next to `useStudySession.ts`), not in this directory.

**`src/types/`:**
- Purpose: cross-cutting `.d.ts` files (e.g. Radix compat shims).

**`supabase/functions/`:**
- Purpose: Deno edge functions. One subdirectory per function, each containing `index.ts`.
- Canonical set today: `asaas-webhook`, `create-asaas-payment`, `grant-access`, `parse-edital`, `parse-questions-bulk`, `process-leagues`, `send-support-ticket`, `send-welcome-email`. 12 pre-pivot zombie functions are scheduled for deletion in `PENDENCIAS-2026-05-16.md`.
- Convention: imports use `npm:@supabase/supabase-js@2.98.0` (Deno-style URL imports).

**`supabase/migrations/`:**
- Purpose: append-only SQL history. Each file is `<timestamp>_<description>.sql`.
- 145 migrations total. Recent ones (2026-05-12+) finish the post-pivot DB cleanup (`drop_legacy_decks_tables.sql`, `review_queue_columns_and_backfill.sql`) and import flashcard lotes (`import_*lote_*.sql`).
- Loose `.sql` files outside `migrations/` (`mixed_study_sessions.sql`, `user_gamification.sql`) are helper scripts, NOT part of the migration ordering.

**`scripts/flashcard-pipeline/`:**
- Purpose: end-to-end content pipeline owned by the `tjsp-flashcards-producer` skill.
- Flow: JSON lote in `inbox/` → `validate-lote.mjs` (fail-fast quality gate) → `build-chunks.mjs` (~15KB SQL chunks under `chunks/`) → MCP apply → `processed/` archive. `build-review.mjs` produces `lote-N-*-REVIEW.md` for human approval. `tally-coverage.mjs` snapshots DB coverage.
- All output cards default to `status='review'` + `review_status='pending'`.

**`legacy/`:**
- Purpose: DB snapshots taken right before destructive migrations, for audit only.
- Contains: `legacy/2026-05-12/subjects-dump.json` — 32 rows from the pre-pivot `subjects` table, all owned by Rafael's admin account, dumped before `drop_legacy_decks_tables.sql`.
- **Generated:** no (manual snapshot).
- **Committed:** yes (audit trail).
- **Restore intention:** none. Schema is preserved in the migration history.

**`public/`:**
- Purpose: static assets served verbatim by Vite (no transformation).
- Contains: favicon, logo, OG image, fonts, robots.txt, sitemap.xml, and the launch creative (`criativo-tjsp.mp4` + `.html`).

**`.claude/skills/tjsp-flashcards-producer/`:**
- Purpose: project-scoped Claude skill, loaded by Claude Code agents when producing flashcard lotes.
- Contains: `SKILL.md` (orchestration), `workflow.md` (7-step pipeline), `knowledge/` (8 reference files including jurisprudence + fundamentos allowlists), `templates/` (JSON schema + SQL template), `historico-lotes.md` (append-only batch log).

**`.planning/codebase/`:**
- Purpose: output directory for `/gsd:map-codebase` runs. This document and `ARCHITECTURE.md` live here.

## Key File Locations

**Entry Points:**
- `index.html`: SPA shell + theme pre-hydration `<script>` (avoids dark-mode FOUC).
- `src/main.tsx`: ReactDOM mount.
- `src/App.tsx`: Router + all route definitions + lazy imports + global providers.

**Configuration:**
- `vite.config.ts`: manual chunks (`vendor-react`/`vendor-ui`/`vendor-charts`/`vendor-query`), `@/` alias to `./src`, dedupe lists.
- `tailwind.config.ts`: design tokens.
- `tsconfig.json`: lax base config (strictNullChecks off). `tsconfig.strict.json` is the opt-in strict variant for new code (`npm run typecheck:strict`).
- `supabase/config.toml`: per-function `verify_jwt` overrides.
- `vercel.json`: SPA rewrite fallback so deep links don't 404 on Vercel.
- `eslint.config.js`: ESLint 9 flat config.
- `vitest.config.ts`: Vitest jsdom config.

**Core Logic:**
- `src/lib/srs.ts`: FSRS-5 spaced repetition (`calculateSRS`).
- `src/lib/edital/queue.ts`: the study queue brain (`buildStudyQueue`).
- `src/pages/FlashcardStudy/index.tsx`: study loop composition root.
- `src/pages/FlashcardStudy/useStudySession.ts`: queue + WAL refs + load.
- `src/pages/FlashcardStudy/useRatingHandler.ts`: rating → SRS → gamification.
- `src/integrations/supabase/client.ts`: Supabase singleton.
- `src/hooks/useAuth.tsx`: AuthProvider (session version bump = global logout).
- `src/hooks/useAccess.ts`: paywall logic (goals → concurso → user_concurso_access).
- `supabase/functions/asaas-webhook/index.ts`: payment → access grant.
- `supabase/functions/create-asaas-payment/index.ts`: customer + payment creation.

**Testing:**
- `src/test/setup.ts`: Vitest global setup.
- `src/pages/FlashcardStudy/useStudySession.test.ts`: only sample test today (the test surface is thin — see CONCERNS).

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g. `AppSidebar.tsx`, `PrepPaywall.tsx`).
- Hooks: `useThing.ts` or `useThing.tsx` (e.g. `useAccess.ts`, `useAuth.tsx`).
- Shadcn primitives keep `kebab-case.tsx` (`button.tsx`, `dropdown-menu.tsx`) — exception inherited from the shadcn templates.
- Pure-logic modules: `kebab-case.ts` (e.g. `auth-errors.ts`, `tipo-card-labels.ts`) or single-word lowercase (`srs.ts`, `utils.ts`).
- Tests: co-located, `Thing.test.ts` next to `Thing.ts`.
- Edge functions: kebab-case directory names (`asaas-webhook/`, `create-asaas-payment/`), each containing `index.ts`.
- Migrations: `<UTC-timestamp>_<lowercase_snake_description>.sql` (e.g. `20260512000200_review_queue_columns_and_backfill.sql`).

**Directories:**
- `src/components/<domain>/` — lowercase, plural where natural (`flashcards/`, `questions/`, `widgets/`).
- `src/pages/<feature>/` for multi-file pages (`FlashcardStudy/`, `dashboards/`, `admin/`).

**Imports:**
- Always use `@/` alias to root `src/`. Never relative paths from `src/` (CLAUDE.md §Conventions). Example: `import { useAuth } from '@/hooks/useAuth'`.

**Style helpers:**
- `cn(...)` from `@/lib/utils` for conditional Tailwind (clsx + twMerge).
- Custom icons: import from `@/components/icons/StudyIcons` (the `Si*` set). Never import lucide-react directly outside the icon module.

## Where to Add New Code

**New page/route:**
- File: `src/pages/<Name>.tsx` (or `src/pages/<Name>/index.tsx` for multi-file pages).
- Wire: add a lazy import + `<Route>` in `src/App.tsx`. Wrap with `ProtectedRoute`/`AuthOnlyRoute`/`AdminRoute` as appropriate.
- Tests: co-located `Name.test.tsx`.

**New admin page:**
- File: `src/pages/admin/Admin<Name>.tsx`.
- Layout: wrap content with `<AdminLayout>` from `src/components/admin/AdminLayout.tsx`. Add a `NavLink` entry to the `adminNav` array in that file.
- Route: `<Route path="/admin/<slug>" element={<AdminRoute><Admin<Name> /></AdminRoute>} />` in `App.tsx`.

**New domain hook:**
- File: `src/hooks/use<Thing>.ts`.
- Pattern: `useQuery` from React Query for reads; expose `{ data, loading, error, refetch }`. For local state, return `{ state, setState }` or domain verbs.
- Convention: read user via `useAuth`, then gate on `!!user`. Always include `user?.id` in the query key.

**New pure logic:**
- File: `src/lib/<thing>.ts` or `src/lib/<domain>/<thing>.ts`.
- Rule: no React, no Supabase. Should run in Node + jsdom equally.
- Tests: `src/lib/<thing>.test.ts`.

**New shared UI primitive:**
- Use shadcn CLI to scaffold into `src/components/ui/`. Extend rather than fork.

**New feature component:**
- Directory: `src/components/<domain>/<Name>.tsx`. Create the domain folder if it doesn't exist (current domains: `admin/`, `brand/`, `concurso/` (empty), `concursos/`, `dashboard/`, `flashcards/`, `focus/`, `gamification/`, `home/`, `icons/`, `landing/`, `layout/`, `paywall/`, `questions/`, `stats/`, `study/`, `ui/`).

**New edge function:**
- Directory: `supabase/functions/<name>/index.ts`.
- Deno imports: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts"` + `import { createClient } from "npm:@supabase/supabase-js@2.98.0"`.
- Auth: default is `verify_jwt=true`. Add an entry to `supabase/config.toml` only if you need to disable JWT (webhook, cron, service-role-only).
- Errors: 4xx with `{ error, code: 'SENTINEL' }` for business-logic failures; 200 with logged error for webhooks (to suppress retries).

**New DB migration:**
- File: `supabase/migrations/<UTC-timestamp>_<snake_description>.sql`.
- Apply via `supabase db push` or paste into SQL Editor.
- After schema change, regenerate types: `supabase gen types typescript --project-id zjyogswbgcauwqisvuyq > src/integrations/supabase/types.ts`.

**New flashcard lote:**
- Driven by the `.claude/skills/tjsp-flashcards-producer` skill. Output JSON to `scripts/flashcard-pipeline/inbox/lote-N-<topic>.json`, validate via `node scripts/flashcard-pipeline/validate-lote.mjs <file>`, build chunks via `build-chunks.mjs`, apply via MCP. All cards default to `status='review'`.

**New static asset:**
- `public/` — served verbatim at the same path.

## Special Directories

**`legacy/`:**
- Purpose: append-only audit snapshots of dropped DB state.
- Generated: no (manual snapshot before destructive migrations).
- Committed: yes.
- Will grow: only when more destructive migrations require an audit dump. Pre-pivot tables (`decks`, `subjects`, `topics`, `items`, `srs_state`) were snapshotted on 2026-05-12; no current plan adds more.

**`dist/`:**
- Purpose: Vite build output for Vercel deploys.
- Generated: yes (`npm run build`).
- Committed: no (gitignored).

**`node_modules/`:**
- Generated: yes (`npm install`).
- Committed: no (gitignored).

**`scripts/flashcard-pipeline/inbox/` and `processed/` and `chunks/`:**
- Purpose: working directories for the lote pipeline. `inbox/` holds JSON awaiting validation, `chunks/` holds generated SQL chunks, `processed/` archives applied lotes.
- Generated: by `import.mjs` + `build-chunks.mjs`.
- Committed: yes (the lote JSONs and REVIEW.mds are the canonical record of what was added).

**`.planning/codebase/`:**
- Purpose: output of `/gsd:map-codebase`. Consumed by future `/gsd:plan-phase` and `/gsd:execute-phase` runs.
- Generated: by the GSD mapper agents.
- Committed: yes.

---

*Structure analysis: 2026-05-21*
