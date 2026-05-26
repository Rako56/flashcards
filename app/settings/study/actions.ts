'use server'

/**
 * Study preferences — daily goal + session defaults.
 *
 * Lets the user tune their /study session shape via user_profiles
 * columns (daily_goal_minutes, default_session_size,
 * default_new_per_day). Defaults match the DB column defaults so
 * the form pre-fills with sensible values when row is missing.
 */
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({
  daily_goal_minutes: z
    .number()
    .int()
    .min(5, 'Mínimo 5 minutos.')
    .max(240, 'Máximo 4 horas (240 min).'),
  default_session_size: z.number().int().min(5, 'Mínimo 5 cards.').max(100, 'Máximo 100 cards.'),
  default_new_per_day: z.number().int().min(0, 'Mínimo 0.').max(50, 'Máximo 50.'),
})

export type StudyPreferencesResult =
  | { ok: true; message: string }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<
        Record<'daily_goal_minutes' | 'default_session_size' | 'default_new_per_day', string>
      >
    }

export async function saveStudyPreferencesAction(
  _prev: StudyPreferencesResult | null,
  formData: FormData,
): Promise<StudyPreferencesResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'saveStudyPreferences' })

  const parsed = Schema.safeParse({
    daily_goal_minutes: Number(formData.get('daily_goal_minutes')),
    default_session_size: Number(formData.get('default_session_size')),
    default_new_per_day: Number(formData.get('default_new_per_day')),
  })
  if (!parsed.success) {
    const fieldErrors: NonNullable<Extract<StudyPreferencesResult, { ok: false }>['fieldErrors']> =
      {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (
        field === 'daily_goal_minutes' ||
        field === 'default_session_size' ||
        field === 'default_new_per_day'
      ) {
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
    return { ok: false, error: 'Você precisa estar logado.' }
  }

  const { error: upsertError } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      daily_goal_minutes: parsed.data.daily_goal_minutes,
      default_session_size: parsed.data.default_session_size,
      default_new_per_day: parsed.data.default_new_per_day,
    },
    { onConflict: 'user_id' },
  )

  if (upsertError) {
    captureWithCorrelation(upsertError, correlationId, { stage: 'user_profiles.upsert' })
    log.error({ err: upsertError.message }, 'study prefs upsert failed')
    return { ok: false, error: 'Não foi possível salvar. Tente novamente.' }
  }

  log.info({ userId: user.id }, 'study preferences saved')
  return { ok: true, message: 'Preferências atualizadas.' }
}
