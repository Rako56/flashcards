/**
 * Subdomain resolution for multi-tenant routing.
 *
 * Production:
 *   tjsp.flashcards.com.br        → 'tjsp'
 *   www.flashcards.com.br         → null (reserved, pass-through)
 *   app.flashcards.com.br         → null (reserved, concurso selector page)
 *   flashcards.com.br             → null (apex, marketing landing)
 *
 * Vercel preview deploys:
 *   flashcards-henna-eight.vercel.app          → null (no concurso routing on preview)
 *   *.vercel.app                                → null
 *
 * Local development:
 *   localhost:3000                              → DEV_DEFAULT_SLUG (env or 'tjsp')
 *   tjsp.localhost:3000                         → 'tjsp' (works in modern browsers via *.localhost DNS)
 *   127.0.0.1:3000                              → null (use localhost for dev concurso routing)
 *
 * Reserved subdomains (never treated as a concurso slug):
 *   www, app, admin, api, monitoring (Sentry tunnel), assets
 */

export const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api', 'monitoring', 'assets'])

const VERCEL_PREVIEW_RE = /\.vercel\.app$/i

interface ResolveOptions {
  /**
   * Root domain (e.g., 'flashcards.com.br'). Used to detect production
   * subdomains. Defaults to the env value but can be overridden in tests.
   */
  rootDomain?: string
  /**
   * Fallback slug for localhost dev when no subdomain is in the host.
   * Defaults to env DEV_DEFAULT_CONCURSO_SLUG or 'tjsp'.
   */
  devDefaultSlug?: string
}

/**
 * Returns the concurso slug from the request host, or `null` if the
 * host is apex / reserved / preview deploy. Callers (e.g., middleware)
 * should treat `null` as "no concurso context — render selector or
 * landing page".
 */
export function resolveSubdomain(host: string, options: ResolveOptions = {}): string | null {
  if (!host) return null

  const rootDomain =
    options.rootDomain ?? process.env['NEXT_PUBLIC_ROOT_DOMAIN'] ?? 'flashcards.com.br'
  const devDefaultSlug =
    options.devDefaultSlug ?? process.env['DEV_DEFAULT_CONCURSO_SLUG'] ?? 'tjsp'

  // Strip port (e.g., "tjsp.localhost:3000" → "tjsp.localhost")
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''

  // 127.0.0.1 / IP address → no concurso routing
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return null

  // Bare localhost → dev default
  if (hostname === 'localhost') return devDefaultSlug

  // <slug>.localhost (works in browsers via DNS rewriting)
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.slice(0, -'.localhost'.length)
    if (RESERVED_SUBDOMAINS.has(slug)) return null
    return slug || null
  }

  // Vercel preview deploys → no concurso routing
  if (VERCEL_PREVIEW_RE.test(hostname)) return null

  // Production: <subdomain>.<rootDomain>
  if (hostname === rootDomain) return null // apex
  if (!hostname.endsWith(`.${rootDomain}`)) return null // foreign domain (custom apex test?)

  const subdomain = hostname.slice(0, -`.${rootDomain}`.length)

  // Reserved subdomains pass through
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null

  // Multi-level subdomains (e.g., "staging.tjsp.flashcards.com.br")
  // → only use the leftmost label as the concurso slug
  const slug = subdomain.split('.')[0] ?? ''
  if (RESERVED_SUBDOMAINS.has(slug)) return null

  return slug || null
}
