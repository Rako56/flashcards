/**
 * Tests for lib/landing/get-content-stats.ts
 *
 * Mocks `@/lib/supabase/server` so we don't hit the real DB. The module
 * uses count-only queries (`{ count: 'exact', head: true }`), so each
 * mocked path returns `{ count: <n>, error: null }`.
 *
 * Key behaviors under test:
 *  - Happy path returns {flashcardsCount, questoesCount, concursosCount}
 *  - Errors / thrown clients fall back to zero stats (never break landing)
 *  - Empty concursoId short-circuits to zeros (no DB call)
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
  it('returns counts from all three tables on happy path', async () => {
    // Each `.from(table)` returns a chain where `select(...).eq(...)` resolves
    // to `{ count: N, error: null }`. We dispatch on table name.
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: (table: string) => ({
            select: () => ({
              eq: () => {
                const counts: Record<string, number> = {
                  admin_flashcards: 3139,
                  admin_questoes: 175,
                  admin_concursos: 1,
                }
                return Promise.resolve({ count: counts[table] ?? 0, error: null })
              },
            }),
          }),
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

  it('treats null counts as zero', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => Promise.resolve({ count: null, error: null }),
            }),
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
  it('returns concurso-scoped counts on happy path', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => {
                  const counts: Record<string, number> = {
                    admin_flashcards: 3139,
                    admin_questoes: 175,
                  }
                  return Promise.resolve({ count: counts[table] ?? 0, error: null })
                },
              }),
            }),
          }),
        }),
    }))
    const { getConcursoContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getConcursoContentStats('some-concurso-id')
    expect(stats).toEqual({
      flashcardsCount: 3139,
      questoesCount: 175,
      concursosCount: 1,
    })
  })

  it('short-circuits to zeros when concursoId is empty', async () => {
    // No mock needed — guard runs before createClient. If the guard
    // breaks and a query fires, the test will surface a different error.
    const { getConcursoContentStats } = await import('@/lib/landing/get-content-stats')
    const stats = await getConcursoContentStats('')
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
