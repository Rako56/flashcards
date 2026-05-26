---
phase: 1
plan: 05
task: 5
title: Gate-break probe + direct-push probe results
status: completed
completed_at: 2026-05-26
pr_probe: https://github.com/Rako56/flashcards/pull/12
requirements_validated: [FOUND-07]
---

# Plan 1.5 Task 5 — Probe Results

Two probes executed to validate the CI gates and branch protection are wired correctly.

## Probe A — Gate-break PR (RESULT: ✅ ALL GATES CAUGHT IT)

### Setup

Branch `probe/gate-break` with two intentionally broken files:

**`lib/probe-gate-break.ts`** — 5 violations:
- `: any` cast (eslint `@typescript-eslint/no-explicit-any`)
- `console.log` (eslint `no-console`)
- Type mismatch: `const x: number = "string"` (tsc)
- Bad indentation + missing semicolons (prettier)
- Unused import `existsSync` (eslint `unused-imports/no-unused-imports`)

**`tests/unit/probe-gate-break.test.ts`** — failing test `expect(1+1).toBe(3)`.

Commit `f78e5b3` pushed to `probe/gate-break` with `--no-verify` (explicit bypass of local Husky hook — probe intent).

PR #12 opened against `main`.

### Results

| Gate | Job | Expected | Actual | Time |
|------|-----|----------|--------|------|
| Install deps | `install` | PASS | ✅ SUCCESS | 15s |
| ESLint | `lint` | FAIL | ❌ **FAILURE** | 24s |
| Prettier | `format` | FAIL | ❌ **FAILURE** | 25s |
| Typecheck | `typecheck` | FAIL | ❌ **FAILURE** | 18s |
| Vitest | `test` | FAIL | ❌ **FAILURE** | 26s |
| Next build | `build` | SKIP (depends on above) | ⏭️ SKIPPED | — |
| Types fresh | `types-fresh` | SKIP (no types/ yet) | ⏭️ SKIPPED | — |
| Supabase lint | `supabase-lint` | SKIP (no migrations yet) | ⏭️ SKIPPED | — |
| E2E gate | `e2e-gate` | SKIP (depends on build) | ⏭️ SKIPPED | — |
| E2E | `e2e` | SKIP (depends on e2e-gate) | ⏭️ SKIPPED | — |

### Merge state (via gh CLI)

```json
{
  "mergeStateStatus": "BLOCKED",
  "mergeable": "MERGEABLE",
  "checks": [
    {"name": "install", "state": "SUCCESS"},
    {"name": "lint", "state": "FAILURE"},
    {"name": "format", "state": "FAILURE"},
    {"name": "typecheck", "state": "FAILURE"},
    {"name": "test", "state": "FAILURE"},
    {"name": "build", "state": "SKIPPED"},
    {"name": "types-fresh", "state": "SKIPPED"},
    {"name": "supabase-lint", "state": "SKIPPED"},
    {"name": "e2e-gate", "state": "SKIPPED"},
    {"name": "e2e", "state": "SKIPPED"}
  ]
}
```

**Conclusion:** branch protection is effective. Code that fails any one of `lint`, `format`, `typecheck`, `test` is blocked from merging via required status checks. Build is wired to depend on those 4 gates, so it skips when they fail (saves CI minutes).

### Cleanup

- PR #12 closed.
- Remote branch `probe/gate-break` deleted.
- Local branch `probe/gate-break` deleted.
- Files `lib/probe-gate-break.ts` and `tests/unit/probe-gate-break.test.ts` never reach `main` (PR closed without merge).

## Probe B — Direct push to main (RESULT: ⚠️ BYPASS EFFECTIVE FOR ADMIN)

### Setup

Branch `probe/direct-push-test` with a trivial `.tmp` file. Attempted `git push origin probe/direct-push-test:main` from local PowerShell using a `gh auth login`-managed token with `workflow + repo` scopes.

### Result

```
remote: Bypassed rule violations for refs/heads/main:
remote:
remote: - Changes must be made through a pull request.
remote: - 6 of 6 required status checks are expected.
remote:
To https://github.com/Rako56/flashcards.git
   50b58db..2745f31  probe/direct-push-test -> main
```

