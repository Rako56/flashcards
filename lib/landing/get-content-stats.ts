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
 *
 * IMPORTANT — F-004 (2026-05-27): direct table COUNT queries return 0
 * to anon visitors because RLS on admin_flashcards/admin_questoes is
 * scoped to paying users + admins. We route through the SECURITY DEFINER
 * `public.get_content_counts(uuid)` RPC instead, which returns aggregates
 * only (no row payload, no leak of curated card content).
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
 * Shape of the jsonb returned by `public.get_content_counts(uuid)`.
 * Mirrors the keys built by `jsonb_build_object` in the migration.
 */
interface CountsRpcResponse {
  flashcardsCount: number
  questoesCount: number
  concursosCount: number
}

/**
 * Coerce the RPC's jsonb response into a ContentStats. Defensive against
 * the function returning unexpected shapes (e.g., during a half-deployed
 * migration). Coalesces to ZERO_STATS so the landing never crashes.
 */
function coerceCounts(raw: unknown): ContentStats {
  if (!raw || typeof raw !== 'object') return ZERO_STATS
  const r = raw as Partial<CountsRpcResponse>
  return {
    flashcardsCount: typeof r.flashcardsCount === 'number' ? r.flashcardsCount : 0,
    questoesCount: typeof r.questoesCount === 'number' ? r.questoesCount : 0,
    concursosCount: typeof r.concursosCount === 'number' ? r.concursosCount : 0,
  }
}

/**
 * Global stats — totals across all published concursos. Used on the
 * apex marketing landing to show "X flashcards · Y questões reais".
 */
export const getGlobalContentStats = cache(async (): Promise<ContentStats> => {
  const log = childLogger({ helper: 'getGlobalContentStats' })
  try {
    const supabase = await createClient()
    // Pass an empty args object — the SQL function defaults p_concurso_id
    // to NULL (= global counts branch). The generated type marks the arg
    // optional (`{ p_concurso_id?: string }`) and refuses explicit `null`.
    const { data, error } = await supabase.rpc('get_content_counts', {})
    if (error) {
      log.warn({ err: error.message }, 'rpc failed — falling back to zero stats')
      return ZERO_STATS
    }
    return coerceCounts(data)
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
    const { data, error } = await supabase.rpc('get_content_counts', {
      p_concurso_id: concursoId,
    })
    if (error) {
      log.warn({ err: error.message }, 'rpc failed — falling back to zero stats')
      return ZERO_STATS
    }
    return coerceCounts(data)
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
