/**
 * Tests for app/api/healthz/route.ts
 *
 * Mocks `@/lib/supabase/admin` so we don't hit the real Supabase project
 * during unit tests. Asserts shape conformance via the Zod schema
 * already used inside the route, by parsing the response JSON.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Stable env so the route's env check passes.
const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co'
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'fake-service-role-1234567890abcdef'
})
afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe('GET /api/healthz', () => {
  it('returns 200 with the documented success shape on happy path', async () => {
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => Promise.resolve({ count: 42, error: null }),
        }),
      }),
    }))
    const { GET } = await import('@/app/api/healthz/route')
    const request = new Request('https://example.com/api/healthz')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.checks).toEqual({ supabase: 'ok', env: 'ok' })
    expect(body.concurso_count).toBe(42)
    expect(body.correlationId).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    )
    expect(typeof body.timestamp).toBe('string')
    expect(response.headers.get('x-correlation-id')).toBe(body.correlationId)
  })

  it('returns 500 with SENTRY_PROBE error when ?simulateError=true', async () => {
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => Promise.resolve({ count: 1, error: null }),
        }),
      }),
    }))
    const { GET } = await import('@/app/api/healthz/route')
    const request = new Request('https://example.com/api/healthz?simulateError=true')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('SENTRY_PROBE')
    expect(body.correlationId).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    )
  })

  it('returns 500 with supabase=fail when DB ping errors', async () => {
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => Promise.resolve({ count: null, error: { message: 'boom' } }),
        }),
      }),
    }))
    const { GET } = await import('@/app/api/healthz/route')
    const request = new Request('https://example.com/api/healthz')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.checks.supabase).toBe('fail')
    expect(body.error).toBe('supabase ping failed')
  })

  it('returns 500 with env=fail when required env vars are missing', async () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => Promise.resolve({ count: 1, error: null }),
        }),
      }),
    }))
    const { GET } = await import('@/app/api/healthz/route')
    const request = new Request('https://example.com/api/healthz')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.checks.env).toBe('fail')
  })

  it('echoes the inbound x-correlation-id header when valid', async () => {
    // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
    const inbound = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => Promise.resolve({ count: 1, error: null }),
        }),
      }),
    }))
    const { GET } = await import('@/app/api/healthz/route')
    const request = new Request('https://example.com/api/healthz', {
      headers: { 'x-correlation-id': inbound },
    })
    const response = await GET(request)

    expect(response.headers.get('x-correlation-id')).toBe(inbound)
    const body = await response.json()
    expect(body.correlationId).toBe(inbound)
  })
})
