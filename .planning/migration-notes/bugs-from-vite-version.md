# Bugs da versão Vite — cheatsheet para o reboot Next.js

> **Contexto**: o repositório `Rako56/flashcards` é um reboot completo do legado `sparkle-study-scape` (Vite + React + TypeScript). O legado rodou em produção interna durante semanas e acumulou 12+ bugs críticos descobertos por uso real. Este arquivo documenta cada um deles com sintoma, causa raiz, fix e padrão a adotar na nova base — para que a equipe Next.js **não repita** os mesmos erros.
>
> Convenção: cada bug tem severidade (🔴 CRÍTICO / 🟠 ALTO / 🟡 MÉDIO), arquivos-âncora do legado para auditoria, e exemplo de código quando aplicável.
>
> Última atualização: 2026-05-26 (post-reset to remote main `dc7215d`).

---

## Tabela de contenção

| # | Severidade | Tema | One-liner |
|---|---|---|---|
| 1 | 🔴 | Postgrest `.in()` truncation | `.in('id', uuids)` com >~150 UUIDs trunca a URL silenciosamente e devolve dados incompletos. |
| 2 | 🔴 | `srs_reviews.item_id` morto | Inserir `item_id` numa tabela onde a coluna foi dropped causa rollback silencioso de transaction inteira. |
| 3 | 🔴 | Stats stale em fim de sessão | React não commitou state quando `SessionFinish` montou — métricas erradas no DB. |
| 4 | 🔴 | Cards repetindo na sessão | Queue gerada antes de ratings comitarem — mesmo card aparece 2x. |
| 5 | 🟠 | `questions.status` sem filtro | Queries sem `.eq('status', 'active')` vazavam questões arquivadas (com bug visual / ambíguas) pro usuário final. |
| 6 | 🟠 | Cloze markers literais | 1158 cards renderizavam `{{______}}` como texto cru porque o componente não conhecia 3 formatos de marker. |
| 7 | 🟠 | Postgrest default limit 1000 | `select()` em tabela com >1000 rows devolve só 1000 silenciosamente. |
| 8 | 🟠 | Schema drift TS ↔ DB | `source_notebook_page_id` foi dropped do DB mas continuou em `Database` types — 400 em runtime. |
| 9 | 🟠 | Onboarding pré-acesso | `PostPurchaseWelcome` liberava CTA antes de `user_concurso_access` materializar. |
| 10 | 🟡 | Duplicate session inserts | Keyboard shortcut re-disparava handler depois de `sessionComplete = true`. |
| 11 | 🟡 | Slug UNIQUE conflict | Admin criava concurso sem retry no conflito de slug → erro 500 no formulário. |
| 12 | 🟡 | `card_source = 'user'` dead code | Branches legadas de cards criados pelo usuário cobriam ~15% do código de SRS sem nunca serem chamadas. |

---

## 1. 🔴 Postgrest `.in()` trunca URL com muitos UUIDs

**Sintoma**: usuário com histórico grande (>~150 cards revisados) abre uma sessão de estudo e a fila vem **vazia** ou com cards aleatórios faltando. Nenhum erro no console. Networks tab mostra 200 OK com payload menor que o esperado.

**Causa raiz**: Postgrest converte `.in('column', array)` em querystring `?column=in.(uuid1,uuid2,...)`. Cada UUID = 36 chars + vírgula = ~37 bytes. Servers HTTP (Cloudflare, nginx) cortam URL em ~8KB → ~200 UUIDs no máximo. **Acima disso, a URL é silenciosamente truncada, o último UUID fica inválido, e o Postgrest aplica o filtro só nos que sobraram.**

**Fix canônico** (legado em `src/pages/FlashcardStudy/useStudySession.ts`):

```ts
// ❌ ERRADO — trunca silenciosamente com >150 UUIDs
const { data } = await supabase
  .from('srs_reviews')
  .select('card_id')
  .eq('user_id', userId)
  .in('card_id', allCardIds);  // BOMBA RELÓGIO

// ✅ CERTO — fetch all + filtro client-side
const { data: allReviews } = await supabase
  .from('srs_reviews')
  .select('card_id')
  .eq('user_id', userId);

const allCardIdsSet = new Set(allCardIds);
const filtered = (allReviews ?? []).filter(r => allCardIdsSet.has(r.card_id));
```

**Quando aplicar inverso (filtro DB)**: só com `.in()` se o array tem garantia de ≤100 itens (ex.: lista de IDs de uma página de UI). **Default**: assume que o array cresce com o usuário e use client-side filter.

