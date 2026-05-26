'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { logger } from '@/lib/observability/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Clones a completed simulado into a fresh `status='pending'` row
 * with the SAME `question_ids`. Lets the user "refazer" without
 * the runner's idempotency guard blocking them (re-submitting the
 * original is refused — creating a new row is the supported path).
 *
 * Schema note: `simulados` rows have no `concurso_id` column — the
 * concurso scoping is implicit via the questions. We re-derive it
 * from the middleware-injected subdomain header (request must be on
 * a concurso subdomain) and re-check user access defensively.
 *
 * Redirects to the new simulado's `/run` page on success. On failure
 * (source not owned, no concurso resolved, access lapsed, insert
 * blocked), redirects back to detail or listing with no UI feedback
 * — rare edge case + the source page still works.
 */
export async function cloneSimuladoAction(formData: FormData): Promise<void> {
  const rawId = formData.get('simulado_id')
  const originalId = typeof rawId === 'string' ? rawId : ''
  if (!originalId) redirect('/simulado')

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/simulado/${originalId}`)

  const concurso = await getConcursoFromHeaders()
  if (!concurso) redirect('/')

  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) redirect('/')

  const supabase = await createClient()
  const { data: source } = await supabase
    .from('simulados')
    .select('title, description, question_ids, total_questions, time_limit_minutes')
    .eq('id', originalId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!source) redirect('/simulado')

  const newTitle = source.title.startsWith('Refazer ') ? source.title : `Refazer — ${source.title}`

  // Conditional spread for nullable time_limit_minutes — exactOptionalPropertyTypes
  // forbids passing `undefined` for a key that's typed as `number | null`.
  const insertPayload = {
    user_id: user.id,
    title: newTitle.slice(0, 200),
    description: source.description,
    question_ids: source.question_ids,
    total_questions: source.total_questions,
    status: 'pending',
    ...(source.time_limit_minutes !== null
      ? { time_limit_minutes: source.time_limit_minutes }
      : {}),
  }

  const { data: inserted, error } = await supabase
    .from('simulados')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) {
    logger.error({ event: 'simulado_clone_failed', originalId, err: error.message })
    redirect(`/simulado/${originalId}`)
  }

  revalidatePath('/simulado')
  redirect(`/simulado/${inserted.id}/run`)
}
