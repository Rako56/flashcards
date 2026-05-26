/**
 * Tests for lib/gamification/get-user-stats.ts
 *
 * Mocks Supabase. Covers empty userId, gam row only, gam+weekly,
 * supabase error (returns zeros), no concursoId case (skips weekly).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

interface ChainResult {
  data: unknown
  error: { message: string } | null
}

function makeSupabase({ gam, weekly }: { gam: ChainResult; weekly?: ChainResult }) {
  let lastTable: string | null = null
  return () =>
    Promise.resolve({
      from: (table: string) => {
        lastTable = table
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve(lastTable === 'weekly_scores' ? (weekly ?? gam) : gam),
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve(lastTable === 'weekly_scores' ? (weekly ?? gam) : gam),
                }),
              }),
            }),
          }),
        }
      },
    })
}

describe('getUserStats', () => {
  it('returns zeros for empty userId', async () => {
    const { getUserStats } = await import('@/lib/gamification/get-user-stats')
    const r = await getUserStats('', 'c1')
    expect(r).toEqual({ totalXp: 0, weekStreak: 0 })
  })

  it('returns total_xp from user_gamification + 0 streak when no concurso', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        gam: { data: { total_xp: 150 }, error: null },
      }),
    }))
    const { getUserStats } = await import('@/lib/gamification/get-user-stats')
    const r = await getUserStats('u1', null)
    expect(r.totalXp).toBe(150)
    expect(r.weekStreak).toBe(0)
  })

  it('returns total_xp + streak when both rows exist', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        gam: { data: { total_xp: 200 }, error: null },
        weekly: { data: { streak_days: 5 }, error: null },
      }),
    }))
    const { getUserStats } = await import('@/lib/gamification/get-user-stats')
    const r = await getUserStats('u1', 'c1')
    expect(r.totalXp).toBe(200)
    expect(r.weekStreak).toBe(5)
  })

  it('returns zeros when gam row is missing', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        gam: { data: null, error: null },
        weekly: { data: null, error: null },
      }),
    }))
    const { getUserStats } = await import('@/lib/gamification/get-user-stats')
    const r = await getUserStats('u1', 'c1')
    expect(r.totalXp).toBe(0)
    expect(r.weekStreak).toBe(0)
  })

  it('returns zeros when createClient throws', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.reject(new Error('boom')),
    }))
    const { getUserStats } = await import('@/lib/gamification/get-user-stats')
    const r = await getUserStats('u1', 'c1')
    expect(r).toEqual({ totalXp: 0, weekStreak: 0 })
  })
})
