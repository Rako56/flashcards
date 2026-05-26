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
import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()
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
  if (error) return { rows: [], total: 0, actions: [] }

  // Build a small facet of distinct action types from the current
  // page (good-enough heuristic — the listing UI uses this to populate
  // the filter chips). A full distinct query would be more accurate
  // but is overkill for a single-tenant admin tool.
  const actions = Array.from(new Set(data.map((r) => r.action))).sort()

  return { rows: data, total: count ?? 0, actions }
}
