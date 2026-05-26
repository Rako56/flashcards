/**
 * Tests for lib/activity/get-today-progress.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const baseDate = new Date('2026-05-20T15:00:00Z')

interface SupabaseStub {
  profile: { data: { daily_goal_minutes: number } | null; error: null }
  reviews: { data: unknown[]; error: null }
}

function makeSupabase(stub: SupabaseStub) {
  return () =>
    Promise.resolve({
      from: (table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve(stub.profile),
              }),
            }),
          }
        }
        // srs_reviews
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve(stub.reviews),
            }),
          }),
        }
      },
    })
}

describe('getTodayProgress', () => {
  it('returns default zeros for empty userId', async () => {
    const { getTodayProgress } = await import('@/lib/activity/get-today-progress')
    const r = await getTodayProgress('', 'c1', baseDate)
    expect(r.reviewsToday).toBe(0)
    expect(r.fraction).toBe(0)
  })

  it('default goal when profile row missing', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        profile: { data: null, error: null },
        reviews: { data: [], error: null },
      }),
    }))
    const { getTodayProgress } = await import('@/lib/activity/get-today-progress')
    const r = await getTodayProgress('u1', 'c1', baseDate)
    expect(r.goalMinutes).toBe(30)
    expect(r.goalCards).toBe(60)
  })

  it('uses user goal minutes when set', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        profile: { data: { daily_goal_minutes: 45 }, error: null },
        reviews: { data: [], error: null },
      }),
    }))
    const { getTodayProgress } = await import('@/lib/activity/get-today-progress')
    const r = await getTodayProgress('u1', 'c1', baseDate)
    expect(r.goalMinutes).toBe(45)
    expect(r.goalCards).toBe(90)
  })

  it('counts only matching concurso + active flashcards', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        profile: { data: { daily_goal_minutes: 30 }, error: null },
        reviews: {
          data: [
            { admin_flashcards: { concurso_id: 'c1', status: 'active' } },
            { admin_flashcards: { concurso_id: 'c1', status: 'active' } },
            { admin_flashcards: { concurso_id: 'OTHER', status: 'active' } }, // wrong concurso
            { admin_flashcards: { concurso_id: 'c1', status: 'archived' } }, // archived
            { admin_flashcards: null }, // orphan
          ],
          error: null,
        },
      }),
    }))
    const { getTodayProgress } = await import('@/lib/activity/get-today-progress')
    const r = await getTodayProgress('u1', 'c1', baseDate)
    expect(r.reviewsToday).toBe(2)
  })

  it('fraction caps at 1 when over goal', async () => {
    const reviews = Array.from({ length: 100 }, () => ({
      admin_flashcards: { concurso_id: 'c1', status: 'active' },
    }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: makeSupabase({
        profile: { data: { daily_goal_minutes: 30 }, error: null },
        reviews: { data: reviews, error: null },
      }),
    }))
    const { getTodayProgress } = await import('@/lib/activity/get-today-progress')
    const r = await getTodayProgress('u1', 'c1', baseDate)
    expect(r.fraction).toBe(1)
    expect(r.reviewsToday).toBe(100)
  })

  it('returns zeros when createClient throws', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.reject(new Error('boom')),
    }))
    const { getTodayProgress } = await import('@/lib/activity/get-today-progress')
    const r = await getTodayProgress('u1', 'c1', baseDate)
    expect(r.reviewsToday).toBe(0)
  })
})
