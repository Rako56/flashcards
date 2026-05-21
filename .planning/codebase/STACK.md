# Technology Stack

**Analysis Date:** 2026-05-21
**Project:** Sparkle Flashcards (`sparkle-study-scape`)
**Status:** Post-pivot, pre-reboot. Several stack pieces are deeply load-bearing; several are zombie dependencies from killed features.

---

## Languages

**Primary:**
- TypeScript 5.8.3 — `src/**/*.{ts,tsx}` (entire frontend)
- TypeScript via Deno — `supabase/functions/**/index.ts` (8 edge functions)

**Secondary:**
- JavaScript (ESM `.mjs`) — `scripts/record-criativo.mjs` only (marketing video script). The rest of `scripts/` is TypeScript.
- SQL (Postgres) — `supabase/migrations/*.sql` (145 migration files since 2026-03-02)
- CSS (via Tailwind) — `src/index.css` (custom CSS vars + font imports)

**CONFIDENCE: HIGH.** Languages are uniform. TypeScript is enforced via ESLint but **strict mode is OFF**: `tsconfig.app.json` has `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`. There is an opt-in `tsconfig.strict.json` (referenced by `npm run typecheck:strict`) but it's not part of the default build. Reboot opportunity: flip on strict mode.

---

## Runtime

**Frontend Runtime:**
- Browser (Vite-bundled SPA)
- Node.js 18+ required for dev (README states "Node.js 18+ e npm")
- No `.nvmrc` or `engines` field in `package.json` — version not pinned. **BRITTLE.**

**Backend Runtime:**
- Deno (Supabase Edge Functions) — pinned per-function via URL imports
  - `asaas-webhook`, `create-asaas-payment`, `grant-access` → `deno.land/std@0.190.0` + `npm:@supabase/supabase-js@2.98.0`
  - `parse-edital`, `parse-questions-bulk`, `send-support-ticket`, `send-welcome-email` → `deno.land/std@0.168.0` + `esm.sh/@supabase/supabase-js@2` (or `@2.39.0`)
  - `process-leagues` → `Deno.serve` (no std import), `esm.sh/@supabase/supabase-js@2`
- Postgres 15+ (managed by Supabase) — schema in `supabase/migrations/`. Types auto-generated to `src/integrations/supabase/types.ts` showing `PostgrestVersion: "14.5"`.

**CONFIDENCE: MEDIUM.** Edge function Deno std versions are inconsistent across functions (0.190.0 vs 0.168.0). `@supabase/supabase-js` client version is inconsistent (2.98.0 vs 2.39.0 vs unpinned `@2`). A reboot should standardize all edge functions on one Deno std version + one client version.

**Package Manager:**
- npm (lockfile: `package-lock.json` present, 8.8MB+, committed)
- No Yarn / pnpm artifacts

---

## Frameworks

**Core Frontend:**
- React 18.3.1 — `react`, `react-dom` (pinned to 18, NOT React 19)
- Vite 5.4.19 + `@vitejs/plugin-react-swc` 3.11.0 (SWC compiler, faster than Babel)
- React Router 6.30.1 — client-side routing, lazy-loaded pages in `src/App.tsx`
- TanStack React Query 5.90.21 — server state cache (config: 2min staleTime, 10min gcTime, `refetchOnWindowFocus: false`, retry 1)

**CONFIDENCE: HIGH.** Vite + React 18 + Router 6 + Query 5 is a current, well-supported combination. React Router 6 is stable but Router 7 is now out — not urgent to migrate.

**UI / Styling:**
- Tailwind CSS 3.4.17 + `tailwindcss-animate` 1.0.7 + `@tailwindcss/typography` 0.5.16
  - Custom design system in `tailwind.config.ts`: editorial font sizes 2xs→7xl, fixed shadow scale 1→5, radius vocabulary 6/10/14/20, color tokens via CSS vars
  - Fonts: Fraunces (display/serif), Inter (body), JetBrains Mono — loaded via Google Fonts `@import` in `src/index.css:1`
- shadcn/ui (Radix UI primitives + Tailwind) — `components.json` at root, primitives in `src/components/ui/`. Style: "default", baseColor: "slate", CSS vars on.
- Radix UI: 24 separate `@radix-ui/react-*` packages (Dialog, Select, Popover, Tabs, etc.)
- Framer Motion 12.34.3 — used in 40+ components for transitions/animations
- `lucide-react` 0.462.0 — icon set (custom wrappers in `src/components/icons/StudyIcons.tsx`)
- `sonner` 1.7.4 — toast notifications (used in 30+ files, primary feedback mechanism)
- `class-variance-authority` 0.7.1 + `clsx` 2.1.1 + `tailwind-merge` 2.6.0 — used via `cn()` helper in `@/lib/utils`
- `next-themes` 0.3.0 — referenced only in `src/components/ui/sonner.tsx` (shadcn boilerplate)
- `cmdk` 1.1.1, `embla-carousel-react` 8.6.0, `vaul` 0.9.9, `react-day-picker` 8.10.1, `react-resizable-panels` 2.1.9, `input-otp` 1.4.2 — pulled in via shadcn primitives. Some of these are used (carousel in landing, otp in flows); some are dead.

