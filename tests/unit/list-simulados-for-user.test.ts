/**
 * Tests for lib/simulados/list-for-user.ts
 *
 * Same mocking pattern as get-concurso-by-slug.test.ts: replace
 * `@/lib/supabase/server` with a stub. Cover empty-user guard,
 * happy path, and supabase-error rejection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('listSimuladosForUser', () => {
  it('returns [] for empty userId', async () => {
    const { listSimuladosForUser } = await import('@/lib/simulados/list-for-user')
    const result = await listSimuladosForUser('')
    expect(result).toEqual([])
  })

  it('returns mapped rows on hit', async () => {
    const mockRows = [
      {
        id: 'sim-1',
        title: 'Simulado TJSP — Direito Civil',
        description: 'Bloco de civil',
        status: 'completed',
        total_questions: 20,
        total_answered: 20,
        total_correct: 15,
        time_spent_seconds: 1200,
        started_at: '2026-05-20T10:00:00Z',
        finished_at: '2026-05-20T10:20:00Z',
        created_at: '2026-05-20T09:55:00Z',
      },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: mockRows, error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { listSimuladosForUser } = await import('@/lib/simulados/list-for-user')
    const result = await listSimuladosForUser('user-1', { limit: 10 })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('sim-1')
    expect(result[0]?.title).toBe('Simulado TJSP — Direito Civil')
  })

  it('returns [] when supabase returns null data', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { listSimuladosForUser } = await import('@/lib/simulados/list-for-user')
    const result = await listSimuladosForUser('user-1')
    expect(result).toEqual([])
  })

  it('throws on supabase error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: null,
                      error: { message: 'permission denied' },
                    }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { listSimuladosForUser } = await import('@/lib/simulados/list-for-user')
    await expect(listSimuladosForUser('user-1')).rejects.toThrow(/permission denied/)
  })
})
