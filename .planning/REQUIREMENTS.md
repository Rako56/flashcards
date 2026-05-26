# Requirements: Flashcards

**Defined:** 2026-05-21
**Core Value:** O aluno paga R$ 297, abre o app, e estuda — sessão SRS + caderno de erros + simulado precisam funcionar perfeitamente. Conteúdo bom, painel premium, simulado real. Funciona.

> Reboot de Sparkle Study Scape → Flashcards (flashcards.com.br). Stack: Next.js 15.5 + TypeScript strict + Supabase Pro + Asaas + Vercel Pro. Multi-tenant desde dia 1 com subdomínio por concurso. TJSP Escrevente é o primeiro concurso v1.

---

## v1 Requirements

### Foundation (FOUND)

Quality gates não-negociáveis aplicados desde commit 1.

- [x] **FOUND-01**: Repositório Next.js 15.5 + App Router + TypeScript strict 100% scaffold inicial pronto, `pnpm` como gerenciador, Node 20.18.x pinado em `.nvmrc` *(Plan 1.1 — 2026-05-21)*
- [x] **FOUND-02**: ESLint flat config bloqueia `any`, `: any`, `as any`, imports relativos profundos e `console.log`; `pnpm lint` falha no CI *(Plan 1.2 — 2026-05-21)*
- [x] **FOUND-03**: Prettier configurado; `pnpm format:check` falha no CI se houver drift *(Plan 1.2 — 2026-05-21)*
- [x] **FOUND-04**: Husky + lint-staged executa lint+typecheck pré-commit; pre-push roda `tsc --noEmit` *(Plan 1.2 — 2026-05-21)*
- [x] **FOUND-05**: Vitest configurado com coverage gates: ≥50% global, ≥90% em `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/` *(Plan 1.3 — 2026-05-21)*
- [x] **FOUND-06**: Playwright instalado e configurado pra E2E em CI (Vercel preview deploy URL) *(Plan 1.4 — 2026-05-21)*
- [x] **FOUND-07**: GitHub Actions: lint → typecheck → test → build → Supabase migrations lint, com proteção de branch `main` *(Plan 1.5 — 2026-05-26; admin-bypass enabled as solo-dev trade-off — see STATE.md Decisions § "Solo dev branch protection trade-off")*
- [x] **FOUND-08**: Sentry SDK Next.js 15 instalado com sourcemaps via Vercel integration; tags `correlationId`, `userId`, `concursoSlug` *(Plan 1.10 — 2026-05-26; @sentry/nextjs 10.54 + 3 config files (server/client/edge) + instrumentation.ts + captureWithCorrelation + setSentryUser + withErrorTracking wrapper. Source maps upload via SENTRY_AUTH_TOKEN; tunnelRoute /monitoring para bypass ad blockers. Region EU.)*
- [x] **FOUND-09**: Pino structured logging em todas Route Handlers e Server Actions com `correlationId` propagado via header *(Plans 1.11 + 1.10 — 2026-05-26; pino 10.3.1 + redact list + childLogger + correlation.ts (getCorrelationId, withCorrelationHeader) + Sentry captureWithCorrelation + withErrorTracking wrapper + /api/healthz com simulateError end-to-end. Middleware correlationId injection será no Plan de Auth (Phase 4).)*
- [x] **FOUND-10**: Supabase Pro project (existing `zjyogswbgcauwqisvuyq` em `us-west-2` — region trade-off decisão 2026-05-26, latência aceitável), Supabase Branching habilitada via GitHub Integration *(Plan 1.6 — 2026-05-26; reuso de projeto existente vs greenfield — ver STATE.md Decisions § "Supabase project reuse")*
- [~] **FOUND-11**: Schema base migrado em 8 migrations (admin_concursos, admin_*, users/profiles, user_concurso_access, srs/progress/reviews, simulados, purchases/webhook_events, audit_log) com RLS em toda tabela e Postgres functions atômicas *(PARCIAL — Plans 1.7 + 1.8 audits 2026-05-26: schema base já em produção com 236 migrations + RLS 33/33 tabelas. Plan 1.7 entregou F-001 (function search_path); F-002 a F-008 deferred. Plan 1.8 audit identificou 7/14 tabelas MISSING e quebrou em sub-plans 1.8-A (webhook_events 🔴 Phase 4 blocker), 1.8-B (simulado normalize 🟠 Phase 9), 1.8-C (LGPD audit_log/legal_audit_log/lgpd_deletion 🟡 compliance), 1.8-D (xp_events 🟢 opcional). Ver `.planning/phases/01-foundation/01-07-AUDIT.md` + `01-08-AUDIT.md`)*
- [x] **FOUND-12**: Pipeline de geração de tipos Supabase (`pnpm types:gen`) roda no CI; build falha se `database.types.ts` estiver desatualizado vs migrations *(Plan 1.9 — 2026-05-26; types reais via `supabase gen types --linked` shipped em Plan 1.6, types-fresh + supabase-lint CI jobs ativados — `if: false` → `if: true`)*

