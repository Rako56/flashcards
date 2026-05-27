/**
 * Tests for app/auth/callback/route.ts
 *
 * The /auth/callback route exchanges Supabase's one-shot auth code for
 * a session. Critical correctness properties:
 *
 *  - Missing `?code` redirects to /login?error=missing-code (don't crash)
 *  - Successful exchange redirects to `?next=...` (relative only — open
 *    redirect prevention)
 *  - Failed exchange redirects to /login?error=invalid-code
 *  - `next=//attacker.com` and `next=https://attacker.com` are
 *    neutralized to /
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GET as CallbackGET } from '@/app/auth/callback/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/logger', () => ({
  childLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/lib/observability/correlation', () => ({
  getCorrelationId: () => 'fake-correlation-id',
}))

const exchangeMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  exchangeMock.mockReset()
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: () =>
      Promise.resolve({
        auth: { exchangeCodeForSession: exchangeMock },
      }),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Build a minimal NextRequest stub — we only use .url and
 * URL(request.url).searchParams in the route. The real NextRequest is
 * heavyweight (requires next/server module init), so a hand-rolled
 * object with the right shape is faster and clearer.
 */
function makeRequest(href: string) {
  // The route uses `new URL(request.url)` and `request.url` for
  // redirects, so both must match.
  return { url: href } as unknown as Parameters<typeof CallbackGET>[0]
}

describe('GET /auth/callback', () => {
  it('redirects to /login?error=missing-code when ?code is missing', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(makeRequest('https://flashcards.com.br/auth/callback'))
    expect(res.status).toBe(307) // NextResponse.redirect default
    expect(res.headers.get('location')).toContain('/login?error=missing-code')
    expect(exchangeMock).not.toHaveBeenCalled()
  })

  it('redirects to the default / when exchange succeeds with no next param', async () => {
    exchangeMock.mockResolvedValue({ error: null })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(makeRequest('https://flashcards.com.br/auth/callback?code=ok'))
    expect(exchangeMock).toHaveBeenCalledWith('ok')
    expect(res.headers.get('location')).toBe('https://flashcards.com.br/')
  })

  it('honors a relative `next=/study` param', async () => {
    exchangeMock.mockResolvedValue({ error: null })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(
      makeRequest('https://flashcards.com.br/auth/callback?code=ok&next=/study'),
    )
    expect(res.headers.get('location')).toBe('https://flashcards.com.br/study')
  })

  it('neutralizes open-redirect via absolute URL (next=https://attacker.com)', async () => {
    exchangeMock.mockResolvedValue({ error: null })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(
      makeRequest(
        'https://flashcards.com.br/auth/callback?code=ok&next=https://attacker.com/admin',
      ),
    )
    // Should fall back to "/", not redirect to attacker.com
    expect(res.headers.get('location')).toBe('https://flashcards.com.br/')
  })

  it('neutralizes protocol-relative URL (next=//attacker.com)', async () => {
    exchangeMock.mockResolvedValue({ error: null })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(
      makeRequest('https://flashcards.com.br/auth/callback?code=ok&next=//attacker.com'),
    )
    expect(res.headers.get('location')).toBe('https://flashcards.com.br/')
  })

  it('redirects to /login?error=invalid-code when exchange fails', async () => {
    exchangeMock.mockResolvedValue({ error: { message: 'code expired' } })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(makeRequest('https://flashcards.com.br/auth/callback?code=bad'))
    expect(res.headers.get('location')).toContain('/login?error=invalid-code')
  })

  it('does not crash when next has no leading slash (treats as relative-to-root)', async () => {
    exchangeMock.mockResolvedValue({ error: null })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(
      makeRequest('https://flashcards.com.br/auth/callback?code=ok&next=somewhere'),
    )
    // sanitizeNext requires `next.startsWith('/')` — "somewhere" → "/"
    expect(res.headers.get('location')).toBe('https://flashcards.com.br/')
  })
})
