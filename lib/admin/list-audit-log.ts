/**
 * `listAuditLog` — read-only admin helper to surface entries from
 * the LGPD-audit table. Admin layout already enforces the role
 * gate; this lib just runs the SELECT.
 *
 * Pagination: offset-based (limit + offset). 50 rows default,
 * sorted by `created_at desc`.
 *
 * Optional filters:
 *  - `action`: exact match on `action` column (e.g. 'user_deletion').
 *  - `userId`: exact match on `user_id` (useful when looking up a
 *    specific user's trail).
 */
import 'server-only'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
// eslint-disable-next-line no-restricted-imports -- role-gated /admin viewer; audit_log has only own-row RLS, so the full trail must be read via the service-role client
import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditLogRow {
  id: string
  action: string
  user_id: string | null
  resource_type: string | null
  resource_id: string | null
  correlation_id: string | null
  ip_address: unknown
  user_agent: string | null
  metadata: unknown
  created_at: string
}

export interface ListAuditLogOptions {
  limit?: number
  offset?: number
  action?: string | null
  userId?: string | null
}

export async function listAuditLog(
  opts: ListAuditLogOptions = {},
): Promise<{ rows: AuditLogRow[]; total: number; actions: string[] }> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  // Service-role client: audit_log's only RLS policy is own-row SELECT
  // (audit_log_user_select_own), with no admin policy — so a user-context
  // client returns only the admin's OWN rows, hiding the rest of the trail.
  // The /admin route is already role-gated, so reading via service role is safe.
  const supabase = createAdminClient()
  let query = supabase
    .from('audit_log')
    .select(
      'id, action, user_id, resource_type, resource_id, correlation_id, ip_address, user_agent, metadata, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.action) {
    query = query.eq('action', opts.action)
  }
  if (opts.userId) {
    query = query.eq('user_id', opts.userId)
  }

  const { data, error, count } = await query
  if (error) {
    const correlationId = crypto.randomUUID()
    childLogger({ helper: 'listAuditLog', correlationId }).warn(
      { err: error.message },
      'audit_log query failed — returning empty',
    )
    captureWithCorrelation(
      new Error(`listAuditLog query failed: ${error.message}`),
      correlationId,
      { helper: 'listAuditLog', dbErrorMessage: error.message, filters: opts },
    )
    return { rows: [], total: 0, actions: [] }
  }

  // Build a small facet of distinct action types from the current
  // page (good-enough heuristic — the listing UI uses this to populate
  // the filter chips). A full distinct query would be more accurate
  // but is overkill for a single-tenant admin tool.
  const actions = Array.from(new Set(data.map((r) => r.action))).sort()

  return { rows: data, total: count ?? 0, actions }
}