### Multi-Tenant Architecture (MULTI)

Multi-concurso DB-driven desde dia 1 com subdomínio por concurso.

- [ ] **MULTI-01**: `admin_concursos` no DB com slug, nome, banca, theme JSONB, simulado_config JSONB, status; concurso criado por admin sem code deploy
- [ ] **MULTI-02**: `middleware.ts` resolve subdomínio → concurso slug (cache via Vercel Edge Config), atualiza session Supabase, injeta headers `x-concurso-slug` + `x-surface` + `x-user-id`, reescreve pra route group correto
- [ ] **MULTI-03**: Route groups `(marketing)`, `(app)`, `(admin)`, `(auth)` separam chrome, guards, theme injection
- [ ] **MULTI-04**: Tema visual por concurso aplicado via CSS variables inline (zero FOUC), lido de `admin_concursos.theme` no layout root
- [ ] **MULTI-05**: `user_concurso_access` junction table: aluno pode ter N concursos ativos, RLS scopes leitura por user_id+concurso_id
- [ ] **MULTI-06**: Cookie domain `.flashcards.com.br` permite sessão compartilhada entre todos os subdomínios; Playwright E2E confirma signin → reload em outro subdomínio mantém autenticado
- [ ] **MULTI-07**: `app.flashcards.com.br` mostra seletor de concurso quando aluno tem 2+ acessos ativos; trocar muda subdomínio + theme + dashboard inteiramente
- [ ] **MULTI-08**: Helper `getConcursoBySlug(slug)` é a única forma de buscar concurso por slug (nunca hardcoded UUID); usado em todas RSC/Server Actions

### Auth & Access (AUTH)

Signup, login, sessão segura, paywall, LGPD.

- [ ] **AUTH-01**: Aluno pode criar conta com email + senha (≥10 chars); HIBP password protection habilitado no Supabase Auth
- [ ] **AUTH-02**: Aluno recebe email de verificação após signup; conta inativa até confirmar
- [ ] **AUTH-03**: Aluno pode resetar senha via email link
- [ ] **AUTH-04**: Aluno pode logar com Google OAuth (`@supabase/ssr` + Supabase OAuth provider)
- [ ] **AUTH-05**: Sessão persiste cross-subdomain e sobrevive refresh; `getUser()` (não `getSession()`) refresca token no middleware
- [ ] **AUTH-06**: Onboarding pós-signup coleta nome, CPF (validado), concurso de interesse
- [ ] **AUTH-07**: `PrepPaywall` modal full-screen bloqueia aluno sem `user_concurso_access` ativo, mostra plano + checkout
- [ ] **AUTH-08**: Aluno pode logout de qualquer página; logout invalida sessão no servidor (`auth.signOut()`)
- [~] **AUTH-09**: Endpoint LGPD account-deletion: aluno solicita → email confirma → `delete_user_cascade` Postgres function deleta dados + chama Supabase `auth.admin.deleteUser()` + dispara webhook para deletar de Resend/PostHog/Sentry *(PARCIAL — Plan 1.8-C 2026-05-26: DB scaffolding pronto — table `lgpd_deletion_requests` com RLS user-own; function `delete_user_cascade(uuid)` que anonimiza user_profile + expira user_concurso_access + insere row em legal_audit_log. Falta: endpoint `/api/account/delete` Route Handler (espera Phase 4 Auth pages), email confirmação magic-link, hooks Resend/PostHog/Sentry. Função usa naming sem `fn_*` prefix conforme decisão Plan 1.8 audit.)*
- [ ] **AUTH-10**: `SESSION_VERSION` constant força re-login em deploy quando schema/token muda

### Funnel & Payment (SALES)

Funil de venda completo Asaas (PIX + boleto + cartão).