**Lugares no legado que tinham esse bug** (auditoria 2026-05-19):
- `useStudySession.ts` (queue generation) — corrigido
- `Questions.tsx` (4 lugares) — corrigido
- `CardHistoryDialog.tsx` — corrigido

**Lição pra Next.js**: criar wrapper `lib/supabase/safe-in.ts` que faz client-side filter quando o array passa de 100 itens e loga warning em dev.

---

## 2. 🔴 `srs_reviews.item_id` morto — insert silencia transaction

**Sintoma**: usuário termina sessão de estudo. UI mostra "Sessão concluída! ✅". Mas no DB, **zero linhas inseridas** em `srs_reviews`. SRS state nunca avança. Próxima sessão mostra os mesmos cards.

**Causa raiz**: migration anterior dropou `srs_reviews.item_id` (renomeada pra `card_id`). Código continuou inserindo `item_id` no payload. Postgrest devolve 400 com `column "item_id" does not exist`. Mas o **batch insert estava dentro de uma RPC** (`batch_save_reviews`) — o erro virou rollback silencioso de toda a transaction, e nem foi exposto pro frontend porque o batcher tinha try/catch sem alerta.

**Fix** (legado em `src/hooks/useReviewBatcher.ts`):

```ts
// ❌ ERRADO
const payload = reviews.map(r => ({
  item_id: r.cardId,  // COLUNA NÃO EXISTE MAIS
  card_id: r.cardId,
  ...
}));

// ✅ CERTO — só card_id
const payload = reviews.map(r => ({
  card_id: r.cardId,
  ...
}));
```

**Padrão a adotar na Next.js**:
1. **Nunca catch silencioso em writes críticos** — todo `INSERT` de SRS state precisa logar erro pro Sentry com `level: 'fatal'` se falhar.
2. **Regen `Database` types após cada migration** — `supabase gen types` + commit no PR da migration. Sem isso, schema drift vira bug em produção.
3. **Testes E2E que validam DB state** — após uma "sessão completa", o teste deve fazer `SELECT COUNT(*) FROM srs_reviews WHERE user_id = ?` e assertar `> 0`.

---

## 3. 🔴 Stats stale em `SessionFinish` — React state race

**Sintoma**: ao final da sessão, a tela "Sessão concluída" mostrava `0 cards revisados / 0% acertos`, mesmo quando o usuário tinha respondido 20 cards. O insert em `study_sessions_rich` (analytics) gravava `total_cards: 0`.

**Causa raiz**: `SessionFinish` lia `stats` como prop vinda de `useState`. O último rating do usuário disparava `setStats({...})` + `setSessionComplete(true)` no mesmo handler. **React fazia batching**: `sessionComplete = true` ficava pronto **antes** de `stats` comitar, então `SessionFinish` montava lendo stats obsoletas.

**Fix**: padrão `statsRef` (legado em `useStudySession.ts` + `useRatingHandler.ts`):

```ts
// Mirror sync via useRef pra bypassar timing de commit
const statsRef = useRef(stats);

const updateStats = (delta: Partial<Stats>) => {
  const next = { ...statsRef.current, ...delta };
  statsRef.current = next;  // 1. sync — disponível IMEDIATAMENTE
  setStats(next);            // 2. async — pra UI rerenderizar
};

// Em SessionFinish, ler do ref ao invés de prop
<SessionFinish stats={session.statsRef.current} />  // ✅
<SessionFinish stats={session.stats} />              // ❌ — pode ser stale
```

**Padrão a adotar na Next.js**: para qualquer state que precisa estar **sincronamente disponível em outro componente que monta no mesmo tick**, espelhar em ref. Especialmente em finishers, modais de confirmação, e analytics inserts.

---

## 4. 🔴 Cards repetindo dentro da mesma sessão

**Sintoma** (sinal vermelho do usuário em 2026-05-23): durante uma sessão de 30 cards, o mesmo card aparecia 2-3x. Frustração alta — quebra a premissa do SRS.

**Causa raiz**: a fila de cards era gerada **uma vez** no início da sessão, lendo `due_at <= now()`. Após cada rating, o card era atualizado no DB (próximo `due_at` movido pra frente), mas a fila em memória continuava com ele. O batcher tinha um **delay de flush** (300ms) — se o usuário ratava rápido, o `due_at` no DB ainda não tinha atualizado quando a query "fetch next due" rodava, então o card voltava.

