/**
 * Sentry — edge runtime init (Middleware, edge Route Handlers).
 *
 * Vercel runs middleware.ts in V8 isolates with a limited Node API surface
 * (no fs, no Buffer, etc). The `@sentry/nextjs` edge build is compatible
 * with that environment. Same DSN, same redaction rules.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

Sentry.init({
  dsn,
  enabled: Boolean(dsn),

  sampleRate: 1.0,
  tracesSampleRate: 0.1,

  environment: process.env['VERCEL_ENV'] ?? process.env.NODE_ENV ?? 'unknown',
  release: process.env['VERCEL_GIT_COMMIT_SHA'],
})
