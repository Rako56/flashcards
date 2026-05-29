/**
 * `getRecentMistakes(userId, concursoId, options)` — cards the user should
 * review in the caderno de erros: those whose MOST-RECENT review in the
 * window is 'again'.
 *
 * Delegates to the get_recent_mistakes RPC (F-007), which takes the latest
 * review per card server-side. This is what makes "Dominei" work: a later
 * rating='good' becomes the latest review and the card drops out. The RPC
 * also applies the concurso + active filters BEFORE the limit (the old
 * client-side filter ran after limit, under-reporting in multi-concurso).
 *
 * Default window: 90 days. Default limit: 50 most recent.
 */
import { createClient } from '@/lib/supabase/server'

export interface MistakeReview {
  card_id: string
  reviewed_at: string
  front_text: string
  back_text: string
  tipo_card: string
  topico_titulo: string | null
  disciplina_titulo: string | null
  fundamento_legal: string | null
}

export async function getRecentMistakes(
  userId: string,
  concursoId: string,
  options: { limit?: number; windowDays?: number } = {},
): Promise<MistakeReview[]> {
  const { limit = 50, windowDays = 90 } = options
  if (!userId || !concursoId) return []

  const supabase = await createClient()
  // RLS scopes srs_reviews to the caller (auth.uid()), so userId is only
  // used for the early-return guard above — the RPC derives identity itself.
  const { data, error } = await supabase.rpc('get_recent_mistakes', {
    p_concurso_id: concursoId,
    p_window_days: windowDays,
    p_limit: limit,
  })

  if (error) {
    throw new Error(`getRecentMistakes failed: ${error.message}`)
  }

  return data.map((r) => ({
    card_id: r.card_id,
    reviewed_at: r.reviewed_at,
    front_text: r.front_text,
    back_text: r.back_text,
    tipo_card: r.tipo_card,
    topico_titulo: r.topico_titulo,
    disciplina_titulo: r.disciplina_titulo,
    fundamento_legal: r.fundamento_legal,
  }))
}
