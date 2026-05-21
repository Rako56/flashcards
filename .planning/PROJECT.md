# Flashcards

> **flashcards.com.br** — marketplace de preparações curadas para concursos públicos brasileiros.
>
> **Reboot 2026-05-21**: novo repositório, nova Supabase, redesign completo, arquitetura Next.js multi-concurso desde dia 1. Substitui o legado "Sparkle Study Scape" (mantido como arquivo).

---

## What This Is

Flashcards é um **marketplace de preparações curadas para concursos públicos brasileiros**. O aluno paga R$ 297/ano por uma preparação e recebe flashcards prontos feitos à mão pela equipe Cowork, simulado real da banca, painel premium e ferramentas de retomada ativa. Cada concurso vive sob seu próprio subdomínio (`tjsp.flashcards.com.br`, `pf.flashcards.com.br`, …) com landing dedicada, tema visual próprio e dashboard adaptado à banca. O aluno autenticado pode comprar múltiplas preparações; ao alternar entre elas o contexto inteiro (subdomínio, design, edital, simulado) muda.

**Persona:** concurseiro sério, dinheiro pra investir R$ 297 numa prep curada, foco em estudo ativo + SRS + simulado, não quer montar Anki próprio.

**Pivot fixo (gravado em cimento):** zero IA visível ao aluno, sem editor rich-text de notas, sem free tier amplo, sem multi-idioma, sem subscription auto-renewable, sem geração automática de conteúdo. Curadoria humana em última instância — todo card passa por revisor Cowork antes de virar `status='active'`.

## Core Value

**O aluno paga R$ 297, abre o app, e estuda — não monta deck, não escolhe algoritmo, não combate IA. Conteúdo bom, painel premium, simulado real. Funciona.**

Se qualquer outra coisa falhar, **a sessão de estudo SRS + o caderno de erros + o simulado** precisam funcionar perfeitamente. É o que o aluno comprou.

---

## Requirements

### Validated

<!-- Greenfield reboot: nada validado ainda no novo código. Itens validados ficarão aqui após shipping. -->

*(Nenhum — reboot. A tese do produto está validada em [docs/PRODUTO.md do legado](../docs/PRODUTO.md), mas nenhuma feature do novo código foi shipada ainda.)*

### Active

#### Plataforma multi-concurso

- [ ] **MULTI-01**: Arquitetura DB-driven com múltiplos concursos desde dia 1 (TJSP é o primeiro; PF/OAB/RF entram depois sem refactor)
- [ ] **MULTI-02**: Subdomínio por concurso (`<slug>.flashcards.com.br`) resolvido por middleware Next.js que injeta contexto do concurso
- [ ] **MULTI-03**: Tema visual por concurso (paleta, hero, logo, fontes de acento) configurado em DB (`admin_concursos.theme`)
- [ ] **MULTI-04**: Aluno pode comprar e manter N preparações; troca de concurso troca todo o contexto (subdomínio, design, edital, simulado)
- [ ] **MULTI-05**: Hub `flashcards.com.br` lista concursos disponíveis + institucional
- [ ] **MULTI-06**: `app.flashcards.com.br` é o painel unificado quando aluno tem 2+ preparações ativas

#### Funil de venda

- [ ] **SALES-01**: Landing institucional em `flashcards.com.br` (SEO real — Next.js RSC + metadata)
- [ ] **SALES-02**: Landing dedicada por concurso em `<slug>.flashcards.com.br` (SEO long-tail: "flashcards tjsp escrevente", "preparação pf agente")
- [ ] **SALES-03**: Signup com email/senha + verificação de email
- [ ] **SALES-04**: Checkout Asaas (PIX + boleto + cartão) com 3 abas, polling de status
- [ ] **SALES-05**: Webhook Asaas correto: idempotente, valida payload via re-fetch, grava log estruturado, **falha visível** (Sentry + alerta — não 200 silencioso)
- [ ] **SALES-06**: Grant automático de acesso após pagamento confirmado (`user_concurso_access`)
- [ ] **SALES-07**: Sistema de reembolso **funcional** (CDC art. 49, 7 dias) com tabela real e estado auditável
- [ ] **SALES-08**: Fluxo de upgrade/combo: aluno com TJSP pode comprar PF com 1 clique

