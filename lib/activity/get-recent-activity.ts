/**
 * `getRecentActivity(userId, concursoId, days?)` — returns per-day review
 * counts for the last N days (default 7). Used by the home page widget.
 *
 * Reads from `srs_reviews` filtered by concurso via the `admin_flashcards`
 * join. Returns a stable array of `{ date, count }` pairs covering EVERY
 * day in the window — including zero-count days — so the UI can render
 * a heatmap-style row without gaps.
 */
import { createClient } from '@/lib/supabase/server'

export interface ActivityBucket {
  /** UTC ISO date `YYYY-MM-DD` */
  date: string
  count: number
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildWindow(days: number, now: Date): ActivityBucket[] {
  const out: ActivityBucket[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    d.setUTCHours(0, 0, 0, 0)
    out.push({ date: isoDate(d), count: 0 })
  }
  return out
}

export async function getRecentActivity(
  userId: string,
  concursoId: string,
  days = 7,
  now = new Date(),
): Promise<ActivityBucket[]> {
  if (!userId || !concursoId) return buildWindow(days, now)

  const since = new Date(now)
  since.setUTCDate(since.getUTCDate() - (days - 1))
  since.setUTCHours(0, 0, 0, 0)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('srs_reviews')
    .select('reviewed_at, admin_flashcards!inner(concurso_id, status)')
    .eq('user_id', userId)
    .gte('reviewed_at', since.toISOString())
    .order('reviewed_at', { ascending: true })

  if (error) {
    // Best-effort widget — render zero row rather than break the page.
    return buildWindow(days, now)
  }

  interface Row {
    reviewed_at: string
    admin_flashcards: { concurso_id: string | null; status: string } | null
  }
  const rows = (data as unknown as Row[] | null) ?? []

  const buckets = buildWindow(days, now)
  const index = new Map<string, ActivityBucket>()
  for (const b of buckets) index.set(b.date, b)

  for (const r of rows) {
    if (!r.admin_flashcards) continue
    if (r.admin_flashcards.concurso_id !== concursoId) continue
    if (r.admin_flashcards.status !== 'active') continue
    const day = r.reviewed_at.slice(0, 10)
    const bucket = index.get(day)
    if (bucket) bucket.count += 1
  }

  return buckets
}
