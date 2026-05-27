/**
 * Content stats for landing pages.
 *
 * Returns live counts of active flashcards + questões from the DB so we
 * never display stale hardcoded numbers on the marketing surfaces.
 *
 * Two granularities:
 *   - global (across all concursos): used on the apex landing footer CTA
 *   - per-concurso: used on the per-subdomain landing
 *
 * Caching: results are memoized per-request via React `cache()`. Two
 * components on the same page that both need counts hit Supabase once.
 *
 * Failure mode: returns zeros instead of throwing. The landing is
 * marketing copy — better to render "preparação curada" without numbers
 * than to break the whole page if the DB hiccups.
 */
import { cache } from 'react'

import { childLogger } from '@/lib/observability/logger'
import { createClient } from '@/lib/supabase/server'

export interface ContentStats {
  flashcardsCount: number
  questoesCount: number
  concursosCount: number
}

const ZERO_STATS: ContentStats = {
  flashcardsCount: 0,
  questoesCount: 0,
  concursosCount: 0,
}

/**
 * Global stats — totals across all published concursos. Used on the
 * apex marketing landing to show "X flashcards · Y questões reais".
 */
export const getGlobalContentStats = cache(async (): Promise<ContentStats> => {
  const log = childLogger({ helper: 'getGlobalContentStats' })
  try {
    const supabase = await createClient()
    // `head: true` makes count-only queries cheap — no row payload.
    const [flashcards, questoes, concursos] = await Promise.all([
      supabase
        .from('admin_flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('admin_questoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('admin_concursos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'publicado'),
    ])

    return {
      flashcardsCount: flashcards.count ?? 0,
      questoesCount: questoes.count ?? 0,
      concursosCount: concursos.count ?? 0,
    }
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'falling back to zero stats')
    return ZERO_STATS
  }
})

/**
 * Per-concurso stats — totals for a single concurso, scoped by id.
 * Used on the per-subdomain landing (STATE 2) to show concurso-specific
 * counts under the hero.
 */
export const getConcursoContentStats = cache(async (concursoId: string): Promise<ContentStats> => {
  const log = childLogger({ helper: 'getConcursoContentStats', concursoId })
  if (!concursoId) return ZERO_STATS

  try {
    const supabase = await createClient()
    const [flashcards, questoes] = await Promise.all([
      supabase
        .from('admin_flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('concurso_id', concursoId),
      supabase
        .from('admin_questoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('concurso_id', concursoId),
    ])

    return {
      flashcardsCount: flashcards.count ?? 0,
      questoesCount: questoes.count ?? 0,
      concursosCount: 1,
    }
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'falling back to zero stats')
    return ZERO_STATS
  }
})

/**
 * Get the first published concurso (by prioridade) — used to make the
 * apex CTA actionable: "Comece com TJSP Escrevente →" instead of just
 * telling visitors to find a subdomain.
 */
export const getFirstPublishedConcurso = cache(
  async (): Promise<{
    slug: string
    title: string
    banca: string | null
  } | null> => {
    const log = childLogger({ helper: 'getFirstPublishedConcurso' })
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_concursos')
        .select('slug, title, banca')
        .eq('status', 'publicado')
        .not('slug', 'is', null)
        .order('prioridade', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) {
        log.warn({ err: error.message }, 'lookup failed')
        return null
      }
      if (!data?.slug) return null
      return { slug: data.slug, title: data.title, banca: data.banca }
    } catch (err) {
      log.warn({ err: (err as Error).message }, 'unexpected error')
      return null
    }
  },
)
