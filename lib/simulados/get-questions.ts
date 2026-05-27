/**
 * `getSimuladoQuestions(questionIds)` — fetches the question content
 * for a simulado's stored question_ids in a single batch query.
 *
 * Returns questions in the SAME ORDER as the input ids so the runner
 * UI can iterate sequentially. Missing ids (archived/deleted questions)
 * are silently dropped — the UI shows whatever survives.
 *
 * Best-effort: returns [] on Supabase error so the runner page doesn't
 * 500. BUT: error paths capture to Sentry (silent-fallback hardening,
 * 2026-05-27). An empty array could mean "all questions archived"
 * (legitimate edge case) OR "RLS is broken" (bug) — without Sentry
 * those two states look identical.
 */
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
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

  const correlationId = crypto.randomUUID()
  const log = childLogger({
    helper: 'getSimuladoQuestions',
    questionCount: questionIds.length,
    correlationId,
  })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_questoes')
    .select(
      'id, enunciado, alternativas, gabarito, explicacao, disciplina_sugerida, anulada, dificuldade',
    )
    .in('id', questionIds)

  if (error) {
    log.warn({ err: error.message }, 'fetch failed — returning empty list')
    captureWithCorrelation(
      new Error(`getSimuladoQuestions fetch failed: ${error.message}`),
      correlationId,
      {
        helper: 'getSimuladoQuestions',
        questionCount: questionIds.length,
        dbErrorMessage: error.message,
      },
    )
    return []
  }

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