#### Núcleo do produto — estudo

- [ ] **STUDY-01**: Sessão SRS com algoritmo FSRS-5 client-side, persistência batched
- [ ] **STUDY-02**: Round-robin/interleaving por disciplina — **resolve o bug histórico de "cards repetindo na mesma seção"** com queue determinística testada
- [ ] **STUDY-03**: Rating 1-clique (Errei / Quase / Fácil / Sabia)
- [ ] **STUDY-04**: Cards "Errei" entram automaticamente no caderno de erros
- [ ] **STUDY-05**: Cards marcados (estrela durante estudo, sessão dedicada de revisão)
- [ ] **STUDY-06**: Mapa do edital — visual de cobertura tópico-a-tópico, navegação direta

#### Núcleo do produto — simulado

- [ ] **SIM-01**: Simulado cronometrado (5h/70Q para TJSP, **configurável por concurso** — duração/quantidade/distribuição vêm do DB)
- [ ] **SIM-02**: Distribuição por disciplina espelha a prova real da banca
- [ ] **SIM-03**: WAL pra resistência a refresh/disconnect
- [ ] **SIM-04**: Resultado: % por disciplina, tempo médio por questão, comparação com outros alunos

#### Cadernos e revisão

- [ ] **NB-01**: Caderno de erros (auto-populado, botão "praticar erros")
- [ ] **NB-02**: Caderno de questões personalizado ("Constitucional 2020-2024" → filtra → salva → pratica)
- [ ] **NB-03**: Cards marcados (lista persistente)

#### Painel premium & métricas

- [ ] **DASH-01**: Dashboard do aluno com hero do concurso ativo, due cards, próxima revisão, streak
- [ ] **DASH-02**: Estatísticas reais por disciplina (acerto %, evolução temporal, heatmap, projeção de prontidão)
- [ ] **DASH-03**: Gamificação — XP **atômico** (read-modify-write protegido), leagues semanais, daily challenges
- [ ] **DASH-04**: Identidade visual própria de Flashcards (design system de raiz) com sub-temas por concurso

#### Pipeline editorial Cowork

- [ ] **ADMIN-01**: Painel admin `admin.flashcards.com.br` (mesmo bundle Next.js, route group restrito)
- [ ] **ADMIN-02**: Importação de edital (parser → disciplinas → tópicos) com revisão humana
- [ ] **ADMIN-03**: Importação em lote de questões da banca
- [ ] **ADMIN-04**: Review queue — cards `status='review'` invisíveis ao aluno até aprovação humana
- [ ] **ADMIN-05**: Auditoria de qualidade (filtro por disciplina/tópico/idade do card)
- [ ] **ADMIN-06**: Métricas internas — cobertura de edital por concurso, fila de produção, tempo médio de revisão

#### Qualidade & operação (não-negociável dia 1)

- [ ] **OPS-01**: TypeScript strict **100%** do código (não 30% como no legado)
- [ ] **OPS-02**: ESLint enforced — CI bloqueia merge + pre-commit hook
- [ ] **OPS-03**: Testes obrigatórios pra core: FSRS-5, queue builder/shuffler, asaas-webhook, grant-access, paywall guards, validador CPF, scoring simulado. Coverage ≥50% no core, ≥30% global
- [ ] **OPS-04**: CI/CD GitHub Actions: lint → type-check → test → preview deploy
- [ ] **OPS-05**: Sentry + logging estruturado desde commit 1, alertas para webhook failures
- [ ] **OPS-06**: LGPD: account deletion endpoint + termos atualizados + política de retenção
- [ ] **OPS-07**: HIBP password protection habilitado no Supabase Auth
- [ ] **OPS-08**: Supabase Pro plan (não free — produto pago não pode auto-pausar)
- [ ] **OPS-09**: Termos de Uso + Política de Privacidade fiéis ao produto atual (sem "planos gratuitos", sem "caderno digital", sem "chat IA")
- [ ] **OPS-10**: E2E Playwright cobrindo fluxo crítico: signup → checkout → grant → primeira sessão de estudo → simulado

