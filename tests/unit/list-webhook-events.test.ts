/**
 * Tests for lib/admin/list-webhook-events.ts
 *
 * Mocks Supabase. Covers happy path, status filter, eventTypePrefix
 * (which uses .like(), not .eq()), and error path (empty + Sentry).
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
  like?: [string, string]
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
    like(col: string, value: string) {
      trace.like = [col, value]
      return builder
    },
    then<T>(onfulfilled: (r: typeof result) => T) {
      return Promise.resolve(result).then(onfulfilled)
    },
  }
  return { builder, trace }
}

describe('listWebhookEvents', () => {
  it('returns rows + total on happy path', async () => {
    const rows = [
      {
        event_id: 'evt-1',
        event_type: 'PAYMENT_CONFIRMED',
        payload: { foo: 'bar' },
        processed_at: '2026-05-27T10:01:00Z',
        processed_status: 'success',
        processing_error: null,
        received_at: '2026-05-27T10:00:00Z',
      },
    ]
    const { builder } = makeQueryStub({ data: rows, error: null, count: 1 })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({ from: () => ({ select: () => builder }) }),
    }))
    const { listWebhookEvents } = await import('@/lib/admin/list-webhook-events')
    const result = await listWebhookEvents()
    expect(result.rows).toEqual(rows)
    expect(result.total).toBe(1)
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('forwards status filter as .eq(processed_status, ...)', async () => {
    const { builder, trace } = makeQueryStub({ data: [], error: null, count: 0 })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({ from: () => ({ select: () => builder }) }),
    }))
    const { listWebhookEvents } = await import('@/lib/admin/list-webhook-events')
    await listWebhookEvents({ status: 'failed' })
    expect(trace.eq).toContainEqual(['processed_status', 'failed'])
  })

  it('forwards eventTypePrefix as .like(event_type, "prefix%")', async () => {
    const { builder, trace } = makeQueryStub({ data: [], error: null, count: 0 })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({ from: () => ({ select: () => builder }) }),
    }))
    const { listWebhookEvents } = await import('@/lib/admin/list-webhook-events')
    await listWebhookEvents({ eventTypePrefix: 'PAYMENT_' })
    expect(trace.like).toEqual(['event_type', 'PAYMENT_%'])
  })

  it('returns empty + fires Sentry on db error', async () => {
    const { builder } = makeQueryStub({ data: null, error: { message: 'gone' }, count: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({ from: () => ({ select: () => builder }) }),
    }))
    const { listWebhookEvents } = await import('@/lib/admin/list-webhook-events')
    const result = await listWebhookEvents()
    expect(result).toEqual({ rows: [], total: 0 })
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0]![2]).toMatchObject({ helper: 'listWebhookEvents' })
  })
})
