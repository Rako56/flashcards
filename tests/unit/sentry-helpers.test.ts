/**
 * Tests for lib/observability/sentry.ts and lib/observability/withErrorTracking.ts
 *
 * Sentry SDK is mocked — we don't want real network calls in unit tests,
 * and we want to assert on the exact arguments passed to captureException.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const captureExceptionMock = vi.fn((_err: unknown) => 'mock-event-id-abc123')
const setUserMock = vi.fn()
const setTagMock = vi.fn()
const setContextMock = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  captureException: (err: unknown, callbackOrHint?: unknown) => {
    if (typeof callbackOrHint === 'function') {
      const scope = { setTag: setTagMock, setContext: setContextMock }
      callbackOrHint(scope)
    }
    return captureExceptionMock(err)
  },
  setUser: setUserMock,
}))

beforeEach(() => {
  captureExceptionMock.mockClear()
  setUserMock.mockClear()
  setTagMock.mockClear()
  setContextMock.mockClear()
})

afterEach(() => {
  vi.resetModules()
})

describe('captureWithCorrelation', () => {
  it('forwards exception to Sentry.captureException', async () => {
    const { captureWithCorrelation } = await import('@/lib/observability/sentry')
    const err = new Error('boom')
    const eventId = captureWithCorrelation(err, 'cid-1')
    expect(captureExceptionMock).toHaveBeenCalledWith(err)
    expect(eventId).toBe('mock-event-id-abc123')
  })

  it('tags the event with correlationId via scope.setTag', async () => {
    const { captureWithCorrelation } = await import('@/lib/observability/sentry')
    captureWithCorrelation(new Error('x'), 'cid-2')
    expect(setTagMock).toHaveBeenCalledWith('correlationId', 'cid-2')
  })

  it('attaches extra context when provided', async () => {
    const { captureWithCorrelation } = await import('@/lib/observability/sentry')
    captureWithCorrelation(new Error('y'), 'cid-3', { userId: 'u-1', route: '/api/x' })
    expect(setContextMock).toHaveBeenCalledWith('extra', { userId: 'u-1', route: '/api/x' })
  })

  it('does NOT call setContext when no extra is provided', async () => {
    const { captureWithCorrelation } = await import('@/lib/observability/sentry')
    captureWithCorrelation(new Error('z'), 'cid-4')
    expect(setContextMock).not.toHaveBeenCalled()
  })
})

describe('setSentryUser / clearSentryUser', () => {
  it('setSentryUser passes id + email to Sentry.setUser', async () => {
    const { setSentryUser } = await import('@/lib/observability/sentry')
    setSentryUser({ id: 'user-1', email: 'a@b.com' })
    expect(setUserMock).toHaveBeenCalledWith({ id: 'user-1', email: 'a@b.com' })
  })

  it('setSentryUser omits email when undefined', async () => {
    const { setSentryUser } = await import('@/lib/observability/sentry')
    setSentryUser({ id: 'user-2' })
    expect(setUserMock).toHaveBeenCalledWith({ id: 'user-2' })
  })

  it('clearSentryUser passes null to Sentry.setUser', async () => {
    const { clearSentryUser } = await import('@/lib/observability/sentry')
    clearSentryUser()
    expect(setUserMock).toHaveBeenCalledWith(null)
  })
})

describe('withErrorTracking — Route Handler shape', () => {
  it('passes the request and response through on success', async () => {
    const { withErrorTracking } = await import('@/lib/observability/withErrorTracking')
    // eslint-disable-next-line @typescript-eslint/require-await -- vi.fn signature requires async
    const handler = vi.fn(async (_req: Request) => Response.json({ ok: true }))
    const wrapped = withErrorTracking(handler)
    const response = await wrapped(new Request('https://example.com/x'))
    expect(handler).toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('captures exception with correlationId from request header and re-throws', async () => {
    const { withErrorTracking } = await import('@/lib/observability/withErrorTracking')
    // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
    const inbound = '11111111-1111-1111-1111-111111111111'
    const handler = vi.fn(async (_req: Request) => {
      await Promise.resolve()
      throw new Error('handler boom')
    })
    const wrapped = withErrorTracking(handler)
    const request = new Request('https://example.com/x', {
      headers: { 'x-correlation-id': inbound },
    })
    await expect(wrapped(request)).rejects.toThrow(/handler boom/)
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    expect(setTagMock).toHaveBeenCalledWith('correlationId', inbound)
  })

  it('Server Action: uses fallbackCorrelationId when no Request is passed', async () => {
    const { withErrorTracking } = await import('@/lib/observability/withErrorTracking')
    const handler = vi.fn(async (_arg: string) => {
      await Promise.resolve()
      throw new Error('action boom')
    })
    const wrapped = withErrorTracking(handler, { fallbackCorrelationId: 'server-action-myAction' })
    await expect(wrapped('input')).rejects.toThrow(/action boom/)
    expect(setTagMock).toHaveBeenCalledWith('correlationId', 'server-action-myAction')
  })
})
