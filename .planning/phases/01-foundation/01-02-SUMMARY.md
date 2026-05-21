---
phase: 01-foundation
plan: 02
subsystem: lint-format-hooks
tags: [eslint, prettier, husky, lint-staged, quality-gates, typescript-eslint, flat-config]
dependency_graph:
  requires:
    - "Plan 1.1 (Next.js 15.5 scaffold + TS strict tsconfig)"
  provides:
    - "ESLint v9 flat config that blocks `: any`, `as any`, console.log, UUID literals, deep relative imports — all `error` severity"
    - "Prettier 3.x with tailwind plugin + singleQuote + no-semi + printWidth 100 + endOfLine lf"
    - "Husky 9 pre-commit (lint-staged + tsc) + pre-push (tsc) hooks"
    - "tests/lint-fixtures/ — 4 tracked files with intentional violations + README"
    - "VS Code workspace settings (defaultFormatter, formatOnSave, ESLint auto-fix, flat-config flag)"
    - "package.json scripts: lint, lint:fix, format, format:check, prepare"
    - "package.json lint-staged config with --no-warn-ignored to skip fixture warnings during staged runs"
  affects:
    - "Every subsequent plan inherits these gates — no path to commit `: any` casts without --no-verify"
    - "Plan 1.4 (CI gates) wires the same checks server-side as required status checks"
    - "Plan 1.10 (final verification) probes the gate-break fixtures from CI to prove gates stay active"
tech_stack:
  added:
    - "eslint@9.39.4"
    - "typescript-eslint@8.59.4 (parser + plugin via meta package)"
    - "@next/eslint-plugin-next@15.5.18"
    - "eslint-plugin-react-hooks@5.2.0"
    - "eslint-plugin-react-refresh@0.5.2"
    - "@eslint/js@9.39.4"
    - "prettier@3.8.3"
    - "prettier-plugin-tailwindcss@0.6.14"
    - "husky@9.1.7"
    - "lint-staged@15.5.2"
  patterns:
    - "ESLint v9 flat config — single eslint.config.mjs, no .eslintrc.*"
    - "tsEslint.config() builder with strictTypeChecked + stylisticTypeChecked"
    - "Per-file-pattern overrides (test files, config files, lint-fixtures) using tsEslint.configs.disableTypeChecked"
    - "Lint fixtures excluded from default lint via top-level ignores; lintable explicitly via --no-ignore"
    - "Pre-commit hook = lint-staged + full-project tsc (slower but catches unstaged-file regressions)"
    - "lint-staged --no-warn-ignored so ignored fixtures don't trip --max-warnings 0"
key_files:
  created:
    - "eslint.config.mjs"
    - ".prettierrc"
    - ".prettierignore"
    - ".vscode/settings.json"
    - ".vscode/extensions.json"
    - ".husky/pre-commit"
    - ".husky/pre-push"
    - "tests/lint-fixtures/bad-any.ts"
    - "tests/lint-fixtures/bad-uuid.ts"
    - "tests/lint-fixtures/bad-console-log.ts"
    - "tests/lint-fixtures/bad-relative-import.ts"
    - "tests/lint-fixtures/README.md"
  modified:
    - "package.json (scripts + lint-staged config + 10 new devDeps)"
    - "pnpm-lock.yaml (143 new transitive packages)"
    - "tsconfig.json (added tests/lint-fixtures/** to exclude)"
    - "tailwind.config.ts (require → ES imports for tailwindcss-animate + @tailwindcss/typography)"
    - "app/error.tsx (removed unused eslint-disable-next-line directives)"
    - "app/global-error.tsx (removed unused eslint-disable-next-line directives)"
    - "lib/env.ts (Prettier reflow — one-line throw under printWidth 100)"
    - "CLAUDE.md (Prettier reflow — markdown table padding normalized)"
