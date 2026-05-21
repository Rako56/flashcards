import { describe, expect, it } from 'vitest'
import { cn } from '../utils'

describe('cn()', () => {
  it('joins truthy class names and drops falsy', () => {
    expect(cn('a', 'b', false && 'c', { d: true, e: false })).toBe('a b d')
  })

  it('resolves conflicting Tailwind utilities — later wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('preserves non-conflicting utilities', () => {
    expect(cn('text-red-500', 'font-bold')).toBe('text-red-500 font-bold')
  })

  it('flattens nested arrays (clsx behavior)', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c')
  })
})
