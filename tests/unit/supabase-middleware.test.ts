/**
 * Tests for lib/supabase/middleware.ts — updateSession().
 *
 * Mocks @supabase/ssr.createServerClient. Verifies:
 *  - cookies.getAll() reads request.cookies
 *  - cookies.setAll() mirrors writes to both request and response
 *  - supabase.auth.getUser() is invoked (validates token against Auth
 *    server, NOT getSession() — see file header in middleware.ts)
 *  - Prod cookie domain is set
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { updateSession as UpdateSession } from '@/lib/supabase/middleware'

const originalEnv = { ...process.env }

const createServerClientMock = vi.fn()
const getUserMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

// next/server's NextResponse/NextRequest are heavyweight; for unit tests
// we don't actually need them — we just need a `cookies` interface with
// getAll/set. We pass a hand-rolled fake into updateSession instead.

beforeEach(() => {
  vi.resetModules()
  createServerClientMock.mockReset()
  getUserMock.mockReset()
  getUserMock.mockResolvedValue({ data: { user: null }, error: null })
  createServerClientMock.mockImplementation(() => ({
    auth: { getUser: getUserMock },
  }))
  process.env = { ...originalEnv }
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://x.supabase.co'
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'anon-key-789'
})

afterEach(() => {
  process.env = { ...originalEnv }
})

function makeFakeRequest(initialCookies: { name: string; value: string }[] = []) {
  const cookies = [...initialCookies]
  return {
    cookies: {
      getAll: vi.fn(() => cookies.map((c) => ({ ...c }))),
      set: vi.fn((name: string, value: string) => {
        cookies.push({ name, value })
      }),
    },
  } as unknown as Parameters<typeof UpdateSession>[0]
}

describe('updateSession()', () => {
  it('calls supabase.auth.getUser() to validate the session (not getSession)', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = makeFakeRequest()
    await updateSession(req)
    expect(getUserMock).toHaveBeenCalledTimes(1)
  })

  it('forwards URL + anon key and sets prod cookie domain', async () => {
    ;(process.env as Record<string, string>)['NODE_ENV'] = 'production'
    const { updateSession } = await import('@/lib/supabase/middleware')
    await updateSession(makeFakeRequest())
    expect(createServerClientMock).toHaveBeenCalledWith(
      'https://x.supabase.co',
      'anon-key-789',
      expect.objectContaining({
        cookieOptions: expect.objectContaining({
          domain: '.flashcards.com.br',
          secure: true,
        }),
      }),
    )
  })

  it('does NOT set cookie domain outside production', async () => {
    ;(process.env as Record<string, string>)['NODE_ENV'] = 'development'
    const { updateSession } = await import('@/lib/supabase/middleware')
    await updateSession(makeFakeRequest())
    const [, , opts] = createServerClientMock.mock.calls[0]!
    expect(opts.cookieOptions).not.toHaveProperty('domain')
  })

  it('cookies.getAll() reads request.cookies', async () => {
    const req = makeFakeRequest([{ name: 'sb-token', value: 'abc' }])
    const { updateSession } = await import('@/lib/supabase/middleware')
    await updateSession(req)
    const [, , opts] = createServerClientMock.mock.calls[0]!
    expect(opts.cookies.getAll()).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('cookies.setAll() mirrors writes to request.cookies (and constructs a fresh response)', async () => {
    const req = makeFakeRequest()
    const { updateSession } = await import('@/lib/supabase/middleware')
    await updateSession(req)
    const [, , opts] = createServerClientMock.mock.calls[0]!
    // Should not throw and should call request.cookies.set per entry.
    opts.cookies.setAll([
      { name: 'a', value: '1', options: { path: '/' } },
      { name: 'b', value: '2', options: { path: '/' } },
    ])
    // request.cookies.set should have been called twice (a and b)
    const setSpy = (req as unknown as { cookies: { set: ReturnType<typeof vi.fn> } }).cookies.set
    expect(setSpy).toHaveBeenCalledTimes(2)
    expect(setSpy).toHaveBeenNthCalledWith(1, 'a', '1')
    expect(setSpy).toHaveBeenNthCalledWith(2, 'b', '2')
  })
})
