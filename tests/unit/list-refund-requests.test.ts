/**
 * Tests for lib/admin/list-refund-requests.ts
 *
 * Mocks Supabase. Covers happy path, status filter forwarding,
 * pagination, error path (empty + Sentry).
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

interface BuilderTrace {
  range?: [number, number]
  eq: [string, unknown][]
}

function makeQueryStub(result: {
  data: unknown[] | null
  error: { message: string } | null
  count: number | null
}) {
  const trace: BuilderTrace = { eq: [] }
  const builder = {
    order() {
      return builder
    },
    range(from: number, to: number) {
      trace.range = [from, to]
      return builder
    },
    eq(col: string, value: unknown) {
      trace.eq.push([col, value])
      return builder
    },
    then<T>(onfulfilled: (r: typeof result) => T) {
      return Promise.resolve(result).then(onfulfilled)
    },
  }
  return { builder, trace }
}

describe('listRefundRequests', () => {
  it('returns rows + total on happy path with defaults', async () => {
    const rows = [
      {
        id: 'r1',
        email: 'a@b.com',
        user_id: 'u1',
        concurso_slug: 'tjsp-escrevente',
        cpf_digits: null,
        motivo: 'não consegui acessar',
        status: 'pending',
        admin_notes: null,
        created_at: '2026-05-27T10:00:00Z',
        processed_at: null,
      },
    ]
    const { builder, trace } = makeQueryStub({ data: rows, error: null, count: 1 })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve({ from: () => ({ select: () => builder }) }),
    }))
    const { listRefundRequests } = await import('@/lib/admin/list-refund-requests')
    const result = await listRefundRequests()
    expect(result.rows).toEqual(rows)
    expect(result.total).toBe(1)
    expect(trace.range).toEqual([0, 49])
    expect(trace.eq).toEqual([])
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('forwards status filter as .eq() and uses custom pagination', async () => {
    const { builder, trace } = makeQueryStub({ data: [], error: null, count: 0 })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve({ from: () => ({ select: () => builder }) }),
    }))
    const { listRefundRequests } = await import('@/lib/admin/list-refund-requests')
    await listRefundRequests({ status: 'pending', limit: 10, offset: 20 })
    expect(trace.eq).toContainEqual(['status', 'pending'])
    expect(trace.range).toEqual([20, 29])
  })

  it('returns empty + fires Sentry on db error', async () => {
    const { builder } = makeQueryStub({ data: null, error: { message: 'down' }, count: null })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve({ from: () => ({ select: () => builder }) }),
    }))
    const { listRefundRequests } = await import('@/lib/admin/list-refund-requests')
    const result = await listRefundRequests()
    expect(result).toEqual({ rows: [], total: 0 })
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0]![2]).toMatchObject({ helper: 'listRefundRequests' })
  })
})
