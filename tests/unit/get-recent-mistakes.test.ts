/**
 * Tests for lib/mistakes/get-recent.ts
 *
 * The helper delegates to the get_recent_mistakes RPC (F-007), which does
 * the latest-review-per-card + concurso + active filtering server-side. So
 * these unit tests cover the helper's contract: the empty guard, mapping
 * the RPC's flat rows to MistakeReview, and error rejection. The
 * suppression/filter LOGIC is verified at the DB level (migration rollback
 * test: a card whose latest review is 'good' is excluded; 'again' is kept).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function clientReturning(result: { data: unknown[] | null; error: { message: string } | null }) {
  return {
    createClient: () => Promise.resolve({ rpc: () => Promise.resolve(result) }),
  }
}

describe('getRecentMistakes', () => {
  it('returns [] for empty userId', async () => {
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    expect(await getRecentMistakes('', 'concurso-1')).toEqual([])
  })

  it('returns [] for empty concursoId', async () => {
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    expect(await getRecentMistakes('user-1', '')).toEqual([])
  })

  it('maps RPC rows to MistakeReview', async () => {
    const rows = [
      {
        card_id: 'card-1',
        reviewed_at: '2026-05-20T10:00:00Z',
        front_text: 'Pergunta',
        back_text: 'Resposta',
        tipo_card: 'conceito',
        topico_titulo: 'Tópico X',
        disciplina_titulo: 'Direito Civil',
        fundamento_legal: 'Art. 5º CF',
      },
    ]
    vi.doMock('@/lib/supabase/server', () => clientReturning({ data: rows, error: null }))
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    const result = await getRecentMistakes('user-1', 'concurso-1')
    expect(result).toHaveLength(1)
    expect(result[0]?.card_id).toBe('card-1')
    expect(result[0]?.disciplina_titulo).toBe('Direito Civil')
  })

  it('throws on RPC error', async () => {
    vi.doMock('@/lib/supabase/server', () =>
      clientReturning({ data: null, error: { message: 'rls denied' } }),
    )
    const { getRecentMistakes } = await import('@/lib/mistakes/get-recent')
    await expect(getRecentMistakes('user-1', 'concurso-1')).rejects.toThrow(/rls denied/)
  })
})
