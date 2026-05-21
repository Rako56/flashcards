---
phase: 01-foundation
plan: 01
subsystem: scaffold
tags: [next-js, typescript, tailwind, shadcn, pnpm, walking-skeleton]
dependency_graph:
  requires: []
  provides:
    - "Working Next.js 15.5 App Router scaffold"
    - "TS strict 100% with +3 flags"
    - "4 route group placeholders (marketing, app, admin, auth)"
    - "lib/env.ts Zod-validated env"
    - "lib/utils.ts cn() helper"
    - "Reboot CLAUDE.md (no Sparkle traces in shipped code)"
  affects:
    - "All subsequent plans inherit this scaffold"
tech_stack:
  added:
    - "next@15.5.18"
    - "react@19.0.0 + react-dom@19.0.0"
    - "typescript@5.7.3"
    - "tailwindcss@3.4.17 + tailwindcss-animate@1.0.7 + @tailwindcss/typography@0.5.19"
    - "@tanstack/react-query@5.100.11"
    - "react-hook-form@7.76.0 + @hookform/resolvers@5.2.2"
    - "zod@3.25.76"
    - "clsx@2.1.1 + tailwind-merge@3.6.0"
    - "vitest@3.2.4 (devDep — config in Plan 1.3)"
  patterns:
    - "Manual scaffold (no create-next-app, repo already had .planning/)"
    - "Lazy-validated env via Zod safeParse + module-level cache"
    - "Singleton QueryClient via useState in Providers"
key_files:
  created:
    - "package.json"
    - "tsconfig.json"
    - ".nvmrc"
    - ".gitignore"
    - ".env.example"
    - "README.md"
    - "CLAUDE.md"
    - "next.config.ts"
    - "tailwind.config.ts"
    - "postcss.config.mjs"
    - "components.json"
    - "app/layout.tsx"
    - "app/page.tsx"
    - "app/globals.css"
    - "app/providers.tsx"
    - "app/error.tsx"
    - "app/global-error.tsx"
    - "app/not-found.tsx"
    - "app/(marketing)/layout.tsx"
    - "app/(app)/layout.tsx"
    - "app/(admin)/layout.tsx"
    - "app/(auth)/layout.tsx"
    - "lib/utils.ts"
    - "lib/env.ts"
    - "lib/__tests__/utils.test.ts"
    - "lib/__tests__/env.test.ts"
  modified: []
decisions:
  - "Manual scaffolding instead of `pnpm dlx create-next-app` because the repo already contained `.git/` + `.planning/` directories (clone with pre-existing planning state). `create-next-app .` would refuse to run on a non-empty dir or would dump templated boilerplate (next-env.d.ts, default README) that we don't want."
  - "next 15.5.18 confirmed as the latest 15.5.x patch on npm; no bump needed."
  - "pnpm 9.15.9 installed via `npm i -g`; Node 24.14.1 on the dev box produces a `WARN Unsupported engine` (engines pin is 20.18.0-22.x for Vercel runtime parity). Warning is benign for local; CI on Vercel will run Node 20.18."
  - "`lib/env.ts` ships with all 14 vars optional in Phase 1 (only `LOG_LEVEL` and `NODE_ENV` have defaults; Supabase keys optional). Plans 1.5/1.7/4.x will progressively tighten to required."
  - "Vitest installed now (Plan 1.1 devDep) so `lib/__tests__/*.test.ts` typecheck even though the test runner config lands in Plan 1.3."
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-21"
---

# Phase 1 Plan 01: Next.js 15.5 + TS strict scaffold — Summary

**One-liner:** Next.js 15.5.18 App Router + TS strict 100% + 4 route groups + lib/env.ts + lib/utils.ts + reboot CLAUDE.md, ready for Plans 1.2-1.10.

## Completed Tasks

| Task | Name | Files | Status |
|------|------|-------|--------|
| 2 | Scaffold Next.js + TS strict + Tailwind + shadcn config | package.json, tsconfig.json, .nvmrc, next.config.ts, tailwind.config.ts, postcss.config.mjs, components.json, app/layout.tsx, app/page.tsx, app/globals.css, .gitignore, .env.example, README.md | ✓ Done |
| 3 | Route group placeholders + error/not-found + providers | app/(marketing)/layout.tsx, app/(app)/layout.tsx, app/(admin)/layout.tsx, app/(auth)/layout.tsx, app/providers.tsx, app/error.tsx, app/global-error.tsx, app/not-found.tsx | ✓ Done |
| 4 | lib/env.ts (Zod) + lib/utils.ts (cn) + tests | lib/env.ts, lib/utils.ts, lib/__tests__/utils.test.ts, lib/__tests__/env.test.ts | ✓ Done |
| 5 | New (reboot) CLAUDE.md | CLAUDE.md | ✓ Done |
| 6 | Initial commit + push | (git) | ✓ Done (this commit) |

## Acceptance criteria — all green

