'use server'

/**
 * Onboarding Server Action — save full_name + CPF after signup.
 *
 * Writes to user_profiles (UPSERT on user_id). The row is created if
 * missing. Other fields keep their defaults (daily_goal_minutes,
 * default_new_per_day, etc.).
 *
 * CPF is validated server-side via lib/validation/cpf.ts. We store the
 * digits-only string (no separators) so downstream consumers like Asaas
 * customer creation can use it without normalization.
 *
 * Returns a typed result; the form re-renders with the error on failure.
 * On success, redirects to /.
 */
import { redirect } from 'next/navigation'
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

const OnboardingSchema = z.object({
  full_name: FullNameSchema,
  cpf: CpfSchema,
})

export type OnboardingResult =
  | { ok: true }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<Record<'full_name' | 'cpf', string>>
    }

export async function saveOnboardingAction(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'saveOnboarding' })

  const parsed = OnboardingSchema.safeParse({
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
    log.warn('onboarding hit without auth')
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

  log.info({ userId: user.id }, 'onboarding saved')
  redirect('/')
}
