'use server'

/**
 * Admin write actions for admin_concursos.
 *
 * Same double-gate pattern as flashcards/questoes (auth + isAdmin).
 * Concurso status drives whether the subdomain landing renders the
 * paywall vs a "concurso encerrado" notice — so toggles here have
 * end-user visible impact.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { isAdmin } from '@/lib/access/is-admin'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const STATUS_ENUM = ['active', 'archived', 'draft'] as const

const ToggleSchema = z.object({
  concursoId: z.string().uuid('concursoId must be a UUID'),
  nextStatus: z.enum(STATUS_ENUM),
})

export type ToggleConcursoResult = { ok: true } | { ok: false; error: string }

export async function toggleConcursoStatusAction(input: {
  concursoId: string
  nextStatus: string
}): Promise<ToggleConcursoResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({
    correlationId,
    action: 'toggleConcursoStatus',
    concursoId: input.concursoId,
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
    log.warn('non-admin attempted concurso status toggle')
    return { ok: false, error: 'Acesso negado.' }
  }

  const { error: updateError } = await supabase
    .from('admin_concursos')
    .update({ status: parsed.data.nextStatus })
    .eq('id', parsed.data.concursoId)

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'admin_concursos.update' })
    log.error({ err: updateError.message }, 'update failed')
    return { ok: false, error: 'Não foi possível atualizar o concurso.' }
  }

  log.info({ nextStatus: parsed.data.nextStatus }, 'concurso status updated')
  revalidatePath('/admin/concursos')
  return { ok: true }
}
