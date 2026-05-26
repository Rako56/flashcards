/**
 * `ensureAsaasCustomer(userId)` — finds-or-creates Asaas customer for
 * the given internal user. Idempotent — caching `asaas_customer_id` on
 * the user_profiles row after first create avoids extra POSTs.
 *
 * Returns null if Asaas is not configured (caller should fall back to
 * manual charge link or display "checkout temporarily unavailable").
 */
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

import { getAsaasClient } from './client'

export interface EnsureCustomerResult {
  customerId: string | null
  cached: boolean
}

export async function ensureAsaasCustomer(
  userId: string,
  correlationId: string,
): Promise<EnsureCustomerResult> {
  const log = childLogger({ correlationId, action: 'ensureAsaasCustomer', userId })

  const supabase = await createClient()
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('full_name, cpf, asaas_customer_id, phone_e164')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    log.warn({ err: profileError?.message }, 'no profile row')
    return { customerId: null, cached: false }
  }

  if (profile.asaas_customer_id) {
    return { customerId: profile.asaas_customer_id, cached: true }
  }

  if (!profile.full_name || !profile.cpf) {
    log.info('profile missing name/cpf — needs onboarding before customer create')
    return { customerId: null, cached: false }
  }

  const client = getAsaasClient(correlationId)
  if (!client) {
    log.warn('Asaas not configured — skipping customer create')
    return { customerId: null, cached: false }
  }

  // Email comes from auth.users, not user_profiles
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email
  if (!email) {
    log.warn('no auth email — cannot create customer')
    return { customerId: null, cached: false }
  }

  try {
    // Try find first (idempotency: user retried signup with same email)
    const existing = await client.findCustomerByEmail(email)
    let customerId: string
    if (existing) {
      customerId = existing.id
      log.info({ asaasId: customerId }, 'found existing Asaas customer')
    } else {
      const created = await client.createCustomer({
        name: profile.full_name,
        email,
        cpfCnpj: profile.cpf,
        externalReference: userId,
        ...(profile.phone_e164 ? { phone: profile.phone_e164 } : {}),
      })
      customerId = created.id
      log.info({ asaasId: customerId }, 'created new Asaas customer')
    }

    // Cache the id back on user_profiles
    const { error: cacheError } = await supabase
      .from('user_profiles')
      .update({ asaas_customer_id: customerId })
      .eq('user_id', userId)

    if (cacheError) {
      log.warn({ err: cacheError.message }, 'failed to cache asaas_customer_id (non-fatal)')
    }

    return { customerId, cached: false }
  } catch (err) {
    captureWithCorrelation(err, correlationId, { stage: 'asaas.ensureCustomer' })
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'asaas error')
    return { customerId: null, cached: false }
  }
}