**CONFIDENCE: MEDIUM-HIGH.** UI stack is solid and current. Some shadcn primitives (`drawer`/`vaul`, `command`/`cmdk`, `calendar`/`react-day-picker`, `resizable`) may be unused in `src/pages` — worth auditing in a cleanup pass.

**Forms / Validation:**
- `react-hook-form` 7.61.1 — **ZOMBIE in src/**. Imported only by `src/components/ui/form.tsx` (shadcn shell). That shell is not imported anywhere in `src/`. All forms (Signup, Login, Onboarding, Checkout, Profile, Settings) use plain `useState` + manual `onChange` handlers.
- `@hookform/resolvers` 3.10.0 — **ZOMBIE**. Never imported anywhere in `src/`.
- `zod` 3.25.76 — **ZOMBIE in src/**. Never imported. Validation is hand-rolled (e.g., `isValidCPF` in `src/lib/cpf.ts`).
- `date-fns` 3.6.0 — **ZOMBIE**. Never imported anywhere in `src/`. Date formatting is done with `toLocaleString`/`Intl.DateTimeFormat` inline.

**OPINION:** Either rip these four out and stay hand-rolled (saves ~150KB bundle, simpler), or commit to using them in the reboot. The middle ground (paying for them but not using them) is the worst case.

**Charts / Visualization:**
- `recharts` 2.15.4 — used in `src/pages/Statistics.tsx`, `src/components/stats/FlashcardStatsSection.tsx`, `src/components/ui/chart.tsx` (shadcn wrapper). Active and load-bearing for statistics page.

**Other UI:**
- `dompurify` 3.3.3 + `@types/dompurify` 3.2.0 — used in `src/components/questions/QuestionCard.tsx` to sanitize question HTML. **Active, load-bearing for security.** Note: as of DOMPurify 3.2, `@types/dompurify` is a stub (types are bundled) — that types package can be removed.
- `@xyflow/react` 12.10.1 + `@dagrejs/dagre` 2.0.4 — **ZOMBIES**. No imports anywhere in `src/`. Were likely used by an old "knowledge graph"/"flow editor" feature, now removed.
- `html-to-image` 1.11.13 — **ZOMBIE in src/**. No imports in `src/`. Used by killed share-card feature.

**Testing:**
- Vitest 3.2.4 — `npm run test`, `npm run test:watch`. Config in `vitest.config.ts` (jsdom env, globals on, setup file `src/test/setup.ts`)
- `@testing-library/react` 16.0.0 + `@testing-library/jest-dom` 6.6.0
- `jsdom` 20.0.3 (note: jsdom 20 is older — version 24+ is current)

**Test coverage is thin** — see TESTING.md from quality focus.

**Build / Dev Tooling:**
- `@vitejs/plugin-react-swc` 3.11.0 — React + SWC transpile
- `autoprefixer` 10.4.21 + `postcss` 8.5.6 — Tailwind toolchain
- ESLint 9.32.0 (flat config) + `typescript-eslint` 8.38.0 + `eslint-plugin-react-hooks` 5.2.0 + `eslint-plugin-react-refresh` 0.4.20
  - Config: `eslint.config.js` (flat config format, current)
  - Ignores: `dist`, `supabase/functions/**`, `scripts/**` — **edge functions are NOT linted**
  - Rules are loose: `@typescript-eslint/no-unused-vars` is OFF
- `ffmpeg-static` 5.3.0 + `playwright` 1.59.1 — **ZOMBIE for app.** Used only by `scripts/record-criativo.mjs` (marketing TikTok-video generator from HTML). Heavy install footprint (~250MB combined) for a one-off marketing tool.

**OPINION:** `ffmpeg-static` and `playwright` should be moved out of the main `package.json` and into a separate `scripts/criativo/package.json` to stop polluting dev installs. They have no business in the product's dep tree.

---

## Key Dependencies (deep dive)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `@supabase/supabase-js` | ^2.98.0 | **LOAD-BEARING, CURRENT** | Singleton in `src/integrations/supabase/client.ts`. Auth + Postgres + Storage + Edge invocations. All paths go through this. |
| `react` / `react-dom` | ^18.3.1 | LOAD-BEARING, NOT LATEST | React 19 is out but no urgency. Concurrent Mode features are in use (Suspense, lazy). |
| `react-router-dom` | ^6.30.1 | LOAD-BEARING | Lazy routes in `src/App.tsx`. Router 7 is out; migration is opt-in. |
| `@tanstack/react-query` | ^5.90.21 | LOAD-BEARING | Server state cache. Some hooks (`useReviewBatcher`) use raw fetch instead — inconsistent. |
| `framer-motion` | ^12.34.3 | LOAD-BEARING | 40+ usages. Going hard on animation. Recent major version (Framer-Motion v12 = Motion v12). |
| `tailwindcss` | ^3.4.17 | LOAD-BEARING | Tailwind 4 is in beta — wait for stable before migrating. |
| `vite` | ^5.4.19 | LOAD-BEARING | Vite 6 is out but 5.4 is fine. |
| `recharts` | ^2.15.4 | ACTIVE | Statistics + stats section. |
| `dompurify` | ^3.3.3 | ACTIVE | XSS protection in `QuestionCard.tsx`. Critical. |
| `sonner` | ^1.7.4 | ACTIVE | Primary toast UX. |
| `lucide-react` | ^0.462.0 | ACTIVE | Icons via custom wrappers in `src/components/icons/StudyIcons.tsx`. |
| `react-hook-form` | ^7.61.1 | **ZOMBIE** | Only referenced by unused `ui/form.tsx`. Remove or adopt. |
| `zod` | ^3.25.76 | **ZOMBIE** | Never imported. Remove or adopt. |
| `@hookform/resolvers` | ^3.10.0 | **ZOMBIE** | Never imported. Drop. |
| `date-fns` | ^3.6.0 | **ZOMBIE** | Never imported. Drop. |
| `@xyflow/react` | ^12.10.1 | **ZOMBIE** | No usages in `src/`. Drop. |
| `@dagrejs/dagre` | ^2.0.4 | **ZOMBIE** | No usages in `src/`. Drop (was for xyflow layout). |
| `html-to-image` | ^1.11.13 | **ZOMBIE** | No usages in `src/`. Drop. |
| `@types/dompurify` | ^3.2.0 | **STUB** | DOMPurify 3.2+ ships its own types; this is a no-op stub. Drop. |
| `ffmpeg-static` | ^5.3.0 | **MISPLACED** | Only used by `scripts/record-criativo.mjs`. Move out of main `package.json`. |
| `playwright` | ^1.59.1 | **MISPLACED** | Only used by `scripts/record-criativo.mjs`. Move out of main `package.json`. |
| `jsdom` | ^20.0.3 | **OUT-OF-DATE** | jsdom 24+ is current. Vitest 3 may benefit from newer jsdom. |

**Reboot recommendation:** Rip out 7 zombies (~~ 1.5MB devDeps + 100KB+ bundle) and move 2 misplaced deps. The dep tree shrinks by maybe 30%.

---

## Configuration

**Environment:**
- `.env` (gitignored — present, contents not inspected per security policy)
- `.env.example` (5 vars only, all client-side):
  - `SUPABASE_PUBLISHABLE_KEY` (legacy, non-VITE prefix — unused)
  - `SUPABASE_URL` (legacy, non-VITE prefix — unused)
  - `VITE_SUPABASE_PROJECT_ID` (read for `Database` type generation flow but not in code)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key, read in `src/integrations/supabase/client.ts:6`)
  - `VITE_SUPABASE_URL` (project URL, read in `src/integrations/supabase/client.ts:5`)
- **NOT documented in `.env.example`** but required for production:
  - Server-side secrets live in Supabase Edge Function secrets dashboard, not in any `.env` file: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `APP_URL`, `GOOGLE_AI_API_KEY`, `CRON_SECRET`

**CONFIDENCE: LOW for documentation, HIGH for actual config.** `.env.example` is misleading — claims only 5 vars matter, but production has 8+ secret env vars in Supabase. Reboot should add a `SECRETS.md` or expand `.env.example` to list the Supabase-side secrets.

**Vite config (`vite.config.ts`):**
- Dev server: host `::`, port 8080, HMR overlay disabled
- Path alias: `@/*` → `./src/*`
- Manual chunk splitting: `vendor-react`, `vendor-ui`, `vendor-charts`, `vendor-query`
- `dedupe`: React, ReactDOM, Router, Lucide, Sonner, Query, Radix Dialog/Label/Select
- `optimizeDeps.include`: Query, Router, Lucide, Sonner

**TypeScript config:**
- `tsconfig.json` (project references → `tsconfig.app.json` + `tsconfig.node.json`)
- `tsconfig.app.json`: target ES2020, jsx `react-jsx`, **strict OFF**, `noImplicitAny: false`, `strictNullChecks: false`, includes `src/`
- `tsconfig.strict.json` exists (read by `npm run typecheck:strict`) — opt-in stricter pass
- `tsconfig.node.json` for Vite config files

**Tailwind config (`tailwind.config.ts`):**
- Custom design system: typography scale 2xs→7xl, shadow 1→5, radius 6/10/14/20, custom transition durations 180/220
- Dark mode via class `.theme-dark`
- Plugin: `tailwindcss-animate`

**Build:**
- `npm run build` → `vite build` (production bundle to `dist/`)
- `npm run build:dev` → `vite build --mode development` (source maps on)
- `npm run preview` → preview server on 4173

**Linting:**
- `npm run lint` → `eslint .` (flat config, ignores `dist`, `supabase/functions/**`, `scripts/**`)

**Type checking:**
- `npm run typecheck` → loose (`tsc --noEmit`)
- `npm run typecheck:strict` → opt-in strict check

**Testing:**
- `npm run test` → `vitest run`
- `npm run test:watch` → `vitest`

---

## Platform Requirements

**Development:**
- Node.js 18+ (per README; not enforced by `engines` field)
- npm (lockfile committed)
- Vite dev server on port 8080
- Locally: SQL editor or Supabase CLI for migrations (per README)

**Production:**
- **Hosting:** Vercel — auto-deploy on push to `main` branch (per README)
  - `vercel.json` is minimal: only a catch-all rewrite of `/(.*)` → `/index.html` (SPA fallback)
  - **No headers, no security policies, no caching rules.** Default Vercel behavior applies.
- **Domain:** `flashcards.com.br` (custom)
- **Backend:** Supabase project ref `zjyogswbgcauwqisvuyq` at `https://zjyogswbgcauwqisvuyq.supabase.co`
  - **Free tier** (per CLAUDE.md). Auto-pauses after ~7 days inactivity. **CRITICAL for launch.**
  - Recommendation in CLAUDE.md: move to Pro ($25/mo) before launch.

**OPINION on Supabase free tier:** Shipping a paid product (R$ 297/year) on a backend that auto-pauses after 7 days of inactivity is a self-inflicted launch risk. Paying customer's queries will start failing with `Connection terminated`. Pro tier is non-negotiable before opening the gate. The codebase has zero retry/backoff logic around the cold-start scenario.

**Deployment notes:**
- Frontend: `git push origin main` → Vercel build
- Edge functions: Manual deploy via `supabase functions deploy <name>` or dashboard — **not in CI**
- Migrations: Manual via SQL editor or `supabase db push` — **not in CI**, very brittle for a paid product

**Reboot recommendations:**
1. Add a `.github/workflows/` for at least CI lint/test gates
2. Add a deploy hook for edge functions on push (or document the manual process explicitly)
3. Add Supabase Pro tier
4. Add `.nvmrc` or `engines` field
5. Document all required server-side env vars in `.env.example` or a new `SECRETS.md`

---

## Stack-Level Health Summary

| Layer | Health | Notes |
|-------|--------|-------|
| Build tool (Vite 5 + SWC) | ✅ Excellent | Modern, fast, current. |
| UI lib (React 18 + Radix + Tailwind 3 + shadcn) | ✅ Excellent | Industry-standard stack. |
| Animation (Framer Motion 12) | ⚠️ Heavy | 40+ usages. Used aggressively — reboot may want to dial back for perf. |
| Backend client (`@supabase/supabase-js` 2.98) | ✅ Current | Singleton pattern, clean. |
| Edge functions | ⚠️ Inconsistent | 3 different Deno std versions, 3 different client versions. Standardize. |
| TypeScript strictness | ❌ Disabled | `strict: false` in main config. Reboot should flip on. |
| Form/validation (RHF + Zod) | ❌ Zombie | Dependencies installed but never used. Decide: adopt or remove. |
| Date handling (date-fns) | ❌ Zombie | Drop. |
| Graph/flow libs (xyflow + dagre + html-to-image) | ❌ Zombie | Drop. |
| Marketing video tooling (playwright + ffmpeg-static) | ⚠️ Misplaced | Move out of main `package.json`. |
| Test coverage | ⚠️ Thin | Vitest installed but few tests. |
| `.env.example` completeness | ❌ Incomplete | Only client-side vars documented. |
| Vercel config | ⚠️ Bare | Just SPA fallback — no headers, no security policy. |
| Supabase tier | ❌ Free tier | Auto-pauses after 7d. Pro tier required pre-launch. |
| CI/CD | ❌ None | No GitHub Actions. Deploys are manual / push-to-main only. |

**Bottom line on stack:** The **core** (Vite + React 18 + Supabase + Tailwind + shadcn + TanStack Query) is excellent and 100% reusable in a reboot. The **perimeter** has 7 zombie deps, 2 misplaced deps, an unused form layer (RHF+Zod) installed but never wired, and zero CI. A reboot's first day should be: bump TypeScript strict, prune zombies, document env vars, set up CI.

---

*Stack analysis: 2026-05-21*
