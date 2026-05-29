/**
 * Asaas webhook receiver.
 *
 * Asaas POSTs here on every payment lifecycle event. We:
 *
 * 1. (Optional Phase 4.2): verify the request signature via shared
 *    secret header `asaas-access-token` matching ASAAS_WEBHOOK_TOKEN env
 * 2. Parse the envelope
 * 3. Call `process_webhook_event` (Plan 1.8-A) for IDEMPOTENT insert
 *    into webhook_events. If was_new=false, short-circuit success
 *    (we already handled this event)
 * 4. Branch on event type:
 *    - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → call grant_concurso_access
 *    - PAYMENT_REFUNDED → revoke (Phase 4.2 wires this)
 *    - everything else → just log for now
 * 5. Update webhook_events.processed_status accordingly
 *
 * Always returns 200 even on logical "skipped" so Asaas doesn't retry.
 * Only 4xx/5xx if the envelope itself is malformed (unparseable JSON,
 * missing required fields).
 */
import type { NextRequest } from 'next/server'

// Route Handlers ARE server-only.
// eslint-disable-next-line no-restricted-imports
import { createAdminClient } from '@/lib/supabase/admin'
import { getCorrelationId, withCorrelationHeader } from '@/lib/observability/correlation'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { verifyAsaasSignature } from '@/lib/asaas/signature'
import {
  parseExternalReference,
  type AsaasWebhookEventType,
  type AsaasWebhookPayload,
} from '@/lib/asaas/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GRANTING_EVENTS = new Set<AsaasWebhookEventType>(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const log = childLogger({ correlationId, route: '/api/webhooks/asaas' })

  // Signature verification — timing-safe + production fail-closed.
  // See lib/asaas/signature.ts for the policy layers.
  const verdict = verifyAsaasSignature({
    headerToken: request.headers.get('asaas-access-token'),
    envToken: process.env['ASAAS_WEBHOOK_TOKEN'],
    nodeEnv: process.env.NODE_ENV,
  })
  if (!verdict.ok) {
    if (verdict.reason === 'missing-env-prod') {
      log.error('ASAAS_WEBHOOK_TOKEN is required in production — refusing webhook')
      return withCorrelationHeader(
        Response.json({ ok: false, error: 'service misconfigured' }, { status: 503 }),
        correlationId,
      )
    }
    log.warn('webhook signature mismatch')
    return withCorrelationHeader(
      Response.json({ ok: false, error: 'invalid signature' }, { status: 401 }),
      correlationId,
    )
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch (err) {
    log.error({ err: (err as Error).message }, 'webhook payload not valid JSON')
    return withCorrelationHeader(
      Response.json({ ok: false, error: 'invalid json' }, { status: 400 }),
      correlationId,
    )
  }

  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof (raw as { id?: unknown }).id !== 'string' ||
    typeof (raw as { event?: unknown }).event !== 'string'
  ) {
    log.error({ raw }, 'webhook envelope missing id or event')
    return withCorrelationHeader(
      Response.json({ ok: false, error: 'malformed envelope' }, { status: 400 }),
      correlationId,
    )
  }

  const payload = raw as AsaasWebhookPayload
  const supabase = createAdminClient()

  // Idempotent insert via Plan 1.8-A. Supabase's generated `Json` type
  // is recursive; the parsed JSON value is already structurally Json,
  // so we forward it directly with the typed RPC signature.
  const { data: idempResult, error: idempError } = await supabase.rpc('process_webhook_event', {
    p_event_id: payload.id,
    p_event_type: payload.event,
    p_payload: raw as never,
  })

  if (idempError) {
    captureWithCorrelation(idempError, correlationId, { stage: 'process_webhook_event' })
    log.error({ err: idempError.message }, 'idempotency check failed')
    return withCorrelationHeader(
      Response.json({ ok: false, error: 'idempotency check failed' }, { status: 500 }),
      correlationId,
    )
  }

  // RPC returns a TABLE — Supabase wraps in array
  const isNewEvent = Array.isArray(idempResult)
    ? Boolean(idempResult[0]?.was_new)
    : Boolean(idempResult)

  if (!isNewEvent) {
    log.info({ eventId: payload.id, event: payload.event }, 'webhook duplicate — skipped')
    return withCorrelationHeader(Response.json({ ok: true, skipped: true }), correlationId)
  }

  // Branch on event type
  let processingStatus: 'success' | 'failed' = 'success'
  let processingError: string | null = null

  try {
    if (GRANTING_EVENTS.has(payload.event)) {
      const ref = parseExternalReference(payload.payment.externalReference)
      if (!ref) {
        throw new Error(
          `Payment ${payload.payment.id} has no parseable externalReference — cannot grant access`,
        )
      }
      const { error: grantError } = await supabase.rpc('grant_concurso_access', {
        p_user_id: ref.userId,
        p_concurso_slug: ref.concursoSlug,
        p_plan: ref.plan,
        // 365 day plan default — Phase 4.2 may switch on plan tier
        p_duration_days: 365,
      })
      if (grantError) {
        throw new Error(`grant_concurso_access failed: ${grantError.message}`)
      }
      log.info(
        {
          eventId: payload.id,
          event: payload.event,
          userId: ref.userId,
          concursoSlug: ref.concursoSlug,
          plan: ref.plan,
        },
        'access granted from webhook',
      )

      // Best-effort: flip the ledger row (created 'pending' at checkout) to
      // 'paid'. Access is already granted above — a ledger miss must NEVER
      // fail the webhook, so this is logged, not thrown. Matched by the
      // unique asaas_payment_id. Runs on the service-role client (purchases
      // RLS has no INSERT/UPDATE policy).
      const { error: ledgerError } = await supabase
        .from('purchases')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('asaas_payment_id', payload.payment.id)
      if (ledgerError) {
        log.warn(
          { err: ledgerError.message, paymentId: payload.payment.id },
          'purchases ledger update failed (non-fatal)',
        )
      }
    } else {
      log.info(
        { eventId: payload.id, event: payload.event },
        'webhook event acknowledged — no action wired yet',
      )
    }
  } catch (err) {
    processingStatus = 'failed'
    processingError = (err as Error).message
    captureWithCorrelation(err, correlationId, {
      stage: 'webhook-action',
      eventId: payload.id,
      event: payload.event,
    })
    log.error({ err: processingError, eventId: payload.id }, 'webhook action failed')
  }

  // Update the idempotency row with the final processing outcome.
  // `processing_error` column accepts null; we use null when no error.
  await supabase
    .from('webhook_events')
    .update({
      processed_status: processingStatus,
      processing_error: processingError,
      processed_at: new Date().toISOString(),
    })
    .eq('event_id', payload.id)

  return withCorrelationHeader(
    Response.json({ ok: processingStatus === 'success', eventId: payload.id }),
    correlationId,
  )
}
