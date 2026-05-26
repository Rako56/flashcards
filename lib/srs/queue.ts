/**
 * Build the next study queue for a user + concurso.
 *
 * Logic:
 *  1. Fetch active flashcards for the concurso (status='active' only)
 *  2. Fetch the user's progress for those cards
 *  3. Partition into 3 lists:
 *     - DUE: progress.due_at <= now → priority 1
 *     - NEW: no progress row → priority 2
 *     - FUTURE: progress.due_at > now → priority 3 (excluded unless empty)
 *  4. Interleave (deterministic, not random — same input = same output)
 *  5. Return up to `limit` cards
 *
 * Critical: the returned list is then consumed by the session UI ONE
 * CARD AT A TIME. Each rating produces a new SRS state — the queue
 * itself is NOT regenerated mid-session. Instead the consumer should
 * keep a local `seenInSessionRef` Set and filter out cards already
 * shown. This was the canonical fix for the cards-repeat bug class
 * (see .planning/migration-notes/bugs-from-vite-version.md #4).
 *
 * This file is pure: takes data as input, returns ordered list.
 * Persistence lookups live in the calling Server Action.
 */
import type { CardProgress } from './types'

/**
 * Card content shape — minimum what the queue needs. Real type
 * comes from types/database.types.ts AdminFlashcardsRow but we keep
 * it loose here so this stays pure (no DB-specific imports).
 */
export interface QueueCard {
  id: string
  front_text: string
  back_text: string
  tipo_card: string
  topico_id: string | null
  disciplina_id: string | null
  fundamento_legal: string | null
}

export interface QueueCardWithProgress extends QueueCard {
  progress: CardProgress | null
}

export interface BuildQueueOptions {
  /**
   * Max cards in returned queue. Default 20 (a typical session length).
   */
  limit?: number
  /**
   * Reference time for "due" comparison. Defaults to now. Parameterized
   * for deterministic tests.
   */
  now?: Date
  /**
   * IDs to exclude (e.g., cards already shown in this session).
   * Plays the role of the legacy `seenInSessionRef` Set.
   */
  excludeIds?: Set<string>
}

/**
 * Build the next queue, deterministically sorted by priority then by
 * card id (stable within a tie — same input always returns same order).
 */
export function buildQueue(
  cards: QueueCardWithProgress[],
  options: BuildQueueOptions = {},
): QueueCard[] {
  const { limit = 20, now = new Date(), excludeIds } = options
  const nowMs = now.getTime()

  const dueCards: QueueCardWithProgress[] = []
  const newCards: QueueCardWithProgress[] = []
  const futureCards: QueueCardWithProgress[] = []

  for (const card of cards) {
    if (excludeIds?.has(card.id)) continue
    const p = card.progress
    if (!p) {
      newCards.push(card)
      continue
    }
    if (!p.due_at) {
      // No due_at = treat like new (defensive — shouldn't happen post-Plan 5.2)
      newCards.push(card)
      continue
    }
    if (new Date(p.due_at).getTime() <= nowMs) {
      dueCards.push(card)
    } else {
      futureCards.push(card)
    }
  }

  // Sort each bucket stably by id (deterministic)
  dueCards.sort((a, b) => a.id.localeCompare(b.id))
  newCards.sort((a, b) => a.id.localeCompare(b.id))

  // Priority order: DUE first (forgetting curve catch-up), then NEW
  // (introduce new content), then FUTURE only as filler if both empty.
  const ordered: QueueCardWithProgress[] = [...dueCards, ...newCards]

  if (ordered.length < limit) {
    // Filler from future bucket — sort by closest due_at first
    futureCards.sort((a, b) => {
      const aDue = new Date(a.progress?.due_at ?? 0).getTime()
      const bDue = new Date(b.progress?.due_at ?? 0).getTime()
      return aDue - bDue
    })
    ordered.push(...futureCards)
  }

  return ordered.slice(0, limit).map(toQueueCard)
}

function toQueueCard(c: QueueCardWithProgress): QueueCard {
  return {
    id: c.id,
    front_text: c.front_text,
    back_text: c.back_text,
    tipo_card: c.tipo_card,
    topico_id: c.topico_id,
    disciplina_id: c.disciplina_id,
    fundamento_legal: c.fundamento_legal,
  }
}
