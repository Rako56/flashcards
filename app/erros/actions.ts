'use server'

/**
 * Caderno write actions.
 *
 * `markMistakeReviewedAction` — user-initiated "I got it now" signal.
 * Inserts a `srs_reviews` row with rating='good' for this card so the
 * 90-day window query no longer counts it as a recent mistake (the
 * caderno listing filters by `rating='again'` only).
 *
 * Does NOT modify user_flashcard_progress — that's owned by the SRS
 * scheduler and only updated via /study. This just clears the mistake
 * notebook view.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const InputSchema = z.object({
  cardId: z.string().uuid('cardId must be a UUID'),
})

export type MarkMasteredResult = { ok: true } | { ok: false; error: string }

export async function markMistakeReviewedAction(input: {
  cardId: string
}): Promise<MarkMasteredResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'markMistakeReviewed', cardId: input.cardId })

  const parsed = InputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão expirou.' }
  }

  // Insert a "good" rating to mark the card as no longer a recent mistake.
  // card_source='admin' matches the rateCard action shape — required NOT NULL.
  const { error: insertError } = await supabase.from('srs_reviews').insert({
    user_id: user.id,
    flashcard_id: parsed.data.cardId,
    rating: 'good',
    card_source: 'admin',
  })

  if (insertError) {
    captureWithCorrelation(insertError, correlationId, { stage: 'srs_reviews.insert' })
    log.error({ err: insertError.message }, 'mark-mastered insert failed')
    return { ok: false, error: 'Não foi possível marcar como dominado.' }
  }

  log.info('mistake marked as reviewed')
  revalidatePath('/erros')
  return { ok: true }
}

const BatchInputSchema = z.object({
  cardIds: z.array(z.string().uuid('each cardId must be a UUID')).min(1).max(200),
})

export type MarkAllMasteredResult = { ok: true; count: number } | { ok: false; error: string }

/**
 * Batch version of `markMistakeReviewedAction` — inserts one
 * `srs_reviews` row per card so the entire visible mistake list
 * clears in a single round-trip. Cap at 200 to bound the payload.
 */
export async function markAllMistakesReviewedAction(input: {
  cardIds: string[]
}): Promise<MarkAllMasteredResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({
    correlationId,
    action: 'markAllMistakesReviewed',
    count: input.cardIds.length,
  })

  const parsed = BatchInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão expirou.' }
  }

  // Build the insert payload — one row per card, all rated 'good'.
  const rows = parsed.data.cardIds.map((cardId) => ({
    user_id: user.id,
    flashcard_id: cardId,
    rating: 'good' as const,
    card_source: 'admin' as const,
  }))

  const { error: insertError } = await supabase.from('srs_reviews').insert(rows)

  if (insertError) {
    captureWithCorrelation(insertError, correlationId, { stage: 'srs_reviews.batch_insert' })
    log.error({ err: insertError.message }, 'batch mark-mastered insert failed')
    return { ok: false, error: 'Não foi possível marcar os erros como dominados.' }
  }

  log.info({ count: rows.length }, 'batch mistake mark-reviewed completed')
  revalidatePath('/erros')
  return { ok: true, count: rows.length }
}
