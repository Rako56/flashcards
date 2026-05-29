'use server'

/**
 * Study Server Actions — rate a card, persist progress, log review.
 *
 * All side effects of a rating go through `rateCardAction`:
 *   1. Validate input + auth
 *   2. Check user has access to the card's concurso (RLS will also
 *      enforce, but explicit check returns a friendly error)
 *   3. Read current progress (or null if first-time review)
 *   4. Compute next state via scheduleNext (FSRS-5)
 *   5. UPSERT user_flashcard_progress
 *   6. INSERT into srs_reviews (append-only log)
 *
 * Returns the new progress + due_at so the client can update its
 * local state if needed (currently UI just shows the next card; this
 * data is for analytics tooltips later).
 */
import { z } from 'zod'

import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { awardXpAndStreak } from '@/lib/gamification/award-xp'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { scheduleNext } from '@/lib/srs/fsrs'
import type { CardState, Rating } from '@/lib/srs/types'
import { createClient } from '@/lib/supabase/server'

const RatingSchema = z.enum(['again', 'hard', 'good', 'easy'])
const RateCardInputSchema = z.object({
  cardId: z.string().uuid('cardId must be a UUID'),
  rating: RatingSchema,
  isSessionFinale: z.boolean().optional(),
})

export type RateCardResult = { ok: true; due_at: string } | { ok: false; error: string }

export async function rateCardAction(input: {
  cardId: string
  rating: Rating
  isSessionFinale?: boolean
}): Promise<RateCardResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'rateCard', cardId: input.cardId })

  const parsed = RateCardInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    log.warn('rateCard hit without auth')
    return { ok: false, error: 'Você precisa estar logado.' }
  }

  // Read current progress (may be null for first-time review)
  const { data: progressRow } = await supabase
    .from('user_flashcard_progress')
    .select('stability, difficulty, lapses, last_reviewed_at, due_at, status')
    .eq('user_id', user.id)
    .eq('flashcard_id', parsed.data.cardId)
    .maybeSingle()

  const now = new Date()
  const nextReview = scheduleNext(
    progressRow
      ? {
          stability: progressRow.stability ?? 0,
          difficulty: progressRow.difficulty ?? 0,
          lapses: progressRow.lapses,
          last_reviewed_at: progressRow.last_reviewed_at,
          due_at: progressRow.due_at,
          // Persisted FSRS state — without it, every review recomputed as
          // 'new', under-counting lapses and using the wrong scheduling branch.
          state: progressRow.status as CardState,
        }
      : null,
    parsed.data.rating,
    now,
  )

  // Upsert the new progress row
  const { error: upsertError } = await supabase.from('user_flashcard_progress').upsert(
    {
      user_id: user.id,
      flashcard_id: parsed.data.cardId,
      stability: nextReview.progress.stability,
      difficulty: nextReview.progress.difficulty,
      lapses: nextReview.progress.lapses,
      last_reviewed_at: now.toISOString(),
      due_at: nextReview.due_at,
      status: nextReview.log.state,
    },
    { onConflict: 'user_id,flashcard_id' },
  )

  if (upsertError) {
    captureWithCorrelation(upsertError, correlationId, { stage: 'upsert_progress' })
    log.error({ err: upsertError.message }, 'progress upsert failed')
    return { ok: false, error: 'Não foi possível salvar o progresso. Tente novamente.' }
  }

  // Append to srs_reviews log (immutable). Schema uses `flashcard_id`
  // and requires `card_source` ('admin' for editor-authored cards).
  const { error: logError } = await supabase.from('srs_reviews').insert({
    user_id: user.id,
    flashcard_id: parsed.data.cardId,
    rating: parsed.data.rating,
    card_source: 'admin',
  })

  if (logError) {
    captureWithCorrelation(logError, correlationId, { stage: 'srs_reviews_insert' })
    log.error({ err: logError.message }, 'srs_reviews insert failed (non-fatal)')
    // Don't fail the whole action — progress was saved, log is secondary
  }

  // Award XP + streak (best-effort — does NOT block the SRS write).
  // Concurso is read from headers; if missing (edge case), skip — the
  // FSRS write still succeeded so the user keeps their session going.
  const concurso = await getConcursoFromHeaders()
  if (concurso) {
    await awardXpAndStreak(supabase, {
      userId: user.id,
      concursoId: concurso.id,
      rating: parsed.data.rating,
      correlationId,
      now,
      isSessionFinale: parsed.data.isSessionFinale ?? false,
    })
  }

  log.info(
    {
      rating: parsed.data.rating,
      newDueAt: nextReview.due_at,
      scheduledDays: nextReview.log.scheduledDays,
    },
    'rateCard ok',
  )

  return { ok: true, due_at: nextReview.due_at }
}
