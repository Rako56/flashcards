/**
 * Sentry — server-side init (Server Components, Server Actions, Route Handlers, edge functions running in Node).
 *
 * Captures unhandled exceptions + manually-reported events. Uses the same
 * DSN as client init but tagged `runtime: server` for filtering in the
 * dashboard.
 *
 * Source maps are uploaded by the build pipeline (Plan 1.10 + Vercel
 * integration via `withSentryConfig` in next.config.ts) so stack traces
 * resolve to original TypeScript instead of minified bundle output.
 *
 * Redaction: the `beforeSend` hook scrubs any field whose key matches
 * the same redact list as `lib/observability/logger.ts`. Sentry stores
 * events permanently, so leak of secrets here = leak forever. The hook
 * walks the event payload + breadcrumbs + extra data.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

Sentry.init({
  dsn,
  // Skip init entirely when DSN is absent (local dev without Sentry).
  // Avoids noisy "Sentry not initialized" warnings.
  enabled: Boolean(dsn),

  // 100% of errors. Lower this if event volume exceeds free tier (5k/mo).
  sampleRate: 1.0,

  // Performance monitoring tracing — start at 10% sample. Tune up if we
  // need more data, down if event budget tightens.
  tracesSampleRate: 0.1,

  // `production` filters out dev events; `preview` lets us see preview
  // deploy errors before they hit production.
  environment: process.env['VERCEL_ENV'] ?? process.env.NODE_ENV ?? 'unknown',

  // Release tracking — Vercel exposes the commit SHA via VERCEL_GIT_COMMIT_SHA.
  // Sentry links errors to releases for "this release introduced N new bugs"
  // dashboards.
  release: process.env['VERCEL_GIT_COMMIT_SHA'],

  // Redaction list — must mirror lib/observability/logger.ts. New
  // sensitive fields go in BOTH places.
  beforeSend(event) {
    return redactSensitive(event)
  },
  beforeBreadcrumb(breadcrumb) {
    return redactSensitive(breadcrumb) as Sentry.Breadcrumb | null
  },
})

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'cookie',
  'service_role_key',
  'apikey',
  'api_key',
  'secret',
])

function redactSensitive<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload
  const cloned: Record<string, unknown> = { ...(payload as Record<string, unknown>) }
  for (const key of Object.keys(cloned)) {
    const lower = key.toLowerCase()
    if (SENSITIVE_KEYS.has(lower) || [...SENSITIVE_KEYS].some((s) => lower.includes(s))) {
      cloned[key] = '[REDACTED]'
    } else if (cloned[key] && typeof cloned[key] === 'object') {
      cloned[key] = redactSensitive(cloned[key])
    }
  }
  return cloned as T
}
