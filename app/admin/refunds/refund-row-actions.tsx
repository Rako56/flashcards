'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { updateRefundStatusAction } from './actions'

interface RefundRowActionsProps {
  refundId: string
  currentStatus: string
}

const NEXT_LABEL: Record<
  string,
  { label: string; nextStatus: 'approved' | 'rejected' | 'pending' }[]
> = {
  pending: [
    { label: 'Aprovar', nextStatus: 'approved' },
    { label: 'Rejeitar', nextStatus: 'rejected' },
  ],
  approved: [{ label: 'Reabrir', nextStatus: 'pending' }],
  rejected: [{ label: 'Reabrir', nextStatus: 'pending' }],
}

/**
 * Refund triage actions — surfaces context-aware status transition
 * buttons + an optional admin_notes textarea.
 *
 * Optimistic transition (button disabled while pending) + inline
 * error message on failure. Success triggers a revalidatePath
 * (server side) which re-renders the page server-side; client
 * state just resets after pending finishes.
 */
export function RefundRowActions({ refundId, currentStatus }: RefundRowActionsProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)

  const options = NEXT_LABEL[currentStatus] ?? []

  function handleTransition(nextStatus: 'approved' | 'rejected' | 'pending') {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('refund_id', refundId)
      fd.set('status', nextStatus)
      if (notes.trim().length > 0) fd.set('admin_notes', notes.trim())
      const result = await updateRefundStatusAction(fd)
      if (!result.ok) {
        setError(result.error)
      } else {
        setExpanded(false)
        setNotes('')
      }
    })
  }

  if (options.length === 0) return null

  return (
    <div className="flex flex-col items-end gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt) => (
          <Button
            key={opt.nextStatus}
            type="button"
            size="sm"
            variant={opt.nextStatus === 'approved' ? 'default' : 'outline'}
            disabled={pending}
            onClick={() => {
              handleTransition(opt.nextStatus)
            }}
          >
            {pending ? '…' : opt.label}
          </Button>
        ))}
        <button
          type="button"
          className="text-foreground/50 underline hover:text-foreground"
          onClick={() => {
            setExpanded((v) => !v)
          }}
        >
          {expanded ? 'Esconder nota' : '+ nota'}
        </button>
      </div>
      {expanded ? (
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
          }}
          maxLength={2000}
          rows={3}
          placeholder="Nota interna (opcional, max 2000 chars)"
          className="w-64 rounded border border-border bg-background px-2 py-1 text-xs"
        />
      ) : null}
      {error ? <p className="text-destructive">{error}</p> : null}
    </div>
  )
}
