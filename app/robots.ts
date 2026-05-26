import type { MetadataRoute } from 'next'

/**
 * robots.txt — built by Next.js metadata API at request time.
 *
 * Disallows (no SEO value + bot crawl wastes our render budget):
 *  - /admin/*       admin panel — public discovery has no value
 *  - /api/*         keeps webhook endpoints + healthz out of crawl logs
 *  - /monitoring    Sentry tunnel
 *  - /auth/*        auth callbacks — internal flow URLs
 *  - /checkout      per-user payment flow
 *  - /sucesso       post-checkout transactional landing
 *  - /onboarding    new-user wizard, only valid mid-flow
 *  - /settings/*    user account
 *  - /study, /erros user dashboard (auth-gated)
 *  - /simulado/*    exam pages (auth-gated + per-user state)
 *  - /esqueci-senha, /redefinir-senha  recovery flow URLs
 *
 * Allows everything else. The marketing landing (/) and per-concurso
 * landings (Phase 9 SALES-01..03) remain crawlable. Pair this with
 * per-page `metadata.robots = { index: false, follow: false }` for
 * pages whose URL can be guessed (defense in depth — robots.txt is
 * a polite request, the meta tag is a hard signal to indexing).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://flashcards.com.br'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/monitoring',
          '/auth/',
          '/checkout',
          '/sucesso',
          '/onboarding',
          '/settings/',
          '/study',
          '/erros',
          '/simulado/',
          '/esqueci-senha',
          '/redefinir-senha',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
