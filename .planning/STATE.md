# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** O aluno paga R$ 297, abre o app, e estuda — sessão SRS + caderno de erros + simulado precisam funcionar perfeitamente.
**Current focus:** Phase 1 — Foundation (CI gates + Supabase Pro + schema base + Sentry)

## Current Position

Phase: 1 of 10 (Foundation)
Plan: 5 of 13 (Plan 1.5 COMPLETE — Tasks 1-5 done, FOUND-07 verified)
Status: Plan 1.5 closed 2026-05-26. PAT unblock via `gh auth login` (HTTPS + workflow scope). 6 placeholder secrets created via `gh secret set`. Workflow permissions configured via GitHub API. Branch protection has "Do not allow bypassing" UNCHECKED (admin bypass enabled — deliberate solo-dev trade-off, see Decisions). Task 5 probes executed: gate-break probe BLOCKED merge of intentionally-bad PR #12 (all 4 gates lint/format/typecheck/test FAILED, build SKIPPED, install PASSED, mergeStateStatus=BLOCKED, no code merged); direct-push probe DEMONSTRATED admin bypass works with audit log entry. Full results in `01-05-TASK-5-PROBE.md`. FOUND-07 CHECKED in REQUIREMENTS.md with note about admin-bypass trade-off.
Last activity: 2026-05-26 — Plan 1.5 Task 5 (gate-break probe + direct-push probe) completed. Cheatsheet PR #11 served as organic Task 4 verification (CI gates green on clean code, merge passed correctly). Plan 1.5 commits in main: 83dce3a..7abdcb3 (incl. one bypass commit + cleanup commit). Doc commits: 01-05-TASK-5-PROBE.md (new) + STATE.md updates + 01-05-SUMMARY.md status flip from halted to complete + REQUIREMENTS.md FOUND-07 checked. Cheatsheet `bugs-from-vite-version.md` lives at main (PR #11 merged 2026-05-26).

Progress: [████░░░░░░] 38% (Phase 1: 5 of 13 plans done)

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
- **Solo dev branch protection trade-off** (Plan 1.5 2026-05-26): keep "Do not allow bypassing the above settings" UNCHECKED in `main` branch protection rule, allowing repo admin (@Rako56) to bypass require-PR + require-status-checks for legitimate solo workflows (initial cheatsheet PR could not be merged because no second reviewer exists — required temp-disabling the rule). Trade-off: admins can bypass; mitigations: (a) GitHub logs every bypass in audit log at /settings/audit-log, (b) status checks still RED-block the merge button in UI, (c) when a 2nd team member joins, flip this checkbox to CHECKED and ensure CODEOWNERS reviewer on high-risk paths is someone other than the author. Decision documented in `01-05-TASK-5-PROBE.md` Probe B reconciliation section. Plan 1.5 spec semantic error (it described UNCHECKED as "admin bypass IMPOSSIBLE" which is inverted) corrected in this revision.
- **`gh auth login` HTTPS preferred over PAT in Credential Manager** (Plan 1.5 2026-05-26): for Windows dev environments, `gh auth login` writes a managed token to the OS keyring (Windows Credential Manager) AND configures `git` to use the `gh` credential helper. This is more durable than a manually-minted PAT because (a) gh refreshes the token automatically, (b) scope changes are one-command (`gh auth refresh -s workflow`), (c) audit/revoke is centralized in https://github.com/settings/tokens (under "GitHub CLI"). Replaces the original Plan 1.5 SUMMARY recommendation to manually regenerate PAT.
- **Supabase project reuse — não greenfield** (Plan 1.6 prep 2026-05-26, Rafael confirmed): O reboot Next.js **reusa o projeto Supabase existente** (ID `zjyogswbgcauwqisvuyq`) em vez de criar um Supabase Pro novo. Justificativa: o projeto atual carrega 236 migrations + 4.265 admin_flashcards + 343 admin_questoes + 102 srs_reviews + 1 user_concurso_access (Rafael owner) + dados reais de produção interna do TJSP Escrevente. Criar greenfield significaria migrar manualmente milhares de rows. Estratégia oficial Plan 1.6: (a) `supabase db pull` traz schema atual como migration inicial commitada no novo repo; (b) novos `lib/supabase/{client,server,admin}.ts` no Next.js apontam pro projeto existente via env vars; (c) RLS policies + RPCs já existem e funcionam (zero recriação). Escopo Plan 1.6 ajustado de "provision new Supabase Pro" para "wire existing Supabase project". Decision recorded here; PROJECT.md "Key Decisions" deve refletir antes de Plan 1.6 começar.
- **Modern publishable key > legacy anon JWT** (Plan 1.6 prep 2026-05-26, Rafael confirmed): `NEXT_PUBLIC_SUPABASE_ANON_KEY` no GitHub secrets agora usa `sb_publishable_6Lz2VwMxFzAAlgCec3U6tQ_6LKOmbWO` (modern publishable key) em vez do legacy anon JWT. Justificativa: Supabase docs recomendam publishable keys pra novas aplicações — melhor segurança, rotação independente do JWT principal, padrão futuro. supabase-js v2.39+ suporta. Trade-off: tutoriais antigos podem usar JWT; quando aparecer, traduzir mentalmente. Legacy anon JWT continua disponível no projeto (compat) mas não usado pelo Next.js novo.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

