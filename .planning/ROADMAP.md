# Roadmap: Flashcards

## Overview

Reboot completo do legado Sparkle Study Scape em novo repositório Next.js 15.5 App Router + Supabase Pro + Asaas + Vercel Pro. 10 fases verticais (MVP mode) entregando capacidade end-to-end user-visible por fase. Phase 1 estabelece quality gates não-negociáveis (TS strict, lint CI, coverage gates, Sentry, schema base) antes de qualquer feature; Phase 2 ativa multi-tenant subdomínio + tokens visuais; Phases 3-6 entregam o produto core (auth → checkout/webhook → SRS → simulado); Phases 7-8 maturam painel premium + pipeline editorial Cowork; Phases 9-10 monetizam (SEO/landings) e operacionalizam (LGPD cascade, PostHog funnel, soft launch). Cada fase tem critérios de sucesso observáveis (não tasks técnicas).

## Notes

**Trade-offs explícitos:**

- **Next.js 15.5 vs 16:** pin `15.5.x` em todas as 10 fases (5.5.x tem Node middleware estável, padrões de subdomínio battle-tested, ecossistema `@supabase/ssr` framed em `middleware.ts`). Upgrade para 16 (`proxy.ts` rename + caching opt-in) agendado para Q4/2026 após o produto operar fluentemente em 15.5. Codemod automático.
- **Design system split:** tokens base (paleta principal, tipografia, motion, dark mode foundation) entram em Phase 2 junto com tema por concurso (`DESIGN-01` + multi-tenant theme injection). Identidade visual completa, sub-temas finalizados, shadcn customizado, visual regression snapshots, breakpoints E2E entram em Phase 7 (`DESIGN-02..08`). Phases 3-6 consomem tokens iniciais sem bloquear no design final.
- **Parallelization cross-phase:** config `parallelization=false` aplica-se a plans dentro de uma fase (executados sequencialmente). Cross-phase: Phase 8 (Admin Pipeline — Cowork) **pode iniciar em paralelo com Phase 6 (Simulado) e Phase 7 (Dashboard Premium) assim que Phase 5 (SRS Core) entregar o schema de flashcards ativo + `status='active'` lifecycle**. Isso destrava Cowork para começar a produção de conteúdo TJSP enquanto o app continua maturando. Decisão de Rafael: quando ativar essa paralelização.
- **SALES split:** SALES-04..16 (checkout funnel, webhook, refund, grant, upgrade) em Phase 4 (funil completo). SALES-01, SALES-02, SALES-03 (landing hub, landing per-concurso, demo cards públicos) em Phase 9 (Marketing + SEO) porque dependem do design system finalizado em Phase 7 + theme por concurso em Phase 2.
- **OPS early sentinel:** OPS-01..10 oficialmente em Phase 10, mas Sentry SDK + structured logging + correlation IDs + Supabase Pro + HIBP estão ativos desde Phase 1 (cobertos como `FOUND-08`, `FOUND-09`, `FOUND-10`, `AUTH-01`). Phase 10 finaliza alertas de produção, PostHog funnel, cascade LGPD external (Resend/PostHog/Sentry person deletion), performance budgets em CI e soft launch.

**Mode:** mvp (Vertical MVP — cada fase entrega capacidade end-to-end user-visible).

**Granularity:** fine (10 phases, 5-13 plans each).

**Cross-cutting non-negotiables** (aplicam-se implicitamente a todas as fases, não duplicados em cada goal):

