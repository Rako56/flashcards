'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/access/get-current-user'
import { isAdmin } from '@/lib/access/is-admin'
import { childLogger } from '@/lib/observability/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin-only triage action — updates `refund_requests.status` and
 * stamps `processed_at` + optional `admin_notes`.
 *
 * Double-gated: layout-level role check + explicit `isAdmin()` here.
 * The Server Action could be called directly by a non-admin via
 * crafted POST, so the explicit gate is required defence-in-depth.
 *
 * Allowed transitions:
 *   pending → approved
 *   pending → rejected
 *   approved → pending (rare: undo)
 *   rejected → pending (rare: undo)
 *
 * NOT a state machine yet — just enforces the canonical statuses.
 * The actual money movement (Asaas refund API) happens out-of-band
 * after status=approved; this action just records the decision.
 */

const InputSchema = z.object({
  refundId: z.string().uuid('refundId must be a UUID'),
  status: z.enum(['pending', 'approved', 'rejected']),
  adminNotes: z.string().trim().max(2000).optional(),
})

export type UpdateRefundResult = { ok: true } | { ok: false; error: string }

export async function updateRefundStatusAction(formData: FormData): Promise<UpdateRefundResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'updateRefundStatus' })

  const rawId = formData.get('refund_id')
  const rawStatus = formData.get('status')
  const rawNotes = formData.get('admin_notes')

  const parsed = InputSchema.safeParse({
    refundId: typeof rawId === 'string' ? rawId : '',
    status: typeof rawStatus === 'string' ? rawStatus : '',
    adminNotes: typeof rawNotes === 'string' ? rawNotes : undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida.' }
  }

  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }
  const admin = await isAdmin(user.id)
  if (!admin) return { ok: false, error: 'Acesso negado.' }

  const supabase = await createClient()
  const update: {
    status: string
    processed_at: string | null
    admin_notes?: string
  } = {
    status: parsed.data.status,
    processed_at: parsed.data.status === 'pending' ? null : new Date().toISOString(),
  }
  if (parsed.data.adminNotes !== undefined && parsed.data.adminNotes.length > 0) {
    update.admin_notes = parsed.data.adminNotes
  }

  const { error } = await supabase
    .from('refund_requests')
    .update(update)
    .eq('id', parsed.data.refundId)

  if (error) {
    log.error({ err: error.message, refundId: parsed.data.refundId }, 'refund update failed')
    return { ok: false, error: 'Não foi possível atualizar a solicitação.' }
  }

  log.info({ refundId: parsed.data.refundId, status: parsed.data.status }, 'refund status updated')
  revalidatePath('/admin/refunds')
  return { ok: true }
}
