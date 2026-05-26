# Flashcards

> **flashcards.com.br** — marketplace de preparações curadas para concursos públicos brasileiros.

Aluno paga R$ 297/ano por uma preparação e recebe flashcards prontos feitos à mão pela equipe Cowork, simulado real da banca, painel premium e ferramentas de retomada ativa. Cada concurso vive sob seu próprio subdomínio (`tjsp.flashcards.com.br`, `pf.flashcards.com.br`, …).

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

## Cliente Supabase

Três factories no `lib/supabase/`:

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
- **Tailwind v3** + **shadcn/ui**
- **TanStack Query** + **React Hook Form** + **Zod**

## Documentação canônica

- Tese, anti-features e arquitetura: [`.planning/PROJECT.md`](.planning/PROJECT.md)
- Diretivas obrigatórias pro Claude: [`CLAUDE.md`](CLAUDE.md)
- Roadmap das 10 fases MVP: [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
- Requisitos detalhados (127 reqs v1): [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)
- Pinos de versão e do-not-use callouts: [`.planning/research/STACK.md`](.planning/research/STACK.md)
