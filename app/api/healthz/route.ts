/**
 * /api/healthz — liveness + dependency probe.
 *
 * Used by:
 *   - Vercel uptime monitoring (Plan 1.12 wires the monitor)
 *   - Playwright E2E smoke test (Plan 1.13)
 *   - Manual ops checks during incidents
 *
 * Shape (Zod-validated below; same shape as documented in
 * 01-11-PLAN.md must_haves):
 *
 *   200 {
 *     ok: true,
 *     checks: { supabase: 'ok' | 'fail', env: 'ok' | 'fail' },
 *     concurso_count: number,        // sanity-checks DB returns rows
 *     correlationId: string,         // UUID for cross-system tracing
 *     timestamp: string,             // ISO 8601
 *   }
 *
 *   500 { ok: false, checks: { ... 'fail' details }, error: string,
 *         correlationId, timestamp }
 *
 * The `?simulateError=true` query parameter forces a 500 path that
 * triggers a Sentry exception capture. Used by Plan 1.13's smoke
 * spec to prove the Sentry pipeline end-to-end. Without Sentry
 * wired (Plan 1.10 pending), the simulateError path returns 500
 * without capturing anything special — still useful for E2E status
 * code assertion.
 */
import { z } from 'zod'

// Route Handlers ARE server-only by Next.js construction (App Router
// routes do not bundle to the client). The lint rule's intent is to
// block client components from importing admin; this is a server file.
// eslint-disable-next-line no-restricted-imports
import { createAdminClient } from '@/lib/supabase/admin'
import { getCorrelationId, withCorrelationHeader } from '@/lib/observability/correlation'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HealthCheck = z.enum(['ok', 'fail'])
const HealthzOk = z.object({
  ok: z.literal(true),
  checks: z.object({
    supabase: HealthCheck,
    env: HealthCheck,
  }),
  concurso_count: z.number().int().nonnegative(),
  correlationId: z.string().uuid(),
  timestamp: z.string().datetime(),
})

const HealthzFail = z.object({
  ok: z.literal(false),
  checks: z.object({
    supabase: HealthCheck,
    env: HealthCheck,
  }),
  error: z.string(),
  correlationId: z.string().uuid(),
  timestamp: z.string().datetime(),
})

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)
  const log = childLogger({ correlationId, route: '/api/healthz' })
  const startedAt = Date.now()

  const url = new URL(request.url)
  if (url.searchParams.get('simulateError') === 'true') {
    log.warn('simulateError=true — capturing test exception to Sentry')
    // Send a real exception to Sentry with the correlationId tag so we
    // can verify the full pipeline (Sentry SDK init → capture → DSN →
    // dashboard) end-to-end after deploy. Plan 1.13 smoke test hits
    // this path and asserts Sentry received an event with the tag.
    const probeError = new Error('SENTRY_PROBE — intentional test exception from /api/healthz')
    captureWithCorrelation(probeError, correlationId, { path: '/api/healthz', probe: true })
    const body = HealthzFail.parse({
      ok: false,
      checks: { supabase: 'ok', env: 'ok' },
      error: 'SENTRY_PROBE',
      correlationId,
      timestamp: new Date().toISOString(),
    })
    return withCorrelationHeader(Response.json(body, { status: 500 }), correlationId)
  }

  // env check: lib/env.ts validates on first import. If the import
  // succeeded, env is good. We don't re-validate here to keep healthz
  // fast and avoid duplicate work.
  let envCheck: 'ok' | 'fail' = 'ok'
  try {
    // Defensive: ensure the two Supabase publics exist (Plan 1.6
    // wired them). They must be present for the admin client to work.
    if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      envCheck = 'fail'
    }
  } catch {
    envCheck = 'fail'
  }

  if (envCheck === 'fail') {
    const body = HealthzFail.parse({
      ok: false,
      checks: { supabase: 'fail', env: 'fail' },
      error: 'missing required env vars',
      correlationId,
      timestamp: new Date().toISOString(),
    })
    log.error('env check failed')
    return withCorrelationHeader(Response.json(body, { status: 500 }), correlationId)
  }

  // Supabase ping: count rows in admin_concursos to prove RLS doesn't
  // block service_role + DB is reachable + at least one row exists.
  let supabaseCheck: 'ok' | 'fail' = 'ok'
  let concursoCount = 0
  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('admin_concursos')
      .select('id', { count: 'exact', head: true })
    if (error) {
      log.error({ err: error.message }, 'supabase count failed')
      supabaseCheck = 'fail'
    } else {
      concursoCount = count ?? 0
    }
  } catch (err) {
    log.error({ err: (err as Error).message }, 'supabase client init failed')
    supabaseCheck = 'fail'
  }

  if (supabaseCheck === 'fail') {
    const body = HealthzFail.parse({
      ok: false,
      checks: { supabase: 'fail', env: 'ok' },
      error: 'supabase ping failed',
      correlationId,
      timestamp: new Date().toISOString(),
    })
    return withCorrelationHeader(Response.json(body, { status: 500 }), correlationId)
  }

  const body = HealthzOk.parse({
    ok: true,
    checks: { supabase: 'ok', env: 'ok' },
    concurso_count: concursoCount,
    correlationId,
    timestamp: new Date().toISOString(),
  })

  log.info({ durationMs: Date.now() - startedAt, concursoCount }, 'healthz ok')
  return withCorrelationHeader(Response.json(body), correlationId)
}
