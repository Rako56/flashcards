/**
 * `getSimuladoQuestions(questionIds)` — fetches the question content
 * for a simulado's stored question_ids in a single batch query.
 *
 * Returns questions in the SAME ORDER as the input ids so the runner
 * UI can iterate sequentially. Missing ids (archived/deleted questions)
 * are silently dropped — the UI shows whatever survives.
 */
import { createClient } from '@/lib/supabase/server'

export interface SimuladoQuestion {
  id: string
  enunciado: string
  alternativas: unknown
  gabarito: string | null
  explicacao: string | null
  disciplina_sugerida: string | null
  anulada: boolean
  dificuldade: string | null
}

export async function getSimuladoQuestions(questionIds: string[]): Promise<SimuladoQuestion[]> {
  if (questionIds.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_questoes')
    .select(
      'id, enunciado, alternativas, gabarito, explicacao, disciplina_sugerida, anulada, dificuldade',
    )
    .in('id', questionIds)

  if (error) return []

  // Preserve input order
  const byId = new Map<string, SimuladoQuestion>()
  for (const row of data) {
    byId.set(row.id, row)
  }
  const ordered: SimuladoQuestion[] = []
  for (const id of questionIds) {
    const q = byId.get(id)
    if (q) ordered.push(q)
  }
  return ordered
}