**Fix** (legado em `useStudySession.ts`):
1. Gerar a fila **uma vez** no início da sessão (não re-query a cada card).
2. Manter um `Set<cardId>` de cards já vistos na sessão atual.
3. Filtrar a fila antes de cada `pickNext()` removendo qualquer ID no Set.

```ts
const seenInSessionRef = useRef<Set<string>>(new Set());

const pickNext = () => {
  const remaining = queue.filter(c => !seenInSessionRef.current.has(c.id));
  if (remaining.length === 0) return null;
  const next = remaining[0];
  seenInSessionRef.current.add(next.id);
  return next;
};
```

**Padrão pra Next.js**: **toda sessão de estudo deve ter um state ephemeral local (`Set` ou `Map`)** que rastreia o que já apareceu. **Nunca confiar só no DB** pra deduplicação em fluxos de UX rápidos.

---

## 5. 🟠 `questions` sem filtro `status = 'active'`

**Sintoma**: 37 questões foram arquivadas no DB (`status = 'archived'`) por problemas — dependência visual (pedem imagem que não existe), enunciado ambíguo, duplicatas. Mas em 5 lugares do código, queries em `questions` **não filtravam por status**, então as arquivadas voltavam a aparecer pro usuário.

**Causa raiz**: o schema tinha `status` ENUM (`active | archived | review`) desde o início, mas as queries iniciais foram escritas pré-conceito-de-arquivamento. Quando o feature foi adicionado, **5 call sites não foram atualizados**.

**Fix** (legado em `src/pages/Questions.tsx` + 4 outros):

```ts
// ❌ ERRADO
const { data } = await supabase.from('questions').select('*');

// ✅ CERTO
const { data } = await supabase
  .from('questions')
  .select('*')
  .eq('status', 'active');
```

**Padrão pra Next.js**:
1. Criar **wrapper / view DB** `questions_active` (Postgres view com `WHERE status = 'active'`) e usar ela como default em todas as queries de leitura pro usuário final.
2. Admin pages explicitamente usam `questions` (tabela base) e filtram via UI (tabs "Ativas / Em revisão / Arquivadas").

---

## 6. 🟠 Cloze markers literais — 3 formatos não renderizados

**Sintoma**: 1158 cards mostravam `{{______}}` ou `[____]` como **texto cru** ao invés do underline visual esperado. Usuário pensava que era bug do conteúdo.

**Causa raiz**: a skill `tjsp-flashcards-producer` evoluiu pra suportar 3 formatos de marker conforme o tipo de card:
- `{{______}}` → cloze simples (lei seca)
- `{{__texto__}}` → cloze com hint
- `[____N____]` → cloze múltiplo (numerado)
- `[____]` → cloze inline curto

O componente `FormattedCardText` só conhecia 1 formato. Os outros 3 passavam reto como texto.

**Fix** (legado em `src/components/FormattedCardText.tsx`):

```ts
function splitByClozeMarkers(text: string): Array<{ type: 'text' | 'cloze'; content: string }> {
  const regex = /(\{\{__.*?__\}\}|\{\{_+\}\}|\[_+\d?_+\]|\[_+\])/g;
  const parts: Array<{ type: 'text' | 'cloze'; content: string }> = [];
  let lastIdx = 0;

  for (const match of text.matchAll(regex)) {
    if (match.index! > lastIdx) {
      parts.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    }
    parts.push({ type: 'cloze', content: match[0] });
    lastIdx = match.index! + match[0].length;
  }
  if (lastIdx < text.length) parts.push({ type: 'text', content: text.slice(lastIdx) });
  return parts;
}
```

**Padrão pra Next.js**: a skill produz dados num **schema canônico bem definido**. O renderer precisa de **uma fonte de verdade de quais markers existem** (constante exportada de `lib/cards/markers.ts`). Cada novo tipo de marker:
1. Define-se em `lib/cards/markers.ts` como `MARKERS = [...]`
2. O regex de split usa essa constante.
3. Skill consome o mesmo arquivo via leitura literal.

Assim, adicionar marker novo na skill **automaticamente atualiza o renderer**.

---

## 7. 🟠 Postgrest default LIMIT 1000

**Sintoma**: na auditoria do banco, `SELECT * FROM srs_reviews WHERE user_id = X` no PostgREST devolvia 1000 linhas mesmo com 3500 reviews reais.

**Causa raiz**: Postgrest tem default `max-rows = 1000`. **Não erra, não warning, só corta**.

**Fix**:

```ts
// ❌ ERRADO — corta em 1000
const { data } = await supabase.from('srs_reviews').select('*');

// ✅ CERTO — explicit range
const { data } = await supabase
  .from('srs_reviews')
  .select('*')
  .range(0, 49999);  // ou .limit(50000)
```

**Padrão pra Next.js**: **toda query sem WHERE restritivo** que pode crescer com o tempo (`srs_reviews`, `study_sessions_rich`, `lead_capture_log`) precisa de `.range()` ou paginação explícita. Lint rule custom: `no-unbounded-select`.

---

## 8. 🟠 Schema drift TS types ↔ DB

**Sintoma**: queries com `select('id, source_notebook_page_id')` devolviam 400 `column "source_notebook_page_id" does not exist`. UI mostrava queue vazia. TS compilava sem erro porque `Database` types ainda tinham a coluna.

**Causa raiz**: migration dropou a coluna. `supabase gen types --project-id <X> --schema public > src/integrations/supabase/types.ts` não foi rodado.

**Fix**: rodar `gen types` + commit no mesmo PR da migration.

**Padrão pra Next.js** (já documentado em `PROJECT.md`):
1. **Pre-commit hook** (`.husky/pre-commit`) que detecta diff em `supabase/migrations/` e exige `types.ts` atualizado no mesmo commit.
2. CI gate `typegen-check`: roda `supabase gen types` em CI e falha se o arquivo gerado difere do commitado.

---

## 9. 🟠 PostPurchaseWelcome libera CTA antes de access materializar

**Sintoma**: usuário paga no Asaas → webhook chega → tela `/sucesso` mostra "Começar a estudar" → usuário clica → redireciona pra `/login` ou `/comprar` (porque `user_concurso_access` ainda não foi criado).

**Causa raiz**: o webhook do Asaas dispara um insert async em `user_concurso_access`. Pode levar 2-15s. A tela de sucesso assumia que o access já existia.

**Fix** (legado em `src/pages/PostPurchaseWelcome.tsx`):

```ts
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('user_concurso_access')
      .select('id')
      .eq('user_id', userId)
      .eq('concurso_id', concursoId)
      .maybeSingle();

    if (data) {
      setAccessReady(true);
      clearInterval(interval);
    }
  }, 1500);

  // Timeout em 30s
  const timeout = setTimeout(() => {
    setError('Algo deu errado. Entre em contato com o suporte.');
    clearInterval(interval);
  }, 30000);

  return () => { clearInterval(interval); clearTimeout(timeout); };
}, [userId, concursoId]);

// CTA desabilitado até accessReady === true
<Button disabled={!accessReady}>Começar a estudar</Button>
```

**Padrão pra Next.js**: **toda transição pós-pagamento** precisa de polling com timeout. Considerar Server-Sent Events ou Supabase Realtime subscription como alternativa mais elegante.

---

## 10. 🟡 Duplicate `study_sessions_rich` inserts

**Sintoma**: tabela de analytics tinha 2 linhas por sessão pra ~5% dos usuários.

**Causa raiz**: o keyboard shortcut (`Space` pra avançar) disparava `handleRate` antes do unmount completo do componente. Quando `sessionComplete = true`, o componente unmounta — mas se Space chegou no mesmo frame, o handler rodava de novo e inseria a sessão.

**Fix**:

```ts
const handleRate = useCallback((rating: number) => {
  if (session.sessionComplete) return;  // ← GUARD
  // ... resto
}, [session.sessionComplete]);
```

**Padrão pra Next.js**: **todo handler que pode disparar via teclado** precisa ter guard explícito de estado. Não confiar em React Strict Mode pra cobrir esse caso — em produção (Strict Mode off), o bug aparece.

---

## 11. 🟡 Admin slug UNIQUE conflict sem retry

**Sintoma**: admin cria 2 concursos com nomes parecidos ("TJSP Escrevente 2026" e "TJSP Escrevente 2026 - 2ª edição") → ambos geram slug `tjsp-escrevente-2026` → segundo dá erro 500.

**Fix** (legado em `src/pages/admin/AdminConcursoNovo.tsx`):

```ts
async function generateUniqueSlug(baseName: string): Promise<string> {
  const base = slugify(baseName);
  let slug = base;
  let attempt = 1;

  while (true) {
    const { data } = await supabase
      .from('concursos')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
}
```

**Padrão pra Next.js**: qualquer column UNIQUE gerada de input do usuário precisa de helper de retry. Idealmente como server action / route handler reutilizável.

---

