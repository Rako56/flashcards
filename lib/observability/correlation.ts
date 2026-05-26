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
 * TODO Plan 1.10: middleware.ts should also inject this header on
 *   the incoming `request.headers` so downstream Server Components
 *   can read it via `headers()`. Currently each Route Handler must
 *   call `getCorrelationId(request)` itself.
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
