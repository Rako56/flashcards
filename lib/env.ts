/**
 * Zod-validated server environment.
 *
 * Imported by any module that needs typed access to `process.env`. Lazy
 * validation — first `env()` call parses and caches; later calls return the
 * cached object. Throws a descriptive error if any required variable is
 * missing or malformed.
 *
 * Phase 1: only NODE_ENV is effectively required; the Supabase/Asaas/Sentry
 * keys are optional placeholders (validated lazily, not required at boot).
 * Later plans (1.5, 1.7, 4.x) will tighten these to required.
 */
import { z } from 'zod'

const serverEnvSchema = z.object({
  // Supabase (Plan 1.5)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_PROJECT_ID: z.string().optional(),
  SUPABASE_ACCESS_TOKEN: z.string().optional(),

  // Sentry (Plan 1.7)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Domain
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('flashcards.com.br'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://flashcards.com.br'),

  // Logging (Plan 1.7)
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  // Asaas (Plan 4.x)
  ASAAS_API_URL: z.string().url().default('https://sandbox.asaas.com/api/v3'),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),

  // Resend (Plan 4.x)
  RESEND_API_KEY: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedEnv: ServerEnv | null = null

/**
 * Returns the validated server environment, throwing on first invalid access.
 *
 * Safe to call repeatedly — result is cached after the first successful parse.
 * To force re-validation in tests, call `resetEnvCacheForTests()`.
 */
export function env(): ServerEnv {
  if (cachedEnv) return cachedEnv
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    throw new Error(`Invalid environment variables:\n${JSON.stringify(fieldErrors, null, 2)}`)
  }
  cachedEnv = parsed.data
  return cachedEnv
}

/** Test-only — drops the cache so the next `env()` call re-validates. */
export function resetEnvCacheForTests(): void {
  cachedEnv = null
}
