import type { ActivityBucket } from '@/lib/activity/get-recent-activity'

/**
 * 7-day activity heatmap row. Each cell = one day, opacity scales with
 * review count (0 = empty; max = solid brand-primary).
 *
 * Server Component — receives buckets from caller (Server Component
 * fetches via getRecentActivity).
 */
export function ActivityFeed({ buckets }: { buckets: ActivityBucket[] }) {
  const totalReviews = buckets.reduce((acc, b) => acc + b.count, 0)
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0)
  const daysActive = buckets.filter((b) => b.count > 0).length

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-foreground/80">Atividade recente</h3>
        <p className="text-xs text-foreground/60">
          {totalReviews} review{totalReviews === 1 ? '' : 's'} · {daysActive} dia
          {daysActive === 1 ? '' : 's'} ativo{daysActive === 1 ? '' : 's'}
        </p>
      </div>
      <div className="mt-3 flex items-stretch gap-1.5">
        {buckets.map((b) => (
          <DayCell key={b.date} bucket={b} max={max} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-foreground/40">
        <span>{formatShortDate(buckets[0]?.date)}</span>
        <span>{formatShortDate(buckets[buckets.length - 1]?.date)}</span>
      </div>
    </div>
  )
}

function DayCell({ bucket, max }: { bucket: ActivityBucket; max: number }) {
  const intensity = max === 0 ? 0 : bucket.count / max
  // Map 0..1 → opacity buckets 0/0.15/0.3/0.5/0.7/1
  const opacity = bucket.count === 0 ? 0 : 0.15 + intensity * 0.85
  return (
    <div
      className="relative flex-1 rounded-sm border border-border/50 bg-brand-primary/10"
      style={{ aspectRatio: '1', minHeight: '32px' }}
      title={`${bucket.date} — ${String(bucket.count)} review${bucket.count === 1 ? '' : 's'}`}
    >
      {bucket.count > 0 ? (
        <span
          className="absolute inset-0 rounded-sm bg-brand-primary"
          style={{ opacity }}
          aria-hidden="true"
        />
      ) : null}
      <span className="sr-only">
        {bucket.date}: {bucket.count} reviews
      </span>
    </div>
  )
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00Z')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return iso.slice(5)
  }
}
