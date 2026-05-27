/**
 * Tests for lib/simulados/get-questions.ts
 *
 * Mocks Supabase. Covers empty input, order preservation, missing
 * id drop, error path. Error path also asserts Sentry capture
 * (silent-fallback hardening).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/logger', () => ({
  childLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}))

const captureMock = vi.fn()
vi.mock('@/lib/observability/sentry', () => ({
  captureWithCorrelation: captureMock,
}))

beforeEach(() => {
  vi.resetModules()
  captureMock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeStub(result: { data: unknown[] | null; error: { message: string } | null }) {
  return {
    from: () => ({
      select: () => ({
        in: () => Promise.resolve(result),
      }),
    }),
  }
}

describe('getSimuladoQuestions', () => {
  it('returns [] for empty ids', async () => {
    const { getSimuladoQuestions } = await import('@/lib/simulados/get-questions')
    expect(await getSimuladoQuestions([])).toEqual([])
  })

  it('returns rows in the same order as input ids', async () => {
    // DB returns rows in arbitrary order (here: q2 then q1)
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve(
          makeStub({
            data: [
              {
                id: 'q2',
                enunciado: 'B',
                alternativas: null,
                gabarito: null,
                explicacao: null,
                disciplina_sugerida: null,
                anulada: false,
                dificuldade: null,
              },
              {
                id: 'q1',
                enunciado: 'A',
                alternativas: null,
                gabarito: null,
                explicacao: null,
                disciplina_sugerida: null,
                anulada: false,
                dificuldade: null,
              },
            ],
            error: null,
          }),
        ),
    }))
    const { getSimuladoQuestions } = await import('@/lib/simulados/get-questions')
    const result = await getSimuladoQuestions(['q1', 'q2'])
    expect(result.map((q) => q.id)).toEqual(['q1', 'q2'])
  })

  it('drops missing ids (archived/deleted) silently', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve(
          makeStub({
            data: [
              {
                id: 'q1',
                enunciado: 'A',
                alternativas: null,
                gabarito: null,
                explicacao: null,
                disciplina_sugerida: null,
                anulada: false,
                dificuldade: null,
              },
            ],
            error: null,
          }),
        ),
    }))
    const { getSimuladoQuestions } = await import('@/lib/simulados/get-questions')
    const result = await getSimuladoQuestions(['q1', 'q-missing'])
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('q1')
  })

  it('returns [] on supabase error AND fires Sentry', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve(makeStub({ data: null, error: { message: 'rls denied' } })),
    }))
    const { getSimuladoQuestions } = await import('@/lib/simulados/get-questions')
    expect(await getSimuladoQuestions(['q1'])).toEqual([])
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0]![2]).toMatchObject({
      helper: 'getSimuladoQuestions',
      questionCount: 1,
    })
  })

  it('does not fire Sentry when input is empty (legitimate guard)', async () => {
    const { getSimuladoQuestions } = await import('@/lib/simulados/get-questions')
    expect(await getSimuladoQuestions([])).toEqual([])
    expect(captureMock).not.toHaveBeenCalled()
  })
})