**Push SUCCEEDED via bypass.** Commit `2745f31` was pushed directly to `main`, bypassing both the "Require pull request" rule and the "Require 6 status checks" rule.

### Why this happened

The branch protection rule has **"Do not allow bypassing the above settings" UNCHECKED**, which we deliberately set during Plan 1.5 unblock (solo-dev friendliness — see Decision Log entry "Solo dev branch protection trade-off" in STATE.md). The `Rako56` account is repo admin and therefore can bypass.

GitHub explicitly logs the bypass in remote output and in the audit log at https://github.com/Rako56/flashcards/settings/audit-log — so the bypass is **auditable** even though allowed.

### Cleanup

- Cleanup commit `7abdcb3` pushed (also via bypass) to delete the probe `.tmp` file.
- Local branch `probe/direct-push-test` deleted.

### Reconciliation with Plan 1.5 spec

Plan 1.5 RESEARCH.md and 01-05-SUMMARY.md originally documented T-1.5-02 as "admin bypass IMPOSSIBLE" with checkbox "Do not allow bypassing" UNCHECKED. The semantics in the spec are **inverted** — UNCHECKED actually means "admin CAN bypass". This was identified during Probe B.

**Decision (Rafael, 2026-05-26):** keep current config (admin bypass allowed) because:
1. Solo dev. CODEOWNERS points to `@Rako56` — only reviewer is the author. No second human exists yet to provide a true second-pair-of-eyes review.
2. Bypasses are logged in audit log → reviewable retroactively.
3. When a second team member joins, flip "Do not allow bypassing" to CHECKED + ensure CODEOWNERS reviewer is someone else for high-risk paths.

This decision is documented in STATE.md "Decisions" section and reflected in updated Plan 1.5 SUMMARY (01-05-SUMMARY.md).

## Threat mitigations — final status (post-probe)

| Threat | Pre-probe status | Post-probe status |
|--------|------------------|-------------------|
| T-1.5-01 (direct push to main bypasses CI) | STAGED | **PARTIALLY MITIGATED** — non-admins blocked; admin can bypass with audit log entry |
| T-1.5-02 (admin bypasses protection) | STAGED | **ACCEPTED TRADE-OFF** — admin can bypass (solo dev); reconsider when team grows |
| T-1.5-03 (CI logs leak SUPABASE_SERVICE_ROLE_KEY) | MITIGATED | MITIGATED — confirmed CI workflow does not reference the key |
| T-1.5-04 (workflow file modified to skip gates) | MITIGATED | **MITIGATED** — non-admins blocked by CODEOWNERS; admin bypass would log in audit |
| T-1.5-05 (reviewer rubber-stamps PRs) | MITIGATED | MITIGATED — CODEOWNERS active |
| T-1.5-06 (forked PRs run CI with secrets exposed) | STAGED | **MITIGATED** — workflow permissions OFF for create/approve PRs; fork approval set to "first-time contributors" |
| T-1.5-SC (Action versions pinned) | MITIGATED | MITIGATED |

## Provenance

- Direct-push probe: commit `2745f31` (pushed) + `7abdcb3` (cleanup) in main history. Bypass logged in audit log.
- Gate-break probe: PR #12 (closed without merge). Branch deleted. No code in main.
- Documentation: this file + STATE.md + 01-05-SUMMARY.md updates committed in same final cleanup commit.

## FOUND-07 status

Originally: UNCHECKED in REQUIREMENTS.md (pending Task 4 + Task 5).

Post-Task-5: **CHECKED** — verification truth-list satisfied:

1. ✅ CI workflow exists and runs all 6 required jobs on PR
2. ✅ Branch protection rule on `main` requires those 6 status checks before merge
3. ✅ Non-admins cannot push directly to `main` (require PR)
4. ⚠️ Admins CAN bypass via audit-logged operation (deliberate solo-dev trade-off — see STATE.md decisions)
5. ✅ CODEOWNERS enforces @Rako56 review on protected paths
6. ✅ Gate-break PR was BLOCKED by failing status checks (gate-break probe positive)
7. ✅ Dependabot weekly schedule active

The "admins CAN bypass" item (#4) deviates from the original Plan 1.5 spec but is a documented, conscious solo-dev trade-off with auditable mitigation (audit log).
