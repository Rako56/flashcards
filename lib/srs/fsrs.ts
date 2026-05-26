/**
 * FSRS-5 wrapper — turns the ts-fsrs library into our typed API.
 *
 * Pure functions only. No I/O. Persistence belongs to the caller
 * (Server Action that writes `user_flashcard_progress` + appends
 * to `srs_reviews`).
 */
import {
  FSRS,
  Rating as TsFsrsRating,
  State as TsFsrsState,
  createEmptyCard,
  generatorParameters,
  type Card as TsFsrsCard,
  type Grade,
} from 'ts-fsrs'

import type { CardProgress, CardState, NextReview, Rating } from './types'

// Default FSRS-5 parameters. The 19-weight tuple is meant to be
// fitted from a user's history; default values are the FSRS authors'
// recommended general-purpose starting point.
const fsrs = new FSRS(
  generatorParameters({
    enable_fuzz: true, // jitter to avoid scheduling clumps
    enable_short_term: true, // honor short steps for new cards
  }),
)

const RATING_MAP: Record<Rating, Grade> = {
  again: TsFsrsRating.Again,
  hard: TsFsrsRating.Hard,
  good: TsFsrsRating.Good,
  easy: TsFsrsRating.Easy,
}

const STATE_FROM_TS: Record<TsFsrsState, CardState> = {
  [TsFsrsState.New]: 'new',
  [TsFsrsState.Learning]: 'learning',
  [TsFsrsState.Review]: 'review',
  [TsFsrsState.Relearning]: 'relearning',
}

const STATE_TO_TS: Record<CardState, TsFsrsState> = {
  new: TsFsrsState.New,
  learning: TsFsrsState.Learning,
  review: TsFsrsState.Review,
  relearning: TsFsrsState.Relearning,
}

/**
 * Schedule the next review given the user's rating.
 *
 * - `progress` may be undefined or have fields all zero/null — that's
 *   treated as a brand-new card.
 * - `now` defaults to current time, parameterized for deterministic tests.
 */
export function scheduleNext(
  progress: CardProgress | null | undefined,
  rating: Rating,
  now: Date = new Date(),
): NextReview {
  const card = toTsFsrsCard(progress, now)
  const result = fsrs.next(card, now, RATING_MAP[rating])

  const newCard = result.card

  return {
    progress: {
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      lapses: newCard.lapses,
      last_reviewed_at: now.toISOString(),
      due_at: newCard.due.toISOString(),
      state: STATE_FROM_TS[newCard.state],
    },
    due_at: newCard.due.toISOString(),
    log: {
      rating,
      // `result.log.elapsed_days` is deprecated in ts-fsrs 5.x in favor
      // of `scheduled_days` only. We compute elapsed from `last_review`
      // for now until ts-fsrs 6 lands and we adapt.
      elapsedDays: result.log.scheduled_days,
      scheduledDays: result.log.scheduled_days,
      state: STATE_FROM_TS[newCard.state],
    },
  }
}

/**
 * Convert our `CardProgress` shape to ts-fsrs `Card`. Missing fields
 * → treated as a brand-new card (createEmptyCard).
 */
function toTsFsrsCard(progress: CardProgress | null | undefined, now: Date): TsFsrsCard {
  if (!progress || (progress.stability === 0 && progress.difficulty === 0)) {
    return createEmptyCard(now)
  }
  const empty = createEmptyCard(now)
  const card: TsFsrsCard = {
    ...empty,
    stability: progress.stability,
    difficulty: progress.difficulty,
    lapses: progress.lapses,
    due: progress.due_at ? new Date(progress.due_at) : empty.due,
    state: progress.state ? STATE_TO_TS[progress.state] : empty.state,
  }
  if (progress.last_reviewed_at) {
    card.last_review = new Date(progress.last_reviewed_at)
  }
  return card
}
