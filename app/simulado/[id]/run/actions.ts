'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/access/get-current-user'
import { logger } from '@/lib/observability/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Server Action for the simulado runner.
 *
 * Two responsibilities:
 *  1. `startSimuladoAction(simuladoId)` — flips `status` to 'in_progress'
 *     and stamps `started_at` if not yet started. Idempotent — calling
 *     twice doesn't re-stamp.
 *  2. `submitSimuladoAction(simuladoId, answers, elapsedSeconds)` —
 *     scores the answers against `admin_questoes.gabarito`, persists
 *     the breakdown to `results_json`, and flips status to 'completed'.
 *
 * Both actions enforce ownership (RLS does the heavy lifting; we
 * double-check here so we can return a clear error rather than a
 * silent row-not-found).
 *
 * Answer format: `Record<questionId, letterAtoE>` — e.g.
 *   { "q1": "A", "q2": "B" }
 * Questions the user skipped simply aren't in the map. The runner
 * UI client-side decides whether to disallow submission with unanswered
 * questions or to score skipped as wrong.
 */

export type SimuladoAnswers = Record<string, string>

export interface SubmitResult {
  ok: boolean
  totalAnswered: number
  totalCorrect: number
  totalQuestions: number
  redirectTo: string
}

export async function startSimuladoAction(simuladoId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false }
  }

  const supabase = await createClient()

  // Only flip if currently pending; don't reset started_at if user
  // refreshed mid-session.
  const { data: existing } = await supabase
    .from('simulados')
    .select('status, started_at')
    .eq('id', simuladoId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) return { ok: false }
  if (existing.status !== 'pending') return { ok: true }

  const { error } = await supabase
    .from('simulados')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', simuladoId)
    .eq('user_id', user.id)

  if (error) {
    logger.error({ event: 'simulado_start_failed', simuladoId, err: error.message })
    return { ok: false }
  }

  revalidatePath(`/simulado/${simuladoId}`)
  revalidatePath(`/simulado/${simuladoId}/run`)
  return { ok: true }
}

export async function submitSimuladoAction(
  simuladoId: string,
  answers: SimuladoAnswers,
  elapsedSeconds: number,
): Promise<SubmitResult> {
  const failed: SubmitResult = {
    ok: false,
    totalAnswered: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    redirectTo: `/simulado/${simuladoId}`,
  }

  const user = await getCurrentUser()
  if (!user) return failed

  const supabase = await createClient()

  // 1. Load the simulado (ownership + question_ids needed for scoring)
  const { data: simulado, error: loadErr } = await supabase
    .from('simulados')
    .select('id, status, question_ids, total_questions')
    .eq('id', simuladoId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (loadErr || !simulado) return failed

  // Refuse to re-submit a completed simulado (idempotency guard).
  if (simulado.status === 'completed') {
    return { ...failed, redirectTo: `/simulado/${simuladoId}` }
  }

  // 2. Load the gabarito map for scoring
  const { data: questions, error: qErr } = await supabase
    .from('admin_questoes')
    .select('id, gabarito, anulada')
    .in('id', simulado.question_ids)

  if (qErr) return failed

  const gabaritoById = new Map<string, { gabarito: string | null; anulada: boolean }>()
  for (const q of questions) {
    gabaritoById.set(q.id, { gabarito: q.gabarito, anulada: q.anulada })
  }

  // 3. Score: count answered + correct. Anuladas count as correct
  //    if user answered them (defensible interpretation — banks usually
  //    award the point to anyone who answered an anulada).
  let totalAnswered = 0
  let totalCorrect = 0
  const breakdown: Record<string, { answer: string; correct: boolean; gabarito: string | null }> =
    {}

  for (const qid of simulado.question_ids) {
    const userAnswer = answers[qid]
    if (!userAnswer) continue
    totalAnswered += 1

    const expected = gabaritoById.get(qid)
    let isCorrect = false
    if (expected) {
      if (expected.anulada) {
        isCorrect = true
      } else if (expected.gabarito) {
        isCorrect = userAnswer.trim().toUpperCase() === expected.gabarito.trim().toUpperCase()
      }
    }

    if (isCorrect) totalCorrect += 1
    breakdown[qid] = {
      answer: userAnswer,
      correct: isCorrect,
      gabarito: expected?.gabarito ?? null,
    }
  }

  // 4. Persist
  const { error: updateErr } = await supabase
    .from('simulados')
    .update({
      status: 'completed',
      total_answered: totalAnswered,
      total_correct: totalCorrect,
      time_spent_seconds: Math.max(0, Math.floor(elapsedSeconds)),
      finished_at: new Date().toISOString(),
      results_json: { breakdown, submittedAt: new Date().toISOString() },
    })
    .eq('id', simuladoId)
    .eq('user_id', user.id)

  if (updateErr) {
    logger.error({ event: 'simulado_submit_failed', simuladoId, err: updateErr.message })
    return failed
  }

  revalidatePath(`/simulado/${simuladoId}`)
  revalidatePath(`/simulado/${simuladoId}/run`)
  revalidatePath('/simulado')

  return {
    ok: true,
    totalAnswered,
    totalCorrect,
    totalQuestions: simulado.total_questions,
    redirectTo: `/simulado/${simuladoId}`,
  }
}

/**
 * Wrapper used by a `<form action={...}>` submit handler. Form data
 * carries the answer map as JSON in a hidden input + elapsed seconds.
 * On success we redirect to the detail page (where the scored results
 * are now visible).
 */
export async function submitSimuladoFormAction(formData: FormData): Promise<void> {
  // formData.get() returns FormDataEntryValue (string | File | null). Coerce
  // explicitly via narrowing — String(File) would yield "[object File]".
  const rawId = formData.get('simulado_id')
  const rawAnswers = formData.get('answers')
  const rawElapsed = formData.get('elapsed_seconds')
  const simuladoId = typeof rawId === 'string' ? rawId : ''
  const answersRaw = typeof rawAnswers === 'string' ? rawAnswers : '{}'
  const elapsedRaw = typeof rawElapsed === 'string' ? rawElapsed : '0'

  let parsedAnswers: SimuladoAnswers = {}
  try {
    const candidate = JSON.parse(answersRaw) as unknown
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      // Coerce values to strings only — defence against accidental nesting.
      for (const [k, v] of Object.entries(candidate as Record<string, unknown>)) {
        if (typeof v === 'string') {
          parsedAnswers[k] = v
        }
      }
    }
  } catch {
    parsedAnswers = {}
  }

  const elapsedSeconds = Number.parseInt(elapsedRaw, 10)
  const result = await submitSimuladoAction(
    simuladoId,
    parsedAnswers,
    Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
  )

  redirect(result.redirectTo)
}
