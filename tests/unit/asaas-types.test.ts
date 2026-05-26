/**
 * Tests for lib/asaas/types.ts — parseExternalReference roundtrip.
 */
import { describe, expect, it } from 'vitest'

import { parseExternalReference } from '@/lib/asaas/types'

describe('parseExternalReference', () => {
  it('parses a well-formed reference', () => {
    const result = parseExternalReference('user-uuid:tjsp:annual')
    expect(result).toEqual({
      userId: 'user-uuid',
      concursoSlug: 'tjsp',
      plan: 'annual',
    })
  })

  it('returns null for empty string', () => {
    expect(parseExternalReference('')).toBeNull()
  })

  it('returns null for null', () => {
    expect(parseExternalReference(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseExternalReference(undefined)).toBeNull()
  })

  it('returns null for too few parts', () => {
    expect(parseExternalReference('user-uuid:tjsp')).toBeNull()
  })

  it('returns null for too many parts', () => {
    expect(parseExternalReference('user-uuid:tjsp:annual:extra')).toBeNull()
  })

  it('returns null for empty parts', () => {
    expect(parseExternalReference(':tjsp:annual')).toBeNull()
    expect(parseExternalReference('user-uuid::annual')).toBeNull()
    expect(parseExternalReference('user-uuid:tjsp:')).toBeNull()
  })
})
