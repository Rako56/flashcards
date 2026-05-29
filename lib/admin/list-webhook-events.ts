/**
 * `listWebhookEvents` — read-only admin helper to surface recent
 * Asaas webhook events. Admin layout already enforces role gate;
 * this lib just runs the SELECT.
 *
 * Pagination: offset-based (limit + offset). 50 rows is the default
 * page size; orders by `received_at desc`.
 *
 * Optional `status` filter narrows to `processed_status='success'`,
 * `'failed'`, or `'pending'`.
 */
import 'server-only'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
// eslint-disable-next-line no-restricted-imports -- role-gated /admin viewer; webhook_events has no RLS read policy, so it must be read via the service-role client
import { createAdminClient } from '@/lib/supabase/admin'

export interface WebhookEventRow {
  event_id: string
  event_type: string
  payload: unknown
  processed_at: string | null
  processed_status: string
  processing_error: string | null
  received_at: string
}

export interface ListWebhookEventsOptions {
  limit?: number
  offset?: number
  status?: 'success' | 'failed' | 'pending' | null
  eventTypePrefix?: string | null
}

export async function listWebhookEvents(
  opts: ListWebhookEventsOptions = {},
): Promise<{ rows: WebhookEventRow[]; total: number }> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  // Service-role client: webhook_events has RLS enabled with NO policy
  // (internal table written by the Asaas webhook via service role), so a
  // user-context client would silently read 0 rows even for admins. The
  // /admin route is already role-gated, so reading via service role is safe.
  const supabase = createAdminClient()
  let query = supabase
    .from('webhook_events')
    .select(
      'event_id, event_type, payload, processed_at, processed_status, processing_error, received_at',
      { count: 'exact' },
    )
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) {
    query = query.eq('processed_status', opts.status)
  }
  if (opts.eventTypePrefix) {
    query = query.like('event_type', `${opts.eventTypePrefix}%`)
  }

  const { data, error, count } = await query
  if (error) {
    const correlationId = crypto.randomUUID()
    childLogger({ helper: 'listWebhookEvents', correlationId }).warn(
      { err: error.message },
      'webhook_events query failed — returning empty',
    )
    captureWithCorrelation(
      new Error(`listWebhookEvents query failed: ${error.message}`),
      correlationId,
      { helper: 'listWebhookEvents', dbErrorMessage: error.message, filters: opts },
    )
    return { rows: [], total: 0 }
  }

  return { rows: data, total: count ?? 0 }
}
