/**
 * Tiny helper to read required environment variables for Supabase clients.
 *
 * The full `lib/env.ts` Zod schema validates the entire process.env at boot,
 * but the Supabase clients also benefit from a focused helper that throws a
 * descriptive error with the exact variable name. This avoids the lint-banned
 * non-null assertion (`process.env['X']!`) pattern while still being concise
 * at call sites.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
