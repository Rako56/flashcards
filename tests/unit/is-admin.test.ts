/**
 * Tests for lib/access/is-admin.ts
 *
 * Mock @/lib/supabase/server. Cover empty userId, true/false RPC,
 * error path, and thrown-error path. Error paths also assert Sentry
 * capture (silent-fallback hardening).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/logger', () => ({
  childLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}))

const captureMock = vi.fn()
vi.mock('@/lib/observability/sentry', () => ({
  captureWithCorrelation: captureMock,
}))

beforeEach(() => {
  vi.resetModules()
  captureMock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isAdmin', () => {
  it('returns false for empty userId', async () => {
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('')
    expect(result).toBe(false)
  })

  it('returns true when rpc returns true', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: true, error: null }),
        }),
    }))
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('user-1')
    expect(result).toBe(true)
  })

  it('returns false when rpc returns false', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: false, error: null }),
        }),
    }))
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('user-1')
    expect(result).toBe(false)
  })

  it('returns false when rpc returns error AND fires Sentry', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: null, error: { message: 'rls denied' } }),
        }),
    }))
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('user-1')
    expect(result).toBe(false)
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0]![2]).toMatchObject({ helper: 'isAdmin', userId: 'user-1' })
  })

  it('returns false when createClient throws AND fires Sentry', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.reject(new Error('boom')),
    }))
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('user-1')
    expect(result).toBe(false)
    expect(captureMock).toHaveBeenCalledTimes(1)
  })

  it('does not fire Sentry when userId is empty (legitimate guard)', async () => {
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('')
    expect(result).toBe(false)
    expect(captureMock).not.toHaveBeenCalled()
  })
})
