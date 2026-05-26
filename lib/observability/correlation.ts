/**
 * Correlation ID helper.
 *
 * Every request gets a UUIDv4. If the upstream caller supplies
 * `x-correlation-id`, we trust it (lets external monitoring tools
 * trace a request end-to-end across services). Otherwise, we mint one.
 *
 * The id is propagated:
 *   - in logs via `childLogger({ correlationId })`
 *   - in Sentry events as a tag (Plan 1.10 wireup)
 *   - in response headers (`x-correlation-id`) so clients can include
 *     it in support tickets / bug reports
 *
 * Since middleware.ts now injects this on `request.headers`, downstream
 * Server Components / Route Handlers should prefer reading the header
 * via `headers().get('x-correlation-id')` instead of re-computing.
 * `getCorrelationId(request)` remains the canonical entry point for
 * code that doesn't go through middleware (e.g. /api/healthz which
 * uses the matcher-excluded path style, or external workers).
 */

const HEADER_NAME = 'x-correlation-id'

/**
 * Reads or generates a correlation ID for a request.
 *
 * Trust the inbound header if it's a syntactically valid UUID
 * (loose check — full RFC 4122 conformance not enforced; collision
 * risk on bad input is acceptable for a tracing tag).
 */
export function getCorrelationId(request: Request): string {
  const inbound = request.headers.get(HEADER_NAME)
  if (inbound && isLikelyUuid(inbound)) {
    return inbound
  }
  return crypto.randomUUID()
}

/**
 * Reads the middleware-injected correlationId from a ReadonlyHeaders
 * (the return of `headers()` from `next/headers`). Returns `null` if
 * the header is missing — caller decides whether to fall back to a
 * fresh `crypto.randomUUID()` or surface the gap.
 */
export function readCorrelationIdFromHeaders(headersAccess: {
  get(name: string): string | null
}): string | null {
  const value = headersAccess.get(HEADER_NAME)
  if (value && isLikelyUuid(value)) {
    return value
  }
  return null
}

/**
 * Adds the correlationId to a Response's headers. Use with `new
 * Response(...)` or `Response.json(...)` when returning from a Route
 * Handler so clients can record/replay.
 */
export function withCorrelationHeader<T extends Response>(response: T, correlationId: string): T {
  response.headers.set(HEADER_NAME, correlationId)
  return response
}

function isLikelyUuid(value: string): boolean {
  // 8-4-4-4-12 hex pattern. Permissive: accepts any version.
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
}

export { HEADER_NAME as CORRELATION_HEADER_NAME }