decisions:
  - "Used `tsEslint.configs.disableTypeChecked` recipe for both config files AND lint-fixtures. Both file groups live outside `tsconfig.json` include, so typed-linting rules would crash with `parserOptions.project` errors. The disableTypeChecked bundle from typescript-eslint is the documented fix (https://typescript-eslint.io/users/configs#disable-type-checked)."
  - "Lint-fixtures override re-enables `no-explicit-any`, `no-console`, `no-restricted-syntax`, and `no-restricted-imports` explicitly (those rules don't need type info — they're AST-based). Without this, `disableTypeChecked` would silently turn off the very gates we want to PROVE fire on the fixtures."
  - "Added `--no-warn-ignored` to lint-staged ESLint invocation. Without it, when fixtures are staged alongside legitimate files (e.g. during initial Plan 1.2 commit), ESLint emits a warning per ignored fixture, and `--max-warnings 0` turns those warnings into commit-blocking errors."
  - "Set Prettier `endOfLine: 'lf'` to force LF on Windows. Otherwise CRLF/LF drift creates noisy diffs every time a Windows dev formats."
  - "Husky v9 `pnpm dlx husky init` failed on the dev box (pnpm-cache ENOENT, transient). Switched to `pnpm exec husky init` which uses the local install. Outcome identical: `.husky/pre-commit` template created, `core.hooksPath=.husky/_`, `.husky/_/.gitignore` excludes auto-generated helpers."
  - "Pre-commit runs BOTH `pnpm lint-staged` AND `pnpm typecheck`. The typecheck is slow (~3-5s on this small scaffold; grows with codebase) but catches unstaged regressions that lint-staged would miss. Worth it per RESEARCH.md Pattern 5."
metrics:
  duration: "~35 minutes (longer than 1.1's 25min because the no-mercy rules surfaced multiple latent issues — unused eslint-disable directives in 1.1, require() in tailwind config, lint-fixture parser mismatch)"
  completed_date: "2026-05-21"
---

# Phase 1 Plan 02: ESLint v9 + Prettier + Husky + UUID-ban rule — Summary

**One-liner:** ESLint flat config v9 + typescript-eslint strict + custom UUID/deep-relative bans, Prettier 3.x + tailwind plugin, Husky 9 pre-commit (lint-staged + tsc) + pre-push (tsc), and 4 lint-fixture proofs that every gate fires.

## Completed Tasks