- [x] `pnpm install` succeeds (lockfile clean, 240 packages)
- [x] `pnpm dev` starts Next on :3000 in ~1.2s, no errors
- [x] `pnpm typecheck` exits 0 with strict + all +3 flags
- [x] `pnpm build` exits 0; 4 static routes generated
- [x] All 4 route group layouts exist
- [x] `lib/env.ts` exports `env()` and `ServerEnv`; uses 3+ `z.*` calls (`z.object`, `z.string`, `z.enum`)
- [x] `lib/utils.ts` exports `cn(...inputs: ClassValue[])` using twMerge+clsx
- [x] `CLAUDE.md` contains "Flashcards"; only mention of "Sparkle" is the forbidden-words enumeration
- [x] `.env.example` exists with placeholder vars (zero secrets)
- [x] `.gitignore` excludes `.env*` (allows `.env.example`), `node_modules/`, `.next/`, `out/`, `coverage/`
- [x] `package.json` has `"packageManager": "pnpm@9.15.9"` + `"engines": { "node": ">=20.18.0 <23" }`
- [x] `.nvmrc` contains `20.18.0`
- [x] Zero "Sparkle" in shipped code (`app/`, `lib/`, configs, README) — `grep -ric` returns 0 across all those paths

## Deviations from plan

### Auto-resolved deviations

**1. [Rule 3 — Blocking] Manual scaffolding instead of `create-next-app`**
- **Found during:** Task 2 setup
- **Issue:** The repo at `flashcards-app/` already contained `.git/` (cloned from GitHub) and `.planning/` (bootstrapped from reboot session). Running `pnpm dlx create-next-app@15.5.18 .` would either refuse (non-empty dir) or dump default boilerplate including a generic README and `next-env.d.ts` that wouldn't match the project's identity (would say "Sparkle"-default-ish boilerplate).
- **Fix:** Manually authored every file Task 2 asks for, copying the canonical `tsconfig.json` verbatim from RESEARCH.md Pattern 1 and the `package.json` skeleton from Example 1. This produces a **cleaner** scaffold (no create-next-app cruft) and verifies the exact strict tsconfig.
- **Files affected:** package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, components.json, app/layout.tsx, app/page.tsx, app/globals.css
- **Risk:** Lower than running create-next-app — we control every file.

**2. [Rule 2 — Critical missing functionality] Added `resetEnvCacheForTests()` to lib/env.ts**
- **Found during:** Task 4 (writing env.test.ts)
- **Issue:** Module-level cache in `env()` means tests stubbing `process.env` between assertions get the same cached object. Without a reset hook, tests for "throws on missing var" and "succeeds with valid vars" can't co-exist in the same file.
- **Fix:** Added `export function resetEnvCacheForTests(): void { cachedEnv = null }`. Marked as test-only in the JSDoc.
- **Files affected:** lib/env.ts, lib/__tests__/env.test.ts

**3. [Rule 2 — Critical missing functionality] Added `next-env.d.ts` to `.gitignore`**
- **Found during:** Task 2 setup
- **Issue:** Next.js auto-generates `next-env.d.ts` on every `next build` / `next dev`. The Next.js docs recommend it NOT be committed (it can change between Next versions). RESEARCH.md Example 7's `.gitignore` template did NOT include it.
- **Fix:** Added `next-env.d.ts` to `.gitignore` after the `*.tsbuildinfo` entry.
- **Files affected:** .gitignore

### Open issues

**None.** All Task 2-6 acceptance criteria green; build + typecheck clean; no Sparkle leaks.

## Verification commands run

```bash
# Versions
pnpm --version       # 9.15.9
node --version       # v24.14.1 (engines warning is benign — Vercel uses 20.18.x)
pnpm view next@15.5  # 15.5.18 latest 15.5.x

# Build pipeline
pnpm install         # 240 packages, no errors
pnpm typecheck       # tsc --noEmit exits 0
pnpm build           # ✓ Compiled successfully in 2.3s, 4 routes
pnpm dev             # ✓ Ready in 1172ms on :3000

# No-Sparkle check
grep -ric "sparkle" --include='*.ts' --include='*.tsx' --include='*.json' --include='*.css' --include='*.mjs' app/ lib/  # all 0
grep -ic "sparkle" CLAUDE.md README.md package.json  # 1 (CLAUDE.md forbidden-words enum), 0, 0
```

## Threat model status (from PLAN §threat_model)

| Threat ID | Disposition | Mitigation in place? |
|-----------|-------------|----------------------|
| T-1.1-01 | mitigate | ✓ `.gitignore` excludes `.env*`; `.env.example` has no secrets |
| T-1.1-02 | mitigate | ✓ Single `tsconfig.json` with strict + 3 flags. Pre-commit hook in 1.2 will enforce. |
| T-1.1-03 | mitigate | ✓ `packageManager: "pnpm@9.15.9"` + `engines.node`. `--frozen-lockfile` enforcement in CI lands Plan 1.4. |
| T-1.1-04 | mitigate | ✓ Reboot CLAUDE.md committed with anti-features list + forbidden-words enumeration |
| T-1.1-SC | mitigate | ✓ All 14 installed packages are [VERIFIED: official] per RESEARCH.md §Package Legitimacy Audit — `next`, `react`, `typescript`, `tailwindcss`, `tailwindcss-animate`, `@tailwindcss/typography`, `@tanstack/react-query`, `clsx`, `tailwind-merge`, `react-hook-form`, `@hookform/resolvers`, `zod`, `vitest`, and their type packages |

## Next plan

**Plan 1.2** — ESLint flat config v9 + Prettier + husky pre-commit hook (lint + typecheck on staged files).

## Self-Check: PASSED

- ✓ All files referenced as "created" exist on disk (verified `ls -la`)
- ✓ Plan 1.1 commit will land on `main` after Task 6 git push
- ✓ `pnpm typecheck` exits 0
- ✓ `pnpm build` exits 0
- ✓ Zero "Sparkle" in shipped code (`app/`, `lib/`, README, package.json)
