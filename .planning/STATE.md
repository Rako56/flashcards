# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** O aluno paga R$ 297, abre o app, e estuda — sessão SRS + caderno de erros + simulado precisam funcionar perfeitamente.
**Current focus:** Phase 1 — Foundation (CI gates + Supabase Pro + schema base + Sentry)

## Current Position

Phase: 1 of 10 (Foundation)
Plan: 4 of 13 (Plan 1.4 complete — Playwright 1.60.0 + Chromium + per-path coverage gate-break probe verified)
Status: Ready to execute Plan 1.5 (GitHub Actions CI + branch protection + CODEOWNERS + Dependabot)
Last activity: 2026-05-21 — Plan 1.4 executed (Playwright 1.60.0 installed, Chromium binary downloaded, playwright.config.ts with PLAYWRIGHT_BASE_URL env support + Vercel-preview-ready, tests/e2e/.gitkeep placeholder. Critical proof: gate-break probe ran `pnpm test:coverage` with 11 uncovered exports in `lib/srs/uncovered-temp.ts` → vitest exit 1 with `ERROR: Coverage for lines (2.85%) does not meet "lib/srs/**" threshold (90%)` AND statement variant + 50% global floor errors. Removed probe → re-ran → exit 0 with 100% protected coverage. Per-path Vitest 3.2.4 threshold syntax PROVEN. Commit fa09610 on origin/main).

Progress: [███░░░░░░░] 31% (Phase 1: 4 of 13 plans done)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~24 min/plan
- Total execution time: ~95 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 4/13 | ~95 min | ~24 min |

**Recent Trend:**
- Last 5 plans: Plan 1.1 (~25 min, 26 files, 0 critical deviations), Plan 1.2 (~35 min, 12 files created + 8 modified, 6 auto-resolved Rule 1/3 deviations all related to no-mercy lint surfacing latent issues), Plan 1.3 (~30 min, 11 files, 0 deviations), Plan 1.4 (~5 min, 2 files created + 3 modified, 1 auto-resolved Rule 1 deviation: playwright.config.ts strict-tsconfig adjustments — bracket env access + conditional spread for optional props)
- Trend: quality infra plans (lint/test/e2e) settling at ~5-35 min each; lint+typecheck gates already paying back by catching strict-tsconfig drift in playwright.config.ts during Plan 1.4 verify step.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisões completas em PROJECT.md "Key Decisions" table. Recentes que afetam Phase 1:

- **Reboot completo em novo repo** (Rafael 2026-05-21): legado tem 72 concerns + lint 435 problems; reboot mais rápido que limpeza cirúrgica
- **Next.js 15.5 (não 16)**: pin em todas 10 fases; upgrade Q4/2026 após produto fluente em 15.5
- **Supabase Pro day 0**: free tier auto-pausa após 7d, incompatível com produto pago
- **Multi-concurso DB-driven desde dia 1**: arquitetura evita refactor quando lançar 2º concurso
- **Design system split (Phase 2 tokens + Phase 7 identidade completa)**: destrava produto core sem bloquear no design final
- **Quality enforced desde commit 1**: TS strict 100% + lint CI + ≥50% coverage core + Sentry — antídoto ao drift do legado
- **`disableTypeChecked` recipe para config files + lint-fixtures** (Plan 1.2 2026-05-21): typescript-eslint não consegue parsear arquivos fora de `tsconfig.json` `include`. Solução documentada da própria typescript-eslint resolve sem comprometer cobertura — gates AST-based (no-explicit-any, no-console, no-restricted-syntax, no-restricted-imports) seguem ativos via re-set explícito no override de lint-fixtures.
- **`--no-warn-ignored` em lint-staged ESLint** (Plan 1.2 2026-05-21): sem essa flag, fixtures intencionalmente ignoradas emitem warnings que `--max-warnings 0` promove a erro, bloqueando commits legítimos quando fixtures são staged junto.
- **Vitest 3.2.4 per-path threshold syntax PROVADA** (Plan 1.4 2026-05-21): `'lib/srs/**': { lines: 90, ... }` é a forma canônica e fire-tested. Probe gate-break com 11 untested exports em `lib/srs/uncovered-temp.ts` produziu exit 1 + `ERROR: Coverage for lines (2.85%) does not meet "lib/srs/**" threshold (90%)`. T-1.4-01 mitigado.
- **playwright.config.ts strict-tsconfig pattern** (Plan 1.4 2026-05-21): com `noPropertyAccessFromIndexSignature` + `exactOptionalPropertyTypes`, RESEARCH Example 5 não compila as-is. Pattern correto: (a) bracket env access (`process.env['CI']`), (b) spread condicional para `workers` e `webServer` ao invés de `key: undefined`, (c) annotation explícita `PlaywrightTestConfig`. Documentado no header do arquivo.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

Questões abertas levantadas no SUMMARY.md research (pendentes de decisão Rafael antes/durante Phase 1):

1. **Supabase branching** — habilitar from day 1 (cada PR DB isolado)? Adiciona custo P1 mas elimina conflitos. Default: yes.
2. **PostHog vs alternativa** — confirmar PostHog para Phase 10 funnel.
3. **Admin AI tools v1** — edital parser AI in scope para Phase 8 ou manual primeiro?
4. **Asaas sandbox creds** — Rafael tem API key sandbox + webhook endpoint configurado? Bloqueador Phase 4.
5. **Cowork timeline** — quando Cowork começa a importar conteúdo TJSP? Define se Phase 8 vira blocker do soft launch ou roda em paralelo.

### Coverage Notes

**Discrepância documental:** REQUIREMENTS.md "Coverage" section declara 119 v1 requirements, mas contagem real por categoria soma 127 (FOUND-12 + MULTI-8 + AUTH-10 + SALES-16 + STUDY-14 + SIM-12 + NB-5 + DASH-9 + DESIGN-8 + ADMIN-15 + SEO-8 + OPS-10). Mapeado os 127 reais. REQUIREMENTS.md traceability section atualizado com mapping correto.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none — greenfield reboot)* | | | |

## Session Continuity

Last session: 2026-05-21
Stopped at: Plan 1.4 complete (Playwright 1.60.0 + Chromium + per-path coverage gate-break probe verified; commit fa09610 on origin/main). Próximo: Plan 1.5 (GitHub Actions CI workflow + branch protection + CODEOWNERS + Dependabot).
Resume file: `.planning/phases/01-foundation/01-04-SUMMARY.md`
