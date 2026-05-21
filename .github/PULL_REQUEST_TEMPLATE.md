<!-- Flashcards PR template — Plan 1.5 (FOUND-07) -->
<!-- Keep it brief. The CI gates do most of the verification; you just confirm intent. -->

## Summary

<!-- 1-2 sentences. What does this PR change and why? -->

## Plan reference

<!-- Which GSD plan does this PR ship? e.g. `01-foundation/01-05-PLAN.md` -->
<!-- Requirement IDs from .planning/REQUIREMENTS.md (e.g. `FOUND-07`) -->

- Phase / Plan:
- Requirement IDs:

## Pre-merge checklist

- [ ] `pnpm lint` clean (no `--max-warnings` failures)
- [ ] `pnpm typecheck` clean (strict tsconfig)
- [ ] `pnpm test:coverage` clean (≥50% global, ≥90% on `lib/{srs,queue,asaas,access}`)
- [ ] `pnpm format:check` clean (Prettier)
- [ ] If migrations changed: ran `pnpm types:gen` and committed the result (P1.9+)
- [ ] No new `console.log` / `console.error` (use `pino` + Sentry instead)
- [ ] No `: any` / `as any` casts introduced
- [ ] No hardcoded UUIDs (use `getConcursoBySlug()` / equivalent lookup)
- [ ] No new packages added without `slopcheck` (verify on npmjs.com first)

## Anti-features check (Flashcards core constraints)

<!-- These constraints are non-negotiable per PROJECT.md. Confirm none of them slipped in. -->

- [ ] No IA visible to the student (no "powered by AI" copy, no model picker)
- [ ] No Tiptap / rich-text "caderno" UX (flashcards are atoms, not notes)
- [ ] No "Sparkle" branding (legacy name — product is **Flashcards**)
- [ ] No `disabled-ts-rule` / `eslint-disable` without an inline justification comment

## Risk + rollback

<!-- What could break? How would you revert? Include the revert command if non-obvious. -->

- Risk surface:
- Rollback plan:
