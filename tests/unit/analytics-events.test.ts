/**
 * Tests for lib/analytics/events.ts
 *
 * Scaffold dormant until ANALYTICS_KEY arrives. Tests assert:
 * - no-op when env missing
 * - enable flags reflect env presence
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ORIGINAL_SERVER = process.env['ANALYTICS_KEY']
const ORIGINAL_CLIENT = process.env['NEXT_PUBLIC_ANALYTICS_KEY']

beforeEach(() => {
  delete process.env['ANALYTICS_KEY']
  delete process.env['NEXT_PUBLIC_ANALYTICS_KEY']
})

afterEach(() => {
  if (ORIGINAL_SERVER === undefined) delete process.env['ANALYTICS_KEY']
  else process.env['ANALYTICS_KEY'] = ORIGINAL_SERVER
  if (ORIGINAL_CLIENT === undefined) delete process.env['NEXT_PUBLIC_ANALYTICS_KEY']
  else process.env['NEXT_PUBLIC_ANALYTICS_KEY'] = ORIGINAL_CLIENT
})

describe('analytics events', () => {
  it('is disabled by default when env keys missing', async () => {
    const { isClientAnalyticsEnabled, isServerAnalyticsEnabled } =
      await import('@/lib/analytics/events')
    expect(isClientAnalyticsEnabled()).toBe(false)
    expect(isServerAnalyticsEnabled()).toBe(false)
  })

  it('trackServerEvent is a no-op when disabled (does not throw)', async () => {
    const { trackServerEvent } = await import('@/lib/analytics/events')
    await expect(
      trackServerEvent('card_rated', { user_id: 'u1', variant: 'good' }),
    ).resolves.toBeUndefined()
  })
})
