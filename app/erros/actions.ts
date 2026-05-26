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
