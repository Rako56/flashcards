/**
 * Gamification: award XP + streak after a successful review.
 *
 * Side effects (idempotent within the same review):
 *   1. user_gamification.total_xp += delta (UPSERT, additive)
 *   2. weekly_scores (user_id, concurso_id, week_start) — increment
 *      points + reviews_count + maybe streak_days (UPSERT)
 *
 * XP table:
 *   - again → 1 (still made an attempt)
 *   - hard  → 3
 *   - good  → 5
 *   - easy  → 7
 *
 * Streak logic:
 *   - Compute "today" (UTC date string) for the user's reviews.
 *   - If user already reviewed today, no streak bump.
 *   - If last review was yesterday, streak += 1.
 *   - If older or first ever, streak = 1.
 *
 * Errors are LOGGED but DO NOT fail the parent action — gamification
 * is best-effort and must not block the SRS write path.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import type { Rating } from '@/lib/srs/types'
import type { Database } from '@/types/database.types'

const XP_BY_RATING: Readonly<Record<Rating, number>> = {
  again: 1,
  hard: 3,
  good: 5,
  easy: 7,
}

export interface AwardXpInput {
  userId: string
  concursoId: string
  rating: Rating
  correlationId: string
  now?: Date
  /**
   * When true, doubles the XP awarded for this review. Used by the
   * study session UI when the user finishes the last card of the queue
   * — small celebratory bonus that nudges users to complete sessions.
   * Streak math is untouched (still bumps once per day).
   */
  isSessionFinale?: boolean
}

export interface AwardXpResult {
  ok: boolean
  xpDelta: number
  newTotalXp?: number
  newStreak?: number
}

/**
 * Returns the ISO date (YYYY-MM-DD) for the Monday of the week
 * containing `d` in UTC. We anchor weeks to Monday because that's the
 * convention used by `weekly_scores.week_start` rows in production.
 */
export function weekStartUTC(d: Date): string {
  const day = d.getUTCDay() // 0 (Sun) … 6 (Sat)
  // Days since Monday: 0=Mon..6=Sun → 1=Mon..7=Sun map back to 0..6
  const daysSinceMon = day === 0 ? 6 : day - 1
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMon),
  )
  return monday.toISOString().slice(0, 10)
}

/**
 * Same-UTC-day comparison via ISO date prefix.
 */
function sameUTCDay(a: Date | string | null, b: Date): boolean {
  if (!a) return false
  const aDate = typeof a === 'string' ? new Date(a) : a
  return aDate.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

function isYesterdayUTC(a: Date | string | null, today: Date): boolean {
  if (!a) return false
  const aDate = typeof a === 'string' ? new Date(a) : a
  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  return aDate.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10)
}

export async function awardXpAndStreak(
  supabase: SupabaseClient<Database>,
  input: AwardXpInput,
): Promise<AwardXpResult> {
  const {
    userId,
    concursoId,
    rating,
    correlationId,
    now = new Date(),
    isSessionFinale = false,
  } = input
  const log = childLogger({ correlationId, action: 'awardXp', userId })
  const baseDelta = XP_BY_RATING[rating]
  // Last card of the session → 2x bonus (Sparkle feature parity).
  const xpDelta = isSessionFinale ? baseDelta * 2 : baseDelta

  try {
    // --- user_gamification (lifetime XP) ---
    const { data: gamRow } = await supabase
      .from('user_gamification')
      .select('total_xp')
      .eq('user_id', userId)
      .maybeSingle()

    const newTotalXp = (gamRow?.total_xp ?? 0) + xpDelta

    const { error: gamError } = await supabase.from('user_gamification').upsert(
      {
        user_id: userId,
        total_xp: newTotalXp,
      },
      { onConflict: 'user_id' },
    )
    if (gamError) {
      captureWithCorrelation(gamError, correlationId, { stage: 'user_gamification.upsert' })
      log.warn({ err: gamError.message }, 'user_gamification upsert failed — non-fatal')
    }

    // --- weekly_scores (current week, concurso-scoped) ---
    const week = weekStartUTC(now)
    const { data: wsRow } = await supabase
      .from('weekly_scores')
      .select('id, points, reviews_count, streak_days, updated_at')
      .eq('user_id', userId)
      .eq('concurso_id', concursoId)
      .eq('week_start', week)
      .maybeSingle()

    // Compute next streak based on the row's updated_at (last review timestamp).
    // We use updated_at because it auto-bumps on every UPSERT, so it reflects
    // the date of the user's previous review in this concurso this week.
    let nextStreak: number
    if (!wsRow) {
      // First review of the week
      nextStreak = 1
    } else if (sameUTCDay(wsRow.updated_at, now)) {
      // Already reviewed today — no streak bump, no double count
      nextStreak = wsRow.streak_days || 1
    } else if (isYesterdayUTC(wsRow.updated_at, now)) {
      nextStreak = (wsRow.streak_days || 0) + 1
    } else {
      // Gap — reset to 1
      nextStreak = 1
    }

    const newPoints = (wsRow?.points ?? 0) + xpDelta
    const newReviewsCount = (wsRow?.reviews_count ?? 0) + 1

    const { error: wsError } = await supabase.from('weekly_scores').upsert(
      {
        user_id: userId,
        concurso_id: concursoId,
        week_start: week,
        points: newPoints,
        reviews_count: newReviewsCount,
        streak_days: nextStreak,
      },
      { onConflict: 'user_id,concurso_id,week_start' },
    )
    if (wsError) {
      captureWithCorrelation(wsError, correlationId, { stage: 'weekly_scores.upsert' })
      log.warn({ err: wsError.message }, 'weekly_scores upsert failed — non-fatal')
      return { ok: false, xpDelta, newTotalXp }
    }

    log.info({ xpDelta, newTotalXp, newStreak: nextStreak }, 'awardXp ok')
    return { ok: true, xpDelta, newTotalXp, newStreak: nextStreak }
  } catch (err) {
    captureWithCorrelation(err, correlationId, { stage: 'awardXp.unhandled' })
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'awardXp threw')
    return { ok: false, xpDelta }
  }
}
