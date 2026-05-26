'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { markAllMistakesReviewedAction, markMistakeReviewedAction } from './actions'

/**
 * "Dominei" button for a single mistake row. Optimistic hide on click;
 * on server error, reverts and shows inline message.
 */
export function MarkMasteredButton({ cardId }: { cardId: string }) {
  const [pending, startTransition] = useTransition()
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (pending) return
    setError(null)
    setHidden(true)
    startTransition(async () => {
      const result = await markMistakeReviewedAction({ cardId })
      if (!result.ok) {
        setError(result.error)
        setHidden(false)
      }
    })
  }

  if (hidden) {
    return (
      <p className="text-xs text-foreground/50">
        Marcado como dominado{pending ? '…' : '. Atualizando…'}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={handleClick}
        title="Remove esse card do caderno de erros"
      >
        Dominei
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

/**
 * Bulk action — flips every visible mistake to mastered in a single
 * round-trip. Confirms first because it's irreversible-ish (cards
 * disappear from the caderno until the user errs again).
 */
export function MarkAllMasteredButton({ cardIds }: { cardIds: string[] }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (cardIds.length === 0) return null

  function handleSubmit() {
    if (pending) return
    setError(null)
    setConfirming(false)
    startTransition(async () => {
      const result = await markAllMistakesReviewedAction({ cardIds })
      if (result.ok) {
        setDone(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <p className="text-xs text-emerald-600">
        Todos os erros visíveis foram marcados como dominados.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setConfirming(true)
        }}
        title="Marca todos os erros visíveis como dominados de uma vez"
      >
        Dominei todos ({cardIds.length})
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-mark-all-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-6"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 id="confirm-mark-all-title" className="text-lg font-semibold">
              Marcar todos como dominados?
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              {cardIds.length} erro(s) visível(eis) sairão do caderno. Se você errar de novo em
              /study, eles voltam.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirming(false)
                }}
                disabled={pending}
              >
                Voltar
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={pending}>
                {pending ? 'Enviando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
