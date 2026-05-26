/**
 * `hasUserConcursoAccess(userId, concursoId)` — does this user have an
 * active access grant to this concurso right now?
 *
 * Active means a row in `user_concurso_access` where:
 *   - user_id = $1
 *   - concurso_id = $2
 *   - expires_at IS NULL OR expires_at > now()
 *
 * Returns `false` for invalid inputs (empty IDs). Throws on unexpected
 * Supabase errors so callers can surface a degraded UI.
 *
 * NOTE: this helper uses the standard (anon-authenticated) server
 * client and relies on RLS for security. Service-role admin checks
 * should use `createAdminClient()` directly with the service_role
 * server-only guard.
 */
import { createClient } from '@/lib/supabase/server'

export async function hasUserConcursoAccess(userId: string, concursoId: string): Promise<boolean> {
  if (!userId || !concursoId) return false

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_concurso_access')
    .select('user_id, concurso_id, expires_at')
    .eq('user_id', userId)
    .eq('concurso_id', concursoId)
    .maybeSingle()

  if (error) {
    throw new Error(`hasUserConcursoAccess failed: ${error.message}`)
  }
  if (!data) return false

  // Expired access → false (treat like no access)
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false

  return true
}
