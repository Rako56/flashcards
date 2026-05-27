/**
 * Tests for lib/supabase/browser.ts — createBrowserClient singleton.
 *
 * Verifies:
 *  - First call constructs a client; second call returns the same instance
 *  - createBrowserClient receives URL + key from env
 *  - Cookie options match prod vs dev expectations (domain only in prod)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

const createBrowserClientMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: createBrowserClientMock,
}))

beforeEach(() => {
  vi.resetModules()
  createBrowserClientMock.mockReset()
  createBrowserClientMock.mockImplementation(() => ({ __sentinel: 'browser-client' }))
  process.env = { ...originalEnv }
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://x.supabase.co'
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'anon-key-123'
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('lib/supabase/browser createClient()', () => {
  it('returns the same instance on subsequent calls (singleton)', async () => {
    const { createClient } = await import('@/lib/supabase/browser')
    const a = createClient()
    const b = createClient()
    expect(a).toBe(b)
    // SDK constructor should only fire once
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1)
  })

  it('forwards the env URL + anon key to createBrowserClient', async () => {
    const { createClient } = await import('@/lib/supabase/browser')
    createClient()
    expect(createBrowserClientMock).toHaveBeenCalledWith(
      'https://x.supabase.co',
      'anon-key-123',
      expect.any(Object),
    )
  })

  it('includes flashcards.com.br cookie domain in production', async () => {
    ;(process.env as Record<string, string>)['NODE_ENV'] = 'production'
    const { createClient } = await import('@/lib/supabase/browser')
    createClient()
    const [, , opts] = createBrowserClientMock.mock.calls[0]!
    expect(opts.cookieOptions).toMatchObject({
      domain: '.flashcards.com.br',
      sameSite: 'lax',
      secure: true,
      path: '/',
    })
  })

  it('does NOT include cookie domain outside production (dev defaults)', async () => {
    ;(process.env as Record<string, string>)['NODE_ENV'] = 'development'
    const { createClient } = await import('@/lib/supabase/browser')
    createClient()
    const [, , opts] = createBrowserClientMock.mock.calls[0]!
    expect(opts.cookieOptions).not.toHaveProperty('domain')
    expect(opts.cookieOptions).toMatchObject({
      sameSite: 'lax',
      secure: false,
      path: '/',
    })
  })
})
