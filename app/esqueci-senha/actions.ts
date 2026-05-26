'use server'

/**
 * Forgot-password: request a reset email.
 *
 * Supabase Auth sends an email with a recovery link that lands on
 * /auth/callback?type=recovery&token_hash=... The callback route
 * exchanges that for a session; the user then lands on
 * /redefinir-senha where they set the new password via
 * `supabase.auth.updateUser({ password })`.
 *
 * We DON'T leak whether the email exists or not — always return
 * success-shape (anti-enumeration). The actual send (or no-op for
 * unknown emails) happens server-side at Supabase.
 */
import { headers } from 'next/headers'
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const EmailSchema = z
  .string({ required_error: 'Informe o e-mail.' })
  .trim()
  .min(1, 'Informe o e-mail.')
  .email('E-mail inválido.')

export type ForgotPasswordResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: { email?: string } }

export async function requestPasswordResetAction(
  _prev: ForgotPasswordResult | null,
  formData: FormData,
): Promise<ForgotPasswordResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'requestPasswordReset' })

  const parsed = EmailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      ok: false,
      error: first?.message ?? 'E-mail inválido.',
      fieldErrors: { email: first?.message ?? 'E-mail inválido.' },
    }
  }

  // The reset link comes back to /auth/callback?type=recovery; we
  // resolve the origin from the current request headers so the email
  // links to the SAME concurso subdomain the user used to request.
  const headerStore = await headers()
  const host = headerStore.get('host') ?? 'flashcards.com.br'
  const proto = headerStore.get('x-forwarded-proto') ?? 'https'
  const redirectTo = `${proto}://${host}/redefinir-senha`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo,
  })

  if (error) {
    // Don't leak the failure type to the client — return generic OK.
    // Internal Sentry capture so we still see anomalies.
    captureWithCorrelation(error, correlationId, { stage: 'resetPasswordForEmail' })
    log.warn({ err: error.message }, 'resetPasswordForEmail failed — masking from client')
  } else {
    log.info('resetPasswordForEmail dispatched')
  }

  // Anti-enumeration: ALWAYS return success-shape with the same message
  // whether the email exists or not.
  return {
    ok: true,
    message:
      'Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha nos próximos minutos. Verifique também a pasta de spam.',
  }
}
