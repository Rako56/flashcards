/**
 * Tests for lib/supabase/env.ts — `requireEnv(name)` reader.
 *
 * Tiny helper but it's the throw site that all Supabase clients depend
 * on, so we want explicit coverage of the missing-var path.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { requireEnv } from '@/lib/supabase/env'

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('requireEnv', () => {
  it('returns the value when the variable is set to a non-empty string', () => {
    process.env['__TEST_FOO__'] = 'bar'
    expect(requireEnv('__TEST_FOO__')).toBe('bar')
  })

  it('throws a descriptive error when the variable is not set', () => {
    delete process.env['__TEST_MISSING__']
    expect(() => requireEnv('__TEST_MISSING__')).toThrowError(
      /Missing required environment variable: __TEST_MISSING__/,
    )
  })

  it('throws when the variable is set to an empty string', () => {
    process.env['__TEST_EMPTY__'] = ''
    expect(() => requireEnv('__TEST_EMPTY__')).toThrowError(
      /Missing required environment variable: __TEST_EMPTY__/,
    )
  })

  it('returns whitespace-only string as-is (caller validates content)', () => {
    // The helper checks falsy, not trimmed — '  ' is truthy. Documenting
    // current behavior so a future change that trims won't be silent.
    process.env['__TEST_WHITESPACE__'] = '   '
    expect(requireEnv('__TEST_WHITESPACE__')).toBe('   ')
  })
})
