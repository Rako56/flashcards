# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** O aluno paga R$ 297, abre o app, e estuda — sessão SRS + caderno de erros + simulado precisam funcionar perfeitamente.
**Current focus:** Phase 1 — Foundation (CI gates + Supabase Pro + schema base + Sentry)

## Current Position

Phase: 1 of 10 (Foundation)
Plan: 5 of 13 (Plan 1.5 HALTED at Task 3b push — PAT lacks `workflow` scope)
Status: Waiting on Rafael to (A) regenerate PAT with `workflow` scope OR install `gh` CLI, then push commit 83dce3a, then (B) add 6 placeholder secrets, then (C) configure main branch protection. Plan 1.5 SUMMARY documents exact next steps.
Last activity: 2026-05-21 — Plan 1.5 Tasks 1-2-3a executed (CI workflow ci.yml with 10 jobs incl. e2e-gate workaround for `secrets.*` in job-level `if:`; CODEOWNERS with @Rako56 on lib/{srs,queue,asaas,access,supabase/admin.ts} + supabase/migrations + app/api/{asaas,healthz} + workflows; PR template with anti-features check; dependabot.yml with npm + github-actions weekly Monday America/Sao_Paulo, 5 groups). All 5 local gates green (lint, format:check, typecheck, test:coverage 17/17 100% protected, build). Commit 83dce3a created locally. `git push origin main` REFUSED by GitHub: `! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or update workflow .github/workflows/ci.yml without 'workflow' scope)`. Auth gate, not code issue. SUMMARY 01-05-SUMMARY.md written with full Rafael resolution path (3 options for unblocking PAT + secrets list + branch protection settings + workflow permissions). FOUND-07 NOT YET checked off.

Progress: [███░░░░░░░] 31% (Phase 1: 4 of 13 plans done; Plan 1.5 halted-at-checkpoint not counted)

## Performance Metrics

**Velocity:**
- Total plans completed: 4 (Plan 1.5 halted-at-checkpoint)
- Average duration: ~24 min/plan
- Total execution time: ~107 min (Plans 1.1-1.4 + Plan 1.5 Tasks 1-3a ≈ 12 min)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 4/13 (+ 1 partial) | ~107 min | ~24 min |

**Recent Trend:**
- Last 5 plans: Plan 1.1 (~25 min, 26 files, 0 critical deviations), Plan 1.2 (~35 min, 12 files created + 8 modified, 6 auto-resolved Rule 1/3 deviations), Plan 1.3 (~30 min, 11 files, 0 deviations), Plan 1.4 (~5 min, 2+3 files, 1 Rule 1 deviation), Plan 1.5 Tasks 1-3a (~12 min, 4 files, 3 auto-resolved Rule 1/2 deviations: e2e-gate job for secrets-in-if workaround, lint+format job split, .next/cache caching; HALTED at push — PAT lacks workflow scope, awaiting Rafael unblock)
- Trend: quality infra plans (lint/test/e2e/CI) settling at ~5-35 min each. Plan 1.5 demonstrates the real-world gotcha pattern — RESEARCH.md pseudocode for CI uses `if: secrets.X != ''` which GitHub silently treats as false; production workaround is a 1-step gate job. Pattern caught + documented.

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
- **GitHub Actions: `secrets.*` NOT accessible from job-level `if:`** (Plan 1.5 2026-05-21): RESEARCH Pattern 4 uses `if: env.PLAYWRIGHT_BASE_URL != ''` (or `if: ${{ secrets.X != '' }}`) to skip the e2e job — but GitHub Actions does NOT expose `secrets.*` to job-level `if:` expressions (deliberate security boundary so secret presence can't be exfiltrated via expression eval). Canonical workaround: tiny preflight `e2e-gate` job that runs unconditionally, injects the secret via `env:`, writes `run=true/false` to `$GITHUB_OUTPUT`, then the e2e job gates on `needs.e2e-gate.outputs.run == 'true'`. Outputs ARE exposed to job-level `if:`, so this works. Cost ~2s per CI run.
- **CI lint + format are separate jobs, not one job** (Plan 1.5 2026-05-21): production-grade CI splits gates as fine-grained as possible. RESEARCH Pattern 4 put `pnpm lint` + `pnpm format:check` as 2 steps in one `lint` job, but a failing format check then surfaces as a red "lint" status — confusing and wrong-blame. Split into separate `lint` + `format` jobs adds 2 required-status-checks but makes branch protection precise.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

**ACTIVE (Plan 1.5):**

0. **🚨 Push blocked by missing PAT scope** (2026-05-21) — Local PAT in Windows Credential Manager lacks `workflow` scope; `git push origin main` refused for commit `83dce3a` containing `.github/workflows/ci.yml`. **Resolution path documented in `.planning/phases/01-foundation/01-05-SUMMARY.md` § "Rafael's Next Steps"**. 3 options: (A) regenerate PAT with `workflow` scope, (B) install `gh` CLI + OAuth login, (C) create files via web UI. Option A or B unblock everything; Option C requires discarding the local commit. AFTER push: Rafael adds 6 placeholder secrets + configures branch protection (Task 4) + workflow permissions, then I run Task 5 gate-break probe.

**OPEN questions (deferred from research, not blockers yet):**

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
Stopped at: Plan 1.5 HALTED-AT-CHECKPOINT. Local commit `83dce3a` (CI workflow + CODEOWNERS + PR template + Dependabot, 4 files, 424 insertions) created with all 5 local gates green, but `git push origin main` refused by GitHub because the local PAT lacks `workflow` scope. Awaiting Rafael to (A) regenerate PAT with `workflow` scope OR install `gh` CLI + OAuth, then push commit, then (B) add 6 placeholder secrets at https://github.com/Rako56/flashcards/settings/secrets/actions, then (C) configure branch protection on `main` at https://github.com/Rako56/flashcards/settings/branches with required checks `[install, lint, format, typecheck, test, build]` + admin-bypass OFF + force-push OFF + linear history ON + CODEOWNERS review required, then (D) Settings → Actions: "Send write tokens to workflows from pull requests" OFF. Full step-by-step in `01-05-SUMMARY.md` § "Rafael's Next Steps". After Rafael confirms, I execute Task 5 (gate-break probe PR + direct-push probe).
Resume file: `.planning/phases/01-foundation/01-05-SUMMARY.md`