- [ ] **SALES-01**: `flashcards.com.br` hub landing institucional (RSC, SEO-optimized, metadata API)
- [ ] **SALES-02**: `<slug>.flashcards.com.br` landing dedicada por concurso (RSC, SEO long-tail por concurso, sub-tema visual)
- [ ] **SALES-03**: Landing mostra 5-10 cards demo (data via RSC, sem login)
- [ ] **SALES-04**: Checkout UI com 3 abas (PIX, boleto, cartão), preço lido de `admin_concursos.price_cents`
- [ ] **SALES-05**: Parcelamento em até 12x no cartão (sem juros Asaas standard); valor da parcela mostrado ao aluno
- [ ] **SALES-06**: Server Action `createAsaasPayment` valida via Zod, cria/recupera customer Asaas (dedup CPF+email), gera payment, retorna URL/QR
- [ ] **SALES-07**: PIX: aluno vê QR + código copia-cola; polling do status até CONFIRMED (max 10min) ou aluno pode fechar e retornar
- [ ] **SALES-08**: Boleto: aluno vê linha digitável + PDF download; texto explícito "boleto pode levar até 3 dias úteis para confirmar"
- [ ] **SALES-09**: Cartão: aluno vê confirmação imediata após pagamento; access granted antes de fechar a tela
- [ ] **SALES-10**: `/api/asaas/webhook` Route Handler valida `asaas-access-token` header, registra evento em `webhook_events` (PK = Asaas event_id pra idempotência), re-fetch payment do Asaas pra verify, executa `fn_process_webhook_event` atômico
- [ ] **SALES-11**: Webhook retorna **500** em erro transiente (Asaas retenta); retorna 200 só em sucesso real. Sentry captura toda exception. Alerta dispara se `webhook_events` recebe entry mas grant não acontece em <60s
- [ ] **SALES-12**: Após pagamento confirmado, `fn_process_webhook_event` cria/atualiza `user_concurso_access` com `expires_at = paid_at + interval '365 days'` (determinístico, idempotente em redelivery)
- [ ] **SALES-13**: Aluno recebe email Resend ao confirmar pagamento (welcome + access link)
- [ ] **SALES-14**: Aluno pode solicitar reembolso em até 7 dias (CDC art. 49) via página `/conta/reembolso`; formulário Zod-validado escreve em `refund_requests` real, `legal_audit_log` registra solicitação, email Resend confirma recebimento
- [ ] **SALES-15**: Termos de Uso + Política de Privacidade fiéis ao produto atual (zero "free tier", zero "caderno digital", zero "chat IA"); cobrem LGPD, retenção, cookies, refund window
- [ ] **SALES-16**: Aluno com TJSP comprado pode comprar PF com 1 clique (sessão já existe, checkout pré-preenche customer Asaas existente)

### SRS Core — Estudo (STUDY)

A sessão de estudo é o coração do produto. Resolve o bug histórico de cards repetindo.

- [ ] **STUDY-01**: `lib/srs/fsrs.ts` implementa FSRS-5 (19 weights, modelo padrão) como funções puras zero-deps; cobertura ≥95%
- [ ] **STUDY-02**: `lib/queue/builder.ts` constrói fila de estudo com round-robin determinístico por disciplina; seed estável `userId + brtDate + sessionId` (mesmo refresh = mesma fila)
- [ ] **STUDY-03**: Property-based tests garantem invariantes do queue: (a) nunca 3+ cards consecutivos da mesma disciplina quando há 3+ disciplinas; (b) seed estável; (c) due cards têm prioridade sobre novos
- [ ] **STUDY-04**: Rating 1-clique com 4 botões (Errei / Quase / Fácil / Sabia) + atalhos teclado 1-4
- [ ] **STUDY-05**: `useReviewBatcher` hook agrupa 5 reviews → flush via `batchUpsertProgress` Server Action; fallback per-card write em falha de rede
- [ ] **STUDY-06**: Server Action chama `fn_batch_upsert_progress` Postgres function (atômica, ON CONFLICT update) — sem read-modify-write client
- [ ] **STUDY-07**: `srs_reviews` table append-only (audit log imutável); `user_flashcard_progress` é projeção denormalizada
- [ ] **STUDY-08**: IndexedDB WAL persiste cada rating localmente antes do batch flush; sessão sobrevive refresh/network drop
- [ ] **STUDY-09**: Card "Errei" entra automaticamente no `mistake_notebook` via trigger Postgres ou inserção paralela na Server Action
- [ ] **STUDY-10**: Cards podem ser marcados (estrela) durante estudo; sessão dedicada `/cards-marcados` lista todos
- [ ] **STUDY-11**: Card content sanitizado via DOMPurify no servidor antes de render (HTML curado mas defesa em profundidade)
- [ ] **STUDY-12**: XP awarded por card revisado via `fn_award_xp` Postgres function atômica (`UPDATE profiles SET xp = xp + N`); `fn_xp_events` audit log com idempotency_key
- [ ] **STUDY-13**: Sessão termina graciosamente: persiste estado, mostra resumo (X cards, Y% acerto, Z minutos)
- [ ] **STUDY-14**: Timezone BR (`America/Sao_Paulo`) usado em todas comparações de "hoje" (BRT midnight = corte do dia); `due_at` é `timestamptz`

### Simulado (SIM)

Cronometrado 5h/70Q (TJSP), WAL strict-durability, server-authoritative timer.