- TypeScript strict 100% (single `tsconfig.json`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- ESLint CI blocking (no `any`, no `as any`, no `: any`)
- Coverage gates: ≥50% global, ≥90% em `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`
- Sentry + pino structured logs from Phase 1 onwards
- Atomic Postgres functions for any read-modify-write (XP, access grant, progress batch, webhook)
- RLS on every table + `getConcursoBySlug()` helper (never hardcoded UUID)
- `service_role` key isolated to `lib/supabase/admin.ts` with `'server-only'` guard
- ANTI-features enforced off: no AI visible to student, no Tiptap, no free tier, no auto-renew

## Phases

**Phase Numbering:**
- Integer phases (1-10): Planned milestone work (sequential start at 1 per GSD convention)
- Decimal phases (e.g., 2.1): Urgent insertions if needed during execution

- [ ] **Phase 1: Foundation** - Quality gates, Supabase Pro, schema base, Sentry, types pipeline — zero-drift codebase from commit 1
- [ ] **Phase 2: Multi-Tenant Skeleton** - Subdomínio resolve, route groups, theme inline via CSS vars, tokens base, TJSP seed
- [ ] **Phase 3: Auth + Access** - Aluno cria conta, verifica email, loga (email/Google), bate PrepPaywall, pede deleção LGPD
- [ ] **Phase 4: Checkout + Webhook** - Funil completo Asaas (PIX/boleto/cartão), webhook idempotente, grant atômico, reembolso CDC art. 49 real
- [ ] **Phase 5: SRS Core** - Sessão de estudo com FSRS-5, round-robin determinístico testado, XP atômico, WAL IndexedDB
- [ ] **Phase 6: Simulado** - 5h cronometrado, WAL strict-durability, timer server-authoritative, sobrevive crash/refresh/dual-tab
- [ ] **Phase 7: Cadernos + Dashboard Premium** - 3 cadernos, dashboard widgets, mapa do edital, identidade visual Flashcards finalizada
- [ ] **Phase 8: Admin Pipeline — Cowork** - Review queue, bulk import, edital parser, refund queue, métricas Cowork
- [ ] **Phase 9: Marketing + SEO** - Hub + landings per-concurso (SEO long-tail), sitemap, OG dinâmico, demo cards públicos
- [ ] **Phase 10: Polish + Soft Launch** - PostHog funnel, LGPD cascade externa, alerts produção, performance budgets CI, primeira cohort paga

## Phase Details

### Phase 1: Foundation

**Goal**: Codebase zero-drift desde commit 1. CI gates blocking, Supabase Pro provisionado, schema base migrado, Sentry + structured logs ativos, types pipeline rodando — antes de qualquer feature. Resolve as 5 críticas legacy (TEST-01 via coverage gates, TD-05 via greenfield schema).
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12
**Success Criteria** (what must be TRUE):
  1. `pnpm lint` falha o build em qualquer `: any`, `as any`, `console.log` ou import relativo profundo (CI bloqueia merge no `main`)
  2. `pnpm typecheck` passa com `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` em 100% do código
  3. `pnpm test` exige ≥50% coverage global e ≥90% em `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/` (CI falha se regredir)
  4. `pnpm types:gen` rodando no CI; build quebra se `database.types.ts` não casa com migrations
  5. Supabase Pro project criado em `sa-east-1`, PITR 7d habilitado, HIBP on, branching por PR funcionando
  6. Sentry captura exception de um endpoint test (`/api/healthz?simulateError=true`) com `correlationId` propagado, source maps OK
  7. Pre-commit hook (husky + lint-staged) bloqueia commit com `tsc --noEmit` ou lint vermelho; bypass requer `--no-verify` consciente
**Plans**: 13 plans
  - [x] 01-01-PLAN.md — Next.js 15.5 scaffold + TS strict + pnpm + route groups + env.ts *(2026-05-21)*
  - [x] 01-02-PLAN.md — ESLint + Prettier + Husky + lint-staged + custom UUID-ban rule *(2026-05-21)*
  - [x] 01-03-PLAN.md — Vitest + MSW + coverage gates + placeholder modules *(2026-05-21)*
  - [x] 01-04-PLAN.md — Playwright + gate-break coverage probe *(2026-05-21)*
  - [ ] 01-05-PLAN.md — GitHub Actions CI + branch protection + CODEOWNERS + Dependabot
  - [ ] 01-06-PLAN.md — Supabase Pro provisioning + client factories + 'server-only' guard
  - [ ] 01-07-PLAN.md — Migrations 0001-0005 + RLS + intermediate `supabase db push`
  - [ ] 01-08-PLAN.md — Migrations 0006-0010 + atomic functions + seed.sql + final `supabase db push`
  - [ ] 01-09-PLAN.md — Types generation pipeline + CI gate
  - [ ] 01-10-PLAN.md — Sentry SDK + Pino + middleware correlationId propagation
  - [ ] 01-11-PLAN.md — Observability helpers + /api/healthz + smoke probe
  - [ ] 01-12-PLAN.md — Vercel Pro + DNS + wildcard SSL + ENV vars
  - [ ] 01-13-PLAN.md — Smoke E2E + 9 gate-break tests + Phase 1 verification + v0.1.0-phase1 tag

### Phase 2: Multi-Tenant Skeleton

**Goal**: Requisição a `tjsp.flashcards.com.br` resolve concurso, aplica tema visual sem FOUC, roteia para route group correto. Cookie domain `.flashcards.com.br` ativo. Nenhuma feature de produto ainda — apenas o esqueleto multi-tenant + tokens visuais base que as próximas fases consomem.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: MULTI-01, MULTI-02, MULTI-03, MULTI-04, MULTI-05, MULTI-06, MULTI-07, MULTI-08, DESIGN-01
**Success Criteria** (what must be TRUE):
  1. Hit em `tjsp.flashcards.com.br` resolve concurso, hidrata CSS vars (`--brand-primary`, fonte de acento) sem flash visual
  2. Hit em `app.flashcards.com.br` (sem subdomínio de concurso) com 2+ acessos ativos mostra seletor de concurso; clicar troca subdomínio + tema inteiro
  3. Admin pode criar novo concurso pelo DB (insert em `admin_concursos`) e o subdomínio funciona sem code deploy
  4. Playwright E2E: signin em `tjsp.flashcards.com.br` → refresh em `pf.flashcards.com.br` → sessão preservada (cookie domain cross-subdomain)
  5. `lib/supabase/admin.ts` lança runtime error se importado fora de `'server-only'` context (service_role isolado)
  6. Helper `getConcursoBySlug()` é a única forma de buscar concurso (lint custom rule bloqueia UUID hardcoded em código)
  7. Design tokens base (paleta principal Flashcards, tipografia Inter + display via `next/font` self-hosted, spacing scale, motion presets) consumidos por componentes shadcn customizados
**Plans**: TBD
**UI hint**: yes

### Phase 3: Auth + Access

**Goal**: Aluno cria conta com email/senha (≥10 chars, HIBP on), confirma email, faz login (email ou Google OAuth), passa por onboarding (nome + CPF validado + concurso de interesse), e bate em `PrepPaywall` modal full-screen se não tem acesso. Pode pedir deleção LGPD com cascade Postgres function.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10
**Success Criteria** (what must be TRUE):
  1. Aluno consegue criar conta com email/senha (≥10 chars) e senha vazada via HIBP é rejeitada com mensagem clara em PT-BR
  2. Aluno recebe email de verificação após signup; conta permanece inativa até clique no link
  3. Aluno pode logar com Google OAuth e ter sessão equivalente ao email/senha (mesma tabela `auth.users`)
  4. Aluno sem `user_concurso_access` ativo bate em `PrepPaywall` modal full-screen mostrando plano + botão checkout
  5. Aluno pode deslogar de qualquer página; sessão invalidada no servidor (`auth.signOut()`)
  6. Aluno solicita deleção LGPD, confirma via email, e em <60s todos os dados foram apagados via `fn_delete_user_cascade` (verificação E2E: query DB pós-deleção retorna 0 rows)
  7. `SESSION_VERSION` constant força re-login em deploy com schema/token change (testado via bump manual)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Checkout + Webhook

**Goal**: Funil de pagamento completo Asaas: aluno escolhe PIX/boleto/cartão, checkout flui com UX distinta por tipo, webhook idempotente processa redelivery sem duplicar, `fn_process_webhook_event` cria/atualiza `user_concurso_access` atomicamente, reembolso CDC art. 49 escreve em tabela real e dispara email Resend. Sentry alerta se webhook recebe evento mas grant não acontece em <60s. Resolve SEC-05 (silent 200) + SEC-10 (fake refund) + DI-01 (non-atomic).
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SALES-04, SALES-05, SALES-06, SALES-07, SALES-08, SALES-09, SALES-10, SALES-11, SALES-12, SALES-13, SALES-14, SALES-15, SALES-16
**Success Criteria** (what must be TRUE):
  1. Aluno completa fluxo PIX: vê QR + código copia-cola, polling do status até CONFIRMED em <10min, acesso liberado antes da tela fechar
  2. Aluno completa fluxo boleto: vê linha digitável + PDF download + texto explícito "boleto pode levar até 3 dias úteis para confirmar"
  3. Aluno completa fluxo cartão (até 12x sem juros): confirmação imediata, valor da parcela mostrado, acesso granted antes de fechar
  4. Webhook Asaas redelivery do mesmo `event_id` não duplica grant (PK em `webhook_events`, `expires_at = paid_at + interval '365 days'` determinístico)
  5. Webhook retorna 500 em erro transiente (DB down, Asaas re-fetch failure) — Asaas retenta; retorna 200 só em sucesso real ou unrecoverable. Sentry captura toda exception
  6. Aluno solicita reembolso em até 7 dias via `/conta/reembolso` → row gravada em `refund_requests` real → `legal_audit_log` registra → email Resend confirma recebimento (CDC art. 49 funcional, NÃO fake como legacy)
  7. Aluno com TJSP ativo compra PF com 1 clique: customer Asaas reusado por CPF+email, checkout pré-preenche, segundo grant não afeta o primeiro
  8. Termos de Uso + Política de Privacidade publicados sem "free tier", "caderno digital", "chat IA" e cobrem LGPD/CDC/retenção/refund window
**Plans**: TBD
**UI hint**: yes

### Phase 5: SRS Core

**Goal**: A sessão de estudo é o produto. Cards interleaved por disciplina via `interleaveQueue` determinístico testado (seed `userId+brtDate+sessionId`), FSRS-5 scheduling correto (19 weights, property-tested), WAL IndexedDB sobrevive refresh/network drop, XP atômico via `fn_award_xp` Postgres. **Resolve o bug histórico de "cards repetindo na mesma seção" que matou o legado** (Rafael 2026-05-21).
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: STUDY-01, STUDY-02, STUDY-03, STUDY-04, STUDY-05, STUDY-06, STUDY-07, STUDY-08, STUDY-09, STUDY-10, STUDY-11, STUDY-12, STUDY-13, STUDY-14
**Success Criteria** (what must be TRUE):
  1. Aluno estuda 50 cards em sessão com 4+ disciplinas e nunca vê 3 cards consecutivos da mesma disciplina (property test garante invariante; manual QA com fixture confirma)
  2. Aluno refresha o navegador no meio da sessão e vê a MESMA fila + os ratings já dados preservados via IndexedDB WAL (seed estável = sessão idêntica)
  3. Aluno rata 100 cards com atalhos 1-4; XP final = soma exata dos awards (sem perda em concorrência), verificado via property test contra `fn_award_xp` paralelo
  4. Card "Errei" entra automaticamente no `mistake_notebook` (trigger ou Server Action paralelo) — visível no caderno de erros em <1s
  5. Aluno marca card durante estudo (estrela); lista persistente em `/cards-marcados` mostra todos
  6. Comparação "hoje" usa BRT midnight (`America/Sao_Paulo`); card com `due_at` 23h59 UTC do dia anterior continua disponível até BRT midnight virar
  7. Sessão termina graciosamente: resumo (X cards, Y% acerto, Z minutos), todos os reviews flushed para Postgres via `fn_batch_upsert_progress`
**Plans**: TBD
**UI hint**: yes

### Phase 6: Simulado

**Goal**: Aluno faz simulado de 5h/70Q (configuração lida de `admin_concursos.simulado_config` JSONB) sem perda de dados em crash/refresh/dual-tab. Timer é server-authoritative (`expires_at` no DB, tolerance 30s). Distribuição de questões espelha banca real via DB. Submit único enforced por UNIQUE constraint. Questões erradas entram no caderno de erros.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SIM-06, SIM-07, SIM-08, SIM-09, SIM-10, SIM-11, SIM-12
**Success Criteria** (what must be TRUE):
  1. Aluno inicia simulado TJSP de 5h/70Q; distribuição por disciplina espelha proporção da banca lida do DB (zero hardcoded)
  2. Aluno responde 20 questões → fecha aba → reabre → todas as respostas + tempo decorrido + estado "marcado pra voltar" são restaurados via IndexedDB WAL strict-durability
  3. Aluno tenta abrir 2ª aba do mesmo simulado em andamento → 2ª aba detecta e bloqueia ("Outra sessão em andamento")
  4. Timer expira no servidor: submit pós-`expires_at + 30s` é rejeitado (verificação E2E)
  5. Aluno clica submit duas vezes em rede lenta — UNIQUE `(attempt_id, question_id)` previne dupla submissão; resultado é único
  6. Aluno vê resultado: % global, % por disciplina, tempo médio/questão, comparação com média dos alunos do concurso
  7. Aluno revisa gabarito questão-a-questão; questões erradas estão automaticamente no caderno de erros
**Plans**: TBD
**UI hint**: yes

### Phase 7: Cadernos + Dashboard Premium

**Goal**: Painel parece premium e distinto. Três cadernos curados (Erros auto-populado + Praticar Erros, Questões personalizado, Cards Marcados). Dashboard com hero do concurso, due cards, streak, heatmap, mapa do edital, projeção de prontidão. Identidade visual Flashcards finalizada (não shadcn defaults) com sub-temas por concurso, dark mode, animações respeitando `prefers-reduced-motion`, visual regression snapshots, breakpoints E2E.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: NB-01, NB-02, NB-03, NB-04, NB-05, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05, DESIGN-06, DESIGN-07, DESIGN-08
**Success Criteria** (what must be TRUE):
  1. Aluno abre dashboard e vê hero do concurso ativo, due count, streak atual com badge de freeze disponível, próxima revisão countdown — tudo dentro de 200ms first paint
  2. Aluno acessa "Caderno de Erros", vê todos os cards errados + questões erradas em simulado, clica "Praticar erros" e entra em sessão SRS exclusiva
  3. Aluno cria caderno personalizado filtrando "Constitucional 2020-2024", salva, pratica com/sem timer
  4. Aluno vê mapa do edital com % de cobertura por tópico (cores baseadas em volume); clique em tópico navega para cards daquele tópico
  5. Aluno vê heatmap de estudo dos últimos 6 meses e estatísticas por disciplina (Recharts lazy-loaded com `dynamic()`, bundle não estourado)
  6. Aluno toggle dark mode em `/conta`; CSS vars switchadas via `data-theme`; preferência persistida
  7. Visual regression snapshots passam em mobile (375px), tablet (768px), desktop (1280px) para landing, dashboard, study session, simulado, admin
  8. Sub-temas por concurso (color accent, hero pattern, logo variant) lidos de `admin_concursos.theme` JSONB renderizam sem regression entre concursos
**Plans**: TBD
**UI hint**: yes

### Phase 8: Admin Pipeline — Cowork

**Goal**: Cowork pode importar edital (PDF → parser AI → status='review' → aprovação humana), bulk-import cards e questões via CSV, revisar via atalhos teclado (A/E/R/S), aprovar para `status='active'` (única forma de card ficar visível ao aluno), monitorar cobertura do edital, processar refund queue, ver métricas internas. Curator audit log registra quem aprovou/editou/rejeitou cada item. **Pode rodar em paralelo com Phase 6/7 assim que Phase 5 entregar o schema de flashcards ativo.**
**Mode:** mvp
**Depends on**: Phase 5 (schema flashcards active), Phase 4 (refund queue depends on `refund_requests` table)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10, ADMIN-11, ADMIN-12, ADMIN-13, ADMIN-14, ADMIN-15
**Success Criteria** (what must be TRUE):
  1. Admin acessa `admin.flashcards.com.br`; usuário sem `user_roles.role='admin'` recebe 403 server-side (`AdminRoute` guard)
  2. Admin cria novo concurso (slug, nome, banca, price_cents, theme, simulado_config) pela UI; subdomínio funciona em <30s sem code deploy
  3. Admin sobe PDF do edital → parser AI gera disciplinas/tópicos como `status='review'` → admin aprova → vira `status='active'` (cards student-visible apenas após approve)
  4. Admin bulk-importa 500 cards via CSV; todos entram como `status='review'`; review queue mostra-os com atalhos A=approve, E=edit, R=reject, S=skip
  5. Admin processa refund pendente: clica approve → `refund_requests.status='approved'` + Asaas refund API chamado + email Resend ao aluno → row em `legal_audit_log`
  6. Admin concede acesso manual a aluno (uso: legacy migrated, comp, suporte) selecionando concurso + duração; row em `user_concurso_access` + audit log
  7. Métricas Cowork (`/admin/metricas`) mostram: produção semanal, tempo médio de revisão, taxa de aprovação, top reviewers, cobertura edital por concurso, gaps por tópico
  8. Cards reportados por alunos (gabarito errado, conceito errado) aparecem em fila dedicada com fluxo de correção
**Plans**: TBD
**UI hint**: yes

### Phase 9: Marketing + SEO

**Goal**: Hub `flashcards.com.br` + landings por concurso `<slug>.flashcards.com.br` são indexáveis, rápidas, SEO-otimizadas, conversionam. Long-tail TJSP estabelecido ("flashcards tjsp escrevente", "preparação tjsp"). Sitemap por subdomínio + master, robots.txt, metadata API, OG images dinâmicas, demo cards públicos sem login. Schema.org Product + Course. Performance: landing <150KB gzipped, LCP <2.5s no 3G.
**Mode:** mvp
**Depends on**: Phase 2 (subdomain routing), Phase 7 (design system finalized)
**Requirements**: SALES-01, SALES-02, SALES-03, SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08
**Success Criteria** (what must be TRUE):
  1. `flashcards.com.br` renderiza hub institucional (RSC, metadata API completa, OG image dinâmica via `/og`) e linka todos os subdomínios de concurso ativos
  2. `tjsp.flashcards.com.br` renderiza landing dedicada SEO long-tail com sub-tema visual aplicado, schema.org Product + Course markup válido
  3. Visitor não-autenticado vê 5-10 cards demo na landing (RSC, sem login, dados via DB)
  4. `sitemap.xml` por subdomínio + master em `flashcards.com.br/sitemap.xml` indexado; `robots.txt` desindexa `admin.` e `app.`, indexa marketing+landings
  5. Lighthouse mobile: landing <150KB first-load JS gzipped, LCP <2.5s no 3G simulado, performance budget enforced em CI (build falha se exceder)
  6. Google Search Console verificado para hub + cada subdomínio; hub-and-spoke linking consolida autoridade (cada subdomínio linka back ao hub)
  7. OG image dinâmica gerada por concurso via Route Handler `/api/og/[slug]` (Vercel OG); preview em Twitter/WhatsApp/LinkedIn mostra imagem correta
**Plans**: TBD
**UI hint**: yes

### Phase 10: Polish + Soft Launch

**Goal**: Primeira cohort paga (5-10 alunos TJSP). LGPD compliant E2E com cascade externo (Resend audience + PostHog person + Sentry user deletion). Observabilidade completa: alerts Sentry para webhook 5xx, auth failures spike, DB connection errors, payload mismatch. PostHog funnel events wired (signup → checkout_started → payment_confirmed → first_study_session → first_simulado). Performance budgets enforced. Healthcheck endpoint vivo. Production checklist passado. Monitorado 1 semana antes de marketing público.
**Mode:** mvp
**Depends on**: All prior phases (1-9)
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07, OPS-08, OPS-09, OPS-10
**Success Criteria** (what must be TRUE):
  1. PostHog dashboard mostra funnel events de pelo menos 5 alunos completos (signup → checkout_started → payment_confirmed → first_study_session → first_simulado) com identificação via user_id interno (zero CPF em PostHog)
  2. Aluno solicita deleção LGPD; em <60s seus dados estão deletados em Supabase + Resend audience + PostHog person + Sentry user (verificação E2E via APIs externas)
  3. Sentry alert dispara em <1min se webhook retorna 5xx (test: derrubar staging DB e enviar webhook) ou se purchase entry sem grant correspondente em 60s
  4. Healthcheck `/api/healthz` retorna 200 com checks de Supabase ping, Asaas reach, Sentry reach; Vercel monitor configurado
  5. Performance budgets em CI: build falha se landing >150KB gzipped first-load JS ou app pages >250KB
  6. Cohort de 5-10 alunos TJSP completou ciclo signup → checkout PIX/cartão → grant → ≥1 sessão de estudo → ≥1 simulado iniciado em 1 semana, sem incident P0/P1
  7. Runbook de incidente documentado (webhook offline, DB pause, payment dispute) + checklist de deploy + contact list operacional
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Fases executam em ordem numérica: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

Cross-phase parallelization (após Rafael aprovar): Phase 8 (Admin Pipeline) pode iniciar em paralelo com Phase 6 e/ou Phase 7 assim que Phase 5 entregar o schema de flashcards ativo.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/13 | In progress | - |
| 2. Multi-Tenant Skeleton | 0/TBD | Not started | - |
| 3. Auth + Access | 0/TBD | Not started | - |
| 4. Checkout + Webhook | 0/TBD | Not started | - |
| 5. SRS Core | 0/TBD | Not started | - |
| 6. Simulado | 0/TBD | Not started | - |
| 7. Cadernos + Dashboard Premium | 0/TBD | Not started | - |
| 8. Admin Pipeline — Cowork | 0/TBD | Not started | - |
| 9. Marketing + SEO | 0/TBD | Not started | - |
| 10. Polish + Soft Launch | 0/TBD | Not started | - |

---

*Roadmap created: 2026-05-21 by gsd-roadmapper*
*Updated: 2026-05-21 after plan-checker revision (Phase 1 expanded from 10 → 13 plans to satisfy ≤5-task limit)*
*Granularity: fine (10 phases) | Mode: mvp | Project mode: Vertical MVP*
*Coverage: 127/127 v1 requirements mapped to exactly one phase*
</content>
</invoke>
