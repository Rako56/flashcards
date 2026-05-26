'use server'

/**
 * Profile editing — re-edit full_name + CPF after onboarding.
 *
 * Same validation as the onboarding action (`isValidCpf`,
 * full_name length). Difference: this one stays on /settings/profile
 * after save (no redirect) so the user can confirm the change.
 *
 * CPF is stored normalized (11 digits, no separators) so downstream
 * Asaas customer creation consumes it directly.
 */
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'
import { isValidCpf, normalizeCpf } from '@/lib/validation/cpf'

const FullNameSchema = z
  .string({ required_error: 'Informe seu nome completo.' })
  .trim()
  .min(3, 'Informe seu nome completo.')
  .max(120, 'Nome muito longo.')

const CpfSchema = z
  .string({ required_error: 'Informe seu CPF.' })
  .trim()
  .min(1, 'Informe seu CPF.')
  .refine((v) => isValidCpf(v), 'CPF inválido. Confira os dígitos.')

const ProfileSchema = z.object({
  full_name: FullNameSchema,
  cpf: CpfSchema,
})

export type ProfileResult =
  | { ok: true; message: string }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<Record<'full_name' | 'cpf', string>>
    }

export async function saveProfileAction(
  _prev: ProfileResult | null,
  formData: FormData,
): Promise<ProfileResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'saveProfile' })

  const parsed = ProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    cpf: formData.get('cpf'),
  })
  if (!parsed.success) {
    const fieldErrors: { full_name?: string; cpf?: string } = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'full_name' || field === 'cpf') {
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
    log.warn('saveProfile without auth')
    return { ok: false, error: 'Você precisa estar logado.' }
  }

  const cpfDigits = normalizeCpf(parsed.data.cpf)

  const { error: upsertError } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      full_name: parsed.data.full_name,
      cpf: cpfDigits,
    },
    { onConflict: 'user_id' },
  )

  if (upsertError) {
    captureWithCorrelation(upsertError, correlationId, { stage: 'user_profiles.upsert' })
    log.error({ err: upsertError.message }, 'user_profiles upsert failed')
    return {
      ok: false,
      error: 'Não foi possível salvar. Tente novamente em alguns minutos.',
    }
  }

  log.info({ userId: user.id }, 'profile updated')
  return { ok: true, message: 'Perfil atualizado.' }
}
