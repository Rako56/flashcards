import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { resolveSubdomain } from '@/lib/concurso/subdomain'

/**
 * sitemap.xml — HOST-AWARE. A sitemap may only list URLs on its own host
 * (Google ignores cross-host entries), and this app is multi-tenant by
 * subdomain. So each host serves only its OWN URLs:
 *   - a concurso subdomain → that concurso's landing root
 *   - the apex → the marketing pages
 *
 * Each concurso subdomain serves its own /sitemap.xml (Next renders this
 * per host) and its own robots.txt points search engines at it. User-scoped
 * pages (/study, /erros, /checkout, /settings) are disallowed in robots.txt.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? ''
  const slug = resolveSubdomain(host)

  // Concurso subdomain → only its own landing (same-host).
  if (slug) {
    return [{ url: `https://${slug}.flashcards.com.br/`, changeFrequency: 'weekly', priority: 1.0 }]
  }

  // Apex (marketing) host.
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://flashcards.com.br'
  return [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/sobre`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/termos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/reembolso`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