### Out of Scope

<!-- Decisões âncora da PRODUTO.md §12, reafirmadas no reboot. -->

- **IA visível ao aluno** — sem botão "gerar flashcards", "explicar com IA", "transcrever áudio". Aluno recebe pronto. *Razão: pivot 2026-04-23, defendido em PRODUTO.md §5 e §12.*
- **Editor rich-text de notas (Tiptap caderno)** — quem quer anotar usa Notion/papel. *Razão: contradiz tese "marketplace de prep curada" — não somos Notion.*
- **Free tier amplo** — talvez 5-10 cards demo na landing, mas não plano gratuito. *Razão: foco em pagantes sérios; free atrai persona errada.*
- **Multi-idioma** — produto BR-PT only. *Razão: persona é concurseiro brasileiro.*
- **Subscription auto-renewable** — anual one-shot por concurso. *Razão: simplifica billing, reduz churn-by-default, alinha com mentalidade do concurseiro.*
- **Geração automática de conteúdo** — Cowork humano sempre. *Razão: diferencial vs ferramentas IA-first; aluno paga R$ 297 por curadoria, não output bruto.*
- **App mobile nativo em v1** — PWA web responsivo basta. *Razão: foco; mobile só se 1000+ alunos engajados pedirem (PRODUTO.md §9 / 2027).*
- **Integração com videoaulas** — não competimos com Estratégia/Gran/AlfaCon. *Razão: complementamos como retomada ativa, não como curso primário.*
- **Migração de dados do legado** — nem alunos, nem cards, nem pagamentos. *Razão: Rafael (2026-05-21): "começa limpo". Conteúdo do legado é arquivo; Cowork re-popula com export sanitizado quando fizer sentido.*

---

## Context

### Por que este reboot existe

O sistema legado em `sparkle-study-scape` carrega herança complicada: nasceu no Lovable, foi migrado pra Vite + Supabase, e acumulou múltiplas iterações com pivôs de produto (AI gen → curadoria humana, multi-idioma → só PT-BR, Tiptap caderno → cadernos automáticos, Stripe → Asaas). Cada pivô deixou código zumbi. O resultado, mapeado em `.planning/codebase/` no commit `2d58418`:

- **72 concerns documentados** (5 CRITICAL, 19 HIGH, 18 MEDIUM, 30 LOW)
- **12 edge functions zumbis** ainda deployed (gen IA + Stripe)
- **4 tabelas zumbis** no DB + Tiptap `user_notes` + bucket `notebook-media`
- **Lint:** 435 problemas, 0% CI gate
- **TypeScript strict** ativo em ~30% do código; 166 `as any` casts + 136 `: any` no resto
- **Testes:** 1 file em 190 source files (~0.5%), `main` em RED
- **React Hook Form + Zod** documentado em CLAUDE.md mas **zero uso** (fictício)
- **Bugs CRÍTICOS:**
  - `/reembolso` escreve em tabela `refund_requests` **que não existe** + UI fake success (exposição CDC art. 49)
  - `awardXp` não-atômico (read-modify-write) — XP perdido em concorrência
  - `question_attempts.content_item_id` NOT NULL apontando pra coluna que vai ser dropada → insert quebra silently
  - `asaas-webhook` retorna 200 em falha + sem Sentry — pagamentos podem perder sem alerta
  - HIBP password protection desligado
