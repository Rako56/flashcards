# Feature Research — Flashcards (flashcards.com.br)

**Domain:** Curated flashcard marketplace for Brazilian concurso público preparation
**Researched:** 2026-05-21
**Confidence:** HIGH (PRODUTO.md is gospel, BR concurso ecosystem deeply documented, legacy product gives 18 months of real-world feature signal)

---

## Executive Frame

Flashcards is **not Anki, not QConcursos, not Estratégia/Gran**. It is a **R$ 297/year curated marketplace** — the student does **not** build decks, does **not** see AI, does **not** stream videoaulas. The persona is the **serious paying concurseiro** who already chose strategy and wants tools, not coaching.

This re-frames every feature trade-off:

- **The Brazilian ecosystem's "table stakes" are wrong for us.** Gran/Estratégia/AlfaCon sell videoaulas + question bank + PDFs + fórum + community. We sell flashcards + simulado + cadernos. Missing videoaulas is **not** a defect — it is **positioning**. We complement the curso primário, we don't replace it.
- **What IS table stakes is the SRS UX + the simulado UX + the painel quality.** The student paid for these three. If they break, the product is dead.
- **Anti-features are PRODUTO.md §5 and §12 — gravadas em cimento.** They look like obvious wins (AI explain, rich-text caderno, free tier). They were tried in the legacy and produced 72 documented concerns, 4 pivôs, and 18 months of debt.

The feature list below is opinionated. Categories are **strict**:

| Category | Meaning | Action |
|----------|---------|--------|
| **TS** Table stakes | Missing = R$ 297 buyer feels cheated and refunds within 7 days | REQ-ID v1, must-ship pre-launch |
| **DIFF** Differentiator | Sets us apart from Anki/QConcursos/Gran for paying concurseiros | REQ-ID v1, marketing hook |
| **ANTI** Anti-feature | Sounds good, contradicts thesis. PRODUTO.md cite required to add | "Out of Scope" with reasoning |
| **FUT** Future / Maybe | Defer until 100+ paying alunos validate the gap | v2+ backlog |

---

## Feature Landscape

### Table Stakes (Users Expect These — Missing = R$ 297 Refund)

