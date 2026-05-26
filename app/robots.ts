import type { MetadataRoute } from 'next'

/**
 * robots.txt — built by Next.js metadata API at request time.
 *
 * Disallows:
 *  - /admin/*  (admin panel — public discovery has no value)
 *  - /api/*    (no SEO benefit + keeps webhook endpoints out of crawl
 *               logs)
 *  - /monitoring (Sentry tunnel)
 *  - /auth/*   (auth pages aren't user-facing destinations)
 *  - /checkout (per-user; not for crawl)
 *
 * Allows everything else. The marketing landing (/) and per-concurso
 * landings (Phase 9 SALES-01..03 will add /tjsp etc as public pages)
 * remain crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://flashcards.com.br'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/monitoring', '/auth/', '/checkout', '/study', '/erros'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
