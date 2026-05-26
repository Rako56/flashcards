/**
 * Asaas REST API client wrapper.
 *
 * Reads ASAAS_API_KEY + ASAAS_API_BASE from env. Returns a typed
 * client with methods for each operation we use (createCustomer,
 * createCharge, listCustomers).
 *
 * Sandbox: `ASAAS_API_BASE=https://sandbox.asaas.com/api/v3`
 * Prod:    `ASAAS_API_BASE=https://api.asaas.com/v3`
 *
 * Errors:
 *   - Missing env → throws `AsaasNotConfigured` (caller decides UX)
 *   - HTTP error → throws `AsaasApiError` with status + body
 *   - Network error → bubbles native fetch error up
 *
 * All requests carry a correlation header so Sentry traces can stitch
 * server → Asaas calls together.
 */

export class AsaasNotConfigured extends Error {
  constructor() {
    super('ASAAS_API_KEY ou ASAAS_API_BASE não configurados.')
    this.name = 'AsaasNotConfigured'
  }
}

export class AsaasApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'AsaasApiError'
    this.status = status
    this.body = body
  }
}

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj?: string
  phone?: string
  externalReference?: string
}

export interface AsaasChargeInput {
  customer: string // Asaas customer ID
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  dueDate: string // YYYY-MM-DD
  description?: string
  externalReference?: string
}

export interface AsaasCharge {
  id: string
  customer: string
  status: string
  value: number
  netValue?: number
  invoiceUrl?: string
  bankSlipUrl?: string
  invoiceNumber?: string
  dueDate: string
}

export interface AsaasClient {
  createCustomer(input: {
    name: string
    email: string
    cpfCnpj?: string
    phone?: string
    externalReference?: string
  }): Promise<AsaasCustomer>
  findCustomerByEmail(email: string): Promise<AsaasCustomer | null>
  createCharge(input: AsaasChargeInput): Promise<AsaasCharge>
}

function readEnv(): { apiKey: string; base: string } {
  const apiKey = process.env['ASAAS_API_KEY']
  const base = process.env['ASAAS_API_BASE']
  if (!apiKey || !base) throw new AsaasNotConfigured()
  return { apiKey, base }
}

async function asaasFetch(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; correlationId?: string },
): Promise<unknown> {
  const { apiKey, base } = readEnv()
  const url = `${base.replace(/\/$/, '')}${path}`
  const headers: Record<string, string> = {
    access_token: apiKey,
    'Content-Type': 'application/json',
  }
  if (init.correlationId) headers['X-Correlation-Id'] = init.correlationId

  const res = await fetch(url, {
    method: init.method,
    headers,
    cache: 'no-store',
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => '(empty)')
    }
    throw new AsaasApiError(`Asaas ${path} returned ${String(res.status)}`, res.status, body)
  }
  return (await res.json()) as unknown
}

export function createAsaasClient(opts: { correlationId?: string } = {}): AsaasClient {
  const { correlationId } = opts
  return {
    async createCustomer(input) {
      const result = await asaasFetch('/customers', {
        method: 'POST',
        body: {
          name: input.name,
          email: input.email,
          cpfCnpj: input.cpfCnpj,
          phone: input.phone,
          externalReference: input.externalReference,
        },
        ...(correlationId ? { correlationId } : {}),
      })
      return result as AsaasCustomer
    },

    async findCustomerByEmail(email) {
      const result = await asaasFetch(`/customers?email=${encodeURIComponent(email)}&limit=1`, {
        method: 'GET',
        ...(correlationId ? { correlationId } : {}),
      })
      // Asaas list endpoint shape: { data: [...], totalCount, hasMore }
      const wrapped = result as { data?: AsaasCustomer[] }
      const found = wrapped.data?.[0]
      return found ?? null
    },

    async createCharge(input) {
      const result = await asaasFetch('/payments', {
        method: 'POST',
        body: input,
        ...(correlationId ? { correlationId } : {}),
      })
      return result as AsaasCharge
    },
  }
}

/**
 * `getAsaasClient(correlationId?)` — convenience factory. Returns
 * null if Asaas is not configured (caller branches on that).
 */
export function getAsaasClient(correlationId?: string): AsaasClient | null {
  try {
    readEnv() // throws AsaasNotConfigured if missing
    return createAsaasClient(correlationId !== undefined ? { correlationId } : {})
  } catch {
    return null
  }
}
