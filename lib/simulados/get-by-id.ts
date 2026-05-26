/**
 * `getSimuladoById(id, userId)` — fetches a single simulado for the
 * detail page. RLS enforces ownership; we pass user_id explicitly as
 * a defence-in-depth check too.
 *
 * Returns null if not found or owned by someone else (RLS will hide).
 */
import { createClient } from '@/lib/supabase/server'

export interface SimuladoDetail {
  id: string
  title: string
  description: string | null
  status: string
  total_questions: number
  total_answered: number | null
  total_correct: number | null
  time_limit_minutes: number | null
  time_spent_seconds: number | null
  question_ids: string[]
  results_json: unknown
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export async function getSimuladoById(id: string, userId: string): Promise<SimuladoDetail | null> {
  if (!id || !userId) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulados')
    .select(
      'id, title, description, status, total_questions, total_answered, total_correct, time_limit_minutes, time_spent_seconds, question_ids, results_json, started_at, finished_at, created_at, updated_at',
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data
}
