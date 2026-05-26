/**
 * Tests for lib/access/{has-concurso-access, get-current-user}.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hasUserConcursoAccess', () => {
  it('returns false for empty userId', async () => {
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    expect(await hasUserConcursoAccess('', 'concurso-id')).toBe(false)
  })

  it('returns false for empty concursoId', async () => {
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    expect(await hasUserConcursoAccess('user-id', '')).toBe(false)
  })

  it('returns false when Supabase finds no row', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    expect(await hasUserConcursoAccess('u', 'c')).toBe(false)
  })

  it('returns true on active access (expires_at = null)', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { user_id: 'u', concurso_id: 'c', expires_at: null },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    expect(await hasUserConcursoAccess('u', 'c')).toBe(true)
  })

  it('returns true on active access (expires_at in the future)', async () => {
    const future = new Date(Date.now() + 86400_000).toISOString()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { user_id: 'u', concurso_id: 'c', expires_at: future },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    expect(await hasUserConcursoAccess('u', 'c')).toBe(true)
  })

  it('returns false on expired access (expires_at in the past)', async () => {
    const past = new Date(Date.now() - 86400_000).toISOString()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { user_id: 'u', concurso_id: 'c', expires_at: past },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    expect(await hasUserConcursoAccess('u', 'c')).toBe(false)
  })

  it('throws on Supabase error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { hasUserConcursoAccess } = await import('@/lib/access/has-concurso-access')
    await expect(hasUserConcursoAccess('u', 'c')).rejects.toThrow(/boom/)
  })
})

describe('getCurrentUser', () => {
  it('returns user when getUser resolves with data', async () => {
    const user = { id: 'u-1', email: 'a@b.com' }
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          auth: {
            getUser: () => Promise.resolve({ data: { user }, error: null }),
          },
        }),
    }))
    const { getCurrentUser } = await import('@/lib/access/get-current-user')
    const result = await getCurrentUser()
    expect(result).toEqual(user)
  })

  it("returns null when error message contains 'Auth session missing'", async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          auth: {
            getUser: () =>
              Promise.resolve({
                data: { user: null },
                error: { message: 'Auth session missing!' },
              }),
          },
        }),
    }))
    const { getCurrentUser } = await import('@/lib/access/get-current-user')
    expect(await getCurrentUser()).toBeNull()
  })

  it('throws on unexpected auth error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          auth: {
            getUser: () =>
              Promise.resolve({
                data: { user: null },
                error: { message: 'Network unreachable' },
              }),
          },
        }),
    }))
    const { getCurrentUser } = await import('@/lib/access/get-current-user')
    await expect(getCurrentUser()).rejects.toThrow(/Network unreachable/)
  })
})
