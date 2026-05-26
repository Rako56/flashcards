/**
 * Next.js middleware — runs on every matched request.
 *
 * Two responsibilities (Plan 1.6 + Phase 2):
 *
 * 1. Refresh Supabase auth session via `updateSession()` from
 *    `lib/supabase/middleware.ts`. This uses `getUser()` (NOT
 *    `getSession()`) to validate the JWT against the Auth server on
 *    every request, killing the legacy bug class where expired tokens
 *    stayed "logged in" until a fresh server action failed.
 *
 * 2. Resolve the concurso subdomain from the Host header and inject
 *    `x-concurso-slug` header on the response (and propagate to the
 *    downstream request) so Server Components can read it via
 *    `headers()` from `next/headers`.
 *
 * The middleware does NOT call `getConcursoBySlug()` — that helper
 * uses the cookies-based Supabase server client which doesn't fit the
 * Edge runtime constraints. Instead, the resolved slug is passed
 * downstream and pages do the lookup themselves.
 *
 * Matcher: skip static assets + Next internals. Let everything else
 * pass through so auth refresh + subdomain header are universally
 * applied (including API routes).
 */
import { NextResponse, type NextRequest } from 'next/server'

import { resolveSubdomain } from '@/lib/concurso/subdomain'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase auth session (writes back any rotated cookies)
  let response = await updateSession(request)

  // 2. Resolve concurso subdomain from Host header
  const host = request.headers.get('host') ?? ''
  const slug = resolveSubdomain(host)

  if (slug) {
    // Propagate to downstream request headers so Server Components +
    // Route Handlers can read via `headers()` without re-parsing host
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-concurso-slug', slug)

    // Re-create the response with the augmented request headers.
    // We must preserve any cookies that `updateSession` set, so we
    // copy the Set-Cookie headers from the previous response.
    const newResponse = NextResponse.next({
      request: { headers: requestHeaders },
    })
    response.cookies.getAll().forEach((cookie) => {
      newResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    response = newResponse

    // Also expose on the response so client code (or curl) can see it
    response.headers.set('x-concurso-slug', slug)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public/ (static assets)
     * - monitoring (Sentry tunnel) — don't add auth/concurso headers to Sentry POSTs
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
}
