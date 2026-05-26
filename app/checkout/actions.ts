'use server'

/**
 * Checkout: kick off Asaas charge creation for the resolved concurso.
 *
 * Flow:
 *   1. Auth check
 *   2. Resolve concurso from headers
 *   3. ensureAsaasCustomer (find-or-create + cache id)
 *   4. createCharge with externalReference = `<userId>:<concursoSlug>:annual`
 *   5. Insert audit row in `purchases` table (status='pending') so the
 *      webhook can later flip it via the externalReference match
 *   6. Redirect to invoiceUrl (Asaas hosted checkout)
 *
 * Returns null-shape if Asaas isn't configured — the page falls back to
 * "checkout em breve" copy. When ASAAS_API_KEY arrives in Vercel env,
 * this flow lights up automatically.
 */
import { redirect } from 'next/navigation'

import { ensureAsaasCustomer } from '@/lib/asaas/ensure-customer'
import { getAsaasClient } from '@/lib/asaas/client'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const ANNUAL_PRICE_CENTS = 29700 // R$ 297,00
const ANNUAL_DUE_OFFSET_DAYS = 3 // boleto/PIX vence em 3 dias

export type CheckoutResult = { ok: true; invoiceUrl: string } | { ok: false; error: string }

export async function startCheckoutAction(): Promise<CheckoutResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'startCheckout' })

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Você precisa estar logado.' }
  }

  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    return { ok: false, error: 'Acesse via o subdomínio do seu concurso.' }
  }

  const client = getAsaasClient(correlationId)
  if (!client) {
    log.warn('Asaas not configured — checkout dormant')
    return {
      ok: false,
      error: 'Checkout temporariamente indisponível. Tente novamente em alguns minutos.',
    }
  }

  // Step 1: ensure Asaas customer exists for this user
  const { customerId } = await ensureAsaasCustomer(user.id, correlationId)
  if (!customerId) {
    return {
      ok: false,
      error:
        'Complete seu perfil (nome + CPF) em /onboarding antes de pagar — usamos para emitir nota fiscal.',
    }
  }

  // Step 2: create the charge
  const dueDate = new Date()
  dueDate.setUTCDate(dueDate.getUTCDate() + ANNUAL_DUE_OFFSET_DAYS)
  const externalReference = `${user.id}:${concurso.slug}:annual`

  try {
    const charge = await client.createCharge({
      customer: customerId,
      billingType: 'UNDEFINED', // Asaas presents PIX + boleto + cartão
      value: ANNUAL_PRICE_CENTS / 100,
      dueDate: dueDate.toISOString().slice(0, 10),
      description: `Preparação ${concurso.title} — 1 ano`,
      externalReference,
    })

    // Step 3: audit row so webhook can reconcile via asaas_payment_id
    const { error: purchaseError } = await supabase.from('purchases').insert({
      user_id: user.id,
      concurso_id: concurso.id,
      status: 'pending',
      asaas_customer_id: customerId,
      asaas_payment_id: charge.id,
      billing_type: 'UNDEFINED',
      amount: ANNUAL_PRICE_CENTS / 100,
    })
    if (purchaseError) {
      // Non-fatal — webhook can still create the purchase via reconcile path.
      // But log loudly: this means our record-keeping has a gap.
      captureWithCorrelation(purchaseError, correlationId, { stage: 'purchases.insert' })
      log.warn({ err: purchaseError.message }, 'purchase audit insert failed (non-fatal)')
    }

    if (!charge.invoiceUrl) {
      log.error({ chargeId: charge.id }, 'Asaas charge has no invoiceUrl')
      return { ok: false, error: 'Erro inesperado no checkout. Tente novamente.' }
    }

    log.info({ chargeId: charge.id }, 'checkout charge created — redirecting')
    redirect(charge.invoiceUrl)
  } catch (err) {
    captureWithCorrelation(err, correlationId, { stage: 'asaas.createCharge' })
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'createCharge failed')
    return {
      ok: false,
      error: 'Não conseguimos criar o pedido agora. Tente em alguns minutos ou fale com o suporte.',
    }
  }
}
