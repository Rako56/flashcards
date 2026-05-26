/**
 * Shared metadata snippet for pages that should NEVER be indexed.
 *
 * Spread into a page's `metadata` export:
 *
 *   export const metadata = {
 *     title: 'Conta — Flashcards',
 *     ...NOINDEX_METADATA,
 *   }
 *
 * `index: false` tells search engines not to add the URL to their
 * index (the meta tag IS authoritative — robots.txt is only a crawl
 * hint that some bots ignore). `follow: false` blocks PageRank
 * propagation through links on these pages.
 *
 * Applies to:
 *   - Auth flow URLs (/login, /signup are still indexed because they
 *     have marketing value — but recovery / callback / confirmation
 *     URLs aren't useful in SERPs)
 *   - Per-user transactional pages (/sucesso, /checkout, /onboarding)
 *   - Auth-gated dashboard (/study, /erros, /settings, /simulado)
 *
 * NOT for:
 *   - / (apex marketing)
 *   - /:concurso (per-concurso landings — public discovery)
 *   - /sobre, /termos, /privacidade, /reembolso (legal pages, want
 *     them in SERPs for trust signals)
 *   - /leaderboard (community page, public value)
 */
export const NOINDEX_METADATA = {
  robots: { index: false, follow: false },
} as const
