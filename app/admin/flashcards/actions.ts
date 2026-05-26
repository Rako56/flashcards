'use server'

/**
 * Admin write actions for admin_flashcards.
 *
 * Gated by `has_role('admin')` check (same as the read pages). RLS
 * enforces server-side too — service_role is NOT used here; we update
 * via the user-scoped server client and let RLS allow/deny.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { isAdmin } from '@/lib/access/is-admin'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const STATUS_ENUM = ['active', 'archived', 'draft', 'review'] as const

const ToggleSchema = z.object({
  cardId: z.string().uuid('cardId must be a UUID'),
  nextStatus: z.enum(STATUS_ENUM),
})

export type ToggleCardResult = { ok: true } | { ok: false; error: string }

export async function toggleCardStatusAction(input: {
  cardId: string
  nextStatus: string
}): Promise<ToggleCardResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'toggleCardStatus', cardId: input.cardId })

  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Status inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão expirou.' }
  }

  const admin = await isAdmin(user.id)
  if (!admin) {
    log.warn('non-admin attempted card status toggle')
    return { ok: false, error: 'Acesso negado.' }
  }

  const { error: updateError } = await supabase
    .from('admin_flashcards')
    .update({ status: parsed.data.nextStatus })
    .eq('id', parsed.data.cardId)

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'admin_flashcards.update' })
    log.error({ err: updateError.message }, 'update failed')
    return { ok: false, error: 'Não foi possível atualizar o card.' }
  }

  log.info({ nextStatus: parsed.data.nextStatus }, 'card status updated')
  revalidatePath('/admin/flashcards')
  return { ok: true }
}
