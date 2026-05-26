import type { TodayProgress } from '@/lib/activity/get-today-progress'

/**
 * Daily-goal progress bar shown on home (STATE 4 — full access).
 *
 * Visual:
 *   ┌─────────────────────────────────────┐
 *   │ Meta diária             18 / 60     │
 *   │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░  30%           │
 *   │ Continue! Faltam 42 cards hoje.     │
 *   └─────────────────────────────────────┘
 *
 * Brand-primary fill, secondary copy when goal reached.
 */
export function DailyGoalWidget({ progress }: { progress: TodayProgress }) {
  const reached = progress.reviewsToday >= progress.goalCards
  const remaining = Math.max(0, progress.goalCards - progress.reviewsToday)
  const pct = Math.round(progress.fraction * 100)

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-foreground/80">
          Meta diária{' '}
          <span className="text-xs font-normal text-foreground/50">
            ({progress.goalMinutes} min)
          </span>
        </h3>
        <p className="text-xs font-medium tabular-nums text-foreground/70">
          {progress.reviewsToday} / {progress.goalCards}
        </p>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${String(pct)}% da meta diária`}
      >
        <div
          className={`h-full rounded-full transition-all ${
            reached ? 'bg-emerald-500' : 'bg-brand-primary'
          }`}
          style={{ width: `${String(pct)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-foreground/60">
        {reached
          ? `Meta batida! ${String(progress.reviewsToday - progress.goalCards)} cards de bônus hoje.`
          : `Faltam ${String(remaining)} card${remaining === 1 ? '' : 's'} pra bater a meta.`}
      </p>
    </div>
  )
}
