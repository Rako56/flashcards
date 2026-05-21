// lib/srs/__tests__/placeholder.test.ts (Plan 1.3)
// Engages the ≥90% per-directory coverage threshold for lib/srs/**.
// When Phase 5 lands real FSRS-5 code, this test is replaced by real algo tests.
import { describe, expect, it } from 'vitest'
import { PLACEHOLDER_VERSION } from '../index'

describe('lib/srs placeholder', () => {
  it('exports the placeholder version constant', () => {
    expect(PLACEHOLDER_VERSION).toBe('p1-1.3-placeholder')
  })
})
