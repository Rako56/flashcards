'use server'

import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

/**
 * Self-serve refund request submission.
 *
 * Inserts into `refund_requests` table (created in earlier migration).
 * Admins triage via `/admin/users` (Phase 8 Plan 8.x — counts per user
 * are already visible).
 *
 * Auth:
 *  - If user is logged in, we attach `user_id` from session and
 *    pre-fill email (validated against form input — mismatched email
 *    is allowed, the requester might be reaching out from a different
 *    address than the cadastro).
 *  - If anonymous, we accept just email + motivo (CDC art. 49 doesn't
 *    require account on the requester side — they may have already
 *    asked us to delete their account first).
 *
 * Returns a discriminated union so the form can render inline
 * success/error without throwing into the framework.
 */

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  concursoSlug: z.string().trim().max(80).optional(),
  cpfDigits: z.string().trim().max(11).regex(/^\d*$/, 'CPF aceita só dígitos.').optional(),
  motivo: z
    .string()
    .trim()
    .min(20, 'Conta um pouco mais — pelo menos 20 caracteres.')
    .max(2000, 'No máximo 2000 caracteres.'),
})

export type SubmitRefundResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export async function submitRefundRequestAction(
  _prevState: SubmitRefundResult | null,
  formData: FormData,
): Promise<SubmitRefundResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'submitRefundRequest' })

  const raw = {
    email: stringField(formData, 'email'),
    concursoSlug: stringField(formData, 'concurso_slug') || undefined,
    cpfDigits: stringField(formData, 'cpf_digits').replace(/\D/g, '') || undefined,
    motivo: stringField(formData, 'motivo'),
  }

  const parsed = InputSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? '')
      if (k) fieldErrors[k] = issue.message
    }
    return {
      ok: false,
      error: 'Verifique os campos destacados.',
      fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Build insert payload — conditional spread guards against
  // exactOptionalPropertyTypes for nullable optional columns.
  const payload = {
    email: parsed.data.email,
    motivo: parsed.data.motivo,
    status: 'pending',
    ...(parsed.data.concursoSlug ? { concurso_slug: parsed.data.concursoSlug } : {}),
    ...(parsed.data.cpfDigits ? { cpf_digits: parsed.data.cpfDigits } : {}),
    ...(user?.id ? { user_id: user.id } : {}),
  }

  const { data: inserted, error: insertError } = await supabase
    .from('refund_requests')
    .insert(payload)
    .select('id')
    .single()

  if (insertError) {
    captureWithCorrelation(insertError, correlationId, {
      stage: 'refund_requests.insert',
    })
    log.error({ err: insertError.message }, 'refund request insert failed')
    return {
      ok: false,
      error: 'Não foi possível registrar sua solicitação. Tente novamente em alguns minutos.',
    }
  }

  log.info({ refundId: inserted.id }, 'refund request submitted')
  return { ok: true, id: inserted.id }
}

function stringField(formData: FormData, key: string): string {
  const raw = formData.get(key)
  return typeof raw === 'string' ? raw : ''
}
