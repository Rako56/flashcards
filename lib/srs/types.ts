/**
 * Spaced-Repetition Scheduling primitives.
 *
 * Built on ts-fsrs 5.x (FSRS-5 algorithm — Free Spaced Repetition
 * System, the open-source successor to SM-2). Default parameter set
 * comes from the FSRS authors based on millions of real Anki reviews.
 *
 * Rating semantics:
 *   - 'again': user did not recall — interval RESET, difficulty UP
 *   - 'hard':  recalled but with significant effort
 *   - 'good':  recalled with normal effort — default growth
 *   - 'easy':  recalled effortlessly — interval BOOST
 *
 * State machine (matches ts-fsrs State enum):
 *   - 'new':       never reviewed (default for newly-imported cards)
 *   - 'learning':  in the initial learning steps
 *   - 'review':    graduated to long-term review
 *   - 'relearning': lapsed (was 'review', user rated 'again')
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

/**
 * The per-user-per-card SRS state we persist between reviews. Mirrors
 * the live schema of `public.user_flashcard_progress` (subset).
 */
export interface CardProgress {
  /** Stability — expected memory lifespan in days. */
  stability: number
  /** Difficulty — 1 (trivial) to 10 (hard). */
  difficulty: number
  /** Number of times the user got it wrong after graduation. */
  lapses: number
  /** When the card was last shown. null = never reviewed. */
  last_reviewed_at: string | null
  /** When the card is next eligible to be shown. null = always eligible. */
  due_at: string | null
  /** Optional current state — derived from last review if not set. */
  state?: CardState
}

/**
 * The output of a single rating: the new progress to persist + the
 * datetime when the card should next surface in the queue.
 */
export interface NextReview {
  progress: CardProgress
  due_at: string
  log: {
    rating: Rating
    elapsedDays: number
    scheduledDays: number
    state: CardState
  }
}