| Task | Name | Files | Status |
|------|------|-------|--------|
| 1 | Install ESLint v9 + plugins + Prettier + husky + lint-staged | package.json, pnpm-lock.yaml | ✓ Done |
| 2 | Write eslint.config.mjs flat config with no-mercy rules | eslint.config.mjs | ✓ Done |
| 3 | Write Prettier config + ignore + VS Code workspace | .prettierrc, .prettierignore, .vscode/settings.json, .vscode/extensions.json | ✓ Done |
| 4 | Set up husky v9 + .husky/pre-commit + .husky/pre-push | .husky/pre-commit, .husky/pre-push | ✓ Done |
| 5 | Create tests/lint-fixtures/ with intentional violations | tests/lint-fixtures/*.ts + README.md, tsconfig.json | ✓ Done |
| 6 | Smoke-test pre-commit hook with intentional fail + legitimate commit | (transient probe + commit 1b7bcca) | ✓ Done |

## Acceptance criteria — all green

### Versions

```
@eslint/js              9.39.4
@next/eslint-plugin-next 15.5.18
eslint                  9.39.4
eslint-plugin-react-hooks    5.2.0
eslint-plugin-react-refresh  0.5.2
husky                   9.1.7
lint-staged             15.5.2
prettier                3.8.3
prettier-plugin-tailwindcss  0.6.14
typescript-eslint       8.59.4
```

### Default repo state

- [x] `pnpm lint` exits 0 on clean scaffold (1.1 code + new fixtures excluded)
- [x] `pnpm format:check` exits 0
- [x] `pnpm typecheck` exits 0 (lint-fixtures excluded via tsconfig)
- [x] `pnpm exec eslint tests/lint-fixtures/bad-any.ts --no-ignore` exits 1 with `@typescript-eslint/no-explicit-any`
- [x] `pnpm exec eslint tests/lint-fixtures/bad-uuid.ts --no-ignore` exits 1 with `no-restricted-syntax` (UUID message)
- [x] `pnpm exec eslint tests/lint-fixtures/bad-console-log.ts --no-ignore` exits 1 with `no-console`
- [x] `pnpm exec eslint tests/lint-fixtures/bad-relative-import.ts --no-ignore` exits 1 with `no-restricted-imports`
- [x] `.husky/pre-commit` exists and runs `lint-staged` + `typecheck`
- [x] `.husky/pre-push` exists and runs `typecheck`
- [x] `git config core.hooksPath` returns `.husky/_`
- [x] `eslint.config.mjs` exports a flat config (default export from `tsEslint.config(...)`)
- [x] No `.eslintrc.*` files exist
- [x] `.prettierrc` has 8 keys: semi, singleQuote, trailingComma, printWidth, tabWidth, endOfLine, arrowParens, plugins
- [x] `package.json` `scripts` includes: `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `prepare`
- [x] `package.json` `lint-staged` key defined with eslint+prettier for ts/tsx/js/jsx and prettier-only for json/md/yml/yaml/css
- [x] Pre-commit hook **proven** to block a `: any` commit (smoke probe output below)
- [x] Plan 1.2 commit pushed to `origin/main` (1b7bcca)

### Smoke-probe output (Task 6) — proves pre-commit blocks bad code

When `app/_temp-bad.ts` containing `export const x: any = 1` was staged and committed:

```
[STARTED] Running tasks for staged files...
[STARTED] *.{ts,tsx,js,jsx} — 1 file
[STARTED] eslint --fix --max-warnings 0 --no-warn-ignored
[FAILED]  eslint --fix --max-warnings 0 --no-warn-ignored [FAILED]
...
✖ eslint --fix --max-warnings 0 --no-warn-ignored:

C:\Users\Gamer\Documents\flashcards-app\app\_temp-bad.ts
  2:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)

husky - pre-commit script failed (code 1)
```

Probe file then deleted, `git log` confirmed no probe commit landed (HEAD remained at `dc1a1c2` Plan 1.1 until the legitimate Plan 1.2 commit).

### Gate-break fixture output (Task 5)

**bad-any.ts:**
```
tests/lint-fixtures/bad-any.ts
  3:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
✖ 1 problem (1 error, 0 warnings)  EXIT 1
```

**bad-uuid.ts:**
```
tests/lint-fixtures/bad-uuid.ts
  3:23  error  Hardcoded UUIDs are forbidden. Use getConcursoBySlug() or a typed constant  no-restricted-syntax
✖ 1 problem (1 error, 0 warnings)  EXIT 1
```

**bad-console-log.ts:**
```
tests/lint-fixtures/bad-console-log.ts
  4:3  error  Unexpected console statement. Only these console methods are allowed: warn, error  no-console
✖ 1 problem (1 error, 0 warnings)  EXIT 1
```

**bad-relative-import.ts:**
```
tests/lint-fixtures/bad-relative-import.ts
  3:1  error  '../../lib/utils' import is restricted from being used by a pattern. Use @/ alias instead of deep relative imports  no-restricted-imports
✖ 1 problem (1 error, 0 warnings)  EXIT 1
```

## Deviations from Plan

### Auto-resolved (Rule 1/2/3)

**1. [Rule 3 - Blocking] Config files (`tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`) outside tsconfig include crashed typed-linting parser.**
- **Found during:** Task 2 (first `pnpm lint` run).
- **Issue:** `tsEslint.configs.strictTypeChecked` applies typed rules to every TS file ESLint sees. Config files at the repo root aren't in `tsconfig.json` `include`, so the parser threw `"parserOptions.project has been provided..." → "The file was not found in any of the provided project(s)"`.
- **Fix:** Added an override block matching `*.config.{ts,mjs,js,cjs}` + `eslint.config.mjs` that `extends: [tsEslint.configs.disableTypeChecked]` per the official typescript-eslint recipe. Also turned off `@typescript-eslint/no-require-imports` for that group (Tailwind v3 plugin loading idiom).
- **Files affected:** eslint.config.mjs, tailwind.config.ts (require → ES imports as belt-and-suspenders).

**2. [Rule 1 - Bug] Unused `eslint-disable-next-line no-console` directives in `app/error.tsx` + `app/global-error.tsx` from Plan 1.1.**
- **Found during:** Task 2 first lint.
- **Issue:** The disable comments preceded `console.error(error)` calls — but `no-console` is configured with `allow: ['warn', 'error']`, so `console.error` is legal. ESLint emits "Unused eslint-disable directive" warnings, and `--max-warnings 0` makes them fail.
- **Fix:** Stripped both comments. The `console.error(error)` calls remain (correct usage of the allowed methods).
- **Files affected:** app/error.tsx, app/global-error.tsx.

**3. [Rule 1 - Bug] `tailwind.config.ts` used `require('@tailwindcss/typography')` + `require('tailwindcss-animate')` — `@typescript-eslint/no-require-imports` error.**
- **Found during:** Task 2 first lint.
- **Issue:** Plan 1.1 used CJS `require()` for plugin loading. Tailwind v3 supports both, but the typed-eslint strict rule bans require() in TS files.
- **Fix:** Converted to ES `import` statements at top of file. Belt-and-suspenders alongside the config-file override block from deviation 1.
- **Files affected:** tailwind.config.ts.

**4. [Rule 3 - Blocking] Test override missed `no-constant-binary-expression` + `@typescript-eslint/no-unnecessary-condition`.**
- **Found during:** Task 2 first lint.
- **Issue:** `lib/__tests__/utils.test.ts` line 6 asserts that `cn('a', 'b', false && 'c', { d: true, e: false })` returns `'a b d'` — i.e., that falsy args drop. The `false && 'c'` is intentional (testing drop behavior), but the strict rules flag it as "always falsy / unnecessary condition."
- **Fix:** Extended the test-file override block to also turn off `no-constant-binary-expression`, `no-constant-condition`, `@typescript-eslint/no-unnecessary-condition`, `@typescript-eslint/no-non-null-assertion`, plus the rest of the `no-unsafe-*` family (mocks frequently violate these intentionally).
- **Files affected:** eslint.config.mjs.

**5. [Rule 3 - Blocking] Lint-fixtures hit the same "not in tsconfig include" parser error.**
- **Found during:** Task 5 first `pnpm exec eslint tests/lint-fixtures/bad-any.ts --no-ignore`.
- **Issue:** Same as deviation 1 but for lint-fixtures, which are excluded from tsconfig include. With `--no-ignore`, ESLint applies the strict typed config to them and crashes on the parser.
- **Fix:** Added a fourth override block for `tests/lint-fixtures/**` that sets `parserOptions.project: false` + `extends: [tsEslint.configs.disableTypeChecked]`. To preserve the GATE rules (which is the entire point of these fixtures), explicitly re-set `@typescript-eslint/no-explicit-any`, `no-console`, `no-restricted-syntax`, and `no-restricted-imports` in the same block.
- **Files affected:** eslint.config.mjs.

**6. [Rule 1 - Bug] First Plan 1.2 commit attempt blocked by lint-staged because fixtures emit "File ignored" warnings under `--max-warnings 0`.**
- **Found during:** Task 6 commit attempt.
- **Issue:** When Plan 1.2 files were staged together (including the 4 lint-fixtures), lint-staged's `eslint --fix --max-warnings 0` ran against all of them. ESLint emitted "File ignored because of a matching ignore pattern. Use `--no-ignore`..." as a warning for each fixture (4 total). `--max-warnings 0` promoted those to errors and the hook rejected the commit.
- **Fix:** Added `--no-warn-ignored` to the lint-staged ESLint invocation in `package.json`. This is the documented ESLint flag that exists for exactly this scenario (suppress the file-ignored warning). With it, lint-staged silently skips the fixtures and lints only the eligible files.
- **Files affected:** package.json (lint-staged.* config).

### Open issues

**None.** All 6 tasks complete, all acceptance criteria green, hooks proven to fire on real bad code (one rejected probe commit before the legitimate Plan 1.2 commit landed).

### Stash debris

Lint-staged automatic backup stashes accumulated during the failed first probe + the first blocked commit attempt:
```
stash@{0}: lint-staged automatic backup (8f7d04e)
stash@{1}: lint-staged automatic backup (6550fab — from blocked commit attempt)
```
These exist because lint-staged stashes the pre-modification state before running tasks, then drops the stash on success. Failures leave the stash. Per the destructive_git_prohibition rule in the executor protocol, I did not run `git stash drop` — these stashes are inert (they represent the same content that's still in the working tree at various points and are now obsolete after the successful commit). They can be inspected with `git stash list` and dropped manually by Rafael if desired (`git stash drop stash@{0}` etc.).

## Verification commands run

```bash
# Versions
pnpm list eslint typescript-eslint @next/eslint-plugin-next eslint-plugin-react-hooks \
  eslint-plugin-react-refresh prettier prettier-plugin-tailwindcss husky lint-staged @eslint/js

# Build pipeline
pnpm lint           # exit 0
pnpm typecheck      # exit 0
pnpm format:check   # exit 0

# Gate-break probes (each MUST exit 1)
pnpm exec eslint tests/lint-fixtures/bad-any.ts --no-ignore              # exit 1, no-explicit-any
pnpm exec eslint tests/lint-fixtures/bad-uuid.ts --no-ignore             # exit 1, no-restricted-syntax
pnpm exec eslint tests/lint-fixtures/bad-console-log.ts --no-ignore      # exit 1, no-console
pnpm exec eslint tests/lint-fixtures/bad-relative-import.ts --no-ignore  # exit 1, no-restricted-imports

# Smoke probe (must fail, no commit lands)
echo 'export const x: any = 1' > app/_temp-bad.ts
git add app/_temp-bad.ts
git commit -m "probe"   # blocked by hook with no-explicit-any error
rm app/_temp-bad.ts; git restore --staged app/_temp-bad.ts

# Legitimate commit (must succeed)
git add eslint.config.mjs .prettierrc .prettierignore .vscode/ .husky/ \
        tests/lint-fixtures/ tsconfig.json package.json pnpm-lock.yaml \
        CLAUDE.md app/error.tsx app/global-error.tsx lib/env.ts tailwind.config.ts
git commit -m "feat(phase-1/plan-1.2): ..."  # commit 1b7bcca, hook ran clean
git push                                      # pre-push tsc ran clean
```

## Threat model status (from PLAN §threat_model)

| Threat ID | Disposition | Mitigation in place? |
|-----------|-------------|----------------------|
| T-1.2-01 | mitigate | ✓ `@typescript-eslint/no-explicit-any: error` + 5 no-unsafe-* rules at error severity; pre-commit + smoke probe proves hook blocks `: any` |
| T-1.2-02 | mitigate | ✓ `no-restricted-syntax` UUID regex pattern blocks all 8-4-4-4-12 hex literals; bad-uuid.ts probe confirms |
| T-1.2-03 | mitigate | ✓ `no-console: ['error', { allow: ['warn', 'error'] }]`; bad-console-log.ts probe confirms |
| T-1.2-04 | mitigate | ✓ `no-restricted-imports` pattern blocks `*/lib/supabase/admin` (waits for Plan 1.5 to create the path; rule is dormant but configured) |
| T-1.2-05 | accept | (intentional — `--no-verify` bypass is the developer's escape hatch; CI in Plan 1.4 will be unbypassable) |
| T-1.2-SC | mitigate | ✓ All 10 installed packages match [VERIFIED: official] roster from RESEARCH.md (eslint, typescript-eslint, @next/eslint-plugin-next, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @eslint/js, prettier, prettier-plugin-tailwindcss, husky, lint-staged) |

## Next plan

**Plan 1.3** — Vitest 3.2.4 configuration + per-path coverage thresholds (90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`; 50% global) + jsdom env + tests/setup.ts.

## Self-Check: PASSED

- ✓ All 12 created files exist on disk (verified `git ls-files`)
- ✓ Plan 1.2 commit `1b7bcca` on `origin/main` (`git log --oneline -1`)
- ✓ `pnpm lint`, `pnpm typecheck`, `pnpm format:check` all exit 0
- ✓ 4 gate-break probes exit 1 with the correct rule name
- ✓ Pre-commit hook proven to block `: any` (smoke probe output captured above)
- ✓ Push to remote succeeded (`dc1a1c2..1b7bcca  main -> main`)
- ✓ FOUND-02, FOUND-03, FOUND-04 satisfied (see requirements file update)
