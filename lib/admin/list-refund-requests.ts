/**
 * `listRefundRequests` — read-only admin helper for the refund queue.
 * Admin layout gate already enforces role; this lib just selects.
 *
 * Pagination: offset-based. Sorted by `created_at desc` so newest
 * requests bubble to the top of the triage queue.
 */
import { createClient } from '@/lib/supabase/server'

export interface RefundRequestRow {
  id: string
  email: string
  user_id: string | null
  concurso_slug: string | null
  cpf_digits: string | null
  motivo: string
  status: string
  admin_notes: string | null
  created_at: string
  processed_at: string | null
}

export interface ListRefundRequestsOptions {
  limit?: number
  offset?: number
  status?: 'pending' | 'approved' | 'rejected' | null
}

export async function listRefundRequests(
  opts: ListRefundRequestsOptions = {},
): Promise<{ rows: RefundRequestRow[]; total: number }> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  const supabase = await createClient()
  let query = supabase
    .from('refund_requests')
    .select(
      'id, email, user_id, concurso_slug, cpf_digits, motivo, status, admin_notes, created_at, processed_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) {
    query = query.eq('status', opts.status)
  }

  const { data, error, count } = await query
  if (error) return { rows: [], total: 0 }

  return { rows: data, total: count ?? 0 }
}
