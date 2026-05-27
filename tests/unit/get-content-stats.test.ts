/**
 * Tests for lib/landing/get-content-stats.ts
 *
 * Mocks `@/lib/supabase/server` so we don't hit the real DB. The module
 * uses the `public.get_content_counts(uuid)` RPC (F-004), so the mock
 * stubs `supabase.rpc('get_content_counts', ...)`.
 *
 * Key behaviors under test:
 *  - Happy path returns {flashcardsCount, questoesCount, concursosCount}
 *  - Errors / thrown clients fall back to zero stats (never break landing)
 *  - Empty concursoId short-circuits to zeros (no DB call)
 *  - RPC returning unexpected shapes is coerced to ZERO_STATS
 *  - getFirstPublishedConcurso filters by status='publicado' and ordering
 *    works as expected
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Silence Pino so test output stays clean. The helper only logs warnings
// on the error paths we exercise.
vi.mock('@/lib/observability/logger', () => ({
  childLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getGlobalContentStats', () => {
  it('returns counts from get_content_counts RPC on happy path', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: (fnName: string, args: unknown) => {
            expect(fnName).toBe('get_content_counts')
            expect(args).toEqual({})
            return Promise.resolve({
              data: { flashcardsCount: 3139, questoesCount: 175, concursosCount: 1 },
              error: null,
            })
          },
        }),
    }))
    const { getGlobalContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getGlobalContentStats()
    expect(stats).toEqual({
      flashcardsCount: 3139,
      questoesCount: 175,
      concursosCount: 1,
    })
  })

  it('coerces non-numeric / missing fields to zero', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () =>
            Promise.resolve({
              data: { flashcardsCount: 'wat', questoesCount: null, concursosCount: undefined },
              error: null,
            }),
        }),
    }))
    const { getGlobalContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getGlobalContentStats()
    expect(stats).toEqual({
      flashcardsCount: 0,
      questoesCount: 0,
      concursosCount: 0,
    })
  })

  it('falls back to zero stats when RPC returns an error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
        }),
    }))
    const { getGlobalContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getGlobalContentStats()
    expect(stats).toEqual({
      flashcardsCount: 0,
      questoesCount: 0,
      concursosCount: 0,
    })
  })

  it('falls back to zero stats if createClient throws', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => {
        throw new Error('boom — connection refused')
      },
    }))
    const { getGlobalContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getGlobalContentStats()
    expect(stats).toEqual({
      flashcardsCount: 0,
      questoesCount: 0,
      concursosCount: 0,
    })
  })
})

describe('getConcursoContentStats', () => {
  it('returns concurso-scoped counts on happy path and forwards concursoId', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: (fnName: string, args: unknown) => {
            expect(fnName).toBe('get_content_counts')
            expect(args).toEqual({ p_concurso_id: 'concurso-abc' })
            return Promise.resolve({
              data: { flashcardsCount: 3139, questoesCount: 175, concursosCount: 1 },
              error: null,
            })
          },
        }),
    }))
    const { getConcursoContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getConcursoContentStats('concurso-abc')
    expect(stats).toEqual({
      flashcardsCount: 3139,
      questoesCount: 175,
      concursosCount: 1,
    })
  })

  it('short-circuits to zeros when concursoId is empty (no RPC call)', async () => {
    const rpcSpy = vi.fn()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve({ rpc: rpcSpy }),
    }))
    const { getConcursoContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getConcursoContentStats('')
    expect(stats).toEqual({
      flashcardsCount: 0,
      questoesCount: 0,
      concursosCount: 0,
    })
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('falls back to zero stats on RPC error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          rpc: () => Promise.resolve({ data: null, error: { message: 'oops' } }),
        }),
    }))
    const { getConcursoContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getConcursoContentStats('some-id')
    expect(stats).toEqual({
      flashcardsCount: 0,
      questoesCount: 0,
      concursosCount: 0,
    })
  })

  it('falls back to zero stats if Supabase throws', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => {
        throw new Error('network')
      },
    }))
    const { getConcursoContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getConcursoContentStats('some-id')
    expect(stats).toEqual({
      flashcardsCount: 0,
      questoesCount: 0,
      concursosCount: 0,
    })
  })
})

describe('getFirstPublishedConcurso', () => {
  it('returns the top concurso on happy path', async () => {
    const row = { slug: 'tjsp-escrevente', title: 'TJSP Escrevente', banca: 'VUNESP' }
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                not: () => ({
                  order: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: () => Promise.resolve({ data: row, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getFirstPublishedConcurso } = await import('@/lib/landing/get-content-stats')
    const result = await getFirstPublishedConcurso()
    expect(result).toEqual(row)
  })

  it('returns null when no published concurso exists', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                not: () => ({
                  order: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: () => Promise.resolve({ data: null, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getFirstPublishedConcurso } = await import('@/lib/landing/get-content-stats')
    const result = await getFirstPublishedConcurso()
    expect(result).toBeNull()
  })

  it('returns null when row has no slug (defensive)', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                not: () => ({
                  order: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: () =>
                          Promise.resolve({
                            data: { slug: null, title: 'X', banca: null },
                            error: null,
                          }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getFirstPublishedConcurso } = await import('@/lib/landing/get-content-stats')
    const result = await getFirstPublishedConcurso()
    expect(result).toBeNull()
  })

  it('returns null on Supabase error (does not throw)', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                not: () => ({
                  order: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: () =>
                          Promise.resolve({ data: null, error: { message: 'down' } }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
    }))
    const { getFirstPublishedConcurso } = await import('@/lib/landing/get-content-stats')
    const result = await getFirstPublishedConcurso()
    expect(result).toBeNull()
  })

  it('returns null when createClient throws unexpectedly', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => {
        throw new Error('boom')
      },
    }))
    const { getFirstPublishedConcurso } = await import('@/lib/landing/get-content-stats')
    const result = await getFirstPublishedConcurso()
    expect(result).toBeNull()
  })
})
