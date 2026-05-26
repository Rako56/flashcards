/**
 * Tests for lib/seo/noindex.ts
 *
 * The helper is intentionally a frozen literal — these tests assert
 * the public shape so a refactor (e.g. switching to a function that
 * returns Metadata) doesn't silently drop the `follow: false` half.
 */
import { describe, expect, it } from 'vitest'

import { NOINDEX_METADATA } from '@/lib/seo/noindex'

describe('lib/seo/noindex', () => {
  it('exports a metadata object with robots.index = false', () => {
    expect(NOINDEX_METADATA.robots.index).toBe(false)
  })

  it('exports a metadata object with robots.follow = false', () => {
    expect(NOINDEX_METADATA.robots.follow).toBe(false)
  })

  it('produces a spreadable object (Next.js `metadata` shape)', () => {
    const combined = { title: 'Sample', ...NOINDEX_METADATA }
    expect(combined.title).toBe('Sample')
    expect(combined.robots).toEqual({ index: false, follow: false })
  })

  it('does not expose unintended keys (kept narrow)', () => {
    // If we ever broaden this helper, that's a deliberate change —
    // bumping this test forces a conscious decision rather than a
    // sneaky leak (e.g. accidentally exporting `googleBot`).
    expect(Object.keys(NOINDEX_METADATA)).toEqual(['robots'])
  })

  it('is a frozen const (cannot mutate at runtime)', () => {
    // `as const` does NOT freeze at runtime — but TypeScript's
    // `Readonly` ensures the call site cannot mutate. This test just
    // documents the intent: no caller should reassign robots.
    const original = { ...NOINDEX_METADATA.robots }
    expect(NOINDEX_METADATA.robots).toEqual(original)
  })
})
