/**
 * `getConcursoBySlug(slug)` — canonical concurso lookup.
 *
 * Every code path that needs a concurso ID MUST go through this helper.
 * The custom ESLint rule (`no-restricted-syntax` on UUID literals in
 * eslint.config.mjs) blocks hardcoded UUIDs in source, forcing callers
 * to lookup by slug.
 *
 * Rationale: hardcoded UUIDs in code are fragile (break when the row is
 * recreated in a different env), opaque (no readable meaning), and
 * silently wrong if the slug→UUID mapping drifts between envs. Slug
 * lookup makes intent obvious and survives env recreation.
 *
 * Caching: results are memoized per-request via React `cache()` so
 * multiple components on the same page resolve the same slug without
 * issuing duplicate Supabase queries. The cache is request-scoped (no
 * cross-request bleed).
 *
 * For long-lived caching across requests (e.g., for middleware on every
 * subdomain hit), use Supabase Edge Config or a Redis layer in a later
 * plan — not this helper, which is for app-internal lookups.
 */
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type ConcursoRow = Database['public']['Tables']['admin_concursos']['Row']

/**
 * Public-facing fields of a concurso. Sensitive fields like
 * `notas_internas` are stripped here so they never accidentally reach
 * a Client Component.
 */
export interface ConcursoPublic {
  id: string
  slug: string
  title: string
  status: string
  banca: string | null
  orgao: string | null
  area: string | null
  cargo: string | null
  estado: string | null
  data_prova: string | null
  descricao: string | null
  edital_url: string | null
  cover_url: string | null
  prioridade: number | null
  tags: string[] | null
}

/**
 * Lookup a concurso by its URL slug.
 *
 * Returns `null` if no concurso matches. Callers should treat that as
 * a 404 (e.g., subdomain matched no known concurso → render not-found).
 *
 * Throws only on unexpected Supabase errors (network down, schema
 * change). Use try/catch at the route boundary if you want to fall
 * back to a degraded UI rather than 500.
 */
export const getConcursoBySlug = cache(async (slug: string): Promise<ConcursoPublic | null> => {
  if (!slug || typeof slug !== 'string' || slug.length > 100) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_concursos')
    .select(
      'id, slug, title, status, banca, orgao, area, cargo, estado, data_prova, descricao, edital_url, cover_url, prioridade, tags',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error(`getConcursoBySlug failed for "${slug}": ${error.message}`)
  }

  if (!data) return null

  return toPublic(data)
})

/**
 * Map an internal row to the public shape. Single source of truth
 * for which fields leak to the client.
 */
function toPublic(
  row: Pick<
    ConcursoRow,
    | 'id'
    | 'slug'
    | 'title'
    | 'status'
    | 'banca'
    | 'orgao'
    | 'area'
    | 'cargo'
    | 'estado'
    | 'data_prova'
    | 'descricao'
    | 'edital_url'
    | 'cover_url'
    | 'prioridade'
    | 'tags'
  >,
): ConcursoPublic {
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title,
    status: row.status,
    banca: row.banca,
    orgao: row.orgao,
    area: row.area,
    cargo: row.cargo,
    estado: row.estado,
    data_prova: row.data_prova,
    descricao: row.descricao,
    edital_url: row.edital_url,
    cover_url: row.cover_url,
    prioridade: row.prioridade,
    tags: row.tags,
  }
}
