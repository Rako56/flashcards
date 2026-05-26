# Flashcards

> **flashcards.com.br** — marketplace de preparações curadas para concursos públicos brasileiros.

Aluno paga R$ 297/ano por uma preparação e recebe flashcards prontos feitos à mão pela equipe Cowork, simulado real da banca, painel premium e ferramentas de retomada ativa. Cada concurso vive sob seu próprio subdomínio (`tjsp.flashcards.com.br`, `pf.flashcards.com.br`, …).

## Status

| Camada                                                                                   | Estado  |
| ---------------------------------------------------------------------------------------- | ------- |
| Foundation (CI, observability, security, timing-safe webhook)                            | ✅ 100% |
| Multi-tenant subdomain routing (+ integration test do full chain)                        | ✅ 100% |
| Auth (signup, login, OAuth Google, password recovery, LGPD deletion)                     | ✅ 100% |
| Pagamento (Asaas checkout + webhook + access grant + self-serve refund + admin triage)   | ✅ 100% |
| SRS (FSRS-5 + streak/XP + last-card bonus + leaderboard)                                 | ✅ 100% |
| Caderno de erros (listagem + filtros + revisar todos + dominei + dominei todos)          | ✅ 100% |
| Visual identity (wordmark + favicon + brand tokens + Fraunces display; logo pendente)    | 80%     |
| Admin (read-only + status toggles + /admin/webhooks + /admin/audit-log + /admin/refunds) | ✅ 100% |
| Simulado (listing + create + detail + runner interativo + gabarito + refazer)            | ✅ 100% |
| SEO (robots, sitemap, OG dinâmico, JSON-LD, breadcrumbs, noindex, analytics)             | ✅ 100% |

113 PRs entregues. **9 das 10 camadas em 100%, Visual em 80%.** Tudo o que dependia de código está fechado. Falta apenas (a) drop-in do logo final do designer em `components/brand/wordmark.tsx` e (b) configuração operacional (env vars, DNS, Asaas API key) pra ligar a venda.

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # preencher conforme `lib/env.ts`
pnpm dev                     # http://localhost:3000
```

Requer Node 20.18+ (ver `.nvmrc`) e pnpm 9.15.x.

## Scripts

- `pnpm dev` — servidor de desenvolvimento Next.js
- `pnpm build` — build de produção
- `pnpm start` — servidor de produção
- `pnpm typecheck` — TypeScript strict 100% check
- `pnpm lint` — ESLint (max-warnings 0)
- `pnpm test` — Vitest unit tests
- `pnpm test:coverage` — Vitest com coverage gates
- `pnpm test:e2e` — Playwright E2E (requer `PLAYWRIGHT_BASE_URL`)
- `pnpm format` / `pnpm format:check` — Prettier
- `pnpm db:link` — link CLI ao projeto Supabase (requer `SUPABASE_PROJECT_ID` + `SUPABASE_ACCESS_TOKEN`)
- `pnpm db:push` / `db:diff` / `db:reset` / `db:lint` — operações Supabase migrations
- `pnpm types:gen` — regenera `types/database.types.ts` a partir do schema remoto

## Rotas em produção

**Públicas:** `/`, `/login`, `/signup`, `/sobre`, `/termos`, `/privacidade`, `/reembolso`, `/leaderboard`, `/esqueci-senha`, `/redefinir-senha`, `/auth/confirmar-email`, `/auth/callback`

**Autenticadas:** `/study` (+ `?mode=mistakes`), `/erros`, `/simulado` (+ `/novo`, `/[id]`, `/[id]/run`), `/checkout`, `/sucesso`, `/onboarding`, `/settings` (+ `/account`, `/profile`, `/password`, `/study`)

**Admin (role gated):** `/admin`, `/admin/concursos`, `/admin/flashcards`, `/admin/questoes`, `/admin/users`, `/admin/webhooks`, `/admin/audit-log`, `/admin/refunds`

**API:** `/api/healthz`, `/api/webhooks/asaas`

**SEO assets:** `/robots.txt`, `/sitemap.xml`, `/opengraph-image`

## Cliente Supabase

Quatro factories no `lib/supabase/`:

- `server.ts` — `createClient()` para Server Components, Server Actions, Route Handlers (cookies via `next/headers`)
- `browser.ts` — `createClient()` singleton para Client Components
- `admin.ts` — `createAdminClient()` com `service_role` + `'server-only'` (NUNCA importar de Client Component)
- `middleware.ts` — `updateSession(request)` para refrescar JWT no `middleware.ts` raiz (usa `getUser()`, não `getSession()`)

Cookies têm `domain: .flashcards.com.br` em produção para login compartilhado entre subdomínios de concurso.

## Stack

- **Next.js 15.5** (App Router) + TypeScript strict 100%
- **Supabase Pro** (Postgres + Auth + Storage)
- **Asaas** (PIX + boleto + cartão)
- **Vercel Pro** (hosting + wildcard SSL)
- **Tailwind v3** + **shadcn-style primitives** (button, input, label, breadcrumb)
- **Sentry** (EU region, sourcemaps, correlationId tags)
- **Pino** (structured logging com redaction list)
- **Vitest** (unit + integration) + **Playwright** (E2E smoke + multi-tenant)
- **ts-fsrs 5.4** (FSRS-5 algorithm)

## Segurança aplicada

- **F-001:** `search_path` fix em funções SECURITY DEFINER do refund_requests
- **F-002:** 23 fns SECURITY DEFINER agora bloqueiam `anon` execute. Tier 1 (allowlist: `get_weekly_leaderboard`, `flashcard_heuristic_flags`, `has_role`) mantém anon. Tier 2 (user-scoped) só `authenticated`. Tier 3 (admin/service-role) só `service_role`.
- **LGPD:** Audit table + `delete_user_cascade` SECURITY DEFINER + `/settings/account` delete flow + 15 dias úteis SLA documentado.
- **Anti-PII em logs:** Pino redact list inclui password, token, authorization, cookie, service_role_key, apiKey, secret.

## Documentação canônica

- Tese, anti-features e arquitetura: [`.planning/PROJECT.md`](.planning/PROJECT.md)
- Diretivas obrigatórias pro Claude: [`CLAUDE.md`](CLAUDE.md)
- Roadmap das 10 fases MVP: [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
- Requisitos detalhados (127 reqs v1): [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)
- Pinos de versão e do-not-use callouts: [`.planning/research/STACK.md`](.planning/research/STACK.md)
- Estado de execução por sessão: [`.planning/STATE.md`](.planning/STATE.md)

## Operacionais pendentes (fora do código)

Pra ligar a venda end-to-end falta:

1. **Vercel env** — colar `SUPABASE_SERVICE_ROLE_KEY` (paste anterior veio truncada)
2. **DNS Hostinger → Vercel** — `A @ 76.76.21.21` + `CNAME * cname.vercel-dns.com`
3. **Asaas sandbox key** — `ASAAS_API_KEY` no Vercel env vars + `ASAAS_API_BASE=https://sandbox.asaas.com/api/v3`
4. **Google OAuth provider** — habilitar no Supabase Dashboard com Client ID/Secret do GCP
5. **Vercel Pro upgrade** — opcional ($20/mês), Hobby tem rate limit em deploys/dia
