// lib/access/__tests__/placeholder.test.ts (Plan 1.3)
// Engages the ≥90% per-directory coverage threshold for lib/access/**.
// When Phase 3 lands real access helpers, this test is replaced.
import { describe, expect, it } from 'vitest'
import { PLACEHOLDER_VERSION } from '../index'

describe('lib/access placeholder', () => {
  it('exports the placeholder version constant', () => {
    expect(PLACEHOLDER_VERSION).toBe('p1-1.3-placeholder')
  })
})
