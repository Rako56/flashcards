/**
 * Pino structured logger — base instance.
 *
 * Why pino: tiny overhead (~50ns/log), JSON output Vercel/Datadog/Sentry
 * grok natively, and `child()` for per-request scoped loggers without
 * allocating new transports.
 *
 * Use `logger` directly for top-level / boot-time messages. For request
 * handlers, prefer `logger.child({ correlationId })` so every line in
 * that request's logs carries the same id (greppable, joinable with
 * Sentry breadcrumbs).
 *
 * Redaction list: anything sensitive must be filtered before it hits
 * the structured payload. New fields added here as we discover them.
 * Future: pino-pretty stays out of production deps; we run it via
 * `pnpm logs:pretty` in dev only.
 *
 * Level: respects LOG_LEVEL env (validated by `lib/env.ts` Zod schema,
 * default 'info'). In tests, vitest setup overrides to 'silent' so
 * logs don't pollute test output.
 */
import { pino, type Logger } from 'pino'

const logLevel =
  process.env['LOG_LEVEL'] ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

export const logger: Logger = pino({
  level: logLevel,
  // Pino's redact uses property paths. Keep the list explicit; broad
  // wildcards (`*.password`) catch nested copies during deep merges.
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
      'service_role_key',
      '*.service_role_key',
      'apiKey',
      '*.apiKey',
      'secret',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  // ISO timestamps are easier to grep than Unix epoch in production logs.
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    // Pino default emits `level: 30` (numeric). Vercel/Datadog parse
    // string levels more reliably for free-form filtering.
    level(label) {
      return { level: label }
    },
  },
})

/**
 * Create a child logger scoped to a request. Every log line emitted via
 * the returned logger automatically includes the correlationId.
 *
 * Use from Route Handlers and Server Actions:
 *
 *   const log = childLogger({ correlationId: getCorrelationId(request) })
 *   log.info({ userId }, 'queue rebuild start')
 */
export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings)
}