- [ ] **SIM-01**: Simulado config lido de `admin_concursos.simulado_config` JSONB (duration_min, num_questoes, distribution por disciplina); zero hardcoded
- [ ] **SIM-02**: Distribuição de questões espelha proporção da banca (DB-driven, por concurso)
- [ ] **SIM-03**: `lib/simulado/wal.ts` IndexedDB com `durability: 'strict'` persiste cada resposta antes de UI atualizar
- [ ] **SIM-04**: Timer é server-authoritative: `simulado_runs.expires_at` no DB; client mostra countdown mas submit valida no servidor com 30s tolerance
- [ ] **SIM-05**: "Marcar pra voltar" + grid navigator (visualização todas questões com estado: respondida/marcada/em branco)
- [ ] **SIM-06**: Aluno pode voltar a qualquer questão antes do submit final
- [ ] **SIM-07**: Submit único ao fim; antes disso respostas só vivem em IndexedDB + cópia parcial em `simulado_answers`
- [ ] **SIM-08**: UNIQUE constraint `(attempt_id, question_id)` em `simulado_answers` previne dupla submissão
- [ ] **SIM-09**: Resultado mostra: % global, % por disciplina, tempo médio por questão, comparação com média dos alunos do concurso
- [ ] **SIM-10**: Review answers: aluno pode revisar cada questão com gabarito, comentário Cowork (se houver), correta
- [ ] **SIM-11**: Questões erradas no simulado entram automaticamente no `mistake_notebook`
- [ ] **SIM-12**: Estado simulado em andamento sobrevive crash/refresh/dual-tab; segunda tab abre detecta e bloqueia ("Outra sessão em andamento")

### Cadernos (NB)

Três cadernos pré-definidos, sem editor Tiptap.

- [ ] **NB-01**: Caderno de Erros auto-populado por cards "Errei" + questões erradas em simulado; aluno adiciona observação curta (1 linha, max 200 chars)
- [ ] **NB-02**: Botão "Praticar erros" inicia sessão SRS exclusiva com erros pendentes
- [ ] **NB-03**: Caderno de Questões personalizado: aluno filtra banco (disciplina/tópico/ano/banca), salva como caderno nomeado, pode praticar com ou sem timer
- [ ] **NB-04**: Cards Marcados: lista todos os cards marcados, sessão direcionada de revisão
- [ ] **NB-05**: Cadernos têm página de listagem com contadores (X erros pendentes, Y questões salvas, Z cards marcados)

### Dashboard & Métricas (DASH)

Painel premium com estatísticas reais.

- [ ] **DASH-01**: Dashboard `/` mostra: hero do concurso ativo, due cards count, streak atual, próxima revisão countdown
- [ ] **DASH-02**: Estatísticas por disciplina (acerto %, evolução temporal) via Recharts (lazy-loaded com `dynamic()`)
- [ ] **DASH-03**: Heatmap de estudo (dias ativos últimos 6 meses) com cores baseadas em volume de cards
- [ ] **DASH-04**: Mapa do Edital: visual de cobertura tópico-a-tópico (% revisado vs total), clique navega para cards do tópico
- [ ] **DASH-05**: Projeção de prontidão `daysToReady()` baseado em ritmo atual de revisão e cobertura
- [ ] **DASH-06**: Streak + freeze: aluno pode "congelar" o streak (cota mensal) sem perder; UI sem culpa, sem push spam
- [ ] **DASH-07**: Leagues semanais (competição entre alunos do mesmo concurso): ranking opt-in, aluno controla privacidade
- [ ] **DASH-08**: Daily challenges (3-5 cards específicos do dia, escolhidos por algoritmo de cobertura)
- [ ] **DASH-09**: Aluno vê histórico de pagamentos + acessos em `/conta`

### Design System (DESIGN)

Identidade própria Flashcards + sub-temas por concurso.

- [ ] **DESIGN-01**: Design tokens definidos (paleta principal Flashcards, tipografia, spacing, motion); documentados em `docs/design-system.md`
- [ ] **DESIGN-02**: Sub-temas por concurso (color accent, hero pattern, logo variant) configurados em `admin_concursos.theme` JSONB
- [ ] **DESIGN-03**: shadcn/ui customizado com tokens Flashcards (NÃO defaults); cada componente revisado
- [ ] **DESIGN-04**: Dark mode opcional (toggle em `/conta`); CSS vars switchadas via `data-theme` attribute
- [ ] **DESIGN-05**: Tipografia (Inter + 1 display) carregada via `next/font` self-hosted
- [ ] **DESIGN-06**: Animações Framer Motion/motion respeitam `prefers-reduced-motion`
- [ ] **DESIGN-07**: Layout responsivo: breakpoints mobile (375px) / tablet (768px) / desktop (1280px); Playwright E2E em cada
- [ ] **DESIGN-08**: Visual regression snapshots para landing, dashboard, study session, simulado, admin

### Admin Pipeline — Cowork (ADMIN)

Painel admin no mesmo bundle, route group restrito.

