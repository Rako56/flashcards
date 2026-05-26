'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { toggleConcursoStatusAction } from './actions'

export function ConcursoStatusToggle({
  concursoId,
  currentStatus,
}: {
  concursoId: string
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
      const result = await toggleConcursoStatusAction({ concursoId, nextStatus })
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
