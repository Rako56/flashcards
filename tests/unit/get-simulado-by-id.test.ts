/**
 * Tests for lib/simulados/get-by-id.ts
 *
 * Mocks Supabase. Covers empty params guard, hit, miss, error.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeStub(result: { data: unknown; error: { message: string } | null }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(result),
          }),
        }),
      }),
    }),
  }
}

describe('getSimuladoById', () => {
  it('returns null for empty id', async () => {
    const { getSimuladoById } = await import('@/lib/simulados/get-by-id')
    expect(await getSimuladoById('', 'user-1')).toBeNull()
  })

  it('returns null for empty userId', async () => {
    const { getSimuladoById } = await import('@/lib/simulados/get-by-id')
    expect(await getSimuladoById('sim-1', '')).toBeNull()
  })

  it('returns the row on hit', async () => {
    const mockRow = {
      id: 'sim-1',
      title: 'Test',
      description: null,
      status: 'pending',
      total_questions: 20,
      total_answered: 0,
      total_correct: 0,
      time_limit_minutes: 30,
      time_spent_seconds: null,
      question_ids: ['q1', 'q2'],
      results_json: null,
      started_at: null,
      finished_at: null,
      created_at: '2026-05-20T10:00:00Z',
      updated_at: '2026-05-20T10:00:00Z',
    }
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve(makeStub({ data: mockRow, error: null })),
    }))
    const { getSimuladoById } = await import('@/lib/simulados/get-by-id')
    const result = await getSimuladoById('sim-1', 'user-1')
    expect(result?.id).toBe('sim-1')
    expect(result?.title).toBe('Test')
  })

  it('returns null when maybeSingle returns null', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve(makeStub({ data: null, error: null })),
    }))
    const { getSimuladoById } = await import('@/lib/simulados/get-by-id')
    expect(await getSimuladoById('sim-1', 'user-1')).toBeNull()
  })

  it('returns null on supabase error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve(makeStub({ data: null, error: { message: 'rls denied' } })),
    }))
    const { getSimuladoById } = await import('@/lib/simulados/get-by-id')
    expect(await getSimuladoById('sim-1', 'user-1')).toBeNull()
  })
})