- **Supabase free tier** auto-pausa após 7 dias de inatividade — incompatível com produto pago
- **Drift de produto:** landing ainda anuncia "Caderno digital" e "chat IA integrado"; Termos diz "planos gratuitos" — contradiz tese atual e cria exposição legal/SEO

**Rafael (2026-05-21):** "Eram muitos erros, o sistema com bugs, os flashcards ficavam se repetindo sempre na mesma seção, o Claude nunca conseguia resolver isso. Acho que isso se deve ao grande histórico de modificações do sistema, além de ter migrado ele do Lovable, então agora estaremos reconstruindo tudo."

### O que herdamos (intacto e aproveitável)

- **A tese do produto** (`docs/PRODUTO.md` do legado, 2026-05-12) — não muda. Marketplace de preparações curadas, R$ 297/ano, zero IA, curadoria humana, multi-concurso.
- **Stack base validada:** React + TypeScript + Supabase + Asaas + Vercel — funcionam, só migram pra Next.js.
- **FSRS-5 algoritmo** (`src/lib/srs.ts` do legado) — reimplementar com testes, mas o modelo de 19 weights está correto.
- **Schema editorial canônico:** Concurso → Disciplina → Tópico → Flashcard + Questões + Mídias. Reaproveita a estrutura, redesenha tabelas limpas.
- **Pipeline editorial Cowork** (importação edital → review queue → approve) — workflow está certo, código será reescrito.

### Cowork team & conteúdo

- Cowork produz conteúdo humano. Hoje **pouco material existe** (Rafael, 2026-05-21: "pouco material, vai produzir do zero junto com reboot").
- Reboot e produção de conteúdo TJSP rodam em paralelo. Backend admin precisa estar maduro a tempo de absorver a produção.

### Nomenclatura — atenção

- **Nome do produto:** Flashcards.
- **Domínio:** flashcards.com.br.
- ⛔ "Sparkle", "Sparkle Flashcards", "Sparkle Study Scape" — **não existem** mais. São nomes do legado (Lovable) que ficam só no diretório `sparkle-study-scape/` como arquivo histórico.

---

## Constraints