- [ ] **ADMIN-01**: `admin.flashcards.com.br` exige `user_roles.role = 'admin'`; `AdminRoute` guard server-side
- [ ] **ADMIN-02**: Concurso CRUD: criar/editar concurso (slug, nome, banca, price_cents, theme, simulado_config) sem code deploy
- [ ] **ADMIN-03**: Disciplina/tópico CRUD por concurso, drag-and-drop reordenação, edição inline
- [ ] **ADMIN-04**: Edital parser: upload PDF do edital → AI parser extrai disciplinas/tópicos como `status='review'` → Cowork aprova → vira `status='active'`
- [ ] **ADMIN-05**: Bulk import de cards via CSV (status='review' por padrão) + UI de revisão
- [ ] **ADMIN-06**: Bulk import de questões da banca via CSV/PDF + parser AI (status='review')
- [ ] **ADMIN-07**: Review queue: lista cards/questões `status='review'` com atalhos teclado (A=approve, E=edit, R=reject, S=skip)
- [ ] **ADMIN-08**: Aprovar card vira `status='active'` e fica visível ao aluno (nunca antes)
- [ ] **ADMIN-09**: Quality audit: filtro por idade do card, taxa de "Errei", cards sem mídia, duplicados detectados
- [ ] **ADMIN-10**: Coverage dashboard por concurso: % do edital coberto, gaps por tópico, fila de produção
- [ ] **ADMIN-11**: Refund queue: solicitações de reembolso pendentes com botões approve/deny + nota; aprovar chama Asaas refund API
- [ ] **ADMIN-12**: Card report queue: cards reportados pelos alunos (gabarito errado, conceito errado) com fluxo de correção
- [ ] **ADMIN-13**: Manual access grant: admin pode conceder acesso a qualquer aluno por concurso/duração (uso: clientes legacy migrados, comp, suporte)
- [ ] **ADMIN-14**: Curator audit log: tabela `audit_log` registra quem aprovou/editou/rejeitou cada card; consultável em `/admin/audit`
- [ ] **ADMIN-15**: Métricas internas Cowork: produção semanal, tempo médio de revisão, taxa de aprovação, top reviewers

### SEO & Marketing (SEO)

Landing pages otimizadas, indexação correta.

- [ ] **SEO-01**: Cada subdomínio + hub têm sitemap próprio (`sitemap.xml`); hub master em `flashcards.com.br/sitemap.xml`
- [ ] **SEO-02**: `robots.txt` corretamente configurado (admin desindexado, app desindexado, marketing+landing indexados)
- [ ] **SEO-03**: Metadata API completa por route (title, description, OG, Twitter Card, canonical)
- [ ] **SEO-04**: OG images dinâmicas via Route Handler `/og` por concurso (Vercel OG)
- [ ] **SEO-05**: Schema.org Product + Course markup nas landings de concurso
- [ ] **SEO-06**: Hub-and-spoke linking: hub linka todos subdomínios; cada subdomínio linka de volta ao hub (consolida autoridade)
- [ ] **SEO-07**: Google Search Console configurado para cada subdomínio + hub
- [ ] **SEO-08**: Performance: landing <150KB gzipped first-load JS; LCP <2.5s no 3G simulado

### Operations & Launch (OPS)

Observabilidade, performance, LGPD, soft launch.

- [ ] **OPS-01**: Sentry alerts em produção para: webhook 5xx, auth failures spike, DB connection errors, asaas verify mismatch, payload schema violations
- [ ] **OPS-02**: PostHog instalado com funnel events: signup → checkout_started → payment_confirmed → first_study_session → first_simulado
- [ ] **OPS-03**: PostHog data residency confirmada LGPD-compliant; identificação por user_id interno (NUNCA CPF)
- [ ] **OPS-04**: Performance budgets em CI: landing <150KB / app pages <250KB first-load JS; falha build se exceder
- [ ] **OPS-05**: Supabase Pro confirmado: PITR 7 dias, HIBP on, connection pooling em port 6543 (transaction mode), monitoring de conexões
- [~] **OPS-06**: Vercel Pro confirmado: wildcard SSL provisioned para `*.flashcards.com.br`, apex em A record, ENV vars segregados por preview/production *(PARCIAL — Plan 1.12 2026-05-26: production deploy LIVE em `flashcards-henna-eight.vercel.app` (Vercel Hobby tier, suficiente até Phase 4). Home + /api/healthz responding. PLAYWRIGHT_BASE_URL setado em GH Secrets. Pendente: custom domain `flashcards.com.br` apontamento DNS (Hostinger → Vercel A/CNAME records), wildcard SSL `*.flashcards.com.br` (requer Vercel Pro $20/mo + custom domain confirmed), env vars segregação preview/production (hoje compartilham; trivial split quando precisar).)*
- [ ] **OPS-07**: LGPD account-deletion E2E: solicitação → email confirma → dados deletados em Supabase + Resend audience + PostHog person + Sentry user (cascade via worker)
- [ ] **OPS-08**: Healthcheck endpoint `/api/healthz` com checks (DB ping, Asaas reach, Sentry reach); Vercel monitors
- [ ] **OPS-09**: Documentação operacional: runbook de incidente (webhook offline, DB pause, payment dispute), checklist de deploy, contact list
- [ ] **OPS-10**: Soft launch: cohort inicial de 5-10 alunos comprando TJSP, monitorado por 1 semana, gates de aprovação antes de marketing público

