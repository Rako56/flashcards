'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { toggleCardStatusAction } from './actions'

/**
 * Inline status toggle for admin flashcard rows.
 *
 * Click → optimistic status flip → server call. If server errors,
 * shows toast-like inline error and reverts. Server response triggers
 * revalidatePath('/admin/flashcards') so the page re-fetches with the
 * authoritative status.
 */
export function CardStatusToggle({
  cardId,
  currentStatus,
}: {
  cardId: string
  currentStatus: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [optimistic, setOptimistic] = useState(currentStatus)

  const nextStatus = optimistic === 'active' ? 'archived' : 'active'
  const label =
    optimistic === 'active' ? 'Arquivar' : optimistic === 'archived' ? 'Reativar' : 'Ativar'

  function handleClick() {
    if (pending) return
    setError(null)
    const previous = optimistic
    setOptimistic(nextStatus)
    startTransition(async () => {
      const result = await toggleCardStatusAction({ cardId, nextStatus })
      if (!result.ok) {
        setError(result.error)
        setOptimistic(previous)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? '…' : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
