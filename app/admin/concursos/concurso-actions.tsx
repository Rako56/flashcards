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

  // PT-BR vocab end-to-end. 'rascunho' (draft) and 'arquivado' (archived)
  // both promote → 'publicado'. 'publicado' demotes → 'arquivado'.
  const nextStatus = optimistic === 'publicado' ? 'arquivado' : 'publicado'
  const label =
    optimistic === 'publicado' ? 'Arquivar' : optimistic === 'arquivado' ? 'Republicar' : 'Publicar'

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
