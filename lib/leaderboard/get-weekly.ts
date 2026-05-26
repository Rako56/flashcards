/**
 * `getWeeklyLeaderboard(concursoId, weekStart?)` — calls the
 * SECURITY-DEFINER `get_weekly_leaderboard` RPC (Tier-1 anon-callable
 * after F-002 migration).
 *
 * Returns top 50 by points for the given week (default: current
 * UTC-anchored Monday). Drops PII — only the columns the RPC exposes.
 *
 * Best-effort: returns [] on any error so the page doesn't 500.
 */
import { createClient } from '@/lib/supabase/server'
import { weekStartUTC } from '@/lib/gamification/award-xp'

export interface LeaderboardRow {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  league: string | null
  points: number
  reviews_count: number
  streak_days: number
}

export async function getWeeklyLeaderboard(
  concursoId: string,
  weekStart?: string,
  limit = 50,
): Promise<LeaderboardRow[]> {
  if (!concursoId) return []

  const week = weekStart ?? weekStartUTC(new Date())

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
      p_concurso_id: concursoId,
      p_week_start: week,
      p_limit: limit,
    })
    if (error) return []
    return data
  } catch {
    return []
  }
}