- **Tech stack — frontend:** Next.js 15 (App Router) + TypeScript strict 100% + Tailwind + shadcn/ui + React Hook Form + Zod + TanStack Query v5 + Framer Motion + Recharts. *Razão: SEO real em landings de concurso (RSC + metadata), middleware pra subdomínio, Server Actions pro funil, ecossistema maduro, Vercel-nativo.*
- **Tech stack — backend:** Supabase (Postgres + Auth + Storage + Edge Functions Deno) + `@supabase/ssr`. *Razão: o ponto forte do legado, mantemos. Edge fns só pra webhook Asaas e operações que precisam de Deno.*
- **Tech stack — pagamento:** Asaas (PIX + boleto + cartão). *Razão: já validado no legado, Rafael confirmou 2026-05-21. Stripe/MP fora.*
- **Tech stack — host:** Vercel + Supabase Pro. *Razão: Vercel é nativo Next.js; Supabase free tier auto-pausa, produto pago precisa Pro.*
- **Repositório:** novo repo (a criar), nova organização ou conta GitHub. Legado fica em `sparkle-study-scape/` como arquivo.
- **Supabase:** novo projeto, **não** o `zjyogswbgcauwqisvuyq` do legado.
- **Migração de dados:** zero. Reboot 100% limpo.
- **Domínio:** flashcards.com.br já adquirido por Rafael, presente no HUB Obsidian.
- **Cronograma:** sem deadline rígido, mas "o quanto antes melhor". Qualidade vem antes de prazo.
- **Qualidade — não-negociável dia 1:** TS strict 100%, ESLint CI, pre-commit hook, ≥50% coverage no core (FSRS/checkout/webhook/access/scoring), Sentry, LGPD compliance, observabilidade.
- **Design:** redesign completo, identidade própria Flashcards (paleta, tipografia, voz). Cada concurso terá sub-tema (cor de acento, hero, logo). Demanda fase dedicada de design upfront.
- **Persona:** concurseiro sério, R$ 297/ano. Foco em pagantes — não persona free user que migra de Anki Telegram.
- **Conformidade legal:** LGPD (account deletion, política de privacidade, retenção), CDC art. 49 (reembolso 7 dias funcional), Termos atualizados.
- **Idioma:** PT-BR only.
- **Plataforma:** web responsivo (PWA opcional). Mobile nativo só pós-1000 alunos engajados.

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reboot completo em novo repo (refundação) | Legado tem drift acumulado de 4 pivôs (Lovable→Vite, IA→curadoria, Tiptap→cadernos, Stripe→Asaas) — 72 concerns, lint 435 problemas, tests 0.5%. Reboot é mais rápido que limpeza cirúrgica. | — Pending |
| Next.js 15 (App Router) substitui Vite SPA | SEO real em landings de concurso (RSC + metadata API), middleware pra subdomínio, Server Actions, ecossistema maduro. Vite SPA não atende SEO orgânico. | — Pending |
| Supabase mantido como backend | Stack do legado que funcionou; Postgres + Auth + Edge Functions estão bem dimensionados. `@supabase/ssr` integra Next.js limpo. | — Pending |
| Asaas mantido como gateway | Validado no legado, suporta PIX+boleto+cartão BR. Trocar de gateway abriria frente nova sem ganho. | — Pending |
| Subdomínio por concurso (`<slug>.flashcards.com.br`) com middleware | SEO long-tail dedicado por concurso, identidade visual própria, contexto isolado do aluno. 1 codebase, 1 deploy. | — Pending |
| Multi-concurso por aluno desde dia 1 | Arquitetura DB-driven desde o início evita refactor quando lançar 2º concurso. Combo é roadmap Q4/2026 da PRODUTO.md. | — Pending |
| Marca única "Flashcards" (não "Sparkle") | Domínio flashcards.com.br já é do Rafael; "Sparkle" é nome legado do Lovable que nunca foi externalizado. | ✓ Good — corrigido 2026-05-21 |
| Zero migração de dados do legado | Rafael (2026-05-21): "começa limpo". DB do legado está sujo (4 tabelas zumbis, schema drift, RLS questionável). Cowork re-popula. | — Pending |
| Qualidade enforced desde commit 1 | Top causa raiz dos bugs do legado: qualidade frouxa permitiu drift. TS strict 100%, lint CI, pre-commit, ≥50% coverage core, Sentry. | — Pending |
| Painel admin junto com app (route group restrito) | Mantém 1 deploy, 1 codebase. Cowork acessa via `admin.flashcards.com.br` apontando pra `(admin)` route group. Simples. | — Pending |
| FSRS-5 client-side (mantém approach do legado) | Modelo de 19 weights está correto; problema do legado foi falta de testes + queue shuffler ruim, não o algoritmo. Reimplementar com tests. | — Pending |
| Bug histórico "cards repetindo na mesma seção" tratado como prioridade arquitetural | Identificado por Rafael (2026-05-21) como sintoma central. Causa: queue builder + round-robin por disciplina + sem testes. Reescreve como `buildStudyQueue` puro, testado. | — Pending |
| Redesign visual completo, identidade própria | Legado usa shadcn defaults sem identidade. Marca Flashcards precisa visual próprio + sub-temas por concurso. Fase dedicada de design upfront. | — Pending |
| Sem free tier amplo (mantém decisão PRODUTO.md §5) | Persona é pagante sério. Free atrai persona errada que polui métricas e suporte. | — Pending |
| LGPD + CDC art. 49 funcionais dia 1 | Legado tem `/reembolso` fake (escreve em tabela inexistente) e sem account-delete. Reboot resolve antes de cobrar centavo. | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-21 after project initialization (reboot do legado Sparkle Study Scape)*
