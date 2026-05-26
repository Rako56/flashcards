/**
 * `getUserStats(userId, concursoId?)` — returns the user's XP + current
 * weekly streak for header display.
 *
 * Reads:
 *   - user_gamification.total_xp (lifetime)
 *   - weekly_scores.streak_days for the current UTC week + concurso
 *
 * Returns nulls if rows don't exist — the header just renders nothing
 * rather than crashing. Best-effort read: never throws to caller.
 */
import { createClient } from '@/lib/supabase/server'

import { weekStartUTC } from './award-xp'

export interface UserStats {
  totalXp: number
  weekStreak: number
}

export async function getUserStats(
  userId: string,
  concursoId: string | null = null,
): Promise<UserStats> {
  if (!userId) return { totalXp: 0, weekStreak: 0 }

  try {
    const supabase = await createClient()

    const { data: gamRow } = await supabase
      .from('user_gamification')
      .select('total_xp')
      .eq('user_id', userId)
      .maybeSingle()

    let weekStreak = 0
    if (concursoId) {
      const week = weekStartUTC(new Date())
      const { data: wsRow } = await supabase
        .from('weekly_scores')
        .select('streak_days')
        .eq('user_id', userId)
        .eq('concurso_id', concursoId)
        .eq('week_start', week)
        .maybeSingle()
      weekStreak = wsRow?.streak_days ?? 0
    }

    return {
      totalXp: gamRow?.total_xp ?? 0,
      weekStreak,
    }
  } catch {
    return { totalXp: 0, weekStreak: 0 }
  }
}
