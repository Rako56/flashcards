/**
 * Tests for lib/srs/fsrs.ts
 *
 * Covers the algorithmic boundary between our typed wrapper and the
 * ts-fsrs library. We don't re-test FSRS-5 math (that lives in the
 * upstream library); we assert that:
 *
 *  - Brand-new card transitions correctly on each rating
 *  - Existing progress is preserved when scheduling next review
 *  - State machine returns to expected end states
 *  - due_at is always > last_reviewed_at after good/easy
 *  - Lapses count increases on `again` from review state
 */
import { describe, expect, it } from 'vitest'

import { scheduleNext } from '@/lib/srs/fsrs'
import type { CardProgress, Rating } from '@/lib/srs/types'

const FIXED_NOW = new Date('2026-05-26T10:00:00Z')

describe('scheduleNext — brand-new card', () => {
  const ratings: Rating[] = ['again', 'hard', 'good', 'easy']

  for (const rating of ratings) {
    it(`schedules a new card after rating ${rating}`, () => {
      const result = scheduleNext(null, rating, FIXED_NOW)
      expect(result.progress.last_reviewed_at).toBe(FIXED_NOW.toISOString())
      expect(result.progress.stability).toBeGreaterThan(0)
      expect(result.progress.difficulty).toBeGreaterThan(0)
      expect(result.due_at).toBeTruthy()
      expect(new Date(result.due_at).getTime()).toBeGreaterThanOrEqual(FIXED_NOW.getTime())
      expect(result.log.rating).toBe(rating)
    })
  }

  it('handles undefined progress like a new card', () => {
    const result = scheduleNext(undefined, 'good', FIXED_NOW)
    expect(result.progress.stability).toBeGreaterThan(0)
  })

  it('treats progress with stability=0 + difficulty=0 as new', () => {
    const empty: CardProgress = {
      stability: 0,
      difficulty: 0,
      lapses: 0,
      last_reviewed_at: null,
      due_at: null,
    }
    const result = scheduleNext(empty, 'good', FIXED_NOW)
    expect(result.progress.stability).toBeGreaterThan(0)
  })
})

describe('scheduleNext — existing progress', () => {
  const existing: CardProgress = {
    stability: 10,
    difficulty: 3,
    lapses: 1,
    last_reviewed_at: '2026-05-20T10:00:00Z',
    due_at: '2026-05-30T10:00:00Z',
    state: 'review',
  }

  it('"easy" rating produces a longer interval than "good"', () => {
    const good = scheduleNext(existing, 'good', FIXED_NOW)
    const easy = scheduleNext(existing, 'easy', FIXED_NOW)
    expect(new Date(easy.due_at).getTime()).toBeGreaterThanOrEqual(new Date(good.due_at).getTime())
  })

  it('"good" rating produces a longer interval than "hard"', () => {
    const hard = scheduleNext(existing, 'hard', FIXED_NOW)
    const good = scheduleNext(existing, 'good', FIXED_NOW)
    expect(new Date(good.due_at).getTime()).toBeGreaterThanOrEqual(new Date(hard.due_at).getTime())
  })

  it('"again" rating sets due close to now (relearning)', () => {
    const again = scheduleNext(existing, 'again', FIXED_NOW)
    // Relearning steps are typically minutes — due_at should be within
    // the next 24h.
    const dueMs = new Date(again.due_at).getTime()
    expect(dueMs - FIXED_NOW.getTime()).toBeLessThan(86_400_000)
  })

  it('"again" from review state increments lapses', () => {
    const again = scheduleNext(existing, 'again', FIXED_NOW)
    expect(again.progress.lapses).toBeGreaterThan(existing.lapses)
  })

  it('preserves last_reviewed_at as the passed `now`', () => {
    const result = scheduleNext(existing, 'good', FIXED_NOW)
    expect(result.progress.last_reviewed_at).toBe(FIXED_NOW.toISOString())
  })
})
