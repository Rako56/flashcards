/**
 * `getTodayProgress(userId, concursoId)` — returns today's review count
 * + the user's daily goal (in cards, derived from minutes × default
 * cards-per-minute pace). Used by the home page widget.
 *
 * "Today" is UTC date — same convention as award-xp.ts streak math.
 * No multi-timezone support yet; users in PT-BR run close to UTC-3 so
 * "today" rolls over at 21:00 local-time (acceptable for v1).
 *
 * Daily goal is `daily_goal_minutes`. We convert to cards via a flat
 * heuristic of 2 cards/min (typical SRS pace including back-side read).
 *
 * Best-effort: returns zeros on any DB error. Never throws.
 */
import { createClient } from '@/lib/supabase/server'

export interface TodayProgress {
  reviewsToday: number
  goalCards: number
  goalMinutes: number
  /** Fraction 0..1 (capped at 1.0 — over-goal still shows full bar) */
  fraction: number
}

const CARDS_PER_MINUTE = 2

export async function getTodayProgress(
  userId: string,
  concursoId: string,
  now = new Date(),
): Promise<TodayProgress> {
  const empty: TodayProgress = {
    reviewsToday: 0,
    goalCards: 60,
    goalMinutes: 30,
    fraction: 0,
  }
  if (!userId || !concursoId) return empty

  try {
    const supabase = await createClient()

    // UTC midnight today
    const dayStart = new Date(now)
    dayStart.setUTCHours(0, 0, 0, 0)

    const [profileResult, reviewResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('daily_goal_minutes')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('srs_reviews')
        .select('id, admin_flashcards!inner(concurso_id, status)', { count: 'exact', head: false })
        .eq('user_id', userId)
        .gte('reviewed_at', dayStart.toISOString()),
    ])

    const goalMinutes = profileResult.data?.daily_goal_minutes ?? 30
    const goalCards = goalMinutes * CARDS_PER_MINUTE

    // Filter rows by concurso (we can't .eq on the joined relation
    // reliably without typegen FK, so post-filter)
    interface ReviewRow {
      admin_flashcards: { concurso_id: string | null; status: string } | null
    }
    const rows = (reviewResult.data as unknown as ReviewRow[] | null) ?? []
    const reviewsToday = rows.filter(
      (r) =>
        r.admin_flashcards?.concurso_id === concursoId && r.admin_flashcards.status === 'active',
    ).length

    const fraction = goalCards > 0 ? Math.min(1, reviewsToday / goalCards) : 0

    return { reviewsToday, goalCards, goalMinutes, fraction }
  } catch {
    return empty
  }
}
