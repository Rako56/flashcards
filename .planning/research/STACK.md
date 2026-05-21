# Technology Stack — Flashcards (Reboot 2026)

**Project:** flashcards.com.br — marketplace de preparações curadas para concursos
**Researched:** 2026-05-21
**Confidence (overall):** HIGH for core, MEDIUM for emerging tooling
**Replaces:** Legacy Vite + React 18 + Supabase free + zero-CI stack in `sparkle-study-scape/`

---

## TL;DR — Stack Snapshot

| Layer | Recommendation | Version | Confidence |
|------|---------------|---------|------------|
| Framework | **Next.js** (App Router only) | `15.5.x` (pin) — see §1 for the 15-vs-16 decision | HIGH |
| Runtime (default) | Node.js LTS | `20.18.x` (pin via `.nvmrc` + `engines`) | HIGH |
| Language | TypeScript strict 100% | `5.7.3` | HIGH |
| UI primitives | shadcn/ui + Radix | `shadcn@2.x` CLI (Tailwind v4 mode) | HIGH |
| Styling | Tailwind CSS | `3.4.17` (NOT v4 — see §4) | HIGH |
| State (server) | TanStack Query | `5.100.x` | HIGH |
| Forms | React Hook Form + Zod | `7.76.x` + `zod 3.25.x` (NOT v4 — see §5) | HIGH |
| Animation | `motion/react` (Framer Motion v12) | `motion@12.39.x` | HIGH |
| Charts | Recharts | `3.8.x` | MEDIUM |
| DB / Auth | Supabase Pro | `@supabase/ssr@0.10.x`, `@supabase/supabase-js@2.106.x` | HIGH |
| SRS algorithm | `ts-fsrs` (with own thin wrapper + tests) | `~4.x` (or fork into `src/lib/srs/`) | MEDIUM |
| Payment | Asaas v3 (raw `fetch`) | API only — no SDK | HIGH |
| Email | Resend SDK | `resend@^4` | HIGH |
| Observability | Sentry | `@sentry/nextjs@10.53.x` + `@sentry/deno` for edge fns | HIGH |
| Logging | `pino` (Node routes) / Sentry breadcrumbs (Edge) | `pino@^9` | MEDIUM |
| Tests | Vitest + RTL + MSW + Playwright | `vitest@3.2.x`, `@playwright/test@1.60.x`, `msw@^2.7` | HIGH |
| Lint/format | ESLint flat + Prettier (NOT Biome yet — see §12) | `eslint@9.x` + `prettier@3.x` | HIGH |
| Pre-commit | husky + lint-staged | `husky@9.x` + `lint-staged@15.x` | HIGH |
| Package manager | **pnpm** | `9.x` (pinned via `packageManager`) | HIGH |
| Hosting | Vercel + Supabase Pro ($25/mo) | — | HIGH |
| PWA | Serwist (NOT next-pwa) | `@serwist/next@^9` | MEDIUM |

**Critical "do NOT use" callouts (concentrate fire here):**

1. **Do NOT use Pages Router.** App Router only. RSC, metadata API, parallel routes, and middleware-based subdomain routing all require App Router.
2. **Do NOT use Supabase Free tier.** Auto-pauses after 7 days. Pro plan ($25/mo) is **mandatory** for a paid product. (CONCERNS.md: legacy was on Free → recurring 7-day cold-start fear.)
3. **Do NOT use `@supabase/auth-helpers-nextjs`.** Deprecated. Use `@supabase/ssr` with `getAll`/`setAll` cookies pattern only.
4. **Do NOT use `cookies.get/set/remove` in `@supabase/ssr`.** Only `getAll` and `setAll`. Mixing breaks session refresh silently and produces the legacy's "infinite loop / random logouts" symptom.
5. **Do NOT use Tailwind v4** yet (see §4 — too churny for a paid greenfield in 2026-Q2; revisit in Q4).
6. **Do NOT use Zod v4** yet (see §5 — subpath `zod/v4` ships alongside v3, but ecosystem (RHF resolver + zodResolver) is still on v3 as of 2026-05; jumping early forces dual-imports).
7. **Do NOT use Next.js 16** (see §1 — released stable in 2026-Q2 but `middleware → proxy` rename + `use cache` opt-in caching are recent breaking changes; 15.5 is current LTS with stable Node middleware).
8. **Do NOT use Biome to replace ESLint** (see §12 — covers ~80% but is missing `eslint-plugin-react-hooks` and `eslint-plugin-next` parity; use Biome as a formatter only or postpone).
9. **Do NOT use `next-pwa`** — abandoned. Use Serwist.
10. **Do NOT use Vite/Create-Next-App's default `npm`.** Use pnpm and pin via `packageManager` in package.json.
11. **Do NOT install `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`** as decoration. The legacy did exactly that — paid the bundle cost and never wired them up. If you install, you use, with at least 3 forms migrated on commit 1.
12. **Do NOT `'use server'` inside React Server Components.** Reserved for Server Action files only. Mixing produces opaque Webpack errors.
13. **Do NOT hardcode `https://api.asaas.com/v3` only.** Make sandbox toggle env-driven (`ASAAS_API_URL`); legacy hardcoded production and couldn't test without changing code (INTEGRATIONS.md).
14. **Do NOT return HTTP 200 from the Asaas webhook on DB error.** Return 500 so Asaas retries. Legacy returned 200 on every path → silent failure mode (CONCERNS.md SEC-05/SEC-06).
15. **Do NOT do read-modify-write on `user_gamification.total_xp` from the client.** Use a Postgres atomic `UPDATE ... SET total_xp = total_xp + $1` RPC (addresses CONCERNS.md DI-01).

---

## 1. Next.js — Framework

### Recommendation

**Next.js 15.5.x (App Router)** — `next@15.5.4` (current 15.x stable as of 2026-05; check `npm view next@15 versions --tag latest` at install time).

### Why 15.5 and NOT 16

Next.js 16 went stable in 2026-Q2 (16.2.6 is current). It brings:
- Turbopack as default for `next dev` and `next build`
- Caching is **opt-in** (`'use cache'`) — old implicit caching removed
- React Compiler stable
- `middleware.ts` **renamed to `proxy.ts`**, the proxy runtime is **nodejs only** (edge runtime not supported in proxy; if you want edge runtime, keep file named `middleware.ts`)

For a greenfield project building **wildcard subdomain routing** as the core architectural pattern, **15.5 is the safer choice** because:

1. **Documentation lag.** Most subdomain/multi-tenant Next.js tutorials and Stack Overflow answers (2026) reference `middleware.ts` patterns — 16's `proxy.ts` is fresh ground.
2. **`@supabase/ssr` cookbook is still framed around middleware.ts.** Supabase docs were updated for `proxy.ts` in 2026-Q2 but field-tested 15.5 patterns dominate.
3. **The caching opt-in is double-edged.** With 16, every page now defaults to dynamic — performance can degrade without explicit `'use cache'`. The team learns RSC first, *then* opts into caching, not both simultaneously.
4. **Node.js runtime for middleware** went stable in 15.5 — already addresses the legacy's "I want Sentry/pino in middleware but it's edge-only" pain.
5. **Next 16 will not be the LTS until Next 17 lands**; running 15.5 buys 6-12 months of stability and a clean migration path.

**When to upgrade to 16:** Q4/2026 once `proxy.ts` patterns mature and team owns 15.5 fluently. The codemod for the `middleware → proxy` rename is automated (`npx @next/codemod@latest`).

### Config Decisions

```ts
// next.config.ts
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // turbopack defaults are already on in 15.5 for dev; build is still beta
    typedRoutes: true,         // catches /tjsp typos at build time
  },
  // Match legacy SPA fallback removed — Next handles routing
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },  // storage URLs
      { protocol: 'https', hostname: 'flashcards.com.br' },
    ],
  },
  // Subdomain routing handled in middleware.ts (see §3)
}

export default withSentryConfig(config, {
  // see §9
})
```

**Runtime per route group:**

| Route group | Runtime | Reason |
|-------------|---------|--------|
| `app/(marketing)/**` (landing, SEO pages) | Node (default) | Need Sentry + `pino` + Supabase server client |
| `app/(student)/**` (protected dashboard) | Node | Same |
| `app/(admin)/**` | Node | Same |
| `app/api/asaas/webhook/route.ts` | Node | Asaas webhook handler — needs Supabase service-role + retry semantics |
| `middleware.ts` | **Node** (15.5 stable) | Sentry, pino, Supabase SSR cookie refresh all need Node APIs |

**Do NOT use Edge runtime** anywhere unless you have a measured latency need. Vercel's Node serverless cold-starts are already <50ms for warm functions and the Edge runtime's restrictions (no Node APIs, no Sentry node SDK, limited Supabase SDK use) cost more than they save.

### Watch out for

- **`async` Request APIs** (cookies, headers, params): in 15+, `cookies()`, `headers()`, `params` are async — `await cookies()`, `await params`. The codemod handles this but writing it correctly from day 1 saves time.
- **Server Actions need `'use server'` at the top of the FILE, not inline.** If you write `async function foo() { 'use server'; ... }` inside a Client Component, you get the opaque "Cannot find module ... .well-known/actions/..." error. Define actions in `app/_actions/*.ts` with `'use server'` as the **first line** of the file.
- **Static export is off the table** — needs middleware (subdomain routing). `output: 'export'` would break the whole architecture.
- **React 19 is the default.** `'use client'` boundaries are stricter — anything importing Framer Motion, TanStack Query devtools, or any hook needs the directive.

