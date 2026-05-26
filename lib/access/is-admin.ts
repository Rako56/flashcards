/**
 * `isAdmin(userId)` — checks whether the user has the 'admin' role.
 *
 * Calls the SECURITY DEFINER `has_role(role, user_id)` function which
 * still works for `authenticated` callers after F-002 (it's in the
 * Tier-1 allowlist because RLS policies depend on it being callable
 * from the user's role context).
 *
 * Returns `false` on any error — admin pages downstream will redirect
 * to / so this is fail-closed.
 */
import { createClient } from '@/lib/supabase/server'

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('has_role', {
      _role: 'admin',
      _user_id: userId,
    })
    if (error) return false
    return data
  } catch {
    return false
  }
}
