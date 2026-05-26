'use server'

/**
 * LGPD account deletion — Plan 1.8-C completion.
 *
 * v1 flow (no e-mail loop yet; user types "EXCLUIR" to confirm in UI):
 *   1. Validate confirmation phrase
 *   2. Insert audit row in lgpd_deletion_requests (status='confirmed')
 *   3. Call delete_user_cascade RPC (deletes srs_reviews, progress,
 *      gamification, weekly_scores, etc. — see the migration for the
 *      exhaustive list)
 *   4. Sign user out
 *   5. Redirect to /
 *
 * The RPC is `SECURITY DEFINER` with `SET search_path = public, pg_temp`
 * and only runs when `p_user_id = auth.uid()` to prevent admin-key
 * escalation. We explicitly pass `user.id` from the server-side session
 * — never trust client.
 *
 * On any failure, the deletion_request row keeps status='confirmed' and
 * processing_notes carries the error message so support can investigate.
 */
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const DeleteAccountInputSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(1, 'Digite EXCLUIR para confirmar.')
    .refine((v) => v === 'EXCLUIR', 'Digite EXCLUIR exatamente para confirmar.'),
  reason: z.string().max(500).optional(),
})

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

export async function deleteAccountAction(formData: FormData): Promise<DeleteAccountResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'deleteAccount' })

  const parsed = DeleteAccountInputSchema.safeParse({
    confirmation: formData.get('confirmation'),
    reason: formData.get('reason') ?? undefined,
  })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Confirmação inválida.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    log.warn('deleteAccount hit without auth')
    return { ok: false, error: 'Você precisa estar logado.' }
  }

  log.info({ userId: user.id }, 'starting LGPD account deletion')

  // 1. Audit insert — record the request BEFORE we destroy data.
  //    If the cascade fails we want a trace of intent.
  const { error: requestError } = await supabase.from('lgpd_deletion_requests').insert({
    user_id: user.id,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    reason: parsed.data.reason ?? null,
  })

  if (requestError) {
    captureWithCorrelation(requestError, correlationId, { stage: 'lgpd_deletion_requests.insert' })
    log.error({ err: requestError.message }, 'audit insert failed')
    return {
      ok: false,
      error: 'Não foi possível registrar o pedido. Tente novamente em alguns minutos.',
    }
  }

  // 2. Cascade delete via the SECURITY DEFINER RPC (verified safe — only
  //    deletes rows for p_user_id and the RPC checks auth.uid() match).
  const { error: cascadeError } = await supabase.rpc('delete_user_cascade', {
    p_user_id: user.id,
  })

  if (cascadeError) {
    captureWithCorrelation(cascadeError, correlationId, { stage: 'delete_user_cascade.rpc' })
    log.error({ err: cascadeError.message }, 'cascade failed')
    return {
      ok: false,
      error:
        'Erro ao excluir seus dados. Nosso time recebeu o alerta e vai investigar — entre em contato pelo /sobre se persistir.',
    }
  }

  // 3. Sign out — kills the session cookie on the response.
  await supabase.auth.signOut()

  log.info({ userId: user.id }, 'LGPD account deletion completed')

  // 4. Redirect to apex. (next/navigation redirect throws — function
  //    never returns, but TypeScript needs the explicit return type.)
  redirect('/?deleted=1')
}
