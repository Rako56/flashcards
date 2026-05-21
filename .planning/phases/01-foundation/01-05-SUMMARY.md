---
phase: 1
plan: 05
title: GitHub Actions CI + CODEOWNERS + PR template + Dependabot
status: halted-at-checkpoint
completed_at: pending-rafael-auth-gate
commit_local: 83dce3a
commit_pushed: blocked-pat-missing-workflow-scope
requirements: [FOUND-07]
tasks_done: [1, 2, 3-local]
tasks_pending: [3-push, 4, 5]
provides:
  - "CI workflow (.github/workflows/ci.yml) — 10 jobs: install, lint, format, typecheck, test, build (all gating) + types-fresh, supabase-lint, e2e-gate, e2e (auto-skip until owning plans land)"
  - "CODEOWNERS — @Rako56 required reviewer on money/correctness paths (lib/srs, lib/queue, lib/asaas, lib/access, supabase/migrations, app/api/{asaas,healthz}, workflows, planning docs)"
  - "Pull request template (.github/PULL_REQUEST_TEMPLATE.md) — pre-merge gate checklist + anti-features check (no IA visible, no Tiptap, no Sparkle, no UUIDs)"
  - "Dependabot config (.github/dependabot.yml) — weekly Monday America/Sao_Paulo, grouped npm (next, test-tooling, supabase, lint-format, tailwind) + github-actions"
key-files:
  created:
    - flashcards/.github/workflows/ci.yml
    - flashcards/CODEOWNERS
    - flashcards/.github/PULL_REQUEST_TEMPLATE.md
    - flashcards/.github/dependabot.yml
  modified: []
decisions:
  - "CI jobs split lint vs format into 2 separate jobs (RESEARCH Pattern 4 had them as 2 steps in one `lint` job) — surfaces format failures distinctly in branch-protection required-checks, plus runs the 2 gates in parallel for faster red signal"
  - "e2e gating uses a 1-step `e2e-gate` job that copies `secrets.PLAYWRIGHT_BASE_URL` into a step output, because GitHub does NOT expose `secrets.*` to job-level `if:` expressions (deliberate security boundary). The `e2e` job then gates on `needs.e2e-gate.outputs.run == 'true'`. This is the canonical workaround documented in GitHub Actions community."
  - "5 active required status checks for branch protection (Task 4): install, lint, format, typecheck, test, build. Adding types-fresh / supabase-lint / e2e to the required list waits for Plans 1.9 / 1.7-1.8 / 1.12-1.13 respectively — adding them prematurely would block all PRs since the jobs would never run / never report a status."
metrics:
  duration_min: ~12 (tasks 1-3 local; push + Task 4 + Task 5 pending Rafael auth gate)
  files_created: 4
  files_modified: 0
  tasks_completed: 3 (Tasks 1, 2, 3-commit) + 0 (Task 3-push, Task 4, Task 5 pending)
  tests_passing: 17 (unchanged — no test code touched)
---

# Phase 1 Plan 1.5: GitHub Actions CI + Repo Hardening Summary

`HALTED at Task 3 final push (auth gate) — local commit 83dce3a preserved ahead of origin/main, push refused by GitHub for missing PAT workflow scope.`

GitHub Actions CI pipeline + CODEOWNERS + PR template + Dependabot all written and **committed locally** with all 5 local gates green (lint, format:check, typecheck, test:coverage 17/17 100% protected, build). The final `git push origin main` was REFUSED by GitHub because the local PAT used by git's credential manager does NOT carry the `workflow` scope required to create/update files under `.github/workflows/`. This is a pure auth gate — no code or config issue.

## Goal

Per RESEARCH.md Pattern 4 + VALIDATION.md FOUND-07: every PR runs lint → typecheck → test (with per-path coverage) → build → e2e (when available); merge to `main` blocked unless all checks green + ≥1 CODEOWNERS-approved review; direct push to `main` rejected. Plan 1.5 ships the CI workflow + CODEOWNERS + PR template + Dependabot (Tasks 1-3, automated), then halts for Rafael to add secrets + configure branch protection in the GitHub UI (Task 4), then runs a gate-break probe PR to PROVE the gates block bad code (Task 5).