---

## v2 Requirements

Diferidos para depois do lançamento e validação inicial.

### Multi-concurso avançado

- **V2-MULTI-01**: Combo multi-concurso (R$ 450 por 2 concursos, etc) com checkout especial
- **V2-MULTI-02**: Painel unificado em `app.flashcards.com.br` mais sofisticado (cross-concurso analytics)
- **V2-MULTI-03**: Lançamento de PF/OAB/Receita Federal/INSS (mais 3-4 concursos)

### Engagement avançado

- **V2-ENG-01**: Audio mode (TTS pra cards na lavação de louça)
- **V2-ENG-02**: Ranking público opt-in nas leagues (hoje só privado por concurso)
- **V2-ENG-03**: Achievements/badges sistema
- **V2-ENG-04**: Reset SRS por tópico (aluno quer re-estudar disciplina X do zero)
- **V2-ENG-05**: Daily challenges adaptive based em performance

### Plataforma

- **V2-PLAT-01**: PWA install prompt + offline mode pra simulado em andamento
- **V2-PLAT-02**: App mobile nativo (depois de 1000+ alunos engajados)
- **V2-PLAT-03**: Internacional cards (mantém PT-BR, mas i18n da UI se Cowork lançar concurso lusófono fora do BR — improvável)

### Admin avançado

- **V2-ADMIN-01**: A/B testing infra (preço, landing variations, design system)
- **V2-ADMIN-02**: Customer success dashboard (alunos em risco de churn, NPS)
- **V2-ADMIN-03**: Multi-curator collaboration (workflows com aprovação dupla)

### Conteúdo

- **V2-CONT-01**: Comentários Cowork em cards (explicação adicional opcional)
- **V2-CONT-02**: Mídia rica em cards (imagens, gráficos, tabelas via `admin_midias`)
- **V2-CONT-03**: Múltiplas bancas pro mesmo cargo (TJSP VUNESP vs FCC vs outras)

---

## Out of Scope

Explicitamente excluído (decisões âncora de PRODUTO.md §5/§12 + Rafael 2026-05-21).

| Feature | Reason |
|---------|--------|
| **IA visível ao aluno** | Pivot 2026-04-23 — sem botão "gerar flashcards", "explicar com IA", "transcrever áudio". Aluno recebe pronto. PRODUTO.md §5/§12. |
| **Editor rich-text de notas (Tiptap caderno)** | Não somos Notion. Quem quer anotar usa Notion/papel. PRODUTO.md §5. |
| **Free tier amplo** | Persona é pagante sério. Free atrai persona errada que polui métricas e suporte. PRODUTO.md §5. |
| **Multi-idioma** | Produto BR-PT only. Persona é concurseiro brasileiro. |
| **Subscription auto-renewable** | Anual one-shot por concurso. Simplifica billing, reduz churn-by-default. |
| **Geração automática de conteúdo** | Cowork humano sempre. Diferencial vs ferramentas IA-first. |
| **App mobile nativo em v1** | PWA web responsivo basta. Mobile só se 1000+ alunos engajados pedirem. PRODUTO.md §9. |
| **Integração com videoaulas** | Não competimos com Estratégia/Gran/AlfaCon. Complementamos como retomada ativa. |
| **Fórum/community público** | Distração do foco "estudar". Não somos rede social. |
| **OCR PDF upload pelo aluno** | Quem produz conteúdo é Cowork. Aluno não importa material próprio. |
| **DIY deck editor pelo aluno** | Mesma razão. Não é Anki. |
| **Push notifications de guilt** | "Estudou ontem, estuda hoje" — não. Streak suficiente. |
| **Gamification spam** | Sem barra de XP piscando, sem confete em cada click. Premium = subtil. |
| **Multi-tier pricing (basic/pro/premium)** | 1 preço por concurso, simples. |
| **Migração de dados do legado** | Rafael 2026-05-21: "começa limpo". DB legacy sujo, Cowork re-popula. |
| **Stripe ou outro gateway** | Asaas validado. Trocar gateway abriria frente nova sem ganho. |
| **Chat IA / suporte IA-first** | Suporte humano via email/Resend. |
| **Tailwind v4 em v1** | Ecossistema RHF+Zod ainda em transição. Revisita Q1/2027. |
| **Next.js 16 em v1** | `proxy.ts` rename é fresh; tutoriais escassos para subdomain pattern. Upgrade Q4/2026. |
| **Biome como replacement do ESLint** | Falta paridade nos plugins react-hooks + next. Revisita 2027. |

