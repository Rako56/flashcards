/**
 * Tests for lib/mistakes/get-recent.ts
 *
 * Mocks `@/lib/supabase/server` so we don't touch the real DB. Covers
 * the user-or-concurso empty guard, happy path with the join-shape
 * Supabase actually returns, the cross-concurso filter, the status
 * filter, the orphan-row defensive skip, and error rejection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

interface MockChain {
  select: (s: string) => MockChain
  eq: (col: string, val: string) => MockChain
  gte: (col: string, val: string) => MockChain
  order: (col: string, opts: { ascending: boolean }) => MockChain
  limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
}

function chainFor(result: {
  data: unknown[] | null
  error: { message: string } | null
}): MockChain {
  const chain: MockChain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => Promise.resolve(result),
  }
  return chain
}

describe('getRecentMistakes', () => {
  it('returns [] for empty userId', async () => {
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('', 'concurso-1')
    expect(result).toEqual([])
  })

  it('returns [] for empty concursoId', async () => {
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', '')
    expect(result).toEqual([])
  })

  it('returns mapped rows on hit', async () => {
    const rows = [
      {
        flashcard_id: 'card-1',
        reviewed_at: '2026-05-20T10:00:00Z',
        admin_flashcards: {
          id: 'card-1',
          concurso_id: 'concurso-1',
          front_text: 'Pergunta',
          back_text: 'Resposta',
          tipo_card: 'concept',
          topico_titulo: 'Tópico X',
          disciplina_titulo: 'Direito Civil',
          fundamento_legal: 'Art. 5º CF',
          status: 'active',
        },
      },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => chainFor({ data: rows, error: null }),
        }),
    }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', 'concurso-1')
    expect(result).toHaveLength(1)
    expect(result[0]?.card_id).toBe('card-1')
    expect(result[0]?.disciplina_titulo).toBe('Direito Civil')
  })

  it('drops rows that belong to a different concurso', async () => {
    const rows = [
      {
        flashcard_id: 'card-x',
        reviewed_at: '2026-05-20T10:00:00Z',
        admin_flashcards: {
          id: 'card-x',
          concurso_id: 'OTHER',
          front_text: 'Q',
          back_text: 'A',
          tipo_card: 'concept',
          topico_titulo: null,
          disciplina_titulo: null,
          fundamento_legal: null,
          status: 'active',
        },
      },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => chainFor({ data: rows, error: null }),
        }),
    }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', 'concurso-1')
    expect(result).toEqual([])
  })

  it('drops rows whose admin_flashcards status is not active', async () => {
    const rows = [
      {
        flashcard_id: 'card-y',
        reviewed_at: '2026-05-20T10:00:00Z',
        admin_flashcards: {
          id: 'card-y',
          concurso_id: 'concurso-1',
          front_text: 'Q',
          back_text: 'A',
          tipo_card: 'concept',
          topico_titulo: null,
          disciplina_titulo: null,
          fundamento_legal: null,
          status: 'archived',
        },
      },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => chainFor({ data: rows, error: null }),
        }),
    }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', 'concurso-1')
    expect(result).toEqual([])
  })

  it('skips rows where the joined admin_flashcards is null', async () => {
    const rows = [
      {
        flashcard_id: 'card-orphan',
        reviewed_at: '2026-05-20T10:00:00Z',
        admin_flashcards: null,
      },
    ]
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => chainFor({ data: rows, error: null }),
        }),
    }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', 'concurso-1')
    expect(result).toEqual([])
  })

  it('returns [] when supabase returns null data', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => chainFor({ data: null, error: null }),
        }),
    }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', 'concurso-1')
    expect(result).toEqual([])
  })

  it('throws on supabase error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => chainFor({ data: null, error: { message: 'rls denied' } }),
        }),
    }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    await expect(getRecentMistakes('user-1', 'concurso-1')).rejects.toThrow(/rls denied/)
  })
})
