# CLAUDE.md — Flashcards

> **Read me first.** Then read [`.planning/PROJECT.md`](.planning/PROJECT.md) for full context.

## Project Identity

- **Name:** Flashcards
- **Domain:** flashcards.com.br
- **Stack:** Next.js 15.5 (App Router) + TypeScript strict 100% + Supabase Pro + Asaas + Vercel Pro
- **Persona:** concurseiro sério (BR-PT), R$ 297/ano por preparação curada por concurso
- **Multi-tenant:** subdomínio por concurso (`<slug>.flashcards.com.br`) resolvido por middleware

⛔ **Forbidden words anywhere in code/comments/copy:** `Sparkle`, `Sparkle Flashcards`, `Sparkle Study Scape`. Those are dead names of the Lovable legacy. The legacy lives **only** as archive under `sparkle-study-scape/`. **Never** import from it, never copy its code, never reference its DB project `zjyogswbgcauwqisvuyq`.

## Anti-Features (NEVER ship)

These are hard blocks. If a task asks you to add any of these, **stop and ask Rafael** — they are anchor decisions in [`.planning/PROJECT.md`](.planning/PROJECT.md) §Out of Scope.

- ⛔ IA visível ao aluno — no "gerar flashcards", "explicar com IA", "transcrever áudio", chatbot, copiloto
- ⛔ Tiptap (ou qualquer rich-text editor) para cadernos do aluno — caderno é auto-populado
- ⛔ Free tier amplo — talvez 5-10 demo cards na landing, **sem** plano gratuito
- ⛔ Multi-idioma (PT-BR only)
- ⛔ Subscription auto-renewable — anual one-shot por concurso
- ⛔ Geração automática de conteúdo — Cowork humano sempre; cards nascem `status='review'`, humano aprova → `status='active'`
- ⛔ App mobile nativo em v1 — PWA web responsivo basta
- ⛔ OCR / upload de PDF pelo aluno
- ⛔ DIY deck editor (aluno criando deck próprio)
- ⛔ Push notifications de guilt
- ⛔ Gamification spam — XP/leagues sim, mas sem dark patterns
- ⛔ Multi-tier pricing — um preço, uma prep
- ⛔ Stripe (ou qualquer outro gateway) — só Asaas
- ⛔ Chat IA / suporte IA-first

## Tech Pins (immutable for v1)

- **Next.js** 15.5.x (NOT 16; pin exact patch)
- **TypeScript** 5.7.x, `strict: true` + 3 flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`)
- **pnpm** 9.15.x — exact version in `packageManager` field
- **Node** 20.18.x (`.nvmrc` + `engines.node`)
- **React** 19.0.0 + React DOM 19.0.0 (ships with Next 15.5)
- **Supabase Pro** (region: `sa-east-1`) + `@supabase/ssr` 0.10.x — NOT free tier (auto-pausa)
- **Tailwind** v3.4.x (NOT v4 — research explicitly bans v4 in v1)
- **Zod** v3.x (NOT v4)
- **ESLint** v9 flat config (`eslint.config.mjs`, NOT `.eslintrc.*`)
- **Vitest** 3.2.x
- **Sentry** `@sentry/nextjs` 10.53.x
- **pino** v9 — structured logging from commit 1

## Quality Gates (non-negotiable)

| Gate          | Rule                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript    | `strict: true` + 3 flags. ZERO `: any` or `as any`. ESLint blocks on `@typescript-eslint/no-explicit-any`.                     |
| Lint          | CI fails on any ESLint error. Pre-commit hook (Plan 1.2) runs lint + typecheck.                                                |
| Coverage      | ≥50% global; ≥90% on `lib/srs/`, `lib/queue/`, `lib/asaas/`, `lib/access/`.                                                    |
| Observability | Sentry + pino from commit 1. Every catch in Route Handlers / Server Actions calls `Sentry.captureException`.                   |
| Atomicity     | All read-modify-write on DB goes through atomic Postgres functions (XP, due cards, simulado answers). No client-side RMW.      |
| RLS           | Every table has RLS enabled with explicit policies. No "RLS off, we'll fix later".                                             |
| Multi-tenant  | `getConcursoBySlug()` is the ONLY API to resolve a concurso. Hardcoded UUIDs in code are banned — ESLint custom rule enforces. |

## Conventions

- **Import alias:** always `@/...` (no deep relative paths like `../../../lib/`)
- **Conditional classes:** always `cn(...)` from `@/lib/utils` — never template strings, never `clsx` directly
- **UI primitives:** prefer shadcn/ui generated into `components/ui/`; extend, don't fork
- **Testing:** Vitest + React Testing Library + MSW (unit/integration); Playwright (E2E)
- **No legacy DB carryover:** new Supabase project, new schema, zero data migration

## Service-Role Isolation

- `lib/supabase/admin.ts` ALWAYS starts with `import 'server-only'`
- Runtime guard: `if (typeof window !== 'undefined') throw new Error('admin client requested in browser')`
- `SUPABASE_SERVICE_ROLE_KEY` **never** in `NEXT_PUBLIC_*` — ESLint rule blocks misuse
- Service-role usage requires explicit `// @reason: bypasses RLS because ...` comment per call site

## Webhook Discipline

Legacy returned 200 on every error. **That's banned.**

- Webhook returns **500** on transient errors (DB down, Asaas re-fetch fail) so Asaas retenta — Asaas's retry curve is our safety net
- Returns **200** only on success or on unrecoverable errors (invalid signature, malformed payload)
- Every catch calls `Sentry.captureException` with structured context (event id, customer id, payment id, correlation id)
- Idempotency by `event.id` (UPSERT into `processed_webhook_events`); re-delivery does nothing

## Reference

- **Product gospel:** [`.planning/PROJECT.md`](.planning/PROJECT.md) — tese, persona, anti-features, key decisions
- **Roadmap (10 fases MVP):** [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
- **Requisitos detalhados (127 reqs v1):** [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)
- **Stack pins + do-not-use callouts:** [`.planning/research/STACK.md`](.planning/research/STACK.md)
- **Arquitetura multi-tenant + route groups:** [`.planning/research/ARCHITECTURE.md`](.planning/research/ARCHITECTURE.md)

---

_Last updated: 2026-05-21 (reboot, Plan 1.1)_
