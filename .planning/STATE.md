# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** O aluno paga R$ 297, abre o app, e estuda — sessão SRS + caderno de erros + simulado precisam funcionar perfeitamente.
**Current focus:** Phase 1 — Foundation (CI gates + Supabase Pro + schema base + Sentry)

## Current Position

Phase: 1 of 10 (Foundation)
Plan: 3 of 13 (Plan 1.3 complete — Vitest + MSW + per-path coverage gates shipped)
Status: Ready to execute Plan 1.4 (Playwright E2E + gate-break coverage probe)
Last activity: 2026-05-21 — Plan 1.3 executed (Vitest 3.2.4 + MSW 2.7 + jsdom + per-path coverage thresholds + 4 placeholder modules + 17 tests passing, 100% coverage in protected paths). Note: gsd-executor agent connection dropped before writing SUMMARY.md; commit a6a9245 was pushed cleanly. Verification re-run by orchestrator (lint/typecheck/format/test/coverage all green), SUMMARY back-filled, state updated manually.

Progress: [███░░░░░░░] 23% (Phase 1: 3 of 13 plans done)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~30 min/plan
- Total execution time: ~1.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 3/13 | ~90 min | ~30 min |

**Recent Trend:**
- Last 5 plans: Plan 1.1 (~25 min, 26 files, 0 critical deviations), Plan 1.2 (~35 min, 12 files created + 8 modified, 6 auto-resolved Rule 1/3 deviations all related to no-mercy lint surfacing latent issues)
- Trend: lint gates added now block the type of disease (`: any`, hardcoded UUIDs, deep relative imports, `console.log`) that produced the legacy 435-problem CONCERNS report.

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
Stopped at: Plan 1.2 complete (ESLint v9 flat + Prettier 3 + Husky 9 + 4 lint-fixtures + VS Code settings; commit 1b7bcca pushed to origin/main). Próximo: Plan 1.3 (Vitest 3.2.4 + coverage gates + jsdom + tests/setup.ts).
Resume file: `.planning/phases/01-foundation/01-02-SUMMARY.md`
