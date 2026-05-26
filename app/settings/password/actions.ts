'use server'

/**
 * Change-password Server Action.
 *
 * Supabase Auth doesn't expose a "verify current password" API directly,
 * so we re-authenticate via signInWithPassword with the user's current
 * email + the typed `current` password. If that succeeds, we call
 * `updateUser({ password: new })` which Supabase processes server-side.
 *
 * Both error modes return PT-BR messages:
 *   - current password wrong → "Senha atual incorreta."
 *   - new password too weak / vazada → friendly Supabase translation
 */
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const PasswordSchema = z
  .string({ required_error: 'Informe a senha.' })
  .min(10, 'A nova senha precisa ter pelo menos 10 caracteres.')

const ChangePasswordSchema = z
  .object({
    current: z.string().min(1, 'Informe sua senha atual.'),
    next: PasswordSchema,
    confirm: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((d) => d.next === d.confirm, {
    message: 'A confirmação não confere com a nova senha.',
    path: ['confirm'],
  })

export type ChangePasswordResult =
  | { ok: true; message: string }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<Record<'current' | 'next' | 'confirm', string>>
    }

export async function changePasswordAction(
  _prev: ChangePasswordResult | null,
  formData: FormData,
): Promise<ChangePasswordResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'changePassword' })

  const parsed = ChangePasswordSchema.safeParse({
    current: formData.get('current'),
    next: formData.get('next'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    const fieldErrors: { current?: string; next?: string; confirm?: string } = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'current' || field === 'next' || field === 'confirm') {
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

  if (authError || !user?.email) {
    log.warn('changePassword without auth or missing email')
    return { ok: false, error: 'Você precisa estar logado.' }
  }

  // Re-authenticate to verify current password. We don't need the
  // returned session — just confirmation it succeeds.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  })

  if (signInError) {
    log.info({ err: signInError.message }, 'current password wrong')
    return {
      ok: false,
      error: 'Senha atual incorreta.',
      fieldErrors: { current: 'Senha atual incorreta.' },
    }
  }

  // Update to the new password.
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
        error: 'Senha rejeitada — ela apareceu em incidentes públicos. Tente uma combinação única.',
        fieldErrors: { next: 'Senha vazada em incidentes públicos.' },
      }
    }
    return { ok: false, error: 'Não foi possível atualizar a senha. Tente novamente.' }
  }

  log.info({ userId: user.id }, 'password updated')
  return { ok: true, message: 'Senha atualizada com sucesso.' }
}
