// lib/asaas/__tests__/placeholder.test.ts (Plan 1.3)
// Engages the ≥90% per-directory coverage threshold for lib/asaas/**.
// When Phase 4 lands real Asaas client code, this test is replaced.
import { describe, expect, it } from 'vitest'
import { PLACEHOLDER_VERSION } from '../index'

describe('lib/asaas placeholder', () => {
  it('exports the placeholder version constant', () => {
    expect(PLACEHOLDER_VERSION).toBe('p1-1.3-placeholder')
  })
})
