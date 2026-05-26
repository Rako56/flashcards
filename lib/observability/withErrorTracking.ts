/**
 * `withErrorTracking` — wraps a Route Handler or Server Action so that
 * unhandled exceptions are captured by Sentry with the request's
 * correlationId attached as a tag, then re-thrown so Next.js can
 * respond with its standard 500.
 *
 * Usage in a Route Handler:
 *
 *   import { withErrorTracking } from '@/lib/observability/withErrorTracking'
 *
 *   export const POST = withErrorTracking(async (request) => {
 *     // ... your logic
 *     return Response.json({ ok: true })
 *   })
 *
 * Server Action equivalent:
 *
 *   'use server'
 *   import { withErrorTracking } from '@/lib/observability/withErrorTracking'
 *
 *   export const myAction = withErrorTracking(async (input) => {
 *     // input is the typed action arg, no request available
 *   }, { fallbackCorrelationId: 'server-action-myAction' })
 *
 * For Route Handlers we read `x-correlation-id` from the request. For
 * Server Actions there's no Request object, so the caller provides
 * a stable label (or a freshly minted UUID).
 */
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { getCorrelationId } from '@/lib/observability/correlation'
import { childLogger } from '@/lib/observability/logger'

interface WithErrorTrackingOptions {
  /**
   * Used for Server Action wrapping where no `Request` exists. If
   * omitted, a fresh UUID is generated. Provide a stable label like
   * `server-action-name` for grouping in Sentry.
   */
  fallbackCorrelationId?: string
}

/**
 * Wraps an async function so any thrown exception is captured to Sentry
 * with the correlationId tag, then re-thrown.
 *
 * For Route Handlers: the wrapped function's first argument should be a
 * `Request`. The correlationId is read from `x-correlation-id` header
 * (or freshly minted via crypto.randomUUID()).
 *
 * For Server Actions: pass `options.fallbackCorrelationId` (a stable
 * label like `server-action-myAction`) since no Request is available.
 *
 * The signature uses `unknown[]` to accept both shapes. Use as:
 *
 *   export const POST = withErrorTracking(async (request: Request) => { ... })
 *   export const myAction = withErrorTracking(async (input: T) => { ... },
 *     { fallbackCorrelationId: 'server-action-myAction' })
 */
export function withErrorTracking<TFn extends (...args: never[]) => Promise<unknown>>(
  handler: TFn,
  options?: WithErrorTrackingOptions,
): TFn {
  const wrapped = async (...args: unknown[]) => {
    // Route Handler: first arg is a Request — read correlationId from header.
    // Server Action: no Request — use fallback label or mint a UUID.
    const firstArg = args[0]
    const correlationId =
      firstArg instanceof Request
        ? getCorrelationId(firstArg)
        : (options?.fallbackCorrelationId ?? crypto.randomUUID())

    const log = childLogger({ correlationId, wrapper: 'withErrorTracking' })

    try {
      return await (handler as unknown as (...args: unknown[]) => Promise<unknown>)(...args)
    } catch (err) {
      const eventId = captureWithCorrelation(err, correlationId, {
        handlerArgsCount: args.length,
      })
      log.error(
        { err: (err as Error).message, sentryEventId: eventId },
        'handler threw — captured to Sentry',
      )
      throw err
    }
  }
  return wrapped as unknown as TFn
}
