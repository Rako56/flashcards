'use server'

/**
 * Admin write actions for admin_questoes.
 * Same double-gate pattern as flashcards (auth + isAdmin).
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { isAdmin } from '@/lib/access/is-admin'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const STATUS_ENUM = ['active', 'archived', 'draft', 'review'] as const

const ToggleSchema = z.object({
  questionId: z.string().uuid('questionId must be a UUID'),
  nextStatus: z.enum(STATUS_ENUM),
})

export type ToggleQuestionResult = { ok: true } | { ok: false; error: string }

export async function toggleQuestionStatusAction(input: {
  questionId: string
  nextStatus: string
}): Promise<ToggleQuestionResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({
    correlationId,
    action: 'toggleQuestionStatus',
    questionId: input.questionId,
  })

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
    log.warn('non-admin attempted question status toggle')
    return { ok: false, error: 'Acesso negado.' }
  }

  const { error: updateError } = await supabase
    .from('admin_questoes')
    .update({ status: parsed.data.nextStatus })
    .eq('id', parsed.data.questionId)

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'admin_questoes.update' })
    log.error({ err: updateError.message }, 'update failed')
    return { ok: false, error: 'Não foi possível atualizar a questão.' }
  }

  log.info({ nextStatus: parsed.data.nextStatus }, 'question status updated')
  revalidatePath('/admin/questoes')
  return { ok: true }
}
