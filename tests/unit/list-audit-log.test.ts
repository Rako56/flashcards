/**
 * Tests for lib/admin/list-audit-log.ts
 *
 * Mocks Supabase. Covers happy path, action/userId filter forwarding,
 * default + custom pagination, and error path (returns empty + Sentry).
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
  order?: [string, { ascending: boolean }]
  eq: [string, unknown][]
}

/**
 * Build a Postgrest-shaped chainable mock. Records the chained call args
 * in `trace` and resolves with the given result. The chain re-returns
 * `this` from order/range/eq so the helper's fluent API works.
 */
function makeQueryStub(result: {
  data: unknown[] | null
  error: { message: string } | null
  count: number | null
}) {
  const trace: BuilderTrace = { eq: [] }

  const builder = {
    order(col: string, opts: { ascending: boolean }) {
      trace.order = [col, opts]
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

describe('listAuditLog', () => {
  it('returns rows + total + facet on happy path with defaults', async () => {
    const rows = [
      {
        id: 'a1',
        action: 'user_deletion',
        user_id: 'u1',
        resource_type: null,
        resource_id: null,
        correlation_id: null,
        ip_address: null,
        user_agent: null,
        metadata: null,
        created_at: '2026-05-27T10:00:00Z',
      },
      {
        id: 'a2',
        action: 'concurso_access_granted',
        user_id: 'u2',
        resource_type: null,
        resource_id: null,
        correlation_id: null,
        ip_address: null,
        user_agent: null,
        metadata: null,
        created_at: '2026-05-27T09:00:00Z',
      },
    ]
    const { builder, trace } = makeQueryStub({ data: rows, error: null, count: 99 })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => builder,
          }),
        }),
    }))
    const { listAuditLog } = await import('@/lib/admin/list-audit-log')
    const result = await listAuditLog()
    expect(result.rows).toEqual(rows)
    expect(result.total).toBe(99)
    // Facet sorted alphabetically
    expect(result.actions).toEqual(['concurso_access_granted', 'user_deletion'])
    // Default pagination: limit 50, offset 0 → range(0, 49)
    expect(trace.range).toEqual([0, 49])
    expect(trace.order?.[0]).toBe('created_at')
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('forwards action filter and userId filter as .eq() calls', async () => {
    const { builder, trace } = makeQueryStub({ data: [], error: null, count: 0 })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve({ from: () => ({ select: () => builder }) }),
    }))
    const { listAuditLog } = await import('@/lib/admin/list-audit-log')
    await listAuditLog({ action: 'user_deletion', userId: 'u-42', limit: 20, offset: 40 })
    expect(trace.eq).toContainEqual(['action', 'user_deletion'])
    expect(trace.eq).toContainEqual(['user_id', 'u-42'])
    expect(trace.range).toEqual([40, 59])
  })

  it('returns empty + fires Sentry on db error', async () => {
    const { builder } = makeQueryStub({ data: null, error: { message: 'rls denied' }, count: null })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve({ from: () => ({ select: () => builder }) }),
    }))
    const { listAuditLog } = await import('@/lib/admin/list-audit-log')
    const result = await listAuditLog()
    expect(result).toEqual({ rows: [], total: 0, actions: [] })
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0]![2]).toMatchObject({ helper: 'listAuditLog' })
  })
})
