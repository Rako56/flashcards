'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { markMistakeReviewedAction } from './actions'

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
