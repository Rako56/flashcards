/**
 * Sentry — client-side init (Client Components, browser-side errors).
 *
 * Same DSN as server init but with tag `runtime: client`. Captures
 * unhandled exceptions in the browser, network errors, navigation
 * problems, etc.
 *
 * The replay integration is OFF by default — it captures a recording
 * of the user's session leading up to an error, which is invaluable
 * but adds bandwidth + storage cost. Enable later when event budget
 * allows (Sentry free tier: 50 replays/month).
 *
 * Source maps for client bundles are uploaded by `withSentryConfig`
 * in next.config.ts.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

Sentry.init({
  dsn,
  enabled: Boolean(dsn),

  sampleRate: 1.0,
  tracesSampleRate: 0.1,

  environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env.NODE_ENV ?? 'unknown',
  release: process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'],

  // Client-side scrub. Mirrors logger.ts + sentry.server.config.ts redact list.
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
