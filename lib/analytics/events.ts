/**
 * Analytics event helpers — Phase 10 scaffold.
 *
 * Provider-agnostic interface so we can swap PostHog ↔ Plausible ↔ GA4
 * without touching call sites. Reads `NEXT_PUBLIC_ANALYTICS_KEY` at
 * boot time; when absent, every call is a no-op (no warning spam).
 *
 * Server side (Server Actions, Route Handlers): call `trackServerEvent`.
 * Client side (interactive UI): call `trackClientEvent` via the hook
 * in `use-analytics.ts`.
 *
 * Event taxonomy (lowercase snake_case, past tense for completed actions):
 *   - card_rated
 *   - mistake_marked_mastered
 *   - simulado_created
 *   - signup_started
 *   - signup_completed
 *   - checkout_started
 *   - checkout_completed   (fired by webhook handler)
 *   - lgpd_deletion_requested
 *
 * NEVER include PII in event properties. Use the user's ID hash if needed.
 */

export type AnalyticsEventName =
  | 'card_rated'
  | 'mistake_marked_mastered'
  | 'simulado_created'
  | 'signup_started'
  | 'signup_completed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'lgpd_deletion_requested'

export interface AnalyticsEventProps {
  /** Hashed/external user id — NEVER raw email or CPF */
  user_id?: string
  /** Concurso slug (public, safe to track) */
  concurso?: string
  /** Free-form numeric metric */
  value?: number
  /** Free-form string discriminator (e.g., rating='good', plan='annual') */
  variant?: string
}

const SERVER_KEY = process.env['ANALYTICS_KEY']
const CLIENT_KEY = process.env['NEXT_PUBLIC_ANALYTICS_KEY']
const ENABLED_SERVER = Boolean(SERVER_KEY)
const ENABLED_CLIENT = Boolean(CLIENT_KEY)

/**
 * Server-side fire-and-forget event sender. Returns immediately;
 * any provider network call is awaited internally without throwing.
 *
 * Currently a no-op pending POSTHOG_KEY / PLAUSIBLE_API_KEY.
 * When key arrives, swap this for the real POST.
 */
export async function trackServerEvent(
  event: AnalyticsEventName,
  props: AnalyticsEventProps = {},
): Promise<void> {
  if (!ENABLED_SERVER) return
  // Placeholder: a real impl would POST to PostHog /capture or similar
  // We intentionally don't enable boot-time warn logs because event
  // fires happen at high-frequency paths and noise would drown
  // legitimate Pino output. When ANALYTICS_KEY arrives, replace this
  // body with the actual HTTPS call.
  await Promise.resolve({ event, props })
}

/**
 * Whether analytics is configured for client emission. Exposed so the
 * client hook can avoid loading the provider SDK at all when off.
 */
export function isClientAnalyticsEnabled(): boolean {
  return ENABLED_CLIENT
}

/**
 * Server-only flag, used by Server Actions to gate tracking.
 */
export function isServerAnalyticsEnabled(): boolean {
  return ENABLED_SERVER
}
