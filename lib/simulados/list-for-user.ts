/**
 * `listSimuladosForUser(userId, limit?)` — returns the user's most
 * recent simulados regardless of concurso.
 *
 * Why no concurso filter:
 *   The `simulados` table doesn't carry a `concurso_id` column —
 *   scoping happens via `goal_id -> goals.exam_context (jsonb)`.
 *   Filtering through that JSON path is brittle and v1 ships with a
 *   single concurso (TJSP Escrevente), so listing everything is
 *   equivalent for now. When we go multi-concurso for real, this
 *   helper takes a `concursoId` and joins `goals` properly.
 *
 * Returns a stable shape: each row has the fields the listing page
 * needs (title, status, score, dates). No PII other than what the
 * user authored themselves.
 */
import { createClient } from '@/lib/supabase/server'

export interface SimuladoSummary {
  id: string
  title: string
  description: string | null
  status: string
  total_questions: number
  total_answered: number | null
  total_correct: number | null
  time_spent_seconds: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export async function listSimuladosForUser(
  userId: string,
  options: { limit?: number } = {},
): Promise<SimuladoSummary[]> {
  const { limit = 50 } = options
  if (!userId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulados')
    .select(
      'id, title, description, status, total_questions, total_answered, total_correct, time_spent_seconds, started_at, finished_at, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`listSimuladosForUser failed: ${error.message}`)
  }

  // data is typed as SimuladoSummary[] but Supabase can hand back null
  // when the row set is empty; coerce defensively to keep the contract.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return data ?? []
}
