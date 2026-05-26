/**
 * Sentry helpers — correlation-aware capture.
 *
 * Most code should NOT call `Sentry.captureException` directly. Use
 * `captureWithCorrelation(err, correlationId)` from inside Route
 * Handlers + Server Actions, OR wrap the handler with
 * `withErrorTracking` from `./withErrorTracking.ts`.
 *
 * The correlationId tag lets us cross-reference Sentry events with
 * Pino structured logs that include the same id. Open a Sentry issue
 * → grep logs by correlationId → see exactly what happened around
 * the error.
 */
import * as Sentry from '@sentry/nextjs'

/**
 * Capture an exception with the request's correlationId attached as a
 * Sentry tag. Optionally accept extra context that will appear on the
 * Sentry issue page.
 *
 * Returns the Sentry event ID — useful if the caller wants to surface
 * it back to the user (e.g., "Error reference: ABC123" in a toast).
 */
export function captureWithCorrelation(
  error: unknown,
  correlationId: string,
  extra?: Record<string, unknown>,
): string {
  return Sentry.captureException(error, (scope) => {
    scope.setTag('correlationId', correlationId)
    if (extra) {
      scope.setContext('extra', extra)
    }
    return scope
  })
}

/**
 * Set persistent user context on the current Sentry scope. Call from
 * the auth middleware once the user is resolved so any subsequent
 * exception capture includes `userId` / `userEmail` automatically.
 *
 * IMPORTANT: never pass PII you don't want in Sentry forever. `userId`
 * is the internal Supabase auth.users.id (uuid — opaque). Email is
 * useful for support but increases LGPD surface; consider hashing.
 */
export function setSentryUser(user: { id: string; email?: string | undefined }): void {
  Sentry.setUser({
    id: user.id,
    ...(user.email ? { email: user.email } : {}),
  })
}

/**
 * Clear user context — call on logout so subsequent anonymous traffic
 * isn't attributed to the previous user.
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}
