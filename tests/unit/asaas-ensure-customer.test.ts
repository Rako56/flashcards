/**
 * Tests for lib/asaas/ensure-customer.ts
 *
 * Mock @/lib/supabase/server + @/lib/asaas/client. Cover:
 * - cached path (existing asaas_customer_id)
 * - missing profile
 * - missing full_name or cpf
 * - asaas not configured
 * - find existing then cache
 * - create then cache
 * - missing auth email
 * - asaas client throws
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

interface ProfileRow {
  full_name: string | null
  cpf: string | null
  asaas_customer_id: string | null
  phone_e164: string | null
}

function mockSupabase({
  profile,
  user,
  updateError,
}: {
  profile: ProfileRow | null
  user: { id: string; email?: string } | null
  updateError?: { message: string } | null
}) {
  return () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: profile,
                error: null,
              }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: updateError ?? null }),
        }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user }, error: null }),
      },
    })
}

describe('ensureAsaasCustomer', () => {
  it('returns cached customerId when present', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'X',
          cpf: '11144477735',
          asaas_customer_id: 'cus_cached',
          phone_e164: null,
        },
        user: { id: 'u1', email: 'x@y.com' },
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r).toEqual({ customerId: 'cus_cached', cached: true })
  })

  it('returns null when profile missing', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({ profile: null, user: { id: 'u1', email: 'x@y.com' } }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBeNull()
  })

  it('returns null when full_name missing', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: null,
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: null,
        },
        user: { id: 'u1', email: 'x@y.com' },
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBeNull()
  })

  it('returns null when Asaas not configured', async () => {
    const ORIG = process.env['ASAAS_API_KEY']
    delete process.env['ASAAS_API_KEY']
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'João',
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: null,
        },
        user: { id: 'u1', email: 'x@y.com' },
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBeNull()
    if (ORIG !== undefined) process.env['ASAAS_API_KEY'] = ORIG
  })

  it('uses existing Asaas customer when found by email', async () => {
    process.env['ASAAS_API_KEY'] = 'test-key'
    process.env['ASAAS_API_BASE'] = 'https://sandbox.asaas.com/api/v3'
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'João',
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: null,
        },
        user: { id: 'u1', email: 'joao@example.com' },
      }),
    }))
    vi.doMock('@/lib/asaas/client', () => ({
      getAsaasClient: () => ({
        findCustomerByEmail: () =>
          Promise.resolve({ id: 'cus_existing', name: 'João', email: 'joao@example.com' }),
        createCustomer: () => Promise.reject(new Error('should not call')),
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBe('cus_existing')
    expect(r.cached).toBe(false)
  })

  it('creates Asaas customer when none found', async () => {
    process.env['ASAAS_API_KEY'] = 'test-key'
    process.env['ASAAS_API_BASE'] = 'https://sandbox.asaas.com/api/v3'
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'João',
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: '+5511999999999',
        },
        user: { id: 'u1', email: 'joao@example.com' },
      }),
    }))
    vi.doMock('@/lib/asaas/client', () => ({
      getAsaasClient: () => ({
        findCustomerByEmail: () => Promise.resolve(null),
        createCustomer: () =>
          Promise.resolve({ id: 'cus_new', name: 'João', email: 'joao@example.com' }),
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBe('cus_new')
  })

  it('returns null when auth has no email', async () => {
    process.env['ASAAS_API_KEY'] = 'test-key'
    process.env['ASAAS_API_BASE'] = 'https://sandbox.asaas.com/api/v3'
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'João',
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: null,
        },
        user: { id: 'u1' },
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBeNull()
  })

  it('non-fatal cache update error still returns customerId', async () => {
    process.env['ASAAS_API_KEY'] = 'test-key'
    process.env['ASAAS_API_BASE'] = 'https://sandbox.asaas.com/api/v3'
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'João',
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: null,
        },
        user: { id: 'u1', email: 'joao@example.com' },
        updateError: { message: 'rls denied' },
      }),
    }))
    vi.doMock('@/lib/asaas/client', () => ({
      getAsaasClient: () => ({
        findCustomerByEmail: () => Promise.resolve(null),
        createCustomer: () =>
          Promise.resolve({ id: 'cus_new', name: 'João', email: 'joao@example.com' }),
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBe('cus_new')
  })

  it('returns null when userId is empty', async () => {
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    // Empty userId still calls supabase but the .eq filter yields no row → null branch
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({ profile: null, user: null }),
    }))
    const r = await ensureAsaasCustomer('', 'corr-1')
    expect(r.customerId).toBeNull()
  })

  it('returns null when Asaas client throws', async () => {
    process.env['ASAAS_API_KEY'] = 'test-key'
    process.env['ASAAS_API_BASE'] = 'https://sandbox.asaas.com/api/v3'
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: mockSupabase({
        profile: {
          full_name: 'João',
          cpf: '11144477735',
          asaas_customer_id: null,
          phone_e164: null,
        },
        user: { id: 'u1', email: 'joao@example.com' },
      }),
    }))
    vi.doMock('@/lib/asaas/client', () => ({
      getAsaasClient: () => ({
        findCustomerByEmail: () => Promise.reject(new Error('network down')),
        createCustomer: () => Promise.reject(new Error('network down')),
      }),
    }))
    const { ensureAsaasCustomer } = await import('@/lib/asaas/ensure-customer')
    const r = await ensureAsaasCustomer('u1', 'corr-1')
    expect(r.customerId).toBeNull()
  })
})