## Tasks Completed

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Write `.github/workflows/ci.yml` (10 jobs) | DONE | 271 lines, all `@v4` actions, concurrency cancellation, skip guards on 3 future-plan jobs (types-fresh / supabase-lint / e2e via e2e-gate) |
| 2 | Write CODEOWNERS + PR template + dependabot.yml | DONE | 4 files total (38 + 42 + 73 lines respectively). PR template covers pre-merge checklist + anti-features check |
| 3a | Commit Plan 1.5 changes | DONE | Commit `83dce3a` (4 files, 424 insertions, 0 deletions). Pre-commit hooks ran clean (lint-staged formatted 3 yml/md files; typecheck passed). |
| 3b | Push to `origin/main` | **BLOCKED** | `! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or update workflow .github/workflows/ci.yml without 'workflow' scope)` |
| 4 | Rafael: 6 placeholder secrets + branch protection rules + workflow permissions | PENDING | Manual GitHub UI work — see "Rafael's Next Steps" below |
| 5 | Gate-break probe + direct-push rejection probe | PENDING | Blocked by Task 3b and Task 4 |

## Acceptance criteria for Tasks 1-2-3a — all green

| # | Check | Result |
|---|-------|--------|
| 1 | `.github/workflows/ci.yml` exists with all expected jobs | ✓ (10 jobs: install, lint, format, typecheck, test, types-fresh, supabase-lint, build, e2e-gate, e2e) |
| 2 | `grep -c "needs:" ci.yml` >= 7 | ✓ (9 needs: clauses) |
| 3 | `grep -c "pnpm/action-setup@v4\|actions/setup-node@v4\|actions/checkout@v4" ci.yml` >= 3 | ✓ (25 matches) |
| 4 | `grep "concurrency:" ci.yml` returns 1 | ✓ |
| 5 | `grep "cancel-in-progress: true" ci.yml` returns 1 | ✓ |
| 6 | `grep "pnpm install --frozen-lockfile" ci.yml` >= 1 | ✓ (8 matches — one per job) |
| 7 | `CODEOWNERS` exists with required paths | ✓ (lib/srs, lib/queue, lib/asaas, lib/access, supabase/migrations, app/api/asaas, app/api/healthz, workflows, planning) |
| 8 | `PULL_REQUEST_TEMPLATE.md` exists with checklist | ✓ (5+ matches of `pnpm lint\|pnpm typecheck\|pnpm test\|: any\|console.log`) |
| 9 | `.github/dependabot.yml` exists with both npm + github-actions ecosystems | ✓ |
| 10 | `pnpm lint` exits 0 | ✓ |
| 11 | `pnpm format:check` exits 0 | ✓ |
| 12 | `pnpm typecheck` exits 0 | ✓ |
| 13 | `pnpm test:coverage` exits 0 (17/17 tests, 100% protected) | ✓ |
| 14 | `pnpm build` exits 0 (Next 15.5, 4 routes static) | ✓ |
| 15 | Pre-commit hook ran clean | ✓ (lint-staged + typecheck both green) |
| 16 | Commit `83dce3a` created locally | ✓ |
| 17 | Commit pushed to `origin/main` | **✗ BLOCKED — PAT lacks `workflow` scope** |

## Files created

### `.github/workflows/ci.yml` (271 lines)

Single CI workflow with 10 jobs:

| Job | Depends on | Purpose | Active in P1.5? |
|-----|-----------|---------|------------------|
| `install` | — | Warm pnpm-store + node_modules cache | YES |
| `lint` | `install` | `pnpm lint` (ESLint flat config, max-warnings 0) | YES |
| `format` | `install` | `pnpm format:check` (Prettier) | YES |
| `typecheck` | `install` | `pnpm typecheck` (tsc --noEmit, strict tsconfig) | YES |
| `test` | `install` | `pnpm test:coverage` + uploads coverage artifact | YES |
| `types-fresh` | `install` | Regen `types/database.types.ts` + diff-check | **SKIP** (waits Plan 1.9) |
| `supabase-lint` | `install` | `supabase db lint --linked` | **SKIP** (waits Plans 1.7/1.8) |
| `build` | `[lint, format, typecheck, test]` | `pnpm build` (Next 15.5 production bundle, `.next/cache` cached) | YES |
| `e2e-gate` | `build` | Outputs `run=true/false` based on `secrets.PLAYWRIGHT_BASE_URL` presence | YES (returns `run=false`) |
| `e2e` | `e2e-gate` | Install Chromium + `pnpm test:e2e` against Vercel preview | **SKIP** (waits Plan 1.12) |

Skip guards:
- `types-fresh`: `if: hashFiles('types/database.types.ts') != ''` → skips until the file exists.
- `supabase-lint`: `if: hashFiles('supabase/migrations/*.sql') != ''` → skips until first migration lands.
- `e2e`: `if: needs.e2e-gate.outputs.run == 'true'` → skips until `PLAYWRIGHT_BASE_URL` secret is non-empty.

Triggers: `pull_request: [main]` + `push: [main]`. Concurrency cancellation: `${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true`. Permissions: `contents: read` + `pull-requests: write` (least-privilege per T-1.5-06).

### `CODEOWNERS` (38 lines)

Repo-root location (GitHub-native). Default `* @Rako56` + specific overrides for high-coverage protected libs (`/lib/srs/`, `/lib/queue/`, `/lib/asaas/`, `/lib/access/`, `/lib/supabase/admin.ts`), DB migrations (`/supabase/migrations/`), server-side payment endpoints (`/app/api/asaas/`, `/app/api/healthz/`), build/CI tooling (`/.github/workflows/`, `/eslint.config.mjs`, `/tsconfig.json`, `/vitest.config.ts`, `/playwright.config.ts`, `/next.config.ts`), and project memory (`/CLAUDE.md`, `/.planning/`).

### `.github/PULL_REQUEST_TEMPLATE.md` (42 lines)

5 sections: Summary, Plan reference (slot for Requirement IDs), Pre-merge checklist (lint/typecheck/test:coverage/format:check/types:gen if migrations/console.log/`: any`/UUIDs/slopcheck), Anti-features check (no IA visible, no Tiptap caderno, no Sparkle branding, no `eslint-disable` without comment), Risk + rollback.

### `.github/dependabot.yml` (73 lines)