---

## Traceability

Mapeamento requirement → fase (atualizado pelo gsd-roadmapper 2026-05-21).

Cada v1 requirement mapeia para exatamente UMA fase. Phases sequenciais 1-10 (sem Phase 0 — GSD convention).

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation | ✓ Done (Plan 1.1) |
| FOUND-02 | Phase 1: Foundation | ✓ Done (Plan 1.2) |
| FOUND-03 | Phase 1: Foundation | ✓ Done (Plan 1.2) |
| FOUND-04 | Phase 1: Foundation | ✓ Done (Plan 1.2) |
| FOUND-05 | Phase 1: Foundation | ✓ Done (Plan 1.3) |
| FOUND-06 | Phase 1: Foundation | ✓ Done (Plan 1.4) |
| FOUND-07 | Phase 1: Foundation | ✓ Done (Plan 1.5) |
| FOUND-08 | Phase 1: Foundation | Pending |
| FOUND-09 | Phase 1: Foundation | Pending |
| FOUND-10 | Phase 1: Foundation | ✓ Done (Plan 1.6) |
| FOUND-11 | Phase 1: Foundation | ~ Partial (Plan 1.7 audit + F-001) |
| FOUND-12 | Phase 1: Foundation | ✓ Done (Plan 1.9 — via Plan 1.6 gen + 1.9 CI activate) |
| MULTI-01 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-02 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-03 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-04 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-05 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-06 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-07 | Phase 2: Multi-Tenant Skeleton | Pending |
| MULTI-08 | Phase 2: Multi-Tenant Skeleton | Pending |
| AUTH-01 | Phase 3: Auth + Access | Pending |
| AUTH-02 | Phase 3: Auth + Access | Pending |
| AUTH-03 | Phase 3: Auth + Access | Pending |
| AUTH-04 | Phase 3: Auth + Access | Pending |
| AUTH-05 | Phase 3: Auth + Access | Pending |
| AUTH-06 | Phase 3: Auth + Access | Pending |
| AUTH-07 | Phase 3: Auth + Access | Pending |
| AUTH-08 | Phase 3: Auth + Access | Pending |
| AUTH-09 | Phase 3: Auth + Access | Pending |
| AUTH-10 | Phase 3: Auth + Access | Pending |
| SALES-01 | Phase 9: Marketing + SEO | Pending |
| SALES-02 | Phase 9: Marketing + SEO | Pending |
| SALES-03 | Phase 9: Marketing + SEO | Pending |
| SALES-04 | Phase 4: Checkout + Webhook | Pending |
| SALES-05 | Phase 4: Checkout + Webhook | Pending |
| SALES-06 | Phase 4: Checkout + Webhook | Pending |
| SALES-07 | Phase 4: Checkout + Webhook | Pending |
| SALES-08 | Phase 4: Checkout + Webhook | Pending |
| SALES-09 | Phase 4: Checkout + Webhook | Pending |
| SALES-10 | Phase 4: Checkout + Webhook | Pending |
| SALES-11 | Phase 4: Checkout + Webhook | Pending |
| SALES-12 | Phase 4: Checkout + Webhook | Pending |
| SALES-13 | Phase 4: Checkout + Webhook | Pending |
| SALES-14 | Phase 4: Checkout + Webhook | Pending |
| SALES-15 | Phase 4: Checkout + Webhook | Pending |
| SALES-16 | Phase 4: Checkout + Webhook | Pending |
| STUDY-01 | Phase 5: SRS Core | Pending |
| STUDY-02 | Phase 5: SRS Core | Pending |
| STUDY-03 | Phase 5: SRS Core | Pending |
| STUDY-04 | Phase 5: SRS Core | Pending |
| STUDY-05 | Phase 5: SRS Core | Pending |
| STUDY-06 | Phase 5: SRS Core | Pending |
| STUDY-07 | Phase 5: SRS Core | Pending |
| STUDY-08 | Phase 5: SRS Core | Pending |
| STUDY-09 | Phase 5: SRS Core | Pending |
| STUDY-10 | Phase 5: SRS Core | Pending |
| STUDY-11 | Phase 5: SRS Core | Pending |
| STUDY-12 | Phase 5: SRS Core | Pending |
| STUDY-13 | Phase 5: SRS Core | Pending |
| STUDY-14 | Phase 5: SRS Core | Pending |
| SIM-01 | Phase 6: Simulado | Pending |
| SIM-02 | Phase 6: Simulado | Pending |
| SIM-03 | Phase 6: Simulado | Pending |
| SIM-04 | Phase 6: Simulado | Pending |
| SIM-05 | Phase 6: Simulado | Pending |
| SIM-06 | Phase 6: Simulado | Pending |
| SIM-07 | Phase 6: Simulado | Pending |
| SIM-08 | Phase 6: Simulado | Pending |
| SIM-09 | Phase 6: Simulado | Pending |
| SIM-10 | Phase 6: Simulado | Pending |
| SIM-11 | Phase 6: Simulado | Pending |
| SIM-12 | Phase 6: Simulado | Pending |
| NB-01 | Phase 7: Cadernos + Dashboard Premium | Pending |
| NB-02 | Phase 7: Cadernos + Dashboard Premium | Pending |
| NB-03 | Phase 7: Cadernos + Dashboard Premium | Pending |
| NB-04 | Phase 7: Cadernos + Dashboard Premium | Pending |
| NB-05 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-01 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-02 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-03 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-04 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-05 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-06 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-07 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-08 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DASH-09 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-01 | Phase 2: Multi-Tenant Skeleton (tokens base) | Pending |
| DESIGN-02 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-03 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-04 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-05 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-06 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-07 | Phase 7: Cadernos + Dashboard Premium | Pending |
| DESIGN-08 | Phase 7: Cadernos + Dashboard Premium | Pending |
| ADMIN-01 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-02 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-03 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-04 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-05 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-06 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-07 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-08 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-09 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-10 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-11 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-12 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-13 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-14 | Phase 8: Admin Pipeline — Cowork | Pending |
| ADMIN-15 | Phase 8: Admin Pipeline — Cowork | Pending |
| SEO-01 | Phase 9: Marketing + SEO | Pending |
| SEO-02 | Phase 9: Marketing + SEO | Pending |
| SEO-03 | Phase 9: Marketing + SEO | Pending |
| SEO-04 | Phase 9: Marketing + SEO | Pending |
| SEO-05 | Phase 9: Marketing + SEO | Pending |
| SEO-06 | Phase 9: Marketing + SEO | Pending |
| SEO-07 | Phase 9: Marketing + SEO | Pending |
| SEO-08 | Phase 9: Marketing + SEO | Pending |
| OPS-01 | Phase 10: Polish + Soft Launch | Pending |
| OPS-02 | Phase 10: Polish + Soft Launch | Pending |
| OPS-03 | Phase 10: Polish + Soft Launch | Pending |
| OPS-04 | Phase 10: Polish + Soft Launch | Pending |
| OPS-05 | Phase 10: Polish + Soft Launch | Pending |
| OPS-06 | Phase 10: Polish + Soft Launch | Pending |
| OPS-07 | Phase 10: Polish + Soft Launch | Pending |
| OPS-08 | Phase 10: Polish + Soft Launch | Pending |
| OPS-09 | Phase 10: Polish + Soft Launch | Pending |
| OPS-10 | Phase 10: Polish + Soft Launch | Pending |

