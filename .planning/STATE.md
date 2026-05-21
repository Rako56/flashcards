# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** O aluno paga R$ 297, abre o app, e estuda — sessão SRS + caderno de erros + simulado precisam funcionar perfeitamente.
**Current focus:** Phase 1 — Foundation (CI gates + Supabase Pro + schema base + Sentry)

## Current Position

Phase: 1 of 10 (Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan (roadmap aprovado, aguardando `/gsd:plan-phase 1`)
Last activity: 2026-05-21 — Roadmap criado pelo gsd-roadmapper (10 fases, 127 reqs mapped, MVP mode)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: — (sem dados ainda)
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

**Recent Trend:**
- Last 5 plans: — (sem dados ainda)
- Trend: — (sem baseline)

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
Stopped at: Roadmap criado e files escritos (ROADMAP.md, STATE.md, REQUIREMENTS.md traceability updated). Aguardando aprovação Rafael + `/gsd:plan-phase 1`.
Resume file: None (próximo passo é planning Phase 1)
