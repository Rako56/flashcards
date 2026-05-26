/**
 * Tests for lib/access/is-admin.ts
 *
 * Mock @/lib/supabase/server. Cover empty userId, true/false RPC,
 * error path, and thrown-error path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
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

  it('returns false when rpc returns error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: null, error: { message: 'rls denied' } }),
        }),
    }))
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('user-1')
    expect(result).toBe(false)
  })

  it('returns false when createClient throws', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.reject(new Error('boom')),
    }))
    const { isAdmin } = await import('@/lib/access/is-admin')
    const result = await isAdmin('user-1')
    expect(result).toBe(false)
  })
})
