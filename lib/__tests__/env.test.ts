import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env, resetEnvCacheForTests } from '../env'

describe('env()', () => {
  beforeEach(() => {
    resetEnvCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    resetEnvCacheForTests()
  })

  it('returns a typed object when all required vars are valid', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'x'.repeat(40))
    const e = env()
    expect(e.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')
    expect(e.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('x'.repeat(40))
  })

  it('throws when NEXT_PUBLIC_SUPABASE_URL is not a valid URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not-a-url')
    expect(() => env()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is too short', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'short')
    expect(() => env()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  })

  it('defaults LOG_LEVEL to "info" when unset', () => {
    const e = env()
    expect(e.LOG_LEVEL).toBe('info')
  })

  it('defaults NEXT_PUBLIC_ROOT_DOMAIN to "flashcards.com.br"', () => {
    const e = env()
    expect(e.NEXT_PUBLIC_ROOT_DOMAIN).toBe('flashcards.com.br')
  })

  it('defaults NEXT_PUBLIC_APP_URL to "https://flashcards.com.br"', () => {
    const e = env()
    expect(e.NEXT_PUBLIC_APP_URL).toBe('https://flashcards.com.br')
  })

  it('caches the parsed env across calls', () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    const e1 = env()
    vi.stubEnv('LOG_LEVEL', 'fatal')
    const e2 = env()
    expect(e1).toBe(e2)
    expect(e2.LOG_LEVEL).toBe('debug')
  })
})