#### Funnel — Marketing & Sales

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TS-01 Public landing with SEO (RSC + metadata)** | BR concurseiros find products via Google long-tail ("flashcards tjsp escrevente") | **M** | Next.js 15 RSC; legacy Vite SPA failed SEO. Two landings: hub + per-concurso |
| **TS-02 Per-concurso landing on subdomain** (`tjsp.flashcards.com.br`) | Long-tail SEO + brand cohesion per banca; common pattern at Gran/Estratégia | **M** | Middleware injects concurso context; shared design system + per-concurso theme |
| **TS-03 Demo cards on landing (5-10 free samples)** | BR market expects "ver amostra grátis" before R$ 297 (Tec Concursos free trial, Gran free aula) | **S** | Static or RSC-rendered subset of `admin_flashcards` for that concurso |
| **TS-04 Signup with email/password + email verification** | Baseline auth; Brazilian buyers will sign up before paying to verify product exists | **S** | Supabase Auth + HIBP enabled, password ≥8 chars |
| **TS-05 Checkout with PIX + boleto + cartão** | BR's "Big Three" payment methods — missing one drops ~20% conversion | **M** | Asaas already validated in legacy; reuse pattern |
| **TS-06 Parcelamento 12x sem juros no cartão** | BR cultural default — credit card installments are "budget management tool, not financial trouble" ([Asaas docs](https://www.asaas.com/precos-e-taxas)) | **M** | R$ 297 → 12x R$ 24,75. Already in PRODUTO.md §4 |
| **TS-07 Webhook idempotent + visible failures** | Lost payment = customer-service disaster + refund + reputational damage | **M** | Legacy bug TD-05 — webhook returned 200 silently on failure. Fix: Sentry + structured logging + alert |
| **TS-08 Polling status pós-pagamento** | PIX/boleto async — user expects "Aguardando pagamento..." → auto-redirect ao confirmar | **S** | Existing pattern in legacy `Checkout.tsx:276-298` |
| **TS-09 Reembolso CDC art. 49 (7 dias) funcional** | Legal obligation; legacy had FAKE refund route (CRITICAL CONCERNS-TD-08). High-trust feature for R$ 297 buyer | **M** | Real `refund_requests` table + admin queue + Asaas refund API call. Não-negociável |
| **TS-10 Termos de Uso + Política de Privacidade (LGPD compliant)** | Legal floor + Asaas/Supabase compliance | **S** | Without fictitious "free plans" or "AI chat" language (legacy bug) |

#### Núcleo — Estudo (SRS)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TS-11 FSRS-5 SRS algorithm** | State of the art (Anki moved to FSRS-5 in 2023, Mochi added it 2025). Concurseiros que conhecem SRS sabem que FSRS-5 reduz 20-30% reviews mantendo retenção ([Mindomax](https://www.mindomax.com/best-spaced-repetition-apps-2026-anki-alternatives)) | **L** | 19-weight model. Reimplement com testes (legacy `src/lib/srs.ts` funciona mas sem coverage) |
| **TS-12 Rating 1-clique (Errei / Quase / Fácil / Sabia)** | Anki convention, low-friction; legacy validated UX | **S** | Spacebar reveals; 1/2/3/4 number keys + click |
| **TS-13 Round-robin/interleaving por disciplina** | Concurseiro studies 5+ disciplinas; consecutive same-discipline cards is cognitive death + the legacy's #1 bug ("flashcards se repetindo na mesma seção") | **L** | `buildStudyQueue` pure-function, deterministic, full test coverage (legacy's failure mode = no tests) |
| **TS-14 Cards "Errei" auto-entram no caderno de erros** | Reduces friction vs Anki manual tagging; BR concurseiro mental model | **S** | Already in legacy `mistake_notebook` table — works |
| **TS-15 Cards marcados (star icon during study)** | Standard "favorite" mechanic; user wants to revisit specific cards independent of SRS | **S** | New column `is_bookmarked` on `user_flashcard_progress` |
| **TS-16 Resume interrupted session** | User opens phone after closing → expects to continue where they left off | **M** | WAL in-memory + persisted; legacy has this in `useStudySession.ts` |
| **TS-17 Card content sanitization (DOMPurify)** | Cards have rich text; XSS attack surface | **S** | Already in legacy `FormattedCardText.tsx` |
| **TS-18 Audio + haptic feedback on rating** | Low-tech delight; works on mobile | **S** | Already in legacy; light additions |

#### Núcleo — Simulado

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TS-19 Simulado cronometrado (5h/70Q para TJSP, DB-configured)** | Concurso real é cronometrado; sem timer não há "simulação" | **M** | Configurável por concurso desde dia 1 (PRODUTO.md §9) — não hardcode TJSP |
| **TS-20 Distribuição por disciplina espelha prova real** | "Simulado real da banca" é a promessa do produto. Random 70Q from 1k pool ≠ simulado | **M** | Per-concurso config: `{disciplina_id, n_questoes, ordem}` |
| **TS-21 WAL persistence (resist refresh / disconnect)** | 5h sessão; perder por refresh acidental = catastrofe | **L** | Já no legacy; reescrever com testes. Localstorage + Supabase periodic sync |
| **TS-22 Marcar e voltar (mark question, return later)** | Padrão VUNESP/CESPE: aluno pula incertas, volta no fim ([Estratégia](https://www.estrategiaconcursos.com.br/blog/simulado-especial-trt-sp-tecnico-e-analista-judiciario/)) | **S** | Toggle flag per question; visible in grid navigator |
| **TS-23 Navegador por questão (grid 1-70)** | Padrão de prova online; user precisa ver onde está sem scroll | **M** | Sidebar/footer com colored states: respondida / marcada / não respondida |
| **TS-24 Single submit at end (não auto-correct per question)** | É simulado real, não quiz; respostas até último segundo | **S** | Resist user temptation to peek (PRODUTO.md "estudo ativo") |
| **TS-25 Resultado por disciplina + tempo médio por questão** | Padrão TecConcursos/QConcursos/Estratégia | **M** | % por disciplina, tempo médio, comparação com média da plataforma |
| **TS-26 Review answers feature post-simulado** | "Vou revisar as 12 que errei" — não há outro caminho de aprendizado pós-prova | **M** | Lista de Q + gabarito + comentário curador (se houver) |
| **TS-27 Salvar simulado errados no caderno de erros automaticamente** | Conecta os dois sistemas; legacy já faz | **S** | Trigger pós-submit insert no `mistake_notebook` |

#### Cadernos

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TS-28 Caderno de Erros (auto-populated)** | **BR-specific termo cultural** — todos os concurseiros conhecem. Estratégia, Gran e TecConcursos têm essa feature explicitamente ([Estratégia](https://www.estrategiaconcursos.com.br/blog/caderno-de-erros-por-onde-comecar/), [Gran](https://blog.grancursosonline.com.br/aprendendo-a-montar-e-utilizar-seu-caderno-de-erros/), [TecConcursos](https://www.youtube.com/watch?v=RRCs1-xEH9I)). Missing = "isso aqui é amador" | **M** | Legacy `mistake_notebook` table reuse. Botão "praticar erros" → sessão SRS filtrada |
| **TS-29 Caderno de Questões personalizado (filtered query)** | TecConcursos & QConcursos têm isso ([Gran caderno questões](https://blog.grancursosonline.com.br/caderno-de-questoes-personalizado/)). Concurseiro quer "Constitucional 2020-2024" salvo p/ revisão | **M** | Tabela `cadernos_questoes` nova com filtros JSONB salvos. PRODUTO.md §7.2 |
| **TS-30 Cards Marcados (lista persistente)** | "Voltar a esses 20 cards crucial antes da prova" | **S** | Query simples sobre `is_bookmarked=true` |
| **TS-31 Caderno de erros — adicionar observação curta (1 linha)** | "Confundi com art. X" — agência sobre o próprio erro (PRODUTO.md §7.1) | **S** | Coluna `note` em `mistake_notebook` |

#### Painel Premium & Métricas

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TS-32 Dashboard com hero do concurso, due cards, streak** | Padrão pós-Duolingo; primeiro toque diário do aluno | **M** | Per-concurso hero/cor (DB-driven theme) |
| **TS-33 Próxima revisão countdown** | SRS é invisível se não há feedback temporal | **S** | "12 cards vencem hoje, 47 amanhã" |
| **TS-34 Streak / ofensiva diária** | Concurseiros adoram streak ([Duolingo case](https://www.uladshauchenka.com/p/duolingo-case-study-the-gamification): streak wager → 14% boost dia 14 retention) | **M** | Freeze opcional (3/mês) — humano, não predatório |
| **TS-35 Estatísticas por disciplina (acerto %, evolução)** | TecConcursos gold standard. R$ 297 buyer wants data, not vibes | **M** | Recharts; legacy `useStatistics.ts` broken — rewrite |
| **TS-36 Heatmap de estudo (dias ativos)** | GitHub-style; visualmente claro; demonstra esforço | **M** | `srs_reviews` por dia agrupado |
| **TS-37 Mapa do Edital (cobertura tópico-a-tópico)** | **BR-specific cultural artifact** — concurseiros chamam "edital mapeado" / "edital verticalizado" ([Caderno Mapeado](https://cadernomapeado.com.br/tjsp-escrevente-2025/), [FazQuestão](https://fazquestao.com.br/admin/files/EDITAIS%20VERTICALIZADOS/EDITAL%20VERTICALIZADO%20-%20TJ-SP.pdf)). É o **mapa do que comprou** | **L** | Visual: 78% revisado, 4 tópicos sem cards (Cowork em produção). Click → cards do tópico |
| **TS-38 Cards por tópico do edital (drill-down)** | A partir do mapa, user filtra "só Constitucional, art. 5º" | **S** | Filter pattern na queue builder |

#### Operações & Confiança

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TS-39 Login com Google (OAuth)** | Baixa fricção; já no legacy. Brazilian buyers expect it. | **S** | Supabase Auth Google provider |
| **TS-40 Account deletion (LGPD)** | Legal obligation; legacy missing | **S** | Edge fn que cascade-deletes user_* tables |
| **TS-41 Mobile responsive (PWA web)** | 60%+ dos concurseiros estudam no celular ([QConcursos app](https://play.google.com/store/apps/details?id=com.qconcursos.QCX&hl=en_US)). PWA install opcional, mas no native | **L** | Já no legacy; refazer com design proper |
| **TS-42 Multi-concurso por aluno (DB-driven, day 1)** | Concurseiros mudam de foco; queremos não-refactor quando lançar PF | **L** | PRODUTO.md §9, MULTI-04 |
| **TS-43 Subdomain switching (contexto muda)** | Aluno com TJSP+PF: troca de subdomain → cor/hero/edital/simulado todos mudam | **M** | Middleware Next.js; MULTI-02 |
| **TS-44 Sentry / structured logging desde commit 1** | Webhook silenciou produção no legado. Sem observability → bugs fantasma | **M** | OPS-05 do PROJECT.md |
| **TS-45 Sessão de estudo configurable (n cards, escopo)** | "Estudar 30 cards de Civil hoje" — não 100 cards aleatórios | **M** | Já no legacy (`SessionConfig.tsx`) |

---

### Differentiators (Competitive Advantage for THIS Positioning)

These are where we **beat** Anki, Gran, QConcursos, Estratégia, AlfaCon, TecConcursos for the paying concurseiro segment.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **DIFF-01 Curadoria humana visível** ("cada card revisado por humano Cowork") | **Marketing hook against IA-first tools.** Anki/Quizlet/RemNote permitem AI gen. Mochi explicitly anti-AI. Flashcards diferencia-se: "nenhum aluno paga R$ 297 pra receber output bruto de script" (PRODUTO.md §5.1) | **S** | Mostrar "✓ Aprovado por Cowork — [date]" no card. Stat na landing: "X cards revisados manualmente" |
| **DIFF-02 100% do edital coberto, garantido** | Concursos é YMYL — comprou e cobertura é incompleta = produto falso. PRODUTO.md §2: "Conteúdo curado humano, cobrindo 100% do edital" | **L** | Coverage dashboard interno (ADMIN-06) + visual público no Mapa do Edital |
| **DIFF-03 Projeção de prontidão para prova** | Concorrente faz heatmap de esforço; ninguém projeta "no ritmo atual você cobre 87% até a prova" | **L** | Função `daysToReady(currentRate, coverageGap, targetDate)`. Diferenciador real |
| **DIFF-04 Sub-tema visual por concurso (paleta, hero, fonte de acento)** | Cada concurso tem cara própria; reforça que comprou produto, não "uma assinatura" | **M** | `admin_concursos.theme` JSONB → CSS vars |
| **DIFF-05 Cards autossuficientes (sem cabeçalho copiado de questão)** | Anki concurso decks free são lixo: cabeçalho de questão, sem fonte legal, sem contexto. Marketing: "card lido fora do app ainda faz sentido" | **S** (editorial) | Não é feature de software — é guideline editorial. Mas merece slot na landing |
| **DIFF-06 Anti-multiplicação (1 card excelente > 5 medíocres)** | Wozniak rule 4. Diferencia de pacotes "10.000 flashcards TJSP" que circulam (`LandingPRF.tsx:4520 flashcards` é honest about volume but the cards lack depth) | **S** (editorial) | Cowork guideline; merece slot na landing |
| **DIFF-07 Round-robin determinístico testado** | **Fixa explicitamente o bug histórico do legado.** Rafael (2026-05-21): "flashcards se repetindo na mesma seção, Claude nunca conseguia resolver". Concorrentes não interleavam corretamente; alunos sentem | **L** | Pure function + ≥80% coverage. PROJECT.md STUDY-02 |
| **DIFF-08 Combo multi-concurso com desconto** | "TJSP + PF por R$ 450 ao invés de R$ 594". Concurseiros que mudam de foco (comum) gostam | **M** | Asaas custom payment per combo SKU. Roadmap PRODUTO.md §9 Q4/2026 |
| **DIFF-09 Update após mudança de edital ("concurso reabre, novo edital")** | Cowork atualiza, aluno não compra de novo. Edital muda em ~30% dos concursos. Diferencial contra "comprei o curso em 2024 e não atualiza" | **M** | Notification banner + delta no Mapa do Edital ("3 tópicos novos adicionados") |
| **DIFF-10 Painel premium (design system próprio)** | shadcn defaults é o que todo mundo usa. Marca Flashcards precisa identidade visual real, não "Tailwind padrão" | **L** | Design phase dedicated (PROJECT.md Constraints) |
| **DIFF-11 Simulado WAL — refresh-proof** | Padrão: usuário perde simulado se cair internet. Diferencial real. **Vai pra marketing** | **L** | Já em TS-21; o marketing dele é diff |
| **DIFF-12 Zero IA visível — mensagem direta na landing** | "Sem IA. Cada card lido por humano." Posicionamento limpo contra Mochi+, RemNote, Anki+ChatGPT plugins | **S** | Landing copy. Não shipping, é narrativa |
| **DIFF-13 Annual one-shot (não subscription)** | Concurseiro odeia "esqueci de cancelar". Asaas one-time já reduz churn-by-default. Marketing: "pagou? estudou. acabou." | **S** | Já em PRODUTO.md §4 |
| **DIFF-14 Curador identificado** ("quem produziu este card") | Trust signal: "Dr. X, advogado público com 5 aprovações" > "anônimo bot" | **M** | Coluna `curator_id` em `admin_flashcards`; bio na landing/sidebar |
| **DIFF-15 Estatística "tempo médio por questão vs média da plataforma"** | Concurseiro quer saber: "eu sou rápido na Português ou estou perdendo tempo?". Diff vs platforms que mostram só seu próprio tempo | **M** | Calc batched de averages por questão; comparison panel |

---

### Anti-Features (DELIBERATELY NOT BUILDING — PRODUTO.md §5/§12)

Each item has a citation. Reversal requires written business justification, not technical impulse.

| Anti-Feature | Why Requested | Why Problematic | What We Do Instead | PRODUTO.md cite |
|--------------|---------------|-----------------|--------------------|-----------------|
| **ANTI-01 AI generation de cards** ("Gerar flashcards", "Explicar com IA", "Transcrever áudio") | Anki+ChatGPT, Mochi 2024+, RemNote, Quizlet AI Plus — está na moda | Aluno paga R$ 297 esperando curadoria. AI gen é o oposto da tese. Legacy tinha 12 edge fns AI; pivot 2026-04-23 matou. Ainda 4 zombies no Supabase deploy (TD-01) | Pipeline Cowork: import → status='review' → admin/review-queue → status='active' | §5, §12.1 |
| **ANTI-02 Rich-text notebook editor (Tiptap)** | "Quero anotar dentro do app". Notion, Obsidian, RemNote fizeram editor in-app | Não somos Notion. Tiptap caderno custou 12 migrations + bucket `notebook-media` + 4 tabelas zombies no legacy. Quem quer anotar usa Notion/papel/OneNote | 3 cadernos curados: erros (auto), questões filtradas, marcados | §5, §7, §12.2 |
| **ANTI-03 Free tier amplo (plano gratuito mensal)** | "Anki é grátis, todo mundo usa". Quizlet free tier mantém engajamento | Free atrai persona errada (DIY concurseiro que cola deck do Telegram), polui métricas, sobrecarrega suporte sem revenue. Foco: pagante sério | 5-10 demo cards na landing por concurso (TS-03) | §4, §5, §12.3 |
| **ANTI-04 Multi-idioma** | "Internacionalizar pra escala". Anki é EN-first | Persona = concurseiro **brasileiro**. PT-BR é gatekeeper de curadoria precisa de direito brasileiro. Esforço sem retorno | PT-BR only, hard-coded | §12.4 |
| **ANTI-05 Subscription auto-renewable** | "Recurring revenue. SaaS bom". Stripe Billing, Asaas Assinaturas | Concurseiro odeia "esqueci de cancelar". Aumenta churn-by-default, reembolsos, suporte. PRODUTO.md §4 commitment | Anual one-shot por concurso (R$ 297). Renewal manual (1-click 60 dias antes do vencimento) | §4, §12.5 |
| **ANTI-06 Editor de deck (DIY)** ("crie seus próprios cards no app") | "Pra completar o que o Cowork não cobre". Anki, Quizlet, RemNote permitem | Diferencial morto: vira Anki ruim. Aluno paga curadoria, não ferramenta. Causa drift editorial | "Sentiu falta? Envie sugestão pra Cowork." (suporte ticket, optional) | §1, §5 |
| **ANTI-07 Chat IA pra "tirar dúvidas"** | Estratégia/Gran lançaram em 2024-2025 ("Estratégia GPT"). Hype | Aluno pergunta Direito Constitucional, IA alucina, aluno reprova → processo. YMYL real. Custa também | Fórum-livre não. "Reportar card" + suporte humano | §5, §12.1 |
| **ANTI-08 Push notifications agressivos / streak guilt** ("Você não estudou hoje! Sua ofensiva acabou! :("`) | Duolingo growth playbook. Funciona pra retenção curta | Persona é adulto sério, não criança. Guilt notifications churn pagante. Streak SIM, mas com freeze opcional e tom respeitoso | Streak com freeze, opt-out fácil. Email diário **só se aluno ativou**. Não push agressivo | §3 (persona adulto sério) |
| **ANTI-09 Gamification spam** (badges desnecessários, "Você desbloqueou Avatar Bronze!") | "Aumenta engajamento". Cada SaaS junior copia Duolingo | Persona reject. R$ 297 paga conteúdo, não brinquedo. XP+streak+leagues OK; achievement spam não | XP atômico + streak + leagues semanais; **stop**. Sem "achievement unlocked" overlays. PRODUTO.md §7 implícito | §3, §5 (não somos curso multidisciplinar de jogo) |
| **ANTI-10 Multi-tier pricing (Bronze/Prata/Ouro)** | "Upsell. Pricing tiers segmentam pagantes" | R$ 297 é o produto. Tier confunde valor. Legacy tinha multi-tier morto + drift legal | 1 tier, R$ 297/ano, 1 concurso. Combos (DIFF-08) substituem upsell | §4, §12.3 |
| **ANTI-11 Videoaulas integradas** | "Curso completo. Estratégia/Gran tem". Concorrência mainstream | Não competimos. Cowork não é Estratégia. Esforço enorme + drift de tese. Complementamos como **retomada ativa**, não curso primário | "Já fez o curso? Use Flashcards pra fixar." Posicionamento explícito | §5, §9 (out-of-roadmap até 2027) |
| **ANTI-12 Fórum de alunos (Q&A)** | QConcursos Fórum, Gran Comunidade, Estratégia Sistema de Questões fórum têm. Pediado por usuários | Moderation cost enorme. Conteúdo de qualidade incerta. Pode contradizer Cowork. Drift de marca | Suporte 1:1 + "reportar card" + (talvez) Discord/Telegram externo Cowork-moderado | §3 (não somos rede social) |
| **ANTI-13 Stylus / paper-style notes (pautado/quadriculado/Cornell)** | iPad/Apple Pencil hype | Legacy tentou; PRODUTO.md §5 mata. Quem quer escrever à mão usa caderno físico ou GoodNotes | Nada in-app | §5 |
| **ANTI-14 OCR / PDF upload de material próprio** | "Upload meu material e gere flashcards" | É AI gen camuflado. Mata curadoria. Custos | "Você não monta deck. Recebe pronto." | §5, §12.1, §12.6 |
| **ANTI-15 Mobile app nativo em v1** | "App is table stakes 2026" | PWA web bem feito basta. Native = 6 meses de esforço + maintenance + 2 stores. Validar primeiro em web | PWA install opcional. Native depois de 1.000 alunos pedirem (PRODUTO.md §9 / 2027) | §9, §12 (implícito) |
| **ANTI-16 Card edit pelo aluno** ("eu acho que esse gabarito está errado, deixa eu editar") | Anki permite | Quebra curadoria. Confunde estado per-aluno. Aluno propõe correção via "Reportar card" + Cowork avalia | "Reportar card" → admin queue → Cowork corrige pra todos | §1 |
| **ANTI-17 Migração de dados do legado (Sparkle Study Scape DB)** | "Já temos cards lá" | Schema sujo (4 tabelas zombies, 72 concerns documented, 12 fns zombies). Reboot 100% limpo. Rafael (2026-05-21): "começa limpo" | Cowork re-importa cards aprovados via pipeline padrão | PROJECT.md Decisions |

---

### Future / Maybe (Defer Until PMF — Possible v2+ Backlog)

| Feature | Why Defer | Trigger to Add | Complexity |
|---------|-----------|----------------|------------|
| **FUT-01 Apple/Google native app** | PWA basta no v1. Native só se 1000+ alunos engajados pedirem | App store reviews > 50/month from web users | **XL** |
| **FUT-02 Combo PF + RF + ICMS-SP (multi-concurso paywall)** | DIFF-08 já tem 2-concurso combo simples. Cross-concurso curriculum mapping é Q4/2026 (PRODUTO.md §9) | 4+ concursos lançados | **M** |
| **FUT-03 Integração com TecConcursos/QConcursos API (importar questões pessoais)** | Política comercial deles. Não óbvio que valha. PRODUTO.md §9 dá "TBD" | Aluno explicitamente pede + parceria viable | **L** |
| **FUT-04 Audio review mode (escutar cards no carro)** | QConcursos tem ("modo Listen"). Pode ser diff secundário | 100+ alunos pedirem; lift inicial baixo | **M** |
| **FUT-05 Image occlusion para mapas mentais** | Concurseiro de direito usa pouco; useful pra anatomia médica/concursos técnicos | Concurso técnico/saúde launched | **L** |
| **FUT-06 Ranking entre alunos público** | QConcursos Ranking Elite, Gran Comunidade. Funciona para alguns | Risco de turning into anxiety mill. Leagues semanais já cobre comparação social. Adicionar **só** se aluno pedir | **M** |
| **FUT-07 Daily challenges públicas (mesma pra todos no dia)** | Duolingo Quests pattern. +25% DAU em estudos do Duolingo | Validar streak primeiro; daily challenges pessoais (random N cards do edital) já cobrem 80% do valor | **M** |
| **FUT-08 Reset SRS por tópico ("comecei estudando há 2 anos, quero recomeçar do zero em Civil")** | Anki tem; útil para retomadas | Suporte pede 2+ vezes/mês | **S** |
| **FUT-09 Compartilhamento social ("eu fiz 50 cards hoje")** | Twitter/Instagram screenshot. Marketing orgânico | Aluno-fundadores compartilham organicamente; sem ROI claro | **S** |
| **FUT-10 Marketplace cross-vendor** (curador X publica também) | PRODUTO.md §1 não exclui mas implica Cowork-only no v1 | Multi-vendor é v2-v3 mínimo. Risco editorial enorme | **XL** |
| **FUT-11 Live mock exam (simulado ao vivo agendado, "todos às sábado 14h")** | Estratégia faz; cria comunidade | Validar engagement de simulado solo primeiro | **L** |
| **FUT-12 Mapa do edital com priorização por banca histórica** (Caderno Mapeado pattern) | "Tópico X cobrado em 8/10 últimas provas" — diff real, mas precisa de Cowork curando histórico | Cowork tem dados estruturados de 5+ editais por concurso | **L** |

---

## Admin / Curator-Facing Features (Cowork Team)

These are not student-facing but **make-or-break the editorial pipeline**. PRODUTO.md §5.1 is gospel: every card revisado humano antes de virar `status='active'`.

### Table Stakes — Admin

| Feature | Why Essential | Complexity | Notes |
|---------|---------------|------------|-------|
| **ADM-01 Review queue with status workflow** (`review → active`) | Pipeline central. Sem isso, no curadoria humana | **M** | Already in legacy `/admin/review-queue`. Keyboard shortcuts: A=approve, E=edit, R=reject, S=skip |
| **ADM-02 Bulk import de cards (CSV / JSON)** | Cowork produz em bulk fora do app; ingest sem 1-a-1 | **M** | Default `status='review'`. Pipeline `scripts/flashcard-pipeline/import.mjs` no legado |
| **ADM-03 Bulk import questões da banca (CSV / PDF parser)** | VUNESP/CESPE PDFs → `admin_questoes`. Para simulado e caderno de questões | **L** | Legacy `parse-questions-bulk` edge fn; reescrever |
| **ADM-04 Edital parser (PDF → disciplinas → tópicos)** | Quando novo concurso lança, importar edital sem mão | **L** | Legacy `parse-edital` edge fn; revisar approach (pode ser semi-automatizado) |
| **ADM-05 Quality audit dashboard** (filtro por disciplina, idade do card, sem fonte, cabeçalho copiado) | Detect bad cards before student does | **M** | Substitui RPCs zombies `flashcard_heuristic_flags` (TD-11) — fresh implementation |
| **ADM-06 Coverage dashboard por concurso** (X% do edital tem cards) | "Falta cobrir tópico 4.3 — Cowork prioriza" | **M** | Counts join `admin_topicos` ↔ `admin_flashcards` filtered by `status='active'` |
| **ADM-07 Manual access grant (admin script via edge fn)** | Suporte: "aluno pagou em outro lugar / cortesia" | **S** | Legacy `grant-access` edge fn já correto |
| **ADM-08 Refund queue (CDC art. 49)** | Compliance + suporte; legacy fake. Não-negociável | **M** | Real table + Asaas refund API |
| **ADM-09 Report card admin queue** (aluno reportou problem) | Feedback loop curadoria → re-revision | **S** | Coluna `reported_by`/`report_reason` em `admin_flashcards` |
| **ADM-10 Editar card mantendo histórico** (não destructive edit) | Update de jurisprudência: card precisa virar correto sem perder evolução | **M** | `card_history` audit table |
| **ADM-11 Curator audit log** ("quem aprovou o quê quando") | Responsabilidade editorial | **S** | Coluna `approved_by` + `approved_at` |
| **ADM-12 Dashboard de produção Cowork** (cards/semana, tempo médio de revisão, gargalos) | Ops do time editorial | **M** | OPS-12 implícito; legacy não tem |

### Differentiators — Admin

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| **ADM-D01 Find duplicates (semantic match across cards)** | Anti-multiplicação (DIFF-06) — herramentar Cowork pra não criar 5 cards pro mesmo conceito | **L** | Embedding-based dedup; já cabe IA *interna* (Cowork-side, não aluno-visible) |
| **ADM-D02 Stale card detector** | Card de 2022 sobre lei de 2024? Flag pra revisão | **M** | Date heuristics + parser legal |
| **ADM-D03 Empty topic finder** (tópico do edital sem nenhum card) | Garante 100% cobertura (DIFF-02) | **S** | Trivial query |
| **ADM-D04 Banca-question coverage** ("essa questão da VUNESP 2023 está coberta por 0 cards?") | Trace de gap | **M** | Join `admin_questoes` ↔ `admin_flashcards` por topico |

---

## Feature Dependencies

```
TS-04 Signup
   └──requires──> TS-05 Checkout
                     └──requires──> TS-07 Webhook idempotent
                                       └──requires──> TS-09 Reembolso CDC funcional
                                                         └──requires──> ADM-08 Refund queue

TS-11 FSRS-5
   └──requires──> TS-13 Round-robin (DIFF-07)
                     └──requires──> TS-14 Auto caderno de erros (TS-28)

TS-37 Mapa do Edital
   └──requires──> ADM-04 Edital parser
                     └──requires──> ADM-06 Coverage dashboard
                                       └──requires──> DIFF-02 100% edital coberto

TS-19 Simulado timed
   └──requires──> TS-21 WAL persistence (DIFF-11)
                     └──requires──> TS-25 Resultado por disciplina
                                       └──requires──> TS-26 Review answers
                                                         └──requires──> TS-27 Auto-into caderno erros

TS-42 Multi-concurso (day 1)
   └──requires──> TS-43 Subdomain switching
                     └──requires──> DIFF-04 Sub-tema visual
                                       └──requires──> DIFF-08 Combo (Q4/2026)

ADM-01 Review queue
   └──requires──> ADM-02 Bulk import
                     └──requires──> ADM-05 Quality audit
                                       └──requires──> DIFF-01 Curadoria humana visível

TS-34 Streak ──enhances──> TS-32 Dashboard
TS-36 Heatmap ──enhances──> TS-35 Estatísticas

ANTI-01 AI gen ──conflicts──> DIFF-01 Curadoria humana visible (cannot coexist)
ANTI-02 Tiptap ──conflicts──> TS-28/29/30 Cadernos curados
ANTI-05 Auto-renew ──conflicts──> DIFF-13 Annual one-shot marketing
```

### Key Dependency Notes

- **Webhook → Refund:** If webhook idempotency breaks, aluno gets double-charged → refund queue overflows → CDC art. 49 exposure (CRITICAL TD-08 in legacy). These two ship together or neither ships.
- **Edital parser → Mapa do Edital → Coverage:** All-or-nothing for a concurso launch. Cowork can't manually populate 600+ topics per concurso.
- **Multi-concurso day 1 vs hardcoded TJSP:** Legacy hardcoded UUID in 3 places (Onboarding/Checkout/edge fn). Reboot ships multi-concurso first or pays the debt 6 months later.
- **WAL → Simulado credibility:** Sem WAL, primeira queda de internet vira refund + tweet "perdi 4h de simulado nesse app".
- **Curadoria pipeline → Marketing:** DIFF-01 ("cada card revisado por humano") só sustenta se ADM-01 + ADM-11 funcionam. Empty curator audit log = vazia marketing claim.

---

## MVP Definition

### Launch With (v1) — Pre-PMF

**Funil completo + estudo SRS perfeito + simulado refresh-proof + admin Cowork funcional + reembolso real.**

Core (não negociáveis):
- [ ] **TS-01 → TS-10**: funnel + signup + checkout + webhook + refund (full pipeline)
- [ ] **TS-11 → TS-18**: SRS session perfect (FSRS-5 + round-robin tested + auto caderno + bookmarks)
- [ ] **TS-19 → TS-27**: simulado complete (timed + WAL + grid nav + review)
- [ ] **TS-28 → TS-31**: 3 cadernos (erros + questões + marcados + observação)
- [ ] **TS-32 → TS-38**: painel premium (dashboard + streak + stats + heatmap + mapa edital)
- [ ] **TS-39 → TS-45**: ops (Google OAuth + LGPD delete + PWA mobile + multi-concurso DB + subdomain + Sentry + session config)
- [ ] **ADM-01 → ADM-12**: pipeline editorial Cowork
- [ ] **DIFF-07 Round-robin determinístico testado** — fix do bug histórico
- [ ] **DIFF-10 Painel premium (design system próprio)** — visual identity

Differentiators que entram no v1 (marketing depende deles):
- [ ] **DIFF-01 Curadoria humana visível** (label + landing copy)
- [ ] **DIFF-02 100% edital coberto** (operacionalizado via Cowork + ADM-06)
- [ ] **DIFF-03 Projeção de prontidão**
- [ ] **DIFF-04 Sub-tema visual por concurso**
- [ ] **DIFF-11 Simulado WAL refresh-proof**
- [ ] **DIFF-12 Zero IA visível — mensagem na landing**
- [ ] **DIFF-13 Annual one-shot — narrative**

### Add After Validation (v1.x — pós primeiros 50 alunos pagantes TJSP)

- [ ] **DIFF-08 Combo multi-concurso** — when concurso #2 launches (Q3/2026)
- [ ] **DIFF-09 Update após mudança de edital** — first re-edital event
- [ ] **DIFF-14 Curador identificado** (bios) — when Cowork tem 3+ curadores
- [ ] **DIFF-15 Tempo médio vs média da plataforma** — when 100+ simulados feitos
- [ ] **ADM-D01 Duplicate detector** — when Cowork passa de 5k cards
- [ ] **ADM-D02 Stale card detector** — when primeiro edital muda
- [ ] **TS-34 Streak freeze** — when streak engagement validado

### Future Consideration (v2+ — pós-PMF, 100+ alunos)

Everything in the **Future / Maybe** section above. Trigger-gated.

---

## Feature Prioritization Matrix

Subset of high-impact features by user value × implementation cost:

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TS-09 Reembolso real (CDC) | HIGH | MEDIUM | **P1** (legal + trust) |
| TS-11 FSRS-5 | HIGH | HIGH | **P1** |
| TS-13 Round-robin testado / DIFF-07 | HIGH | HIGH | **P1** (fix do bug histórico) |
| TS-19 Simulado timed | HIGH | MEDIUM | **P1** |
| TS-21 WAL / DIFF-11 | HIGH | HIGH | **P1** (refund prevention) |
| TS-28 Caderno de Erros | HIGH | MEDIUM | **P1** (BR cultural table stake) |
| TS-37 Mapa do Edital | HIGH | HIGH | **P1** (DIFF-02 carrier) |
| TS-42 Multi-concurso day 1 | HIGH | HIGH | **P1** (evita refactor) |
| DIFF-01 Curadoria visível | HIGH | LOW | **P1** (marketing) |
| DIFF-02 100% edital | HIGH | HIGH | **P1** (DIFF-02 operacional) |
| ADM-01 Review queue | HIGH | MEDIUM | **P1** (pipeline) |
| TS-44 Sentry | MEDIUM | LOW | **P1** (debugged in legacy hard way) |
| TS-34 Streak | MEDIUM | MEDIUM | **P1** (engagement) |
| DASH-03 Leagues semanais | MEDIUM | MEDIUM | **P1** (PROJECT.md já comprometido) |
| TS-3 Demo cards landing | MEDIUM | LOW | **P1** (conversão) |
| DIFF-03 Projeção prontidão | HIGH | HIGH | **P2** (defer 30 dias se atrasar) |
| DIFF-04 Sub-tema por concurso | MEDIUM | MEDIUM | **P2** |
| DIFF-08 Combo multi-concurso | MEDIUM | MEDIUM | **P2** (Q4/2026 PRODUTO.md) |
| FUT-04 Audio mode | LOW | MEDIUM | **P3** |
| FUT-06 Ranking público | LOW | MEDIUM | **P3** (anti pattern risk) |

**Priority key:**
- **P1**: Must ship at launch (TJSP open)
- **P2**: Ship within 60 dias pós-launch (validates with first paid users)
- **P3**: Backlog, triage trimestral

---

## Competitor Feature Analysis

Brazilian competitors and international SRS apps. For each feature, our position is **explicit**.

| Feature | QConcursos | TecConcursos | Gran/Estratégia | Anki | Mochi/RemNote | **Flashcards (us)** |
|---------|------------|--------------|------------------|------|---------------|---------------------|
| Videoaulas integradas | Yes (10k+) | No | Yes (Gran/Estratégia core) | No | No | **NO** (anti-feature, complementamos) |
| Question bank com filtro | Yes (1.5M) | Yes (1.4M) | Yes (Estratégia 2.5M) | No | No | **Sim, mas escopo curado por concurso** (não bank gigante) |
| Caderno de erros | Yes (Folha QC) | Yes ([video](https://www.youtube.com/watch?v=RRCs1-xEH9I)) | Yes (Estratégia, Gran blogs cite) | Tag manual | Tag manual | **Sim, auto-populated** (TS-28) |
| Caderno de questões personalizado | Yes | Yes | Yes (Gran) | No | No | **Sim** (TS-29) |
| Flashcards SRS | QFlashcards (separate app) | No | No | **Core** | **Core** | **Core** |
| FSRS-5 algorithm | No (legacy) | No | No | **Yes (default)** | **Yes (opcional)** | **Sim** (TS-11) |
| Mapa do edital / cobertura | No | Partial (priorização) | "Edital verticalizado" PDF estático | No | No | **Sim, dinâmico + live coverage** (TS-37, DIFF-02) |
| Simulado cronometrado | Yes | Yes | Yes | No | No | **Sim + WAL refresh-proof** (DIFF-11) |
| Fórum / Comunidade | Yes (Ranking + Fórum) | Limited | Yes (Estratégia, Gran Comunidade) | No | No | **NÃO** (ANTI-12) |
| Ranking público entre alunos | Yes (Ranking Elite) | No | No | No | No | **Leagues semanais sim, ranking permanente público não** |
| App mobile nativo | Yes | Yes | Yes | Yes | Yes | **PWA web v1; native FUT-01 pós-1000 alunos** |
| Free tier | Yes (limited bank) | Yes (limited) | No (Gran Premium) | **Free open-source** | Yes (limited) | **NO** (ANTI-03; 5-10 demo cards na landing) |
| AI integration | Yes (2024-2025) | No | Yes (Estratégia GPT 2024) | Plugins | Mochi+ AI (2024+) | **NO** (ANTI-01; positioning core) |
| Curadoria humana garantida | No | No | Sim (Estratégia professor reviews) | DIY | DIY | **Sim, marketing-forward** (DIFF-01, §5.1) |
| Annual one-shot | No (sub) | No (sub) | No (sub) | Free | Free/sub | **Sim** (DIFF-13, §4) |
| Reembolso CDC 7 dias funcional | Compliant | Compliant | Compliant | N/A | N/A | **TS-09 / ADM-08 (legacy quebrou)** |
| PIX checkout | Sim | Sim | Sim | N/A | N/A | **TS-05** |
| Parcelamento 12x sem juros | Sim | Sim | Sim | N/A | N/A | **TS-06** |
| Multi-concurso por aluno | Sim (subscription única) | Sim | Sim | N/A | N/A | **Sim, por-concurso paywall + combos** (TS-42, DIFF-08) |
| Streak / ofensiva | Limited | Limited | Limited | Yes | Yes (Anki only) | **Sim + freeze opcional** (TS-34) |
| Image occlusion | No | No | No | **Plugin core** | RemNote sim | **NO v1; FUT-05** |
| Subdomain per concurso (SEO) | No | No | No | N/A | N/A | **Sim** (TS-02, DIFF-04) — *único no mercado BR* |

**Synthesis:** Em features genéricas (banco questões, videoaula, fórum), perdemos por design. Em features de **SRS + simulado + cadernos + edital + curadoria**, ganhamos. A diferença vital: nosso aluno **já tem o curso primário em outra plataforma** — busca ferramenta de retomada ativa premium. Isso desloca a conversão de "quero plataforma completa" para "quero o melhor SRS de concurso BR que existe".

---

## Sources

### Brazilian Concurso Ecosystem

- [QConcursos — flashcards e ferramentas](https://www.qconcursos.com/questoes-de-concursos/materiais-de-apoio/como-estudar-para-concursos-com-a-ajuda-de-flashcards-13707)
- [QConcursos — Ranking e Fórum do Concurseiro](https://www.qconcursos.com/noticias/ranking-do-qc-forum-do-concurseiro)
- [QConcursos — Fórum do Concurseiro](https://www.qconcursos.com/noticias/forum-do-concurseiro)
- [QConcursos App Google Play](https://play.google.com/store/apps/details?id=com.qconcursos.QCX&hl=en_US)
- [QConcursos QFlashcards app dedicated](https://play.google.com/store/apps/details?id=com.danbapps.qflashcards.concursos&hl=en_US)
- [Gran Cursos — Aprendendo a montar e utilizar seu caderno de erros](https://blog.grancursosonline.com.br/aprendendo-a-montar-e-utilizar-seu-caderno-de-erros/)
- [Gran Cursos — Caderno de questões personalizado](https://blog.grancursosonline.com.br/caderno-de-questoes-personalizado/)
- [Gran Cursos — Gran Comunidade](https://blog.grancursosonline.com.br/gran-comunidade/)
- [Estratégia Concursos — Caderno de Erros: por onde começar?](https://www.estrategiaconcursos.com.br/blog/caderno-de-erros-por-onde-comecar/)
- [Estratégia Concursos — Revisões mais eficientes e caderno de erros](https://www.estrategiaconcursos.com.br/blog/revisoes-eficientes-caderno-erros/)
- [Estratégia Concursos — Simulado especial TRT SP](https://www.estrategiaconcursos.com.br/blog/simulado-especial-trt-sp-tecnico-e-analista-judiciario/)
- [Estratégia Atendimento — Fórum de alunos do Sistema de Questões](https://atendimentoconcursos.estrategia.com/hc/pt-br/articles/18169883035543-Como-funciona-o-F%C3%B3rum-de-alunos-do-Sistema-de-Quest%C3%B5es)
- [TecConcursos — Caderno de Erros (YouTube)](https://www.youtube.com/watch?v=RRCs1-xEH9I)
- [TecConcursos — Priorização de assuntos IBGE](https://www.tecconcursos.com.br/blog/noticias/concurso-ibge-priorizacao-de-assuntos/)
- [AlfaCon — cursos preparatórios](https://www.alfaconcursos.com.br/)
- [Folha Dirigida — Ranking Elite QConcursos](https://folha.qconcursos.com/n/ranking-elite-qconcursos-como-funciona)
- [Folha Dirigida — Erros nos concursos aprendizado](https://folha.qconcursos.com/n/erros-nos-concursos-aprendizado)
- [Uni10 — Gran Cursos Online ou TEC Concursos 2026](https://uniten.com.br/gran-cursos-online-ou-tec-concursos-plataformas-2026/)
- [Escolha Certo — AlfaCon ou Gran Cursos](https://escolhacerto.com.br/alfacon-ou-gran-cursos-conheca-os-dois-cursos-preparatorios-que-estao-entre-os-que-mais-aprovam/)

### TJSP & Edital Mapeado

- [VUNESP — Edital TJSP Escrevente 2503](https://www.vunesp.com.br/TJSP2503)
- [Caderno Mapeado TJSP Escrevente 2025](https://cadernomapeado.com.br/tjsp-escrevente-2025/)
- [FazQuestão — Edital Verticalizado TJSP](https://fazquestao.com.br/admin/files/EDITAIS%20VERTICALIZADOS/EDITAL%20VERTICALIZADO%20-%20TJ-SP.pdf)
- [Estratégia — Concurso TJSP nota discursiva 2025](https://www.estrategiaconcursos.com.br/blog/concurso-tj-sp/)
- [Aprova Concursos — Edital Verticalizado TJ SP 2025](https://www.aprovaconcursos.com.br/noticias/concurso-tj-sp-edital-verticalizado-2025/)

### International SRS / Flashcard Apps

- [Notigo — Best Flashcard Apps Anki vs RemNote vs Quizlet 2025](https://notigo.ai/blog/best-flashcard-apps-students-anki-remnote-quizlet-2025)
- [Mindomax — Best Spaced Repetition Apps 2026 Anki Alternatives](https://www.mindomax.com/best-spaced-repetition-apps-2026-anki-alternatives)
- [Mindomax — Best Anki alternatives with AI 2026](https://www.mindomax.com/best-anki-alternatives-with-ai-in-2026)
- [Goodoff — Best Anki Alternatives 2026](https://goodoff.co/blog/best-anki-alternatives-2026-flashcard-apps)
- [LexieLearn — Best Anki Alternatives 2026](https://www.lexielearn.com/best-anki-alternatives)
- [LearnClash — 11 Best Quizlet Alternatives 2026](https://learnclash.com/blog/quizlet-alternatives)
- [Mochi — Spaced repetition flashcards](https://mochi.cards/)
- [Brainscape — Comparing Spaced Repetition Algorithms](https://www.brainscape.com/academy/comparing-spaced-repetition-algorithms/)
- [Cambridge English — Learning to learn flash cards and SRS](https://www.cambridge.org/elt/blog/2019/08/12/learning-learn-flash-cards-spaced-repetition-example-sentences/)
- [Anki Blog BR — Anki para Concursos](https://anki.blog.br/2025/11/11/concursos/)
- [Provas Brasil — Como usar Anki para concursos](https://blog.provasbrasil.com.br/metodos-de-estudo/como-usar-anki-flashcards-concursos/)
- [DEV Community — Anki Cloze and Image Occlusion](https://dev.to/juliafmorgado/anki-cloze-and-image-occlusion-features-n8n)

### Gamification & Engagement

- [Duolingo Case Study — Gamification of Learning](https://www.uladshauchenka.com/p/duolingo-case-study-the-gamification)
- [Orizon — Duolingo's Gamification Secrets (Streaks & XP)](https://www.orizon.co/blog/duolingos-gamification-secrets)
- [Trophy.so — Duolingo Gamification 2026 Case Study](https://trophy.so/blog/duolingo-gamification-case-study)
- [StriveCloud — Duolingo gamification explained](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo)
- [Young Urban Project — Duolingo Case Study 2025](https://www.youngurbanproject.com/duolingo-case-study/)

### Payment / Checkout BR

- [Asaas — Preços e Taxas](https://www.asaas.com/precos-e-taxas)
- [Asaas — PIX](https://blog.asaas.com/pix-asaas/)
- [Asaas — PIX garantido parcelado](https://blog.asaas.com/pix-garantido/)
- [Asaas — Compensação prazos](https://blog.asaas.com/compensacao-de-pagamento/)
- [Asaas — Tempo de compensação boleto D+0 D+1](https://blog.asaas.com/tempo-de-compensacao-de-boleto/)
- [Asaas — Boleto bancário parcelado](https://www.asaas.com/boleto-bancario)
- [Asaas — Assinaturas docs](https://docs.asaas.com/docs/assinaturas)
- [B2B Stack — Pagamento SaaS Brasil PIX/boleto/cartão](https://blog.b2bstack.com.br/pagamento-de-saas-no-brasil-pix-boleto-cartao/)
- [Stripe — Pix payments Brazil guide](https://stripe.com/resources/more/pix-replacing-cards-cash-brazil)
- [Babitonhela — Meios de Pagamento E-commerce 2026](https://babitonhela.com/blog/meios-de-pagamento-ecommerce/)

### SaaS Onboarding / Activation

- [SaaSFactor — User Activation Strategies](https://www.saasfactor.co/blogs/saas-user-activation-proven-onboarding-strategies-to-increase-retention-and-mrr)
- [Rework Resources — Onboarding & Time-to-Value 2026](https://resources.rework.com/libraries/saas-growth/onboarding-time-to-value)
- [DAR Design — SaaS Onboarding 2026 Activation](https://dardesign.io/blog/saas-onboarding-2026-activation-checklist-reduce-churn)
- [UserTourKit — 7 SaaS onboarding flows that convert free to paid](https://usertourkit.com/blog/saas-onboarding-flow-free-to-paid)

### Internal — Legacy Project Documentation

- `C:\Users\Gamer\Documents\sparkle-study-scape\.planning\PROJECT.md` (reboot scope)
- `C:\Users\Gamer\Documents\sparkle-study-scape\docs\PRODUTO.md` (canonical thesis, gospel)
- `C:\Users\Gamer\Documents\sparkle-study-scape\.planning\codebase\ARCHITECTURE.md` (legacy system surface)
- `C:\Users\Gamer\Documents\sparkle-study-scape\.planning\codebase\CONCERNS.md` (72 documented concerns to avoid repeating)

---

*Feature research for: curated flashcard marketplace for Brazilian concurso preparation*
*Researched: 2026-05-21*
*Confidence: HIGH — PRODUTO.md is fixed, legacy is documented, BR ecosystem is well-mapped*
