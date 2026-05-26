/**
 * `getRecentMistakes(userId, concursoId, limit?)` — returns cards the
 * user rated 'again' recently.
 *
 * Source: srs_reviews (append-only log). We don't dedupe inside the
 * helper — if the user got the same card wrong 3x in 2 weeks, we
 * return 3 rows. The UI groups by card_id and shows count + latest.
 *
 * Default window: last 90 days. Default limit: 50 most recent.
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

  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('srs_reviews')
    .select(
      'flashcard_id, reviewed_at, admin_flashcards!inner(id, concurso_id, front_text, back_text, tipo_card, topico_titulo, disciplina_titulo, fundamento_legal, status)',
    )
    .eq('user_id', userId)
    .eq('rating', 'again')
    .gte('reviewed_at', since)
    .order('reviewed_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`getRecentMistakes failed: ${error.message}`)
  }

  interface SrsReviewRow {
    flashcard_id: string | null
    reviewed_at: string
    admin_flashcards: {
      id: string
      concurso_id: string | null
      front_text: string
      back_text: string
      tipo_card: string
      topico_titulo: string | null
      disciplina_titulo: string | null
      fundamento_legal: string | null
      status: string
    } | null
  }

  const rows = (data as unknown as SrsReviewRow[] | null) ?? []

  const result: MistakeReview[] = []
  for (const r of rows) {
    const c = r.admin_flashcards
    if (!c) continue
    if (c.concurso_id !== concursoId) continue
    if (c.status !== 'active') continue
    result.push({
      card_id: c.id,
      reviewed_at: r.reviewed_at,
      front_text: c.front_text,
      back_text: c.back_text,
      tipo_card: c.tipo_card,
      topico_titulo: c.topico_titulo,
      disciplina_titulo: c.disciplina_titulo,
      fundamento_legal: c.fundamento_legal,
    })
  }
  return result
}
