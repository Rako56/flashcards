'use server'

/**
 * Reset-password: set the new password after clicking the recovery link.
 *
 * The recovery email lands on /auth/callback?type=recovery&... which
 * exchanges the token for a session and redirects here. So we expect
 * the user to ALREADY be authenticated (recovery session) when this
 * action runs. We call `supabase.auth.updateUser({ password })`.
 *
 * If the user lands here without a session (link expired, etc.) we
 * return a friendly error directing them to /esqueci-senha.
 */
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const PasswordSchema = z
  .string({ required_error: 'Informe a nova senha.' })
  .min(10, 'A senha precisa ter pelo menos 10 caracteres.')

const ResetSchema = z
  .object({
    next: PasswordSchema,
    confirm: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((d) => d.next === d.confirm, {
    message: 'A confirmação não confere.',
    path: ['confirm'],
  })

export type ResetPasswordResult =
  | { ok: true }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<Record<'next' | 'confirm', string>>
    }

export async function resetPasswordAction(
  _prev: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'resetPassword' })

  const parsed = ResetSchema.safeParse({
    next: formData.get('next'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    const fieldErrors: { next?: string; confirm?: string } = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'next' || field === 'confirm') {
        fieldErrors[field] = issue.message
      }
    }
    return { ok: false, error: 'Verifique os dados informados.', fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    log.warn('resetPassword without recovery session')
    return {
      ok: false,
      error:
        'Sessão de recuperação expirou ou link inválido. Solicite um novo link em "Esqueci minha senha".',
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.next,
  })

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'updateUser.password' })
    log.error({ err: updateError.message }, 'updateUser failed')
    const msg = updateError.message.toLowerCase()
    if (msg.includes('weak') || msg.includes('pwned') || msg.includes('compromised')) {
      return {
        ok: false,
        error: 'Senha rejeitada — ela apareceu em incidentes públicos.',
        fieldErrors: { next: 'Senha vazada.' },
      }
    }
    return { ok: false, error: 'Não foi possível atualizar a senha.' }
  }

  log.info({ userId: user.id }, 'password reset via recovery flow')
  redirect('/login?reset=1')
}