Two `updates:` entries:
- `npm` directory `/` — weekly Monday 09:00 America/Sao_Paulo, max 5 open PRs, labels `[dependencies]`, commit prefix `chore(deps)`. Groups: `next-ecosystem` (next, @next/*, eslint-config-next, @next/eslint-plugin-next), `test-tooling` (vitest, @vitest/*, @playwright/*, @testing-library/*, msw, jsdom), `supabase` (@supabase/*, supabase), `lint-format` (eslint, eslint-*, @eslint/*, typescript-eslint, prettier, prettier-*), `tailwind` (tailwindcss, tailwindcss-*, @tailwindcss/*, autoprefixer, postcss).
- `github-actions` directory `/` — weekly Monday, max 3 open PRs, labels `[dependencies, ci]`, commit prefix `chore(ci)`. Catches CVEs in pinned `@v4` actions (T-1.5-SC mitigation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `if: ${{ secrets.PLAYWRIGHT_BASE_URL != '' }}` rejected by GitHub Actions**

- **Found during:** Task 1 (writing the e2e job)
- **Issue:** The RESEARCH.md Pattern 4 example uses `if: env.PLAYWRIGHT_BASE_URL != ''` for the e2e job. But `secrets.*` are NOT exposed to job-level `if:` expressions in GitHub Actions — this is a deliberate security boundary so that secret presence can't be exfiltrated via expression evaluation. Direct `if: ${{ secrets.X != '' }}` is silently treated as `if: false`.
- **Fix:** Added a tiny `e2e-gate` job that runs `if [ -n "$PLAYWRIGHT_BASE_URL" ]; then echo run=true >> $GITHUB_OUTPUT; ...` with the secret injected via `env:`. The `e2e` job then gates on `needs.e2e-gate.outputs.run == 'true'`. Outputs ARE exposed to job-level `if:`, so this works correctly. Cost: one extra ~2s job that runs unconditionally but skips downstream e2e until the secret is set.
- **Files modified:** `.github/workflows/ci.yml`
- **Rationale:** This is the canonical workaround documented in GitHub Actions community discussions. RESEARCH.md Pattern 4 was simplified pseudocode; the gate-job pattern is the production-grade real shape.

**2. [Rule 2 — Critical functionality] Split `lint` job into separate `lint` + `format` jobs**

- **Found during:** Task 1
- **Issue:** RESEARCH.md Pattern 4 puts `pnpm lint` and `pnpm format:check` as two steps in one `lint` job. That has two problems: (a) when format fails but lint passes, the "lint" check is red even though lint itself is green — confusing for contributors; (b) they don't run in parallel, slowing the PR-feedback loop.
- **Fix:** Split into 2 jobs: `lint` (just `pnpm lint`) and `format` (just `pnpm format:check`). Each has its own status in branch protection so the required-checks list is `[install, lint, format, typecheck, test, build]` (6 active) instead of `[install, lint, typecheck, test, build]` (5).
- **Files modified:** `.github/workflows/ci.yml`
- **Rationale:** Pattern 4 was pseudocode for the canonical shape; production CI splits gates as fine-grained as possible because debugging a multi-gate `lint` job means scrolling logs to find which gate failed.

**3. [Rule 2 — Critical functionality] Added `.next/cache` caching for the `build` job**

- **Found during:** Task 1
- **Issue:** RESEARCH.md Pattern 4 caches pnpm-store via `actions/setup-node@v4` `cache: 'pnpm'` but does NOT cache Next.js incremental build outputs. First CI run is fine, but subsequent runs do full rebuild from scratch — wasted minutes.
- **Fix:** Added `actions/cache@v4` step to the `build` job keyed by `pnpm-lock.yaml` + all `.ts/.tsx` content hash, restoring from a `pnpm-lock.yaml`-only prefix when the content hash differs (so the cache survives source-only changes).
- **Files modified:** `.github/workflows/ci.yml`
- **Rationale:** Next.js docs recommend this exact pattern for CI. The cost is negligible (cache write is async); the saving is 30-90s on typical builds.

## Blocker — pending Rafael auth gate

**Title:** GitHub refused `git push origin main` because the credential PAT lacks `workflow` scope.

**Verbatim error:**
```
! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or update workflow `.github/workflows/ci.yml` without `workflow` scope)
```

**Root cause:** The PAT cached in Windows Git Credential Manager (`credential.helper=manager`) was minted with `repo` scope but NOT `workflow` scope. GitHub specifically refuses any push that touches `.github/workflows/*.yml` unless the auth principal has the `workflow` scope — a deliberate protection so a leaked PAT can't be used to backdoor a repo's CI.

**State preserved locally:**
- Commit `83dce3a` is sitting on `main` (ahead of `origin/main` by 1 commit)
- Working tree is clean (`git status` reports no changes, no untracked)
- 4 files staged in that commit: `.github/workflows/ci.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`, `CODEOWNERS`
- All 5 local gates (lint, format, typecheck, test:coverage, build) green
- Push needs only to retry once auth is fixed; no code changes required

**Rafael's resolution options:** see "Rafael's Next Steps" section below.

## Threat mitigations applied

- **T-1.5-01 (HIGH, direct push to main bypasses CI)** → STAGED. Branch protection rule (Task 4 Step B) will block direct pushes. Confirmed by Task 5 direct-push probe (pending Task 4).
- **T-1.5-02 (HIGH, admin bypasses protection)** → STAGED. Task 4 Step B explicitly leaves "Do not allow bypassing the above settings" UNCHECKED — making admin bypass IMPOSSIBLE. Documented in Task 4 instructions to Rafael.
- **T-1.5-03 (HIGH, CI logs leak SUPABASE_SERVICE_ROLE_KEY)** → MITIGATED. The CI workflow does NOT reference `SUPABASE_SERVICE_ROLE_KEY` at all. Only `NEXT_PUBLIC_*` (designed for client exposure) and `SUPABASE_ACCESS_TOKEN` (used by `supabase/setup-cli@v1` for CLI auth, GitHub auto-masks).
- **T-1.5-04 (HIGH, workflow file modified to skip gates)** → MITIGATED. `CODEOWNERS` requires `@Rako56` review on `/.github/workflows/`. PR template + branch protection make this a 3-layer ack.
- **T-1.5-05 (LOW, reviewer rubber-stamps PRs)** → MITIGATED. CODEOWNERS makes @Rako56 required reviewer on lib/srs, lib/queue, lib/asaas, lib/access, lib/supabase/admin.ts, supabase/migrations, app/api/asaas, app/api/healthz. Review history visible on each PR.
- **T-1.5-06 (MEDIUM, forked PRs run CI with secrets exposed)** → STAGED. CI workflow permissions block is `contents: read` + `pull-requests: write` (least privilege). Rafael's Task 4 Step C will additionally disable "Send write tokens to workflows from pull requests" in Settings → Actions.
- **T-1.5-SC (MEDIUM, Action versions pinned to major)** → MITIGATED. All actions pinned to `@v4` (latest stable major). Dependabot weekly `github-actions` ecosystem catches major CVEs.

## Rafael's Next Steps

Three blocks of work, **all manual on github.com**. Do them in order.

### A) UNBLOCK THE PUSH — choose one option

**Option 1 (recommended): regenerate PAT with `workflow` scope.**
1. Go to https://github.com/settings/tokens
2. Find your current PAT in the list; click "Regenerate" (or generate a new one)
3. Check the boxes: `repo` (full), `workflow`, `read:org`. Set 90-day expiry.
4. Copy the new token.
5. Run: `git config --global credential.helper manager` (already set per `credential.helper=manager`).
6. Run: `git push origin main` from `C:\Users\Gamer\Documents\flashcards-app`. When prompted for username+password, enter your GitHub username and PASTE the new PAT as the password. Windows Credential Manager will cache it.

**Option 2 (alternative): install `gh` CLI and re-auth via OAuth (gets full scopes automatically).**
1. Download from https://cli.github.com/ (Windows .msi)
2. Run: `gh auth login` → choose GitHub.com → HTTPS → "Login with a web browser" → paste the device code in the browser.
3. After login, `gh auth status` should show `git operations protocol: https` + scopes including `workflow`.
4. Run: `git push origin main` from `C:\Users\Gamer\Documents\flashcards-app`.

**Option 3 (last resort): create the files via GitHub web UI.**
- Open https://github.com/Rako56/flashcards
- Use "Add file → Create new file" to recreate each of the 4 files. (NOT recommended — slow and you'd need to discard the local commit and re-fetch.)

**After push succeeds:**
- Verify commit `83dce3a` appears at https://github.com/Rako56/flashcards/commits/main
- Verify the first CI run is visible at https://github.com/Rako56/flashcards/actions
- Expected: `install`, `lint`, `format`, `typecheck`, `test`, `build` GREEN. `e2e-gate` GREEN with `run=false` (because no `PLAYWRIGHT_BASE_URL` secret yet). `types-fresh`, `supabase-lint`, `e2e` SKIPPED (no `types/database.types.ts`, no `supabase/migrations/`, gate output is false).

### B) ADD 6 PLACEHOLDER SECRETS

At https://github.com/Rako56/flashcards/settings/secrets/actions → "New repository secret":

| Name | Placeholder value | Real source (plan) |
|------|------------------|--------------------|
| `SUPABASE_PROJECT_ID` | `pending-plan-1.6` | Supabase Dashboard → Settings → API → Reference ID (Plan 1.6) |
| `SUPABASE_ACCESS_TOKEN` | `pending-plan-1.6` | https://supabase.com/dashboard/account/tokens (Plan 1.6) |
| `NEXT_PUBLIC_SUPABASE_URL` | `pending-plan-1.6` | Supabase Dashboard → Settings → API (Plan 1.6) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `pending-plan-1.6` | Supabase Dashboard → Settings → API (Plan 1.6) |
| `NEXT_PUBLIC_SENTRY_DSN` | `pending-plan-1.10` | Sentry Dashboard → Settings → Projects → DSN (Plan 1.10) |
| `SENTRY_AUTH_TOKEN` | `pending-plan-1.10` | Sentry → Settings → Auth Tokens (Plan 1.10) |

DO NOT create `PLAYWRIGHT_BASE_URL` yet — leaving it absent keeps the `e2e-gate` job returning `run=false`, which is what we want until Plan 1.12 wires Vercel previews.

### C) CONFIGURE BRANCH PROTECTION ON `main`

At https://github.com/Rako56/flashcards/settings/branches → "Add branch protection rule":

- **Branch name pattern:** `main`
- ☑ Require a pull request before merging
  - ☑ Require approvals: **1**
  - ☑ Dismiss stale pull request approvals when new commits are pushed
  - ☑ Require review from Code Owners
- ☑ Require status checks to pass before merging
  - ☑ Require branches to be up to date before merging
  - **Required status checks** (search and add each — they'll only appear in the dropdown AFTER the first CI run finishes):
    - `install`
    - `lint`
    - `format`
    - `typecheck`
    - `test`
    - `build`
  - (Do NOT add `types-fresh`, `supabase-lint`, `e2e-gate`, `e2e` yet. They will be added in Plans 1.9, 1.7/1.8, and 1.12.)
- ☑ Require conversation resolution before merging
- ☑ Require linear history
- ☐ Allow force pushes — **MUST stay OFF**
- ☐ Allow deletions — **MUST stay OFF**
- ☐ "Do not allow bypassing the above settings" — **MUST stay OFF** (this is the *admin-bypass disabled* check per T-1.5-02)

Click "Create".

### D) CONFIGURE WORKFLOW PERMISSIONS

At https://github.com/Rako56/flashcards/settings/actions → "Workflow permissions" section:

- ☑ "Read and write permissions" (CI needs to post PR comments)
- ☐ "Send write tokens to workflows from pull requests" — **MUST stay OFF** (T-1.5-06)

Click "Save".

### E) CONFIRM BACK

Reply with one of:
- **"protection done"** — I'll execute Task 5 (gate-break probe PR + direct-push probe) and produce the final SUMMARY update + FOUND-07 completion.
- **"skip protection probe"** — I'll mark Plan 1.5 done without Task 5; the verification truth-list will stay UNCHECKED in REQUIREMENTS.md.
- **"problem: X"** — I'll help debug the GitHub UI step that failed.

## Self-Check: PASSED (for Tasks 1-2-3a only — Task 3b push remains BLOCKED)

- File `.github/workflows/ci.yml`: FOUND
- File `CODEOWNERS`: FOUND
- File `.github/PULL_REQUEST_TEMPLATE.md`: FOUND
- File `.github/dependabot.yml`: FOUND
- Commit `83dce3a`: FOUND locally (`git log --oneline -1`)
- Commit pushed to `origin/main`: NOT YET — auth gate, pending Rafael Step A
- 5 local gates green (lint, format, typecheck, test:coverage, build): CONFIRMED

## Next plan

After Tasks 3b/4/5 complete: **Plan 1.6** — Supabase Pro project provisioning + `.env.local` wiring + `lib/supabase/{client,server,admin}.ts` (FOUND-08).