## 12. 🟡 `card_source = 'user'` — dead code legado

**Sintoma**: ~15% do código de SRS, Notebook e Card History tinha branches `if (card.source === 'user') { ... }`. Mas o feature "cards criados pelo usuário" foi removido há meses. Branches nunca eram executadas.

**Risco**: confunde leitura do código, atrasa onboarding, esconde bugs (dead branches não são cobertas por testes).

**Padrão pra Next.js**: ao remover features:
1. **Mesma PR**: deletar UI, rotas, branches, types, migrations, RLS policies.
2. Não deixar "código morto comentado" — confia no git history.
3. Lint rule `no-dead-conditional-branches` se possível.

---

## Migrations DB já aplicadas (não no repo)

O legado tinha 87 migrations em `supabase/migrations/`. Ao migrar pro reboot, **estas migrations DB já estão aplicadas** no Supabase Project (`<project-id>`), mas **não vão pro `supabase/migrations/` do novo repo** (greenfield). Quando o Next.js implementar features que dependem delas, **olhar nesta lista antes de criar migration nova**:

| Feature | Tabelas / Colunas / RPCs já existentes | Origem |
|---|---|---|
| FSRS-5 SRS | `srs_state` (DROPPED) → migrou pra colunas inline em `cards` (`stability`, `difficulty`, `due_at`, `last_reviewed_at`) | Migration 2026-05-04 |
| Reviews log | `srs_reviews` (`card_id` not `item_id`, sem `srs_state` referência) | Migration 2026-05-19 |
| Batch review insert | RPC `batch_save_reviews(reviews jsonb)` (NÃO usa `srs_state`) | Migration 2026-05-23 |
| Question status | `questions.status ENUM('active', 'archived', 'review')` + 37 archived | Migration 2026-05-19 |
| User access | `user_concurso_access(user_id, concurso_id, plan, expires_at)` + RLS | Migration 2026-05-15 |
| Admin role | `user_roles(user_id, role ENUM('admin','user'))` + helper RPC `is_admin()` | Migration 2026-05-15 |
| Sessions analytics | `study_sessions_rich(user_id, concurso_id, started_at, ended_at, total_cards, accuracy_pct, retention_pct, ...)` | Migration 2026-05-20 |
| Multi-tenancy | `concursos(slug, name, status)` + FK em `cards`/`questions` | Migration 2026-05-21 |

**Ação pra Next.js Phase 1+**: rodar `supabase db pull` no novo repo + commitar como migration `00000000000000_initial_schema.sql`. Aí cada migration nova diverge daí.

---

## Padrões anti-fragility a adotar

1. **Sentry obrigatório em writes críticos** (todo INSERT/UPDATE em `srs_reviews`, `study_sessions_rich`, `user_concurso_access`, `cards.stability`).
2. **Testes E2E Playwright** que validam DB state pós-fluxo (sessão completa → query DB → asserta linhas).
3. **Lint rule `no-unbounded-select`** (custom — flag Postgrest `.select()` sem `.eq()`, `.in()`, `.range()` ou `.limit()`).
4. **Lint rule `no-postgrest-in-with-array-bigger-than-100`** (heurística estática quando dá).
5. **Pre-commit `supabase gen types`** check.
6. **`statsRef` pattern** documentado em CONVENTIONS.md como padrão pra cross-component state em flows finalizadores.
7. **Renderer + skill compartilham `lib/cards/markers.ts`** como fonte única.

---

## O que **NÃO** trazer da versão Vite

- ❌ React Router (Next.js App Router cobre).
- ❌ Toda `src/pages/*` — Next.js usa `app/`.
- ❌ Bibliotecas auxiliares Vite-specific (`vite-plugin-*`).
- ❌ Hostinger deploy assumptions (`'use server'` quebra Passenger — mas o legado já não usava). Vercel suporta Server Actions full.
- ❌ `card_source = 'user'` branches (feature morta).
- ❌ `notebook_pages` references (feature morta — Caderno virou view sobre `srs_reviews`).

---

## Quando ler isto

- **Antes de Phase 4** (Pagamento + Onboarding): bugs #2, #9, #11.
- **Antes de Phase 5** (Sessão de estudo): bugs #1, #3, #4, #6, #10.
- **Antes de Phase 8** (Admin + Curadoria): bugs #5, #11, #12.
- **Sempre que tocar Postgrest**: bugs #1, #7, #8.

**Manutenção**: cada bug novo descoberto em produção do reboot vai pra este arquivo + acompanha PR de fix.
