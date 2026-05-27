/**
 * Tests for lib/supabase/server.ts — per-request server client.
 *
 * Mocks @supabase/ssr.createServerClient and next/headers.cookies(). Verifies:
 *  - getAll() forwards cookie store
 *  - setAll() in normal context calls cookieStore.set per cookie
 *  - setAll() swallows the RSC "Cookies can only be modified..." throw
 *  - URL + anon key forwarded; prod cookie domain
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const originalEnv = { ...process.env }

const createServerClientMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

// We mock cookies() per-test by re-assigning a fresh impl before each.
const cookiesMock = vi.fn()
vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}))

beforeEach(() => {
  vi.resetModules()
  createServerClientMock.mockReset()
  createServerClientMock.mockImplementation(() => ({ __sentinel: 'server-client' }))
  cookiesMock.mockReset()
  process.env = { ...originalEnv }
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://x.supabase.co'
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'anon-key-456'
})

afterEach(() => {
  process.env = { ...originalEnv }
})

interface FakeCookie {
  name: string
  value: string
  options?: Record<string, unknown> | undefined
}

function makeCookieStore(initial: FakeCookie[] = []) {
  const store: FakeCookie[] = [...initial]
  return {
    store,
    getAll: vi.fn(() => store.map((c) => ({ name: c.name, value: c.value }))),
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      store.push({ name, value, options })
    }),
  }
}

describe('lib/supabase/server createClient()', () => {
  it('forwards env URL + anon key and prod cookie domain to createServerClient', async () => {
    ;(process.env as Record<string, string>)['NODE_ENV'] = 'production'
    cookiesMock.mockResolvedValue(makeCookieStore())
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()
    expect(createServerClientMock).toHaveBeenCalledWith(
      'https://x.supabase.co',
      'anon-key-456',
      expect.objectContaining({
        cookieOptions: expect.objectContaining({
          domain: '.flashcards.com.br',
          secure: true,
        }),
      }),
    )
  })

  it('cookies.getAll() returns the underlying cookie store contents', async () => {
    const store = makeCookieStore([{ name: 'sb-access', value: 'tok' }])
    cookiesMock.mockResolvedValue(store)
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()
    const [, , opts] = createServerClientMock.mock.calls[0]!
    expect(opts.cookies.getAll()).toEqual([{ name: 'sb-access', value: 'tok' }])
    expect(store.getAll).toHaveBeenCalled()
  })

  it('cookies.setAll() writes every cookie via cookieStore.set', async () => {
    const store = makeCookieStore()
    cookiesMock.mockResolvedValue(store)
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()
    const [, , opts] = createServerClientMock.mock.calls[0]!
    opts.cookies.setAll([
      { name: 'a', value: '1', options: { path: '/' } },
      { name: 'b', value: '2', options: { path: '/' } },
    ])
    expect(store.set).toHaveBeenCalledTimes(2)
    expect(store.set).toHaveBeenNthCalledWith(1, 'a', '1', { path: '/' })
    expect(store.set).toHaveBeenNthCalledWith(2, 'b', '2', { path: '/' })
  })

  it('cookies.setAll() swallows the RSC "cookies can only be modified" throw', async () => {
    // Simulate the Next.js RSC throw: cookieStore.set throws synchronously.
    const store = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error('Cookies can only be modified in a Server Action or Route Handler')
      }),
    }
    cookiesMock.mockResolvedValue(store)
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()
    const [, , opts] = createServerClientMock.mock.calls[0]!
    // Should NOT throw — the helper catches and ignores.
    expect(() =>
      opts.cookies.setAll([{ name: 'a', value: '1', options: { path: '/' } }]),
    ).not.toThrow()
  })
})
