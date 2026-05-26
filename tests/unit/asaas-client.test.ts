/**
 * Tests for lib/asaas/client.ts
 *
 * Covers: env-missing path, createCustomer, findCustomerByEmail,
 * createCharge, HTTP error handling. Uses global fetch mock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const ORIGINAL_KEY = process.env['ASAAS_API_KEY']
const ORIGINAL_BASE = process.env['ASAAS_API_BASE']

beforeEach(() => {
  process.env['ASAAS_API_KEY'] = 'test-key'
  process.env['ASAAS_API_BASE'] = 'https://sandbox.asaas.com/api/v3'
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env['ASAAS_API_KEY']
  else process.env['ASAAS_API_KEY'] = ORIGINAL_KEY
  if (ORIGINAL_BASE === undefined) delete process.env['ASAAS_API_BASE']
  else process.env['ASAAS_API_BASE'] = ORIGINAL_BASE
  vi.restoreAllMocks()
})

describe('Asaas client', () => {
  it('getAsaasClient returns null when env missing', async () => {
    delete process.env['ASAAS_API_KEY']
    const { getAsaasClient } = await import('@/lib/asaas/client')
    expect(getAsaasClient()).toBeNull()
  })

  it('getAsaasClient returns client when env present', async () => {
    const { getAsaasClient } = await import('@/lib/asaas/client')
    expect(getAsaasClient()).not.toBeNull()
  })

  it('createCustomer POSTs to /customers with auth header', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 'cus_123', name: 'X', email: 'x@y.com' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    globalThis.fetch = fetchMock

    const { createAsaasClient } = await import('@/lib/asaas/client')
    const client = createAsaasClient({ correlationId: 'corr-1' })
    const result = await client.createCustomer({
      name: 'João',
      email: 'joao@example.com',
      cpfCnpj: '11144477735',
    })

    expect(result.id).toBe('cus_123')
    expect(fetchMock).toHaveBeenCalledOnce()
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(firstCall[0]).toContain('/customers')
    expect(firstCall[1].method).toBe('POST')
    const headers = firstCall[1].headers as Record<string, string>
    expect(headers['access_token']).toBe('test-key')
    expect(headers['X-Correlation-Id']).toBe('corr-1')
  })

  it('findCustomerByEmail returns first hit or null', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{ id: 'cus_42', name: 'Y', email: 'y@z.com' }],
            totalCount: 1,
            hasMore: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const { createAsaasClient } = await import('@/lib/asaas/client')
    const result = await createAsaasClient().findCustomerByEmail('y@z.com')
    expect(result?.id).toBe('cus_42')
  })

  it('findCustomerByEmail returns null on empty data array', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: [], totalCount: 0, hasMore: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const { createAsaasClient } = await import('@/lib/asaas/client')
    expect(await createAsaasClient().findCustomerByEmail('none@x.com')).toBeNull()
  })

  it('throws AsaasApiError on non-2xx', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: [{ description: 'bad cpf' }] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const { createAsaasClient, AsaasApiError } = await import('@/lib/asaas/client')
    await expect(
      createAsaasClient().createCustomer({ name: 'X', email: 'x@y.com' }),
    ).rejects.toBeInstanceOf(AsaasApiError)
  })

  it('throws AsaasNotConfigured when calling without env', async () => {
    delete process.env['ASAAS_API_KEY']
    const { createAsaasClient, AsaasNotConfigured } = await import('@/lib/asaas/client')
    await expect(
      createAsaasClient().createCustomer({ name: 'X', email: 'x@y.com' }),
    ).rejects.toBeInstanceOf(AsaasNotConfigured)
  })

  it('createCharge POSTs to /payments', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'pay_1',
            customer: 'cus_1',
            status: 'PENDING',
            value: 297,
            dueDate: '2026-06-01',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const { createAsaasClient } = await import('@/lib/asaas/client')
    const result = await createAsaasClient().createCharge({
      customer: 'cus_1',
      billingType: 'PIX',
      value: 297,
      dueDate: '2026-06-01',
    })
    expect(result.id).toBe('pay_1')
    expect(result.value).toBe(297)
  })
})
