/**
 * Asaas webhook + API types — subset focused on what Flashcards uses.
 *
 * Asaas docs: https://docs.asaas.com/docs/webhook-payments
 *
 * Phase 4.1 ships only the types + webhook receiver wiring. Real API
 * client (creating Customer + Payment server-side) comes in Phase 4.2
 * once Rafael provides the sandbox API key (ASAAS_API_KEY env).
 */

/**
 * Status values delivered by Asaas payment webhooks. We only act on a
 * subset; the rest are stored for audit.
 */
export type AsaasPaymentStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH'
  | 'REFUND_REQUESTED'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED'
  | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS'

/**
 * Event types in the Asaas webhook envelope.
 */
export type AsaasWebhookEventType =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
  | 'PAYMENT_ANTICIPATED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED'
  | 'PAYMENT_REFUND_IN_PROGRESS'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_DUNNING_REQUESTED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  | 'PAYMENT_CHECKOUT_VIEWED'

/**
 * Minimum shape we depend on from the payment object inside a webhook.
 * Asaas returns many more fields; we ignore them but pass the full
 * payload through to `process_webhook_event` for archival.
 */
export interface AsaasPaymentSnapshot {
  id: string
  customer: string
  value: number
  netValue?: number
  status: AsaasPaymentStatus
  billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'
  externalReference?: string | null
  description?: string | null
  invoiceUrl?: string | null
  dateCreated?: string
  dueDate?: string
  paymentDate?: string | null
  clientPaymentDate?: string | null
  installmentNumber?: number | null
  refunds?:
    | {
        dateCreated: string
        status: string
        value: number
      }[]
    | null
}

/**
 * Top-level webhook envelope.
 *
 * `externalReference` is how we map an Asaas payment back to our user +
 * concurso context. Phase 4.2 sets it to `${userId}:${concursoSlug}:${plan}`
 * at checkout creation time so the webhook can grant access without a
 * second roundtrip.
 */
export interface AsaasWebhookPayload {
  id: string
  event: AsaasWebhookEventType
  dateCreated: string
  payment: AsaasPaymentSnapshot
}

/**
 * Helper to parse `externalReference` set during checkout.
 *
 * Format: `<userId>:<concursoSlug>:<plan>`
 * Example: `9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d:tjsp:annual`
 */
export interface ExternalReference {
  userId: string
  concursoSlug: string
  plan: string
}

export function parseExternalReference(ref: string | null | undefined): ExternalReference | null {
  if (!ref) return null
  const parts = ref.split(':')
  if (parts.length !== 3) return null
  const [userId, concursoSlug, plan] = parts
  if (!userId || !concursoSlug || !plan) return null
  return { userId, concursoSlug, plan }
}
