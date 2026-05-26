/**
 * Next.js 15 Instrumentation hook.
 *
 * `register()` runs once per Next.js worker boot. It imports the
 * appropriate Sentry config file based on which runtime is starting
 * (Node.js server vs. edge V8 isolate). The client config is loaded
 * separately by Next via the `_app` / `layout` route — not here.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
import { captureRequestError } from '@sentry/nextjs'

export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Next.js 15 hook for capturing errors thrown in Route Handlers + Server
// Actions automatically. Sentry SDK v10 exports `captureRequestError` as
// the canonical name; re-export with Next's expected name `onRequestError`.
export const onRequestError = captureRequestError
