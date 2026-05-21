// tests/unit/utils.test.ts (Plan 1.3)
// Tests for lib/utils.ts cn() — Tailwind class composer (clsx + tailwind-merge).
import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('joins truthy class names and drops falsy', () => {
    expect(cn('a', 'b', false && 'c', { d: true, e: false })).toBe('a b d')
  })

  it('resolves conflicting Tailwind utilities — later wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops undefined and null inputs', () => {
    expect(cn(undefined, null, 'a')).toBe('a')
  })

  it('returns empty string when called with no inputs', () => {
    expect(cn()).toBe('')
  })

  it('preserves non-conflicting utilities', () => {
    expect(cn('text-red-500', 'font-bold')).toBe('text-red-500 font-bold')
  })

  it('flattens nested arrays (clsx behavior)', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c')
  })
})
