import type { MetadataRoute } from 'next'

import { createClient } from '@/lib/supabase/server'

/**
 * sitemap.xml — generated dynamically.
 *
 * Includes apex routes (/, /termos, /privacidade, /sobre, /reembolso)
 * + one entry per active concurso (Phase 9 will deepen this with
 * per-concurso topic landings).
 *
 * Excludes user-scoped pages (/study, /erros, /checkout) which appear
 * in robots.txt as disallowed anyway.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://flashcards.com.br'

  // Apex pages (marketing)
  const apex: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/sobre`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/termos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/reembolso`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Per-concurso landing pages (each subdomain owns its own / route)
  try {
    const supabase = await createClient()
    const { data: concursos } = await supabase
      .from('admin_concursos')
      .select('slug, updated_at')
      .eq('status', 'publicado')
      .not('slug', 'is', null)

    const concursoEntries: MetadataRoute.Sitemap = (concursos ?? [])
      .filter((c): c is { slug: string; updated_at: string } => Boolean(c.slug))
      .map((c) => ({
        url: `https://${c.slug}.flashcards.com.br/`,
        lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))

    return [...apex, ...concursoEntries]
  } catch {
    // Fall back to apex-only if DB is unreachable
    return apex
  }
}
