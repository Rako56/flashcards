/**
 * Tests for lib/activity/get-recent-activity.ts
 *
 * Pure-shape tests: window has correct length, days have stable ISO
 * date strings, zero-count days are present, joined rows count up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getRecentActivity', () => {
  const baseDate = new Date('2026-05-20T12:00:00Z')

  it('returns 7 days of buckets when called with default', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getRecentActivity } = await import('@/lib/activity/get-recent-activity')
    const result = await getRecentActivity('user-1', 'concurso-1', 7, baseDate)
    expect(result).toHaveLength(7)
    expect(result.every((b) => b.count === 0)).toBe(true)
  })

  it('first bucket is the earliest day (today - 6) when window=7', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getRecentActivity } = await import('@/lib/activity/get-recent-activity')
    const result = await getRecentActivity('user-1', 'concurso-1', 7, baseDate)
    expect(result[0]?.date).toBe('2026-05-14')
    expect(result[6]?.date).toBe('2026-05-20')
  })

  it('counts reviews per day, skipping wrong concurso or inactive cards', async () => {
    const rows = [
      // Counts: 2026-05-20 active concurso-1
      {
        reviewed_at: '2026-05-20T10:00:00Z',
        admin_flashcards: { concurso_id: 'concurso-1', status: 'active' },
      },
      {
        reviewed_at: '2026-05-20T11:00:00Z',
        admin_flashcards: { concurso_id: 'concurso-1', status: 'active' },
      },
      // Wrong concurso
      {
        reviewed_at: '2026-05-19T10:00:00Z',
        admin_flashcards: { concurso_id: 'concurso-X', status: 'active' },
      },
      // Inactive card
      {
        reviewed_at: '2026-05-18T10:00:00Z',
        admin_flashcards: { concurso_id: 'concurso-1', status: 'archived' },
      },
      // Null join
      { reviewed_at: '2026-05-17T10:00:00Z', admin_flashcards: null },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: rows, error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getRecentActivity } = await import('@/lib/activity/get-recent-activity')
    const result = await getRecentActivity('user-1', 'concurso-1', 7, baseDate)
    const onMay20 = result.find((b) => b.date === '2026-05-20')
    expect(onMay20?.count).toBe(2)
    const onMay19 = result.find((b) => b.date === '2026-05-19')
    expect(onMay19?.count).toBe(0) // wrong concurso filtered
    const onMay18 = result.find((b) => b.date === '2026-05-18')
    expect(onMay18?.count).toBe(0) // inactive card filtered
    const onMay17 = result.find((b) => b.date === '2026-05-17')
    expect(onMay17?.count).toBe(0) // null join filtered
  })

  it('returns zero-window for empty userId or concursoId', async () => {
    const { getRecentActivity } = await import('@/lib/activity/get-recent-activity')
    const a = await getRecentActivity('', 'c1', 7, baseDate)
    expect(a).toHaveLength(7)
    expect(a.every((b) => b.count === 0)).toBe(true)
    const b = await getRecentActivity('u1', '', 7, baseDate)
    expect(b).toHaveLength(7)
    expect(b.every((x) => x.count === 0)).toBe(true)
  })

  it('returns zero-window on supabase error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: null, error: { message: 'rls denied' } }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getRecentActivity } = await import('@/lib/activity/get-recent-activity')
    const result = await getRecentActivity('user-1', 'concurso-1', 7, baseDate)
    expect(result).toHaveLength(7)
    expect(result.every((b) => b.count === 0)).toBe(true)
  })

  it('supports custom days window', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getRecentActivity } = await import('@/lib/activity/get-recent-activity')
    const result = await getRecentActivity('user-1', 'concurso-1', 30, baseDate)
    expect(result).toHaveLength(30)
  })
})