**Sources:**
- [Next.js 15.5 release notes](https://nextjs.org/blog/next-15-5)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Node.js Middleware stable](https://nextjs.org/blog/next-15-5)

### Do NOT use

- Pages Router. (Legacy was Vite SPA — no Pages Router familiarity to preserve.)
- Edge runtime for `middleware.ts` (or anywhere) unless measured need.
- `output: 'export'`.
- Next.js 16 (yet — Q4/2026 candidate).

---

## 2. TypeScript — Strict 100%

### Recommendation

**TypeScript 5.7.3** with the strictest practical config. This is the antidote to the legacy's `166 as any + 136 explicit any` disease.

### `tsconfig.json` (project root, project references)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "verbatimModuleSyntax": true,

    // --- Strict family (all on) ---
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "alwaysStrict": true,
    "useUnknownInCatchVariables": true,

    // --- The "+3 the legacy lacked" ---
    "noUncheckedIndexedAccess": true,       // arr[0] is T | undefined
    "exactOptionalPropertyTypes": true,      // ?: T means absent, NOT undefined
    "noPropertyAccessFromIndexSignature": true,

    // --- Misc strictness ---
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    // --- Next.js plugin ---
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Ban `any`** via ESLint:

```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error"
}
```

### What the +3 unique flags catch (vs the legacy)

| Flag | Catches | Why it matters here |
|------|---------|---------------------|
| `noUncheckedIndexedAccess` | `array[i]` is now `T \| undefined`; `record["key"]` too | Legacy did `cards[idx].rating` everywhere — would have caught the "cards repeating in same section" bug class |
| `exactOptionalPropertyTypes` | `interface X { a?: string }` no longer accepts `a: undefined` explicitly | Forces conscious handling of "absent vs set to undefined" in form state |
| `noPropertyAccessFromIndexSignature` | Can't dot-access record keys that aren't statically known | Prevents `obj.someKey` typos in dynamic configs (e.g., per-concurso theme dictionary) |

### Type generation for Supabase

```bash
# Add to package.json scripts
"types:supabase": "supabase gen types typescript --linked > src/types/database.ts"
```

Run on every migration, commit the output. Types must be in sync with schema **before** PR merges (enforce in CI).

### Watch out for

- `verbatimModuleSyntax: true` requires `import type { Foo } from '...'` for type-only imports. The ESLint rule above enforces this automatically.
- `exactOptionalPropertyTypes` will break some `react-hook-form` patterns and `defaultValues` — workaround is explicit `value: undefined` in your form types, but in 95% of cases the stricter checking surfaces real bugs.
- **Pre-commit hook MUST run `tsc --noEmit`** in addition to lint-staged. Legacy lacked this — strict mode is worthless if it's not gated.

**Sources:**
- [TypeScript: TSConfig Reference (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)](https://www.typescriptlang.org/tsconfig/)
- [The Strictest TypeScript Config (Vladyslav Zubko, 2026)](https://whatislove.dev/articles/the-strictest-typescript-config/)
- [TypeScript Best Practices 2026 (Hashtag Coders)](https://hashtagcoders.lk/blogs/typescript-best-practices-2026)

### Do NOT use

- `any` — banned by ESLint.
- `as` casts without comment explaining why. Use `as unknown as T` only when truly necessary (parsing untyped JSON), and prefer Zod parsing instead.
- `// @ts-ignore` — banned. `@ts-expect-error` with a comment is acceptable for known-temporary issues.
- `strict: false` "for migration purposes". The whole point is to start strict.

---

## 3. Supabase — Auth, DB, Storage, Edge Functions

### Recommendation

| Component | Pkg | Version | Note |
|-----------|-----|---------|------|
| Server/client SSR | `@supabase/ssr` | `^0.10.3` | Use this, NOT `auth-helpers-nextjs` |
| JS client | `@supabase/supabase-js` | `^2.106.0` | Singleton, both browser and server |
| CLI (dev / migrations) | `supabase` | `^2.x` (latest, install via brew/npm) | Run `supabase link` then `supabase db push` |
| Hosting plan | **Pro** | $25/mo | Free auto-pauses after 7d — **launch blocker** |

### Project setup (new Supabase project)

1. **New project**, NOT the legacy `zjyogswbgcauwqisvuyq`.
2. **Upgrade to Pro plan on day 1.** Free tier auto-pauses after 7 days of inactivity — a paid product cannot have its DB hibernate when no one logged in over the weekend. Pro removes this entirely.
3. **Region:** `sa-east-1` (São Paulo) — concurseiros brasileiros, minimize latency.
4. **Postgres version:** 16+ (current Supabase default).
5. **Extensions to enable from the start:**
   - `pg_cron` — for in-DB scheduled jobs (replaces the legacy's manual edge function `process-leagues` cron)
   - `pg_net` — async HTTP from Postgres, used with `pg_cron` to call edge functions on schedule
   - `pgcrypto` — UUIDs, password hashing for any custom flows
   - `pgsodium` (or its successor `pg_tle`) — only if encrypting columns; **skip if not used** to avoid maintenance overhead
   - `uuid-ossp` — UUID v4 generation in default values
   - `pg_stat_statements` — query performance monitoring; on by default in Supabase but verify
6. **Auth dashboard config (set BEFORE first signup):**
   - **HIBP Leaked password protection: ON** (addresses CONCERNS.md SEC-01 — legacy was off; this is a Pro feature)
   - **Email confirmations: ON** (required signup verify)
   - **Min password length: 10** (raise from legacy's 8)
   - **Site URL:** `https://flashcards.com.br`
   - **Redirect URLs:** add all `*.flashcards.com.br` subdomains + dev/preview Vercel URLs
   - **JWT expiry: 3600s (1h)** — default is fine
   - **Refresh token rotation: ON**
   - **Rate limits:** raise signup limit only after launch + spam testing

### `@supabase/ssr` cookbook (Next.js 15 App Router)

**Critical:** Use **only** `getAll` and `setAll`. Never `get`/`set`/`remove` — they exist for backward compatibility but break session refresh in middleware silently.

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware will persist
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do NOT remove this line — refreshes the session
  await supabase.auth.getUser()
  return response
}
```

```typescript
// middleware.ts (project root)
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Refresh session cookies first
  const response = await updateSession(request)

  // 2. Subdomain routing
  const host = request.headers.get('host') ?? ''
  const subdomain = extractSubdomain(host)  // see §13

  if (subdomain && subdomain !== 'www') {
    // Rewrite e.g. tjsp.flashcards.com.br/dashboard → /(student)/tjsp/dashboard
    const url = request.nextUrl.clone()
    url.pathname = `/_concurso/${subdomain}${url.pathname}`
    return NextResponse.rewrite(url, { headers: response.headers })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### RLS conventions

- **Every table has RLS enabled.** Even admin tables — gate by `auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')`.
- **Service-role bypasses RLS.** Edge functions use `SUPABASE_SERVICE_ROLE_KEY` ONLY when they need to write across users (webhook → grant access). All client-facing reads/writes go through the anon key + RLS.
- **Policy naming convention:** `<table>_<action>_<role>` e.g. `flashcards_select_owner`, `flashcards_update_admin`.
- **Pre-launch audit:** run `select * from pg_policies` and document expected policies in `supabase/policies.md`. Compare to actual schema before launch.

### Migrations

```bash
# Local dev
supabase start
supabase migration new <name>   # creates timestamped SQL file
# Edit SQL...
supabase db reset               # apply locally
supabase test db                # run pgtap if you have tests

# To remote
supabase db push                # apply pending to linked project
supabase gen types typescript --linked > src/types/database.ts
```

**CI must run `supabase db lint` + dry-run push on PR.** Migration drift between branches is the #1 cause of "works locally / broken in prod" for Supabase teams.

### Edge Functions (Deno)

Use **one `deno.json` at `supabase/functions/`** as the import map root, plus per-function `deno.json` only for function-specific overrides. **Standardize all functions on:**
- Deno std `0.224.0` (Deno 2 compatible)
- `@supabase/supabase-js@^2.106` via npm specifier: `import { createClient } from 'npm:@supabase/supabase-js@2.106.0'`
- `@sentry/deno@^9` for error tracking (separate Sentry project from Next.js — see §9)

```json
// supabase/functions/deno.json
{
  "imports": {
    "std/": "https://deno.land/std@0.224.0/",
    "supabase": "npm:@supabase/supabase-js@2.106.0",
    "sentry": "npm:@sentry/deno@^9.0.0",
    "zod": "npm:zod@3.25.76"
  },
  "tasks": {
    "test": "deno test --allow-env --allow-net --allow-read"
  }
}
```

**Edge functions to build (from INTEGRATIONS.md "KEEP AS-IS" list):**
- `asaas-webhook` (rewrite with idempotency + verify-back + Sentry — see §7)
- `create-asaas-payment` (rewrite with DB-driven product table)
- `send-welcome-email` (move from Resend custom call to `resend@^4` npm package)
- `process-leagues` (consider moving to `pg_cron` + `pg_net` instead of separate edge fn — simpler)

**Watch out for:**
- Deno's `npm:` specifier was added in Deno 1.45; Supabase's edge runtime supports it. Don't fall back to `https://esm.sh/...` URLs — they bypass Supabase's npm caching and are slower.
- ESM `https://deno.land/std@x.x.x/` imports are still supported but discouraged for new code. Use `npm:` first, `jsr:` (Deno's package registry) second, `https://` last.

**Sources:**
- [Supabase Pricing — Pro removes pausing](https://supabase.com/pricing)
- [@supabase/ssr — getAll/setAll cookie pattern](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase HIBP password protection](https://supabase.com/docs/guides/auth/password-security)
- [Supabase Edge Functions dependencies](https://supabase.com/docs/guides/functions/dependencies)
- [Supabase pg_cron + pg_net](https://supabase.com/docs/guides/cron)

### Do NOT use

- `@supabase/auth-helpers-nextjs` — deprecated.
- `cookies.get/set/remove` in `@supabase/ssr` — silently breaks session refresh.
- Free tier — auto-pauses, launch blocker.
- A separate Supabase JS singleton in different files. One server client factory (`createClient()` in `lib/supabase/server.ts`), one browser client factory (`createClient()` in `lib/supabase/client.ts`).
- Mixed Deno std versions in edge functions (legacy had 0.190 + 0.168 simultaneously — total mess).

---

## 4. Tailwind + shadcn/ui — Styling

### Recommendation

**Tailwind 3.4.17** (NOT v4) + **shadcn/ui via the v2.3 CLI** (Tailwind v3 config mode).

### Why Tailwind v3 NOT v4

Tailwind v4 went stable in January 2025 and is well-trodden by 2026-Q2. **BUT** for this project I recommend v3 because:

1. **Design system migration friction.** Flashcards is doing a complete redesign with sub-themes per concurso (PROJECT.md MULTI-03). v3's `tailwind.config.ts` lets the team author **typed token files** (e.g. `themes/tjsp.ts`, `themes/pf.ts`) with TypeScript autocomplete and type-checking on color names. v4's CSS-first `@theme` blocks lose this.
2. **shadcn/ui has a Tailwind v3 install path (`shadcn@2.3.0`) that's still actively maintained.** v4 mode is also supported, but every shadcn example/block from 2024-2026 assumes v3. For a team learning the design system, less translation = less drift.
3. **Plugin compatibility.** Tailwind v4 dropped `tailwindcss-animate` in favor of CSS-only `@theme` animations. shadcn ships with `tailwindcss-animate` baked in for v3. Until the shadcn community fully migrates animation patterns, v3 is the path of least resistance.
4. **v4 build perf isn't a bottleneck.** Legacy build time was fine. v4's 3-8× faster builds are nice but solve a problem this project doesn't have.

**When to migrate to v4:** Q1/2027, after the design system has stabilized. The Tailwind team ships `@tailwindcss/upgrade` codemod.

### Setup

```bash
pnpm add -D tailwindcss@3.4.17 postcss@8.5.6 autoprefixer@10.4.21 tailwindcss-animate@1.0.7 @tailwindcss/typography@0.5.16
pnpm dlx shadcn@2.3.0 init
```

`components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "hooks": "@/hooks",
    "lib": "@/lib"
  }
}
```

### Multi-concurso theming pattern

Design tokens go in CSS vars on `.theme-tjsp`, `.theme-pf` etc., applied to `<html>` based on subdomain context resolved in middleware.

```css
/* src/app/globals.css */
@layer base {
  :root {
    /* default Flashcards brand — used on flashcards.com.br */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... */
  }
  .theme-tjsp {
    --primary: 215 100% 28%;   /* TJSP institutional blue */
    --accent: 0 100% 47%;      /* concurso accent */
  }
  .theme-pf {
    --primary: 142 76% 16%;    /* PF green */
  }
}
```

```tsx
// Set on <html> from server: app/(student)/[concurso]/layout.tsx
import { getConcursoTheme } from '@/lib/concurso'

export default async function Layout({
  params,
  children,
}: { params: Promise<{ concurso: string }>; children: React.ReactNode }) {
  const { concurso } = await params
  const theme = await getConcursoTheme(concurso)
  return (
    <html className={`theme-${theme}`} lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
```

### Dark mode

Use `next-themes@^0.4` (NOT the legacy's 0.3) wrapping the root layout. shadcn's docs include the canonical setup. Use **class strategy** (`dark` class on html), NOT media-query strategy — gives the user explicit control.

### Watch out for

- `@tailwindcss/typography` plugin has React-19 / Next-15 compatibility quirks if the `prose` class is used inside a Server Component with markdown — output renders but hydration may warn. Test with one real article render first.
- shadcn's `Form.tsx` component requires `react-hook-form` — if you DON'T install RHF day 1, drop `Form.tsx` from the generated set or leave it but understand it's dead.
- Custom Tailwind config in legacy had editorial type scale 2xs→7xl, shadow 1→5, radius 6/10/14/20 — these are reasonable design-system foundations. **Reuse the token names but redesign the values** to match new Flashcards brand.

**Sources:**
- [shadcn/ui — Next.js install](https://ui.shadcn.com/docs/installation/next)
- [Tailwind v4 migration considerations](https://designrevision.com/blog/tailwind-4-migration)

### Do NOT use

- Tailwind v4 (this project, this milestone).
- shadcn `Form.tsx` if you skip RHF — but you're NOT skipping RHF.
- `media` strategy for dark mode.
- Inline arbitrary values everywhere (e.g. `text-[14.5px]`) — defeats the design system. Use token values.

---

## 5. Forms — React Hook Form + Zod

### Recommendation

| Pkg | Version | Note |
|-----|---------|------|
| `react-hook-form` | `^7.76.0` | v8 in beta; stay on v7 |
| `@hookform/resolvers` | `^5.2.2` | Has Standard Schema resolver |
| `zod` | `^3.25.76` | NOT v4 (yet — see below) |

### Why Zod v3 NOT v4

Zod v4 went stable in 2025 and ships at the `zod/v4` subpath alongside v3 in the same `zod` package. It's 14× faster string parsing, 57% smaller core. **BUT:**

1. **`@hookform/resolvers/zod` defaults to v3 imports.** Using v4 requires either (a) a Standard Schema resolver bridge or (b) explicit `zod/v4` imports. Either way, every form's resolver setup is a one-off.
2. **For a project starting from zero forms**, the ergonomic win of v4 is real but the cost of mismatched docs (most RHF+Zod tutorials still target v3) is higher than the perf win.
3. **The legacy never wired RHF+Zod up.** This project's job is to actually USE the libs in 8+ forms (signup, login, onboarding, checkout, profile, settings, refund, support). v3 is enough; the test is whether you actually USE the lib.

**Upgrade plan:** Migrate to v4 in Q1/2027 once `@hookform/resolvers` defaults flip and ecosystem is settled.

### Canonical RHF + Zod + Server Action pattern

```typescript
// src/lib/schemas/signup.ts
import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(10, 'Mínimo 10 caracteres'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').refine(isValidCpf, 'CPF inválido'),
  fullName: z.string().min(2),
})

export type SignupInput = z.infer<typeof signupSchema>
```

```typescript
// src/app/_actions/signup.ts
'use server'

import { signupSchema, type SignupInput } from '@/lib/schemas/signup'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signupAction(input: SignupInput) {
  // Re-validate on server (defense in depth)
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName, cpf: parsed.data.cpf } },
  })
  if (error) return { error: { _form: [error.message] } }

  redirect('/onboarding')
}
```

```tsx
// src/components/signup-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { signupSchema, type SignupInput } from '@/lib/schemas/signup'
import { signupAction } from '@/app/_actions/signup'

export function SignupForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', cpf: '', fullName: '' },
  })

  return (
    <form onSubmit={form.handleSubmit((data) => {
      startTransition(async () => {
        const result = await signupAction(data)
        if (result?.error) {
          // Map server errors back to form fields
          Object.entries(result.error).forEach(([key, msgs]) => {
            form.setError(key as keyof SignupInput, { message: msgs?.[0] })
          })
        }
      })
    })}>
      {/* fields wired via form.register('email') etc. */}
    </form>
  )
}
```

### Validate on BOTH client and server

The Zod schema is the single source of truth. Client gets fast feedback via `zodResolver`. Server **re-parses** every action — never trust client-side validation. This is non-negotiable for signup, payment, refund.

### Watch out for

- `exactOptionalPropertyTypes: true` (from §2) interacts poorly with RHF's `defaultValues` if you set them to `undefined`. Use explicit empty strings/sensible defaults instead.
- Use `mode: 'onTouched'` (not `'onChange'`) for most forms — `onChange` validates on every keystroke and feels nag-y. Onboarding and checkout especially.
- `form.handleSubmit` swallows submission promise rejections. Wrap in try/catch inside the callback or use `onSubmit` + `onInvalid` callbacks.

**Sources:**
- [React Hook Form + Zod + Server Actions pattern](https://nehalist.io/react-hook-form-with-nextjs-server-actions/)
- [Zod v4 stable release notes](https://zod.dev/v4)

### Do NOT use

- Hand-rolled `useState` + `onChange` for forms. (Legacy did this for **every** form despite RHF being installed. Don't repeat.)
- `zod/v4` subpath (yet — Q1/2027 candidate).
- `@hookform/resolvers/standard-schema` — works but adds an indirection layer; `zodResolver` is direct.
- Client-only validation. Re-validate on server actions every time.

---

## 6. State — TanStack Query v5 + Server Components

### Recommendation

`@tanstack/react-query@^5.100.11` + `@tanstack/react-query-devtools@^5.100.11` (dev only).

### Pattern — RSC prefetch + client hydration

```tsx
// app/(student)/[concurso]/dashboard/page.tsx (Server Component)
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { DashboardClient } from './dashboard-client'
import { fetchDueCards } from '@/lib/queries/due-cards'

export default async function Page({ params }: { params: Promise<{ concurso: string }> }) {
  const { concurso } = await params
  const qc = new QueryClient()
  await qc.prefetchQuery({
    queryKey: ['due-cards', concurso],
    queryFn: () => fetchDueCards(concurso),
  })
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardClient concurso={concurso} />
    </HydrationBoundary>
  )
}
```

```tsx
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 2 * 60 * 1000,        // 2min — matches legacy
          gcTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    }),
  )
  return (
    <QueryClientProvider client={qc}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

### Watch out for

- **One `QueryClient` per request on the server.** Don't share across requests — different users would see each other's cache. `new QueryClient()` inside the RSC render function (as above) ensures freshness.
- **Don't use TanStack Query for everything.** Server-side data that's static or refresh-by-revalidate (concurso list, edital tree) belongs in `fetch()` + `revalidateTag()` — Next's native caching is simpler. Use TanStack only for client-mutated, real-time-ish state (due cards, simulado progress, gamification XP).
- **`useSuspenseQuery` + Next streaming** is shipping but somewhat experimental — gate behind a feature flag for v1.
- **Devtools must NOT load in production.** The `process.env.NODE_ENV` check above + Next's tree-shaking handle this, but verify in built bundle.

**Sources:**
- [TanStack Query — Next.js App Router prefetching](https://tanstack.com/query/v5/docs/framework/react/examples/nextjs-app-prefetching)
- [TanStack Query — Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)

### Do NOT use

- Raw `fetch` in client components if you have TanStack Query — the legacy mixed both and ended up with inconsistent error handling.
- A single global `QueryClient` instantiated outside React (server-side leak).
- Auto-`refetchOnWindowFocus: true` — distracting for a study app.

---

## 7. Asaas — Payment Integration (no SDK)

### Recommendation

**No SDK.** Raw `fetch()` to `https://api.asaas.com/v3/*` from Supabase Edge Function (Deno) **and** from Next.js Server Actions (Node) — both via a shared `asaasFetch<T>` helper in `src/lib/asaas/`.

### Endpoints used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /customers` | POST | Create customer (idempotent by `cpfCnpj`) |
| `GET /customers?cpfCnpj=<cpf>` | GET | Find existing customer by CPF before create |
| `PUT /customers/{id}` | PUT | Update customer (email, name change) |
| `POST /payments` | POST | Create payment (PIX/boleto/cartão) — use `externalReference: "${userId}:${concursoId}"` for idempotency |
| `GET /payments?externalReference=<ref>` | GET | Find existing payment by external ref before re-creating |
| `GET /payments/{id}` | GET | Re-fetch a payment to **verify** webhook payload (SEC-08 fix) |
| `GET /payments/{id}/pixQrCode` | GET | PIX QR code + copy-paste payload |
| `POST /payments/{id}/refund` | POST | Refund flow (CDC art. 49) |

### Headers

```typescript
// All Asaas calls
{
  'access_token': process.env.ASAAS_API_KEY!,
  'Content-Type': 'application/json',
  'User-Agent': 'flashcards.com.br/1.0',
}
```

### Environment toggle

```typescript
// src/lib/asaas/client.ts
const ASAAS_BASE = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'
//                                              ^ default to PROD
// Sandbox: https://sandbox.asaas.com/api/v3 — set ASAAS_API_URL in preview deployments
```

**Critical:** the legacy hardcoded production. Make this env-driven so preview deploys / staging use sandbox.

### Webhook handler — the rewrite

Per CONCERNS.md SEC-05 (CRITICAL), SEC-07 (idempotency), SEC-08 (re-verify), here's the spec:

```typescript
// supabase/functions/asaas-webhook/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.106.0'
import * as Sentry from 'npm:@sentry/deno@9'
import { z } from 'npm:zod@3.25.76'

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN_EDGE')! })

const eventSchema = z.object({
  id: z.string(),               // event id — for idempotency
  event: z.string(),
  payment: z.object({
    id: z.string(),
    status: z.string(),
    value: z.number(),
    externalReference: z.string().optional(),
  }),
})

Deno.serve(async (req) => {
  try {
    // 1. Verify webhook token (header)
    const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN')!
    const got = req.headers.get('asaas-access-token') ?? ''
    if (!timingSafeEqual(expected, got)) {
      return new Response('forbidden', { status: 403 })  // Asaas DOES NOT retry on 4xx
    }

    // 2. Parse + validate payload
    const body = await req.json()
    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      Sentry.captureException(new Error('Invalid Asaas payload'), { extra: { body } })
      return new Response('bad payload', { status: 400 })  // No retry — payload won't change
    }

    const { id: eventId, event, payment } = parsed.data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 3. IDEMPOTENCY — refuse to process same event twice
    const { data: alreadyProcessed } = await supabase
      .from('asaas_webhook_log')
      .select('id')
      .eq('asaas_event_id', eventId)
      .maybeSingle()
    if (alreadyProcessed) return new Response(JSON.stringify({ skipped: 'duplicate' }), { status: 200 })

    // 4. VERIFY BACK — re-fetch payment from Asaas (SEC-08)
    const verifyRes = await fetch(`${Deno.env.get('ASAAS_API_URL')}/payments/${payment.id}`, {
      headers: { 'access_token': Deno.env.get('ASAAS_API_KEY')! },
    })
    if (!verifyRes.ok) {
      Sentry.captureException(new Error('Asaas verify failed'))
      return new Response('verify failed', { status: 500 })   // Asaas WILL retry on 5xx
    }
    const verified = await verifyRes.json()
    if (verified.status !== payment.status || verified.value !== payment.value) {
      Sentry.captureMessage('Asaas webhook payload mismatch', { extra: { payment, verified } })
      return new Response('mismatch', { status: 400 })
    }

    // 5. Idempotent grant — use payment.id as the row key, NOT now()
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const [userId, concursoId] = payment.externalReference!.split(':')
      const expiresAt = computeExpiry(verified.confirmedDate ?? verified.dateCreated)
      //                                ^^ deterministic from Asaas's timestamp, NOT Date.now()

      const { error: purchaseError } = await supabase
        .from('purchases')
        .upsert({
          asaas_payment_id: payment.id,
          user_id: userId,
          concurso_id: concursoId,
          amount_cents: Math.round(verified.value * 100),
          paid_at: verified.confirmedDate,
          status: 'paid',
        }, { onConflict: 'asaas_payment_id' })
      if (purchaseError) {
        Sentry.captureException(purchaseError)
        return new Response('db error', { status: 500 })  // Asaas WILL retry
      }

      const { error: accessError } = await supabase
        .from('user_concurso_access')
        .upsert({
          user_id: userId,
          concurso_id: concursoId,
          granted_at: verified.confirmedDate,
          expires_at: expiresAt,
        }, { onConflict: 'user_id,concurso_id' })
      if (accessError) {
        Sentry.captureException(accessError)
        return new Response('db error', { status: 500 })
      }
    }
    // PAYMENT_REFUNDED, PAYMENT_DELETED → revoke (similar pattern)

    // 6. Log the event for idempotency on next delivery
    await supabase.from('asaas_webhook_log').insert({
      asaas_event_id: eventId,
      event_type: event,
      payload: parsed.data,
    })

    return new Response(JSON.stringify({ processed: true }), { status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    return new Response('internal', { status: 500 })  // 5xx → Asaas retries
  }
})
```

### How this answers the 5 CRITICAL concerns

| Concern | Fix in this handler |
|---------|---------------------|
| SEC-05 — webhook silent failure | Sentry.init on edge fn + `captureException` on every error path; 5xx on DB errors → Asaas retries |
| SEC-07 — idempotency | `asaas_webhook_log` table keyed by `event.id`; `expires_at` deterministic from `verified.confirmedDate + 365d`, NOT `now() + 365d` |
| SEC-08 — verify back | `GET /payments/{id}` after token check; compare `status` + `value` |
| SEC-10 — refund_requests table | Created in migration on day 1 (see DATABASE.md) |
| DI-01 — XP race | XP awarding does NOT happen in the webhook; XP awards use atomic RPC (see §3) |

### Idempotency contract

Asaas uses **"at least once" delivery** — same webhook may arrive 2-5 times during a network blip. The handler MUST:

1. Process each `event.id` exactly once (via `asaas_webhook_log`)
2. Never double-extend `expires_at` (deterministic from `verified.confirmedDate`)
3. Never grant access twice (upsert with `onConflict`)
4. Return 200 only when the side effect is committed

### Webhook token

Asaas now (March 2026) enforces token complexity: 32-255 chars, no whitespace, no sequential digits, no 4 repeated letters. Generate via `openssl rand -hex 32`. Rotate annually.

**Sources:**
- [Asaas webhook overview](https://docs.asaas.com/docs/about-webhooks)
- [Asaas idempotency](https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks)
- [Asaas authentication](https://docs.asaas.com/docs/authentication-2)
- [Asaas PIX QR code](https://docs.asaas.com/docs/payments-via-pix-or-dynamic-qr-code)

### Do NOT use

- Any unofficial Asaas SDK from npm (none are maintained — checked 2026-05).
- Hardcoded `https://api.asaas.com/v3` without env override.
- Returning 200 on DB errors.
- `Date.now() + 365 * 24 * 3600 * 1000` for `expires_at` — produces drift on every redelivery.
- Trusting the webhook payload without re-fetching `/payments/{id}` (SEC-08).
- Caching webhook responses anywhere.

---

## 8. Testing — Vitest + RTL + MSW + Playwright

### Recommendation

| Tool | Pkg | Version | Use |
|------|-----|---------|-----|
| Unit/component | `vitest` | `^3.2.4` | Jest-compatible, much faster |
| React DOM | `@testing-library/react` | `^16.1.0` | RTL |
| DOM assertions | `@testing-library/jest-dom` | `^6.6.3` | matchers |
| User event sim | `@testing-library/user-event` | `^14.6.0` | typing/clicking |
| Browser-env | `jsdom` | `^25.0.1` | bump from legacy's 20 |
| Network mocks | `msw` | `^2.7.0` | Replace per-test Supabase mocking |
| Vite plugin | `@vitejs/plugin-react` | `^4.4.0` | OXC-based, faster than swc plugin |
| E2E | `@playwright/test` | `^1.60.0` | Already a dep (was misplaced in legacy) |

### Coverage targets (per PROJECT.md OPS-03)

- **≥50% on `src/lib/` core** (FSRS, queue builder/shuffler, validators, asaas-fetch, scoring)
- **≥30% global**
- **100% on:**
  - `src/lib/srs/` (FSRS-5 algorithm)
  - `src/lib/queue/` (round-robin shuffler — the "cards repeating" bug)
  - `src/lib/asaas/` (webhook, verify-back, idempotency check, retry policy)
  - `src/lib/access/` (paywall guards, CPF validator)
  - `supabase/functions/asaas-webhook/`

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/types/**', 'src/test/**'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
        // Per-file enforce on core
        perFile: false,
        'src/lib/srs/**': { lines: 90, functions: 90 },
        'src/lib/queue/**': { lines: 90, functions: 90 },
      },
    },
  },
})
```

### `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

### MSW server

```typescript
// src/test/msw/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// src/test/msw/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Asaas API
  http.post('https://api.asaas.com/v3/payments', () =>
    HttpResponse.json({ id: 'pay_test_123', status: 'PENDING', value: 297 })
  ),
  http.get('https://api.asaas.com/v3/payments/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, status: 'CONFIRMED', value: 297 })
  ),
  // Supabase REST stubs go here too — but prefer functional fixtures
]
```

### Playwright E2E — the OPS-10 happy path

```typescript
// e2e/critical-path.spec.ts
import { test, expect } from '@playwright/test'

test('signup → checkout → grant → first study session → simulado start', async ({ page }) => {
  // 1. Signup
  await page.goto('/signup')
  await page.fill('[name=email]', `e2e-${Date.now()}@example.com`)
  await page.fill('[name=password]', 'SecureTest!2026Pwd')
  await page.fill('[name=cpf]', '52998224725')   // valid test CPF
  await page.fill('[name=fullName]', 'Test User')
  await page.click('button[type=submit]')

  // 2. Onboarding completes...

  // 3. Checkout — PIX path (using Asaas sandbox)
  await page.goto('https://tjsp.flashcards.com.br/comprar')
  await page.click('text=Pagar com PIX')
  await expect(page.locator('img[alt*=QR]')).toBeVisible()

  // 4. Simulate webhook delivery (test-only endpoint)
  await fetch('/api/test/simulate-payment-confirmed', { method: 'POST', ... })

  // 5. First session
  await page.goto('https://tjsp.flashcards.com.br/estudar')
  await expect(page.locator('[data-card]')).toBeVisible()
  await page.click('text=Sabia')

  // 6. Start simulado
  await page.click('text=Simulado')
  await expect(page.locator('text=70 questões')).toBeVisible()
})
```

### Watch out for

- jsdom 25 has tighter ESM behavior than 20 — may need to adjust your import polyfills. Test early.
- MSW v2 has a different handler API from v1 — make sure team learns v2 patterns (use `http.get`, not `rest.get`).
- Playwright + Next.js dev server: use `webServer` in `playwright.config.ts` to start `next dev` automatically and `reuseExistingServer: true` locally.
- Don't share QueryClient across tests — instantiate fresh in `render()` setup.

**Sources:**
- [Vitest with Next.js 15](https://nextjs.org/docs/app/guides/testing/vitest)
- [MSW with Vitest](https://mswjs.io/docs/integrations/node/)
- [Playwright + Next.js](https://nextjs.org/docs/app/guides/testing/playwright)

### Do NOT use

- Jest. (Migration to Vitest already paid off in legacy; don't regress.)
- Inline Supabase mocking per-test (legacy's 40-line per-test pattern). Use MSW.
- Snapshot tests for UI. They rot fast and team won't maintain.
- E2E for unit-level logic. Playwright for journeys, Vitest for everything else.

---

## 9. Observability — Sentry + Pino

### Recommendation

| Tool | Pkg | Version | Where |
|------|-----|---------|-------|
| Sentry (Next.js) | `@sentry/nextjs` | `^10.53.0` | Frontend + Node routes + middleware |
| Sentry (edge fns) | `@sentry/deno` | `^9.0.0` (via npm:) | Supabase edge functions |
| Logging | `pino` | `^9.6.0` | Node routes only (NOT edge runtime) |
| Pretty dev | `pino-pretty` | `^11.3.0` | Dev only |

### Why Sentry

The legacy had **zero error tracking**, with a paid product and an Asaas webhook that returned 200 on every path. Per CONCERNS.md SEC-05 (CRITICAL): "When the webhook fails to grant access (DB down, wrong service-role key, payload schema change), the user already paid but you have no alert."

Sentry Team plan is ~$26/mo. The cost of one lost-payment customer-support escalation pays for it 10× over.

### Setup

```bash
pnpm dlx @sentry/wizard@latest -i nextjs
```

This generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and updates `next.config.ts` with `withSentryConfig`. Edit them to:

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  // Profiling on Node:
  profilesSampleRate: 0.1,
  integrations: [
    // Supabase integration auto-instruments Postgres queries
    Sentry.supabaseIntegration({ supabaseClient }),
  ],
})
```

### Critical alerting (set up day 1)

| Alert | Condition | Channel |
|-------|-----------|---------|
| **Asaas webhook 5xx** | `event.type:transaction transaction:POST /functions/v1/asaas-webhook status:5xx` count > 0 / 5min | Slack/Discord + email |
| **Webhook payload mismatch** | message contains "Asaas webhook payload mismatch" count > 0 | Slack/Discord |
| **Auth signup failures** | message contains "auth.signUp error" count > 5 / 10min | email |
| **Postgres connection errors** | `error.type:PostgrestError code:PGRST*` count > 3 / 5min | Slack/Discord + email |
| **TS error boundary triggered** | `error.boundary:ErrorBoundary` count > 5 / 5min | email |

### Sourcemap upload

Sentry's `withSentryConfig` wrapper handles sourcemap upload to Sentry automatically on `next build`. For Vercel:

1. Use the **Sentry Vercel integration** (sentry.io/integrations/vercel).
2. It injects `SENTRY_AUTH_TOKEN` automatically into Vercel env.
3. With Turbopack (Next 15.4+), sourcemap upload runs **after build** via `runAfterProductionCompile` — already default-true in `@sentry/nextjs@10.13+`.

### Pino — structured logging (Node only)

```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    env: process.env.VERCEL_ENV,
    service: 'flashcards-web',
  },
  redact: ['*.password', '*.token', 'req.headers.cookie', 'req.headers.authorization'],
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
})
```

**Use pino in:**
- Node-runtime route handlers (`app/api/**`)
- Server Actions
- Middleware (Node runtime since 15.5)
- Supabase Edge Functions? **NO** — pino's transports don't work in Deno. Use `console.log` with structured JSON + Sentry breadcrumbs in edge functions.

### Watch out for

- **Sentry Deno SDK supports Deno 2.** Supabase Edge runtime is at Deno 1.45.x as of 2026-05. Verify compatibility before relying on edge function Sentry in production — there's a known issue where errors don't always capture. If it doesn't capture, fall back to forwarding errors to a Resend webhook or Discord webhook from inside the catch block (cheap, reliable).
- Pino in middleware works in 15.5+ Node runtime but NOT in the legacy edge runtime — verify your `middleware.ts` runs Node.
- Don't log PII (CPF, email body) — use Pino `redact` paths.
- Sentry's "Auto-capture console errors" can be noisy — disable in production.

**Sources:**
- [Sentry Next.js source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)
- [Sentry Vercel integration](https://docs.sentry.io/organization/integrations/deployment/vercel/)
- [Sentry + Supabase observability](https://blog.sentry.io/nextjs-supabase-observability/)
- [Pino with Next.js 15](https://vercel.com/templates/next.js/pino-logging)

### Do NOT use

- `console.error` as the only logging strategy (legacy did exactly this — invisible failures).
- Bugsnag, Rollbar (Sentry has clearly won the Next.js ecosystem).
- LogRocket (overkill / expensive for v1).
- pino in middleware/edge runtime (transport breaks).

---

## 10. CI/CD — GitHub Actions + Vercel

### Recommendation

| Tool | Use |
|------|-----|
| GitHub Actions | Required checks: lint, typecheck, test, build, e2e (smoke only on PR; full on merge) |
| Vercel | Frontend + Node API routes; auto-preview per PR |
| Supabase CLI in CI | `db lint`, `db diff`, `gen types` validation |

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { run_install: false }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --coverage
      - uses: codecov/codecov-action@v4
        if: always()
        with: { token: ${{ secrets.CODECOV_TOKEN }} }

  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  supabase-lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase db lint
```

### Branch protection (GitHub Settings)

- `main` requires PR with review
- Required status checks: `lint`, `typecheck`, `test`, `build`, `supabase-lint`
- No direct pushes to main
- Linear history (no merge commits)

### Pre-commit hook (husky + lint-staged)

```bash
pnpm add -D husky@^9 lint-staged@^15
pnpm dlx husky init
```

`.husky/pre-commit`:
```bash
pnpm lint-staged
pnpm typecheck
```

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"],
    "supabase/migrations/*.sql": ["supabase db lint --file"]
  }
}
```

**Note:** `pnpm typecheck` (full `tsc --noEmit`) in pre-commit is slow on big projects but worth it. Alternative is `tsc --noEmit --incremental` + cached state — fast after first run.

### Watch out for

- husky v9 removed `husky install` — use `husky init` once.
- Don't put `prepare: "husky install"` in package.json if using `husky@^9` — instead `prepare: "husky"`.
- If `lint-staged` blocks too often, consider `simple-git-hooks` (lighter weight) — but husky is the safer choice for team standardization.

**Sources:**
- [GitHub Actions CI/CD for Next.js](https://dev.to/whoffagents/github-actions-cicd-for-nextjs-tests-type-checking-and-auto-deploy-1kp7)
- [Husky + lint-staged for Next.js](https://www.ducxinh.com/en/techblog/setting-up-husky-and-lint-staged-in-your-nextreact-project)

### Do NOT use

- Branch protection without required status checks (legacy: zero CI gates).
- Force pushes to main (block in branch protection).
- Commits without lint-staged (don't bypass with `--no-verify` unless emergency, then file an issue).
- Skipping CI on docs-only changes — easier to test once than enforce exceptions.

---

## 11. PWA — Serwist (NOT next-pwa)

### Recommendation

`@serwist/next@^9` + `serwist@^9` — the spiritual successor to the abandoned `next-pwa`, fully compatible with App Router and Workbox-based.

### Setup

```bash
pnpm add @serwist/next serwist
```

```typescript
// next.config.ts
import { withSerwistInit } from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  reloadOnOnline: true,
  cacheOnNavigation: true,
})

export default withSerwist({
  // your existing next config
})
```

```typescript
// src/sw.ts
import { defaultCache } from '@serwist/next/worker'
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

### Manifest

```typescript
// src/app/manifest.ts — Next 13.4+ native manifest API
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flashcards — Concursos',
    short_name: 'Flashcards',
    description: 'Preparações curadas para concursos públicos',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

### Caching strategy

For a study app, the right caching map is:

| Resource | Strategy |
|----------|----------|
| Static assets (`/_next/static/`) | Cache-first, long TTL |
| HTML pages | NetworkFirst, 5s timeout, fall back to cache |
| API calls (Supabase) | NetworkOnly (no cache — student data is too dynamic) |
| Concurso landing pages | StaleWhileRevalidate |
| Study session in progress | IndexedDB (NOT Service Worker) — write own WAL using Dexie or raw IDB |

**Critical:** **Do NOT** cache Asaas webhook responses or payment status polls. SW must explicitly skip these URLs.

### Watch out for

- Serwist is the maintained successor to `next-pwa` (last published 3+ years ago). next-pwa works with App Router only via community patches — Serwist is the right choice.
- The "Add to Home Screen" prompt UX is OS-specific and tricky. Don't ship the prompt in v1 — let users add manually. (Add prompt in v1.1 after UX testing.)
- Test PWA installation flow with `next build` + `next start`, NOT `next dev`.

**Sources:**
- [Serwist with Next.js](https://serwist.pages.dev/docs/next/getting-started)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)

### Do NOT use

- `next-pwa` (abandoned).
- Caching Supabase API responses in SW.
- Aggressive offline mode in v1 — study sessions are too session-specific. WAL belongs in IndexedDB inside the app, not the SW.

---

## 12. Dev Tools — pnpm, ESLint, Prettier (NOT Biome yet)

### pnpm — Package Manager

`pnpm@9.x`, pinned via `packageManager` field:

```json
{
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20.18.0 <23" }
}
```

Vercel auto-detects pnpm from this field. Disk usage ~50% less than npm, install ~2× faster, strict isolation (catches accidental hoist dependencies).

### ESLint + Prettier — NOT Biome (yet)

**Why not Biome:** Biome covers ~80% of common ESLint rules and is 20× faster, but is missing:
- `eslint-plugin-react-hooks` (catches `useEffect` deps bugs — non-negotiable for a React app)
- `eslint-plugin-next` (catches Next.js-specific issues like importing from `next/server` in client components)
- Custom rules / plugins ecosystem

For this project, ESLint v9 (flat config) + Prettier is the boring-correct choice. **Use Biome as a formatter only** if you want speed — but the ergonomic win is small.

### `eslint.config.mjs` (flat config)

```javascript
import js from '@eslint/js'
import tsEslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tsEslint.config(
  js.configs.recommended,
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',  // ERROR not warn
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'public/sw.js', 'coverage/'],
  },
)
```

Versions: `eslint@^9.18`, `typescript-eslint@^8.20`, `@next/eslint-plugin-next@^15.5`, `eslint-plugin-react-hooks@^5.1`.

### Prettier

`prettier@^3.4.2`, `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

`prettier-plugin-tailwindcss@^0.6` sorts Tailwind classes deterministically.

### Renovate / Dependabot

Use **Renovate** (GitHub App, more configurable than Dependabot) with this config:

```json
{
  "extends": ["config:recommended", ":semanticCommits", ":disableMajorUpdates"],
  "schedule": ["before 6am on monday"],
  "automerge": false,
  "rangeStrategy": "pin",
  "packageRules": [
    { "matchPackageNames": ["next"], "schedule": ["before 6am on first day of month"] },
    { "matchPackageNames": ["@supabase/*"], "schedule": ["before 6am on first day of month"] },
    { "matchPackageNames": ["typescript"], "schedule": ["before 6am on first day of month"] }
  ]
}
```

Group minor updates in one PR per week; reserve majors for manual review.

### Bundle analyzer

```bash
pnpm add -D @next/bundle-analyzer
```

```typescript
// next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })
export default bundleAnalyzer(config)
```

Run on every major dep upgrade (`ANALYZE=true pnpm build`). Aim for `<300KB` first-load JS on the marketing landing.

### Sources

- [pnpm vs npm in monorepos (2026)](https://www.pkgpulse.com/guides/npm-vs-yarn-vs-pnpm-2026)
- [Biome vs ESLint+Prettier (2026)](https://www.pkgpulse.com/blog/biome-vs-eslint-prettier-linting-2026)

### Do NOT use

- npm. (Slower, larger node_modules, no `packageManager` enforcement.)
- yarn. (Berry adds friction; Classic is unmaintained.)
- bun. (Promising but not battle-tested for Next.js+Vercel in mid-2026.)
- Biome to fully replace ESLint (yet) — wait for plugin parity.
- Dependabot for npm — Renovate is better for grouping and rules.
- Range versions (`^x.y.z`) in production lockfile — pin exact via `--save-exact` for critical deps (next, react, @supabase/*).

---

## 13. Animation + Charts — Motion v12 + Recharts v3

### Motion (Framer Motion) v12

```bash
pnpm add motion@^12.39.0
```

**Note:** `framer-motion` was renamed to `motion`. Import path changed:

```typescript
// OLD (legacy)
import { motion } from 'framer-motion'

// NEW
import { motion } from 'motion/react'
```

For RSC compatibility, motion components live in client components only. Create a single `MotionDiv` wrapper component if you'd like:

```typescript
// src/components/motion/index.tsx
'use client'
export { motion, AnimatePresence } from 'motion/react'
```

Then `import { motion } from '@/components/motion'` everywhere — keeps a single client boundary visible.

**Watch out for:**
- The legacy used Framer Motion in 40+ places. Reboot should be **deliberate** about animation. Stick to: page transitions, modal/dialog enter/exit, success states. Skip card-shuffle physics — pure CSS transitions are fine.
- Motion's `LayoutGroup` is powerful but expensive; use only where it earns its keep.

### Recharts v3

```bash
pnpm add recharts@^3.8.1
```

Recharts 3.x:
- Removed `recharts-scale` and `react-smooth` deps (smaller install)
- React 19 compat resolved
- Better TS types

**For the Statistics dashboard** (DASH-02): line charts (XP over time), bar charts (per-discipline accuracy), heatmap (study session calendar) all map well to Recharts primitives.

**Watch out for:**
- Recharts requires `'use client'`. Wrap each chart in a client component.
- Recharts is ~50KB gzipped. If you only need 2-3 charts, evaluate if a tiny lib like `nivo` parts or hand-rolled SVG would be lighter. For a full dashboard with 5+ chart types, Recharts is fine.
- The legacy used Recharts 2.15.4 in `src/components/stats/`. The migration to v3 is a `pnpm add recharts@^3` + minor import path updates.

**Sources:**
- [motion (Framer Motion)](https://motion.dev/docs/react)
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)

### Do NOT use

- `framer-motion` (the old package name). Use `motion`.
- Recharts in a Server Component without `'use client'`.
- `chart.js` / `react-chartjs-2` — heavier, less idiomatic for React than Recharts.
- Lottie. (Heavy, often abused, design system pressure to use everywhere.)

---

## 14. Multi-concurso Subdomain Routing

This isn't a "library" but it's a stack decision worth pinning explicitly.

### Pattern

| Hostname | Behavior |
|----------|----------|
| `flashcards.com.br` | Marketing landing — `app/(marketing)/page.tsx` |
| `app.flashcards.com.br` | Unified student hub (when student has 2+ preparations) — `app/(student)/hub/page.tsx` |
| `tjsp.flashcards.com.br` | TJSP-specific student dashboard — rewrite to `app/(student)/[concurso]/...` with `concurso=tjsp` |
| `<any>.flashcards.com.br` | Looked up in `admin_concursos` table; 404 if not found |
| `admin.flashcards.com.br` | Admin route group — `app/(admin)/page.tsx`, gated by `useAdmin` + role check |

### Middleware (Node runtime)

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'flashcards.com.br'

function extractSubdomain(host: string): string | null {
  // Strip port
  const hostname = host.split(':')[0]
  // localhost or IP — no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null
  // Vercel preview: <branch>-<project>-<team>.vercel.app
  if (hostname.endsWith('.vercel.app')) return null
  // Exact match — no subdomain
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return null

  // Extract
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null
  const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1))
  return sub
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const host = request.headers.get('host') ?? ''
  const subdomain = extractSubdomain(host)

  if (!subdomain) {
    // Root — marketing landing
    return response
  }
  if (subdomain === 'app') {
    // Unified hub
    const url = request.nextUrl.clone()
    url.pathname = `/_app${url.pathname}`
    return NextResponse.rewrite(url, { headers: response.headers })
  }
  if (subdomain === 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = `/_admin${url.pathname}`
    return NextResponse.rewrite(url, { headers: response.headers })
  }

  // Concurso subdomain — rewrite
  const url = request.nextUrl.clone()
  url.pathname = `/_concurso/${subdomain}${url.pathname}`
  return NextResponse.rewrite(url, { headers: response.headers })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
  runtime: 'nodejs',  // 15.5 stable Node middleware
}
```

### Vercel domain config

1. **Domains → Add wildcard:** `*.flashcards.com.br` (and `flashcards.com.br` separately).
2. **CRITICAL:** wildcard requires the **Nameservers** method, not A records. Set NS to Vercel's DNS.
3. Set `NEXT_PUBLIC_ROOT_DOMAIN=flashcards.com.br` and `NEXT_PUBLIC_APP_URL=https://flashcards.com.br` in env.

### Watch out for

- Local dev: subdomains don't resolve to `localhost` by default. Use `127.0.0.1 tjsp.localhost` entries in hosts file, or use `lvh.me` (`tjsp.lvh.me` resolves to 127.0.0.1).
- Cookie scope: Supabase session cookies need `.flashcards.com.br` scope to work across subdomains. `@supabase/ssr` handles this if you set `cookieOptions: { domain: '.flashcards.com.br' }` in the createServerClient call **in production only** (omit for localhost).
- Preview deploys on Vercel are `<branch>-<project>.vercel.app` — no wildcard support. Use a query param like `?_concurso=tjsp` as a fallback for preview testing.

**Sources:**
- [Subdomain routing in Next.js](https://medium.com/@sheharyarishfaq/subdomain-based-routing-in-next-js-a-complete-guide-for-multi-tenant-applications-1576244e799a)

### Do NOT use

- A subdomain → tenant resolution that hits the DB on every request without caching. Use Next's `unstable_cache` (renamed `cache` in 16) or in-memory LRU.
- Hardcoded subdomain list in code. Lookup must be DB-driven (per PROJECT.md MULTI-01).
- Path-based tenancy (`flashcards.com.br/tjsp`) — defeats the SEO long-tail goal of dedicated subdomains.

---

## 15. FSRS-5 Spaced Repetition

### Recommendation

`ts-fsrs@^4.x` — the actively maintained TypeScript reference implementation of FSRS-5, used by Anki forks and other SRS apps.

```bash
pnpm add ts-fsrs
```

**Or:** fork the algorithm into `src/lib/srs/` for full control + tests, using the published 19-weight model. The legacy already had `src/lib/srs.ts` with this approach but lacked tests — fix that.

### Why fork it

The reboot's #1 stated pain (Rafael, 2026-05-21) is "cards repetindo na mesma seção" — a queue builder bug, not the FSRS algorithm itself. But the test gap meant nobody could prove the FSRS code wasn't contributing. Fork + test exhaustively:

```typescript
// src/lib/srs/fsrs.ts — small, owned, ≥90% tested
export const FSRS_WEIGHTS_V5 = [
  0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477,
  // ... 19 weights, from FSRS-5 paper
] as const

export interface Card { stability: number; difficulty: number; due: Date; reps: number; lapses: number }
export type Rating = 1 | 2 | 3 | 4   // Again, Hard, Good, Easy

export function scheduleNext(card: Card, rating: Rating, now: Date): Card { /* ... */ }
```

Then:

```typescript
// src/lib/queue/build.ts — the round-robin shuffler that was buggy
export function buildStudyQueue(
  due: Array<{ cardId: string; disciplineId: string }>,
  options: { interleave: boolean; seed?: number },
): string[] { /* ... pure function, fully testable */ }
```

`buildStudyQueue` is the function that was buggy in the legacy. Make it **pure**, deterministic with a seed, and test 20 scenarios including edge cases (single discipline, empty queue, single card).

### Watch out for

- FSRS-5 weights changed slightly from FSRS-4 — use the v5 weights from the [open-spaced-repetition GitHub](https://github.com/open-spaced-repetition/ts-fsrs).
- The `request_retention` parameter affects scheduling aggressiveness — 0.9 is the standard default. Don't expose to users in v1.
- Card scheduling math drifts if dates aren't UTC. Always use `Date.UTC()` or normalize to ISO strings before storing.

**Sources:**
- [ts-fsrs npm package](https://www.npmjs.com/package/ts-fsrs)
- [ts-fsrs docs](https://open-spaced-repetition.github.io/ts-fsrs/)

### Do NOT use

- An older FSRS-4 implementation — v5 is the current SoTA.
- A hand-rolled "Anki SM-2" — explicitly inferior to FSRS-5 for this use case.
- Client-side-only scheduling without server reconciliation. Persist `srs_state` rows in Postgres with batched writes (one of the testable units).

---

## 16. Misc Critical Pieces

### CPF validation
`@brazilian-utils/brazilian-utils@^1.x` for CPF/CNPJ/CEP validation. Or hand-roll (it's ~30 lines). Either way: test on real and synthetic CPFs (legacy had `isValidCPF` in `src/lib/cpf.ts` — port and add unit tests).

### Email — Resend
`resend@^4.0` (official SDK). Replace the legacy's raw `fetch` to `api.resend.com/emails`. Cleaner error handling.

```bash
pnpm add resend
```

```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
await resend.emails.send({
  from: 'Flashcards <no-reply@auth.flashcards.com.br>',
  to: user.email,
  subject: 'Bem-vindo ao Flashcards',
  react: <WelcomeEmail name={user.name} />,
})
```

Switch the "from" name from legacy's `StudyOS <...>` to `Flashcards <...>` (cosmetic bug from INTEGRATIONS.md). Support email mailbox: `support@flashcards.com.br` (set up before launch — don't reuse Rafael's personal Gmail per INTEGRATIONS.md).

### Date handling
**No `date-fns`.** Use native `Intl.DateTimeFormat('pt-BR', ...)` and `Date` math. The legacy had `date-fns` installed as a zombie. If you need duration math, use `date-fns/formatDistance` only — install with `pnpm add date-fns@^4` and use selectively.

### Brazilian utilities
`@brazilian-utils/brazilian-utils` for CPF + CEP. For currency formatting, use `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

### Refund flow
Create `refund_requests` table (CONCERNS.md SEC-10 / PAY-04). Schema:
```sql
CREATE TABLE refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchases(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  asaas_refund_id text,
  notes text
);
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY refund_insert_owner ON refund_requests FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY refund_select_owner ON refund_requests FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
```

CDC art. 49 (7-day right to withdraw) is **not optional**. Implement before charging the first centavo.

### Atomic XP increment (DI-01 fix)
```sql
CREATE OR REPLACE FUNCTION award_xp(p_user_id uuid, p_amount int, p_source text)
RETURNS user_gamification AS $$
DECLARE
  result user_gamification;
BEGIN
  INSERT INTO user_gamification (user_id, total_xp, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_gamification.total_xp + p_amount,
        updated_at = now()
  RETURNING * INTO result;

  INSERT INTO xp_audit_log (user_id, amount, source, awarded_at)
  VALUES (p_user_id, p_amount, p_source, now());

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

Frontend:
```typescript
const { data, error } = await supabase.rpc('award_xp', {
  p_user_id: userId,
  p_amount: 50,
  p_source: 'session_complete',
})
```

**Atomic** — no read-modify-write race. Solves DI-01 CRITICAL.

---

## How This Stack Addresses the 5 CRITICAL Concerns

| Concern | Solution in this stack |
|---------|------------------------|
| **TD-05** — `question_attempts.content_item_id` mismatch + silent insert breakage | Greenfield schema — no `content_item_id` ghost column exists. Schema is `question_attempts(id, user_id, admin_questao_id, ...)` with `admin_questao_id` as the only FK. (See ARCHITECTURE.md for schema.) |
| **SEC-05** — No Sentry/monitoring on Asaas webhook | Sentry `@sentry/nextjs@10.53` on web; `@sentry/deno@9` on edge fn; structured `pino` logs on Node routes; webhook returns 5xx on DB errors (triggers Asaas retry); critical alerts wired day 1 (§9) |
| **DI-01** — `awardXp` non-atomic race | Postgres `award_xp` RPC (above) using `INSERT ... ON CONFLICT DO UPDATE SET total_xp = total_xp + p_amount`. No client-side read-modify-write. |
| **SEC-10** — `refund_requests` table doesn't exist + fake success UI | Table created in initial migration with RLS; form Server Action re-validates with Zod; error path returns to form (no `setSubmitted(true)` before `try` block per legacy). |
| **TEST-01** — 1 test in entire codebase | Vitest + RTL + MSW + Playwright (§8); ≥50% core coverage gate in CI; ≥30% global gate; pre-commit + CI both run tests; specific files (`srs/`, `queue/`, `asaas/`, `access/`, webhook) gated at 90%. |

---

## Stack-Level Health Summary

| Layer | Recommended Version | Confidence | Replaces in Legacy |
|-------|---------------------|------------|--------------------|
| Framework | Next.js 15.5.x | HIGH | Vite 5.4 SPA |
| Lang | TS strict 5.7.3 | HIGH | TS 5.8.3 with `strict: false` |
| Runtime | Node 20.18 LTS | HIGH | Unpinned Node 18+ |
| Pkg manager | pnpm 9.x | HIGH | npm |
| UI | Tailwind 3.4.17 + shadcn (v2.3 CLI) | HIGH | Tailwind 3.4.17 + shadcn (kept) |
| Animation | motion@12.39 | HIGH | framer-motion@12.34 |
| Charts | recharts@3.8 | MEDIUM | recharts@2.15 |
| Forms | rhf@7.76 + zod@3.25 (v3 path) | HIGH | rhf+zod installed, never wired |
| State | TanStack Query 5.100 | HIGH | TanStack Query 5.90 (kept) |
| Backend | Supabase Pro + `@supabase/ssr@0.10` | HIGH | Supabase free + auth-helpers (deprecated) |
| Payment | Asaas v3 raw fetch (new helper) | HIGH | Asaas v3 raw fetch (rewrite to fix SEC-05/-07/-08) |
| SRS | ts-fsrs OR forked + tested | MEDIUM | Hand-rolled `src/lib/srs.ts` (no tests) |
| Observability | @sentry/nextjs@10.53 + pino@9 | HIGH | None (console.* only) |
| Tests | Vitest 3.2 + RTL + MSW + Playwright | HIGH | Vitest 3.2 + 1 test file |
| Lint/format | ESLint 9 flat + Prettier 3 | HIGH | ESLint 9 flat (rules loose) |
| Pre-commit | husky 9 + lint-staged 15 | HIGH | None |
| CI | GitHub Actions (lint+typecheck+test+build+supabase-lint) | HIGH | None |
| Hosting | Vercel + Supabase Pro | HIGH | Vercel + Supabase free |
| PWA | Serwist 9 | MEDIUM | None |

**Bottom line:** The stack inherits the legacy's reasonable choices (Tailwind + shadcn + Radix + TanStack Query + Vitest + Vercel + Supabase + Asaas) and replaces what didn't work (Vite SPA → Next.js App Router, free tier → Pro, unsigned-off TS → strict, zero CI → enforced gates, zombie deps → real usage, console.log → Sentry+pino). Total new packages relative to legacy: ~7 net additions (Next, @supabase/ssr, Sentry, pino, Serwist, ts-fsrs, MSW). Total package removals from legacy zombies: 7 (xyflow, dagre, html-to-image, @types/dompurify stub, ffmpeg-static, playwright misplaced, date-fns zombie).

---

## Quick Reference — Exact Install Commands

```bash
# Core
pnpm add next@15.5.4 react@19 react-dom@19

# TypeScript
pnpm add -D typescript@5.7.3 @types/node@22 @types/react@19 @types/react-dom@19

# Supabase
pnpm add @supabase/ssr@0.10.3 @supabase/supabase-js@2.106.0
pnpm add -D supabase@2 # CLI

# UI
pnpm add -D tailwindcss@3.4.17 postcss@8.5.6 autoprefixer@10.4.21 tailwindcss-animate@1.0.7 @tailwindcss/typography@0.5.16 prettier-plugin-tailwindcss@0.6
pnpm dlx shadcn@2.3.0 init
pnpm add next-themes@0.4 class-variance-authority@0.7 clsx@2.1 tailwind-merge@2.6 lucide-react@0.460 sonner@1.7
pnpm add motion@12.39 recharts@3.8

# Forms + validation
pnpm add react-hook-form@7.76 @hookform/resolvers@5.2 zod@3.25.76

# State
pnpm add @tanstack/react-query@5.100.11
pnpm add -D @tanstack/react-query-devtools@5.100.11

# Email
pnpm add resend@4

# CPF/CNPJ
pnpm add @brazilian-utils/brazilian-utils@1

# SRS
pnpm add ts-fsrs@4

# Observability
pnpm add @sentry/nextjs@10.53 pino@9
pnpm add -D pino-pretty@11

# PWA
pnpm add @serwist/next@9 serwist@9

# Lint/format
pnpm add -D eslint@9.18 typescript-eslint@8.20 @next/eslint-plugin-next@15.5 eslint-plugin-react-hooks@5.1 eslint-plugin-react-refresh@0.4 prettier@3.4

# Testing
pnpm add -D vitest@3.2.4 @vitejs/plugin-react@4.4 @testing-library/react@16.1 @testing-library/jest-dom@6.6 @testing-library/user-event@14.6 jsdom@25 msw@2.7 vite-tsconfig-paths@5 @playwright/test@1.60
pnpm add -D @vitest/coverage-v8@3.2.4

# Pre-commit
pnpm add -D husky@9 lint-staged@15

# Bundle analyzer
pnpm add -D @next/bundle-analyzer@15.5
```

Pin the `packageManager` field:
```json
{
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20.18.0 <23" }
}
```

And `.nvmrc`:
```
20.18.0
```

---

## Sources

**Authoritative / HIGH confidence:**
- [Next.js 15.5 release notes](https://nextjs.org/blog/next-15-5)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [@supabase/ssr — Creating a SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Pricing — Pro plan](https://supabase.com/pricing)
- [Supabase HIBP password protection](https://supabase.com/docs/guides/auth/password-security)
- [Supabase pg_cron + pg_net cron quickstart](https://supabase.com/docs/guides/cron/quickstart)
- [Supabase Edge Function dependencies](https://supabase.com/docs/guides/functions/dependencies)
- [Asaas webhooks overview](https://docs.asaas.com/docs/about-webhooks)
- [Asaas idempotency](https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks)
- [Asaas authentication](https://docs.asaas.com/docs/authentication-2)
- [Asaas PIX QR codes](https://docs.asaas.com/docs/payments-via-pix-or-dynamic-qr-code)
- [shadcn/ui — Next.js install](https://ui.shadcn.com/docs/installation/next)
- [Tailwind v4 migration guide](https://tailwindcss.com/docs/upgrade-guide)
- [TypeScript: TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [TanStack Query — App Router prefetching](https://tanstack.com/query/v5/docs/framework/react/examples/nextjs-app-prefetching)
- [TanStack Query — Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)
- [Sentry + Supabase observability](https://blog.sentry.io/nextjs-supabase-observability/)
- [Vitest with Next.js](https://nextjs.org/docs/app/guides/testing/vitest)
- [MSW Node.js integration](https://mswjs.io/docs/integrations/node/)
- [Playwright + Next.js](https://nextjs.org/docs/app/guides/testing/playwright)
- [Serwist — getting started](https://serwist.pages.dev/docs/next/getting-started)
- [motion (Framer Motion)](https://motion.dev/docs/react)
- [Recharts 3.0 migration](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [Vercel pnpm support](https://vercel.com/changelog/improved-support-for-pnpm-corepack-and-monorepos)
- [Pino + Next.js Vercel template](https://vercel.com/templates/next.js/pino-logging)

**Secondary / MEDIUM confidence:**
- [Biome vs ESLint+Prettier (2026)](https://www.pkgpulse.com/blog/biome-vs-eslint-prettier-linting-2026)
- [pnpm vs npm in monorepos (2026)](https://dev.to/jtorchia/pnpm-vs-npm-vs-yarn-in-2026-i-ran-all-three-on-my-real-monorepo-and-it-forced-me-to-change-my-mind-9mc)
- [Husky + lint-staged for Next.js](https://www.ducxinh.com/en/techblog/setting-up-husky-and-lint-staged-in-your-nextreact-project)
- [Subdomain routing in Next.js multi-tenant](https://medium.com/@sheharyarishfaq/subdomain-based-routing-in-next-js-a-complete-guide-for-multi-tenant-applications-1576244e799a)
- [Zod v4 stable release](https://zod.dev/v4)

---

*STACK.md — 2026-05-21 — research feeding roadmap for `flashcards.com.br` reboot. Synthesis of CONCERNS.md (5 CRITICAL addressed in §3, §7, §9, §16), INTEGRATIONS.md (Asaas + Supabase + Resend preserved with hardening), and legacy STACK.md (zombie deps removed, weak points replaced).*
