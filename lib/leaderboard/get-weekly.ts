/**
 * `getWeeklyLeaderboard(concursoId, weekStart?)` — calls the
 * SECURITY-DEFINER `get_weekly_leaderboard` RPC (Tier-1 anon-callable
 * after F-002 migration).
 *
 * Returns top 50 by points for the given week (default: current
 * UTC-anchored Monday). Drops PII — only the columns the RPC exposes.
 *
 * Best-effort: returns [] on any error so the page doesn't 500. BUT:
 * every error path also captures to Sentry (silent-fallback hardening,
 * 2026-05-27). An empty leaderboard could mean "no participants this
 * week" (legitimate) OR "RPC is broken" (bug); without Sentry capture
 * those two states are indistinguishable in observability.
 */
import { weekStartUTC } from '@/lib/gamification/award-xp'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

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
  const correlationId = crypto.randomUUID()
  const log = childLogger({
    helper: 'getWeeklyLeaderboard',
    concursoId,
    week,
    correlationId,
  })

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
      p_concurso_id: concursoId,
      p_week_start: week,
      p_limit: limit,
    })
    if (error) {
      log.warn({ err: error.message }, 'rpc failed — returning empty leaderboard')
      captureWithCorrelation(
        new Error(`get_weekly_leaderboard RPC failed: ${error.message}`),
        correlationId,
        {
          helper: 'getWeeklyLeaderboard',
          concursoId,
          week,
          rpcErrorMessage: error.message,
        },
      )
      return []
    }
    return data
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'unexpected error — returning empty leaderboard')
    captureWithCorrelation(err, correlationId, {
      helper: 'getWeeklyLeaderboard',
      concursoId,
      week,
    })
    return []
  }
}
