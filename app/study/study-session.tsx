'use client'

import { useState, useTransition } from 'react'

import { renderCloze } from '@/components/cloze'
import { Button } from '@/components/ui/button'
import type { QueueCard } from '@/lib/srs/queue'
import type { Rating } from '@/lib/srs/types'

import { rateCardAction } from './actions'

interface StudySessionProps {
  initialQueue: QueueCard[]
}

interface SessionStats {
  total: number
  reviewed: number
  again: number
  hard: number
  good: number
  easy: number
}

const RATING_LABELS: Record<
  Rating,
  { label: string; variant: 'destructive' | 'outline' | 'secondary' | 'default' }
> = {
  again: { label: 'De novo', variant: 'destructive' },
  hard: { label: 'Difícil', variant: 'outline' },
  good: { label: 'Bom', variant: 'secondary' },
  easy: { label: 'Fácil', variant: 'default' },
}

// Human labels for the internal tipo_card taxonomy. Falls back to the raw
// value for any future type so a new tipo never renders blank or crashes.
const TIPO_LABELS = new Map<string, string>([
  ['conceito', 'Conceito'],
  ['vf', 'Certo ou errado'],
  ['cloze', 'Complete a lacuna'],
  ['conceito_aplicacao', 'Aplicação'],
  ['contraste', 'Contraste'],
])

export function StudySession({ initialQueue }: StudySessionProps) {
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [stats, setStats] = useState<SessionStats>({
    total: initialQueue.length,
    reviewed: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })

  const card = initialQueue[index]

  if (!card) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <h2 className="text-2xl font-semibold">Sessão concluída!</h2>
        <p className="text-foreground/70">Você revisou {stats.reviewed} cards.</p>
        <dl className="mt-4 grid grid-cols-4 gap-3 text-center text-sm">
          <Stat label="De novo" value={stats.again} />
          <Stat label="Difícil" value={stats.hard} />
          <Stat label="Bom" value={stats.good} />
          <Stat label="Fácil" value={stats.easy} />
        </dl>
        <Button
          variant="outline"
          onClick={() => {
            window.location.reload()
          }}
        >
          Próxima sessão
        </Button>
      </div>
    )
  }

  function handleRate(rating: Rating) {
    if (!card) return
    if (isPending) return // double-press guard
    // index + 1 === total queue length means this is the last card.
    // Pass isSessionFinale so awardXpAndStreak doubles XP for the
    // celebratory finish bonus (sparkle parity, feat #7).
    const isSessionFinale = index === initialQueue.length - 1
    startTransition(async () => {
      const result = await rateCardAction({ cardId: card.id, rating, isSessionFinale })
      if (!result.ok) {
        // Surface error in UI somehow — for now, swallow + log to Sentry
        // via the network layer. Phase 5.3 adds a toast/snackbar.
        return
      }
      setStats((s) => ({
        ...s,
        reviewed: s.reviewed + 1,
        [rating]: s[rating] + 1,
      }))
      setShowBack(false)
      setIndex((i) => i + 1)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between text-xs text-foreground/60">
        <span>
          Card {index + 1} de {stats.total}
        </span>
        <span>{stats.reviewed} revisado(s)</span>
      </div>

      <article className="min-h-[260px] rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-foreground/50">
          {TIPO_LABELS.get(card.tipo_card) ?? card.tipo_card}
        </div>
        <div className="mt-4 text-lg leading-relaxed text-foreground">
          {renderCloze(card.front_text, showBack)}
        </div>

        {showBack ? (
          <div className="mt-6 border-t border-border pt-6 text-base leading-relaxed text-foreground/90">
            {card.back_text}
            {card.fundamento_legal ? (
              <p className="mt-4 text-xs text-foreground/60">
                <span className="font-medium">Fundamento legal:</span> {card.fundamento_legal}
              </p>
            ) : null}
          </div>
        ) : null}
      </article>

      {!showBack ? (
        <Button
          onClick={() => {
            setShowBack(true)
          }}
          size="lg"
          disabled={isPending}
        >
          Mostrar resposta
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['again', 'hard', 'good', 'easy'] as const).map((r) => (
            <Button
              key={r}
              variant={RATING_LABELS[r].variant}
              onClick={() => {
                handleRate(r)
              }}
              disabled={isPending}
            >
              {RATING_LABELS[r].label}
            </Button>
          ))}
        </div>
      )}

      {isPending ? <p className="text-center text-xs text-foreground/50">Salvando…</p> : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
    </div>
  )
}
