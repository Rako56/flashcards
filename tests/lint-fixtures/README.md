# Lint Fixtures — Intentional Violations

These files contain **intentional violations** of project lint rules. They are
**EXCLUDED** from `pnpm lint .` (via `ignores` in `eslint.config.mjs`) and from
`pnpm typecheck` (via `exclude` in `tsconfig.json`), but Plan 1.4 + Plan 1.10
use them **explicitly** via `pnpm exec eslint tests/lint-fixtures/<file> --no-ignore`
to **PROVE** that the corresponding gate fires.

## DO NOT FIX. DO NOT INCLUDE IN TEST EXECUTION.

| File                       | Violates                              | Rule                                |
| -------------------------- | ------------------------------------- | ----------------------------------- |
| `bad-any.ts`               | Explicit `any` annotation             | `@typescript-eslint/no-explicit-any` |
| `bad-uuid.ts`              | Hardcoded UUID literal in source      | `no-restricted-syntax` (UUID regex)  |
| `bad-console-log.ts`       | `console.log` call                    | `no-console`                         |
| `bad-relative-import.ts`   | Deep relative import (`../../`)       | `no-restricted-imports`              |

## How the gates prove they fire

From `flashcards/`:

```bash
# Each command MUST exit 1
pnpm exec eslint tests/lint-fixtures/bad-any.ts --no-ignore
pnpm exec eslint tests/lint-fixtures/bad-uuid.ts --no-ignore
pnpm exec eslint tests/lint-fixtures/bad-console-log.ts --no-ignore
pnpm exec eslint tests/lint-fixtures/bad-relative-import.ts --no-ignore
```

The `--no-ignore` flag overrides the `ignores` pattern in `eslint.config.mjs`
just for this one invocation, so ESLint actually lints the file. In any
normal `pnpm lint` run these files are skipped entirely.

## Why these exist

If the gate config silently regresses (someone downgrades a rule from
`error` to `warn`, or removes a custom selector), the default `pnpm lint`
will still pass — but the gate-break probes will start passing too, signaling
the gate is no longer protecting prod code. Plan 1.4 + 1.10 wire these probes
into CI as required status checks.
