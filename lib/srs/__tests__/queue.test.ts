/**
 * Tests for lib/srs/queue.ts
 *
 * Validates the priority partitioning (DUE → NEW → FUTURE), the
 * deterministic ordering, the excludeIds dedup (legacy bug class #4),
 * and the limit cap.
 */
import { describe, expect, it } from 'vitest'

import { buildQueue, type QueueCardWithProgress } from '@/lib/srs/queue'
import type { CardProgress } from '@/lib/srs/types'

const FIXED_NOW = new Date('2026-05-26T10:00:00Z')

function makeCard(id: string, progress: CardProgress | null): QueueCardWithProgress {
  return {
    id,
    front_text: `front-${id}`,
    back_text: `back-${id}`,
    tipo_card: 'conceito',
    topico_id: null,
    disciplina_id: null,
    fundamento_legal: null,
    progress,
  }
}

const dueProgress = (dueOffsetMs: number): CardProgress => ({
  stability: 5,
  difficulty: 4,
  lapses: 0,
  last_reviewed_at: new Date(FIXED_NOW.getTime() - 5 * 86_400_000).toISOString(),
  due_at: new Date(FIXED_NOW.getTime() + dueOffsetMs).toISOString(),
  state: 'review',
})

describe('buildQueue', () => {
  it('returns empty list when there are no cards', () => {
    expect(buildQueue([], { now: FIXED_NOW })).toEqual([])
  })

  it('prioritises DUE cards before NEW cards', () => {
    const queue = buildQueue(
      [
        makeCard('new-1', null),
        makeCard('due-1', dueProgress(-86_400_000)),
        makeCard('new-2', null),
        makeCard('due-2', dueProgress(-3 * 86_400_000)),
      ],
      { now: FIXED_NOW, limit: 4 },
    )
    expect(queue.map((c) => c.id)).toEqual(['due-1', 'due-2', 'new-1', 'new-2'])
  })

  it('excludes cards with due_at in the future unless slots remain', () => {
    const queue = buildQueue(
      [makeCard('future-1', dueProgress(86_400_000)), makeCard('due-1', dueProgress(-1))],
      { now: FIXED_NOW, limit: 5 },
    )
    // Both fit under limit — future card included as filler
    expect(queue.map((c) => c.id)).toEqual(['due-1', 'future-1'])
  })

  it('excludes future cards when DUE+NEW already fill the limit', () => {
    const queue = buildQueue(
      [
        makeCard('future-1', dueProgress(86_400_000)),
        makeCard('due-1', dueProgress(-1)),
        makeCard('new-1', null),
      ],
      { now: FIXED_NOW, limit: 2 },
    )
    expect(queue.map((c) => c.id)).toEqual(['due-1', 'new-1'])
  })

  it('respects excludeIds (legacy bug class — same card showing twice)', () => {
    const queue = buildQueue(
      [
        makeCard('due-1', dueProgress(-1)),
        makeCard('due-2', dueProgress(-1)),
        makeCard('due-3', dueProgress(-1)),
      ],
      { now: FIXED_NOW, limit: 10, excludeIds: new Set(['due-2']) },
    )
    expect(queue.map((c) => c.id)).toEqual(['due-1', 'due-3'])
  })

  it('caps result at the limit', () => {
    const cards: QueueCardWithProgress[] = []
    for (let i = 0; i < 50; i++) {
      cards.push(makeCard(`card-${String(i).padStart(2, '0')}`, dueProgress(-1)))
    }
    const queue = buildQueue(cards, { now: FIXED_NOW, limit: 5 })
    expect(queue).toHaveLength(5)
  })

  it('returns a deterministic order on the same input', () => {
    const cards = [
      makeCard('z-due', dueProgress(-1)),
      makeCard('a-due', dueProgress(-1)),
      makeCard('m-due', dueProgress(-1)),
    ]
    const q1 = buildQueue(cards, { now: FIXED_NOW })
    const q2 = buildQueue(cards, { now: FIXED_NOW })
    expect(q1.map((c) => c.id)).toEqual(q2.map((c) => c.id))
    expect(q1.map((c) => c.id)).toEqual(['a-due', 'm-due', 'z-due'])
  })

  it('treats progress without due_at as NEW (defensive)', () => {
    const orphan: CardProgress = {
      stability: 5,
      difficulty: 4,
      lapses: 0,
      last_reviewed_at: null,
      due_at: null,
    }
    const queue = buildQueue([makeCard('orphan-1', orphan), makeCard('new-1', null)], {
      now: FIXED_NOW,
    })
    // Both end up in NEW bucket, sorted by id
    expect(queue.map((c) => c.id)).toEqual(['new-1', 'orphan-1'])
  })

  it('returned card shape strips the progress field (UI-facing)', () => {
    const queue = buildQueue([makeCard('a', dueProgress(-1))], { now: FIXED_NOW })
    expect(queue[0]).not.toHaveProperty('progress')
    expect(Object.keys(queue[0]!).sort()).toEqual([
      'back_text',
      'disciplina_id',
      'front_text',
      'fundamento_legal',
      'id',
      'tipo_card',
      'topico_id',
    ])
  })
})