**Coverage:**

- v1 requirements: 127 total (12 FOUND + 8 MULTI + 10 AUTH + 16 SALES + 14 STUDY + 12 SIM + 5 NB + 9 DASH + 8 DESIGN + 15 ADMIN + 8 SEO + 10 OPS)
- Mapped to phases: 127
- Unmapped: 0 ✓
- Each requirement → exactly one phase (zero duplicates, zero orphans)

**Phase distribution:**

| Phase | Count | Categories |
|-------|-------|------------|
| Phase 1: Foundation | 12 | FOUND-01..12 |
| Phase 2: Multi-Tenant Skeleton | 9 | MULTI-01..08 + DESIGN-01 (tokens) |
| Phase 3: Auth + Access | 10 | AUTH-01..10 |
| Phase 4: Checkout + Webhook | 13 | SALES-04..16 |
| Phase 5: SRS Core | 14 | STUDY-01..14 |
| Phase 6: Simulado | 12 | SIM-01..12 |
| Phase 7: Cadernos + Dashboard Premium | 21 | NB-01..05 + DASH-01..09 + DESIGN-02..08 |
| Phase 8: Admin Pipeline — Cowork | 15 | ADMIN-01..15 |
| Phase 9: Marketing + SEO | 11 | SALES-01..03 + SEO-01..08 |
| Phase 10: Polish + Soft Launch | 10 | OPS-01..10 |
| **Total** | **127** | — |

**Note on prior count:** A versão anterior desta tabela declarava "119 total" — contagem incorreta (somatório real por categoria = 127). Corrigido nesta atualização.

---

*Requirements defined: 2026-05-21*
*Last updated: 2026-05-21 after gsd-roadmapper traceability update (10 phases, 127 reqs mapped, MVP mode)*
