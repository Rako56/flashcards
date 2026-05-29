'use server'

/**
 * Create a new simulado for the current user + concurso.
 *
 * Picks N random `admin_questoes` (status='active', not anulada,
 * depende_visual=false) for the resolved concurso, then INSERTs a row
 * in `simulados` with question_ids populated. Status='pending'. The
 * /simulado/:id page (future) renders the question runner.
 *
 * v1 simplification: random sample. Future: difficulty filter,
 * topic filter, weighted by user's mistake history, etc.
 */
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const CreateSchema = z.object({
  title: z
    .string({ required_error: 'Informe um título.' })
    .trim()
    .min(3, 'O título precisa ter pelo menos 3 caracteres.')
    .max(120, 'Título muito longo.'),
  description: z.string().max(500).optional(),
  total_questions: z
    .number()
    .int()
    .min(5, 'Mínimo 5 questões.')
    .max(100, 'Máximo 100 questões por simulado.'),
  time_limit_minutes: z
    .number()
    .int()
    .min(0, 'Sem limite (0) ou > 0.')
    .max(360, 'Máximo 6 horas (360 min).')
    .optional(),
})

export type CreateSimuladoResult =
  | { ok: true; id: string }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<
        Record<'title' | 'description' | 'total_questions' | 'time_limit_minutes', string>
      >
    }

export async function createSimuladoAction(
  _prev: CreateSimuladoResult | null,
  formData: FormData,
): Promise<CreateSimuladoResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'createSimulado' })

  const totalRaw = formData.get('total_questions')
  const limitRaw = formData.get('time_limit_minutes')

  const parsed = CreateSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    total_questions: totalRaw !== null ? Number(totalRaw) : NaN,
    time_limit_minutes: limitRaw !== null && limitRaw !== '' ? Number(limitRaw) : undefined,
  })
  if (!parsed.success) {
    const fieldErrors: NonNullable<Extract<CreateSimuladoResult, { ok: false }>['fieldErrors']> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (
        field === 'title' ||
        field === 'description' ||
        field === 'total_questions' ||
        field === 'time_limit_minutes'
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

  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    return {
      ok: false,
      error: 'Concurso não resolvido. Acesse via o subdomínio do seu concurso.',
    }
  }

  // Gate creation on a live access grant (the detail/run pages also gate,
  // but creation must not be the asymmetric path that lets an unpaid user
  // enumerate question inventory — defense-in-depth alongside the RLS fix).
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) {
    return { ok: false, error: 'Você ainda não tem acesso a este concurso.' }
  }

  // Fetch a candidate pool of active questions for this concurso.
  // Over-fetch (3x requested) so we have shuffle room and skip
  // anulada/depende_visual cases without ending under-quota.
  const candidatePoolSize = parsed.data.total_questions * 3
  const { data: candidates, error: poolError } = await supabase
    .from('admin_questoes')
    .select('id, gabarito, anulada, depende_visual, status')
    .eq('concurso_id', concurso.id)
    .eq('status', 'active')
    .eq('anulada', false)
    .eq('depende_visual', false)
    .limit(candidatePoolSize)

  if (poolError) {
    captureWithCorrelation(poolError, correlationId, { stage: 'admin_questoes.select' })
    log.error({ err: poolError.message }, 'pool fetch failed')
    return { ok: false, error: 'Não foi possível montar o simulado. Tente novamente.' }
  }

  const pool = candidates
  if (pool.length < parsed.data.total_questions) {
    return {
      ok: false,
      error: `Banco de questões insuficiente — apenas ${String(pool.length)} questões disponíveis para esse concurso.`,
    }
  }

  // Map IDs first, then sort by random key. Avoids index-mutation
  // gymnastics that fight noUncheckedIndexedAccess + lint rules.
  const pickedQuestions = pool
    .map((q) => ({ q, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, parsed.data.total_questions)
    .map((entry) => entry.q)
  const picked = pickedQuestions.map((q) => q.id)

  // Freeze the answer key at creation (F-009): scoring reads this snapshot
  // instead of a live admin_questoes query, so archiving or editing a
  // question later can't mis-score an already-created simulado.
  const gabaritoSnapshot: Record<string, { gabarito: string | null; anulada: boolean | null }> = {}
  for (const q of pickedQuestions) {
    gabaritoSnapshot[q.id] = { gabarito: q.gabarito, anulada: q.anulada }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('simulados')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      total_questions: parsed.data.total_questions,
      question_ids: picked,
      gabarito_snapshot: gabaritoSnapshot,
      status: 'pending',
      time_limit_minutes:
        parsed.data.time_limit_minutes && parsed.data.time_limit_minutes > 0
          ? parsed.data.time_limit_minutes
          : null,
    })
    .select('id')
    .single()

  if (insertError) {
    captureWithCorrelation(insertError, correlationId, { stage: 'simulados.insert' })
    log.error({ err: insertError.message }, 'insert failed')
    return { ok: false, error: 'Não foi possível salvar o simulado. Tente novamente.' }
  }

  log.info({ simuladoId: inserted.id, questionCount: picked.length }, 'simulado created')

  // v1 redirects back to listing — runner UI is Phase 9 full.
  redirect('/simulado?created=1')
}
