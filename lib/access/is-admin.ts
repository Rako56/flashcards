/**
 * `isAdmin(userId)` — checks whether the user has the 'admin' role.
 *
 * Calls the SECURITY DEFINER `has_role(role, user_id)` function which
 * still works for `authenticated` callers after F-002 (it's in the
 * Tier-1 allowlist because RLS policies depend on it being callable
 * from the user's role context).
 *
 * Returns `false` on any error — admin pages downstream redirect to /
 * so this is fail-closed. BUT: every error path also captures to Sentry
 * (silent-fallback hardening, 2026-05-27). Without it, a broken
 * `has_role` RPC would lock everyone out of /admin without a single
 * observability signal — exactly the F-003/F-004 silent-failure trap.
 */
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false

  const correlationId = crypto.randomUUID()
  const log = childLogger({ helper: 'isAdmin', userId, correlationId })

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('has_role', {
      _role: 'admin',
      _user_id: userId,
    })
    if (error) {
      log.warn({ err: error.message }, 'has_role RPC failed — denying admin (fail-closed)')
      captureWithCorrelation(new Error(`has_role RPC failed: ${error.message}`), correlationId, {
        helper: 'isAdmin',
        userId,
        rpcErrorMessage: error.message,
      })
      return false
    }
    return data
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'unexpected error — denying admin (fail-closed)')
    captureWithCorrelation(err, correlationId, { helper: 'isAdmin', userId })
    return false
  }
}
