/**
 * `getConcursoFromHeaders()` — reads the `x-concurso-slug` header injected
 * by `middleware.ts` and resolves the full concurso row via
 * `getConcursoBySlug()`.
 *
 * Use from Server Components, Server Actions, and Route Handlers that
 * need the current concurso context. Throws if called from a Client
 * Component (next/headers is server-only).
 *
 * Returns `null` if the request has no concurso (apex domain, reserved
 * subdomain, or no matching slug in admin_concursos). Pages should treat
 * `null` as either marketing context (apex) or 404 (slug provided but
 * not found).
 */
import { headers } from 'next/headers'

import { getConcursoBySlug, type ConcursoPublic } from '@/lib/concurso/get-by-slug'

/**
 * Resolve current request's concurso. Returns null if no x-concurso-slug
 * header was set or if the slug doesn't match any concurso row.
 */
export async function getConcursoFromHeaders(): Promise<ConcursoPublic | null> {
  const headerStore = await headers()
  const slug = headerStore.get('x-concurso-slug')
  if (!slug) return null
  return getConcursoBySlug(slug)
}

/**
 * Variant that throws if no concurso resolves. Use when the page MUST
 * have a concurso context (e.g., study session, simulado) and you want
 * an early failure instead of a confused render.
 *
 * Convert to a Next.js notFound() call at the page boundary so the
 * framework renders the canonical 404 page instead of throwing through.
 */
export async function requireConcursoFromHeaders(): Promise<ConcursoPublic> {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    throw new Error('No concurso resolved for this request — apex or invalid subdomain')
  }
  return concurso
}
