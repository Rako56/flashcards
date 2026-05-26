/**
 * Auth callback — Supabase redirects here after email confirmation
 * OR OAuth provider redirect (Phase 3.5+).
 *
 * Exchanges the `code` query param for an active session (cookies are
 * set by `@supabase/ssr` automatically) then redirects to the URL in
 * `next=...` or `/`.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { childLogger } from '@/lib/observability/logger'
import { getCorrelationId } from '@/lib/observability/correlation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const log = childLogger({ correlationId, route: '/auth/callback' })

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = sanitizeNext(url.searchParams.get('next'))

  if (!code) {
    log.warn('callback hit without ?code — redirecting to /login')
    return NextResponse.redirect(new URL('/login?error=missing-code', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    log.error({ err: error.message }, 'exchangeCodeForSession failed')
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('invalid-code')}`, request.url),
    )
  }

  log.info({ next }, 'auth callback OK — session established')
  return NextResponse.redirect(new URL(next, request.url))
}

/**
 * Only accept relative paths to prevent open-redirect via `next=https://attacker.com`.
 */
function sanitizeNext(input: string | null): string {
  if (!input) return '/'
  if (!input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}