**RESOLVED (2026-05-26):**

- ✅ Push blocked by missing PAT scope → resolved via `gh auth login` (HTTPS + workflow scope auto-granted).
- ✅ 6 placeholder secrets created via `gh secret set` (SUPABASE_PROJECT_ID, SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN — first 4 placeholder `pending-plan-1.6`, last 2 `pending-plan-1.10`).
- ✅ Workflow permissions configured via GitHub API: `default_workflow_permissions=write`, `can_approve_pull_request_reviews=false`, "Allow GitHub Actions to create and approve pull requests" UNCHECKED.
- ✅ Branch protection rule active on `main` with required status checks `[install, lint, format, typecheck, test, build]`. "Do not allow bypassing the above settings" UNCHECKED (deliberate solo-dev trade-off — see Decisions).
- ✅ Plan 1.5 Task 5 probes executed (results in `01-05-TASK-5-PROBE.md`).

**PENDING USER ACTION (não bloqueador imediato):**

- ⏳ **SUPABASE_ACCESS_TOKEN** secret ainda em placeholder `pending-plan-1.6`. Token pessoal — só Rafael consegue gerar em https://supabase.com/dashboard/account/tokens. Necessário pra Plan 1.6+ (jobs CI que usam Supabase CLI: `supabase db pull`, `supabase db push`, `supabase functions deploy`, `supabase gen types`). 3 outros Supabase secrets atualizados pros valores reais em 2026-05-26 10:30 UTC.

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

Last session: 2026-05-26
Stopped at: Plan 1.5 COMPLETE. All 5 tasks done, FOUND-07 verified. Cheatsheet `bugs-from-vite-version.md` shipped via PR #11 (organic Task 4 verification). Task 5 probes (gate-break PR #12 closed + direct-push probe) demonstrated: (a) status checks effectively block bad code merge (4 of 6 RED on intentional violations → mergeStateStatus=BLOCKED), (b) admin can bypass require-PR + require-status-checks via audit-logged operation (deliberate solo-dev config). Documentation: `01-05-TASK-5-PROBE.md` written. Next action: `/gsd:plan-phase 1` to start Plan 1.6 (Supabase Pro project provisioning + .env.local wiring + lib/supabase/{client,server,admin}.ts) OR continue manually with the canonical next step.
Resume file: `.planning/phases/01-foundation/01-05-TASK-5-PROBE.md` (Task 5 results) + `.planning/STATE.md` (this file, current position) + `.planning/REQUIREMENTS.md` (FOUND-07 now checked).
