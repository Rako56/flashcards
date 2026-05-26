/**
 * Tests for lib/gamification/award-xp.ts
 *
 * Focus: weekStartUTC (pure function) + awardXpAndStreak end-to-end
 * with a mocked Supabase client. We assert on the streak logic
 * branches (first review, same day, yesterday, gap, error).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { awardXpAndStreak, weekStartUTC } from '@/lib/gamification/award-xp'

interface ChainResult {
  data: unknown
  error: { message: string } | null
}

interface MockTable {
  selectChain: ChainResult
  upsertResult: { error: { message: string } | null }
}

function makeSupabaseStub(tables: Record<string, MockTable>) {
  return {
    from: (name: string) => {
      const table = tables[name]
      if (!table) {
        throw new Error(`unexpected table ${name}`)
      }
      const selectChain = {
        eq: () => selectChain,
        maybeSingle: () => Promise.resolve(table.selectChain),
      }
      return {
        select: () => selectChain,
        upsert: () => Promise.resolve(table.upsertResult),
      }
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('weekStartUTC', () => {
  it('returns the Monday for a Wednesday', () => {
    // 2026-05-20 is a Wednesday
    const result = weekStartUTC(new Date('2026-05-20T15:30:00Z'))
    expect(result).toBe('2026-05-18')
  })

  it('returns the Monday for a Sunday (treats Sunday as last day of week)', () => {
    // 2026-05-24 is a Sunday
    const result = weekStartUTC(new Date('2026-05-24T15:30:00Z'))
    expect(result).toBe('2026-05-18')
  })

  it('returns the same date when given a Monday', () => {
    const result = weekStartUTC(new Date('2026-05-18T00:00:00Z'))
    expect(result).toBe('2026-05-18')
  })
})

describe('awardXpAndStreak', () => {
  const baseInput = {
    userId: 'user-1',
    concursoId: 'concurso-1',
    correlationId: 'corr-1',
  }

  it('first review of the week → streak = 1, total_xp seeded with delta', async () => {
    const supabase = makeSupabaseStub({
      user_gamification: {
        selectChain: { data: null, error: null },
        upsertResult: { error: null },
      },
      weekly_scores: {
        selectChain: { data: null, error: null },
        upsertResult: { error: null },
      },
    })
    const result = await awardXpAndStreak(supabase as any, {
      ...baseInput,
      rating: 'good',
      now: new Date('2026-05-20T10:00:00Z'),
    })
    expect(result.ok).toBe(true)
    expect(result.xpDelta).toBe(5)
    expect(result.newTotalXp).toBe(5)
    expect(result.newStreak).toBe(1)
  })

  it('second review same day → no streak bump', async () => {
    const supabase = makeSupabaseStub({
      user_gamification: {
        selectChain: { data: { total_xp: 10 }, error: null },
        upsertResult: { error: null },
      },
      weekly_scores: {
        selectChain: {
          data: {
            id: 'ws-1',
            points: 5,
            reviews_count: 1,
            streak_days: 1,
            updated_at: '2026-05-20T09:00:00Z',
          },
          error: null,
        },
        upsertResult: { error: null },
      },
    })
    const result = await awardXpAndStreak(supabase as any, {
      ...baseInput,
      rating: 'good',
      now: new Date('2026-05-20T10:00:00Z'),
    })
    expect(result.ok).toBe(true)
    expect(result.newStreak).toBe(1)
    expect(result.newTotalXp).toBe(15)
  })

  it('reviewed yesterday → streak += 1', async () => {
    const supabase = makeSupabaseStub({
      user_gamification: {
        selectChain: { data: { total_xp: 100 }, error: null },
        upsertResult: { error: null },
      },
      weekly_scores: {
        selectChain: {
          data: {
            id: 'ws-1',
            points: 50,
            reviews_count: 10,
            streak_days: 3,
            updated_at: '2026-05-19T09:00:00Z',
          },
          error: null,
        },
        upsertResult: { error: null },
      },
    })
    const result = await awardXpAndStreak(supabase as any, {
      ...baseInput,
      rating: 'easy',
      now: new Date('2026-05-20T10:00:00Z'),
    })
    expect(result.ok).toBe(true)
    expect(result.newStreak).toBe(4)
    expect(result.newTotalXp).toBe(107)
  })

  it('gap > 1 day → streak resets to 1', async () => {
    const supabase = makeSupabaseStub({
      user_gamification: {
        selectChain: { data: { total_xp: 200 }, error: null },
        upsertResult: { error: null },
      },
      weekly_scores: {
        selectChain: {
          data: {
            id: 'ws-1',
            points: 100,
            reviews_count: 20,
            streak_days: 10,
            updated_at: '2026-05-15T09:00:00Z',
          },
          error: null,
        },
        upsertResult: { error: null },
      },
    })
    const result = await awardXpAndStreak(supabase as any, {
      ...baseInput,
      rating: 'again',
      now: new Date('2026-05-20T10:00:00Z'),
    })
    expect(result.ok).toBe(true)
    expect(result.newStreak).toBe(1)
    expect(result.xpDelta).toBe(1)
  })

  it('non-fatal user_gamification upsert error still allows weekly_scores', async () => {
    const supabase = makeSupabaseStub({
      user_gamification: {
        selectChain: { data: null, error: null },
        upsertResult: { error: { message: 'rls' } },
      },
      weekly_scores: {
        selectChain: { data: null, error: null },
        upsertResult: { error: null },
      },
    })
    const result = await awardXpAndStreak(supabase as any, {
      ...baseInput,
      rating: 'hard',
      now: new Date('2026-05-20T10:00:00Z'),
    })
    expect(result.ok).toBe(true)
    expect(result.newStreak).toBe(1)
  })

  it('weekly_scores upsert error returns ok:false', async () => {
    const supabase = makeSupabaseStub({
      user_gamification: {
        selectChain: { data: null, error: null },
        upsertResult: { error: null },
      },
      weekly_scores: {
        selectChain: { data: null, error: null },
        upsertResult: { error: { message: 'rls denied' } },
      },
    })
    const result = await awardXpAndStreak(supabase as any, {
      ...baseInput,
      rating: 'good',
      now: new Date('2026-05-20T10:00:00Z'),
    })
    expect(result.ok).toBe(false)
  })
})
