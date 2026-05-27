/**
 * Tests for lib/leaderboard/get-weekly.ts
 *
 * Mocks Supabase. Covers empty concursoId, happy path, error path,
 * caught-throw path. Error paths assert Sentry capture (silent-fallback
 * hardening — empty leaderboard could mean "no participants" or "RPC
 * broke", and we need to tell them apart).
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

// weekStartUTC is a pure function — we want the real one so the
// helper's default `weekStart` arg gets computed identically.
beforeEach(() => {
  vi.resetModules()
  captureMock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getWeeklyLeaderboard', () => {
  it('returns [] when concursoId is empty (no Sentry)', async () => {
    const { getWeeklyLeaderboard } = await import('@/lib/leaderboard/get-weekly')
    const result = await getWeeklyLeaderboard('')
    expect(result).toEqual([])
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('returns rows from the RPC on happy path', async () => {
    const fakeRows = [
      {
        user_id: 'u1',
        full_name: 'Alice',
        avatar_url: null,
        league: 'gold',
        points: 100,
        reviews_count: 50,
        streak_days: 7,
      },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: (fn: string) => {
            expect(fn).toBe('get_weekly_leaderboard')
            return Promise.resolve({ data: fakeRows, error: null })
          },
        }),
    }))
    const { getWeeklyLeaderboard } = await import('@/lib/leaderboard/get-weekly')
    const result = await getWeeklyLeaderboard('concurso-1')
    expect(result).toEqual(fakeRows)
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('returns [] AND fires Sentry on RPC error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: null, error: { message: 'rpc denied' } }),
        }),
    }))
    const { getWeeklyLeaderboard } = await import('@/lib/leaderboard/get-weekly')
    const result = await getWeeklyLeaderboard('concurso-1')
    expect(result).toEqual([])
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0]![2]).toMatchObject({
      helper: 'getWeeklyLeaderboard',
      concursoId: 'concurso-1',
    })
  })

  it('returns [] AND fires Sentry when createClient throws', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.reject(new Error('network')),
    }))
    const { getWeeklyLeaderboard } = await import('@/lib/leaderboard/get-weekly')
    const result = await getWeeklyLeaderboard('concurso-1')
    expect(result).toEqual([])
    expect(captureMock).toHaveBeenCalledTimes(1)
  })

  it('accepts an explicit weekStart override', async () => {
    let receivedArgs: Record<string, unknown> = {}
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: (_fn: string, args: Record<string, unknown>) => {
            receivedArgs = args
            return Promise.resolve({ data: [], error: null })
          },
        }),
    }))
    const { getWeeklyLeaderboard } = await import('@/lib/leaderboard/get-weekly')
    await getWeeklyLeaderboard('concurso-1', '2026-01-06', 25)
    expect(receivedArgs).toMatchObject({
      p_concurso_id: 'concurso-1',
      p_week_start: '2026-01-06',
      p_limit: 25,
    })
  })
})
