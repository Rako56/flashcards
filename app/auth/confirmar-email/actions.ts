'use server'

/**
 * Resend the email-verification message for an account that signed up
 * but never clicked the confirmation link.
 *
 * Supabase exposes `auth.resend({ type: 'signup', email })` which
 * triggers a new confirmation email if the address exists and is
 * still pending. Same anti-enumeration story as forgot-password —
 * we never reveal whether the email exists, always return success-shape.
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

export type ResendResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: { email?: string } }

export async function resendConfirmationAction(
  _prev: ResendResult | null,
  formData: FormData,
): Promise<ResendResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'resendConfirmation' })

  const parsed = EmailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      ok: false,
      error: first?.message ?? 'E-mail inválido.',
      fieldErrors: { email: first?.message ?? 'E-mail inválido.' },
    }
  }

  const headerStore = await headers()
  const host = headerStore.get('host') ?? 'flashcards.com.br'
  const proto = headerStore.get('x-forwarded-proto') ?? 'https'
  const emailRedirectTo = `${proto}://${host}/auth/callback`

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data,
    options: { emailRedirectTo },
  })

  if (error) {
    captureWithCorrelation(error, correlationId, { stage: 'auth.resend' })
    log.warn({ err: error.message }, 'resend failed — masking from client')
  } else {
    log.info('confirmation email resent')
  }

  // Anti-enumeration: same success shape regardless.
  return {
    ok: true,
    message:
      'Se este e-mail tiver um cadastro pendente de confirmação, reenviamos o link agora. Verifique sua caixa de entrada e também a pasta de spam.',
  }
}
