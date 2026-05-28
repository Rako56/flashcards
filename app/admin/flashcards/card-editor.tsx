'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { archiveByLegislacaoAction, updateFlashcardAction } from './actions'

/**
 * Full card editor — expands inline under the row. Edits front/back +
 * fundamento/explicação/dica + dificuldade/status. Used when a law
 * changes/is revoked and the content needs correcting (not just a
 * status flip). On save, the server action revalidates the page.
 */
export interface EditableCard {
  id: string
  front_text: string
  back_text: string
  fundamento_legal: string | null
  explicacao_detalhada: string | null
  dica_pegadinha: string | null
  dificuldade: string | null
  status: string
}

const STATUS_OPTS = ['active', 'review', 'archived', 'draft'] as const
const DIF_OPTS = ['facil', 'media', 'dificil'] as const
const fieldCls =
  'w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-brand-primary focus:outline-none'

export function CardEditor({ card }: { card: EditableCard }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [front, setFront] = useState(card.front_text)
  const [back, setBack] = useState(card.back_text)
  const [fund, setFund] = useState(card.fundamento_legal ?? '')
  const [expl, setExpl] = useState(card.explicacao_detalhada ?? '')
  const [dica, setDica] = useState(card.dica_pegadinha ?? '')
  const [dif, setDif] = useState(card.dificuldade ?? 'media')
  const [status, setStatus] = useState(card.status)

  function save() {
    if (pending) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateFlashcardAction({
        cardId: card.id,
        front_text: front,
        back_text: back,
        fundamento_legal: fund,
        explicacao_detalhada: expl,
        dica_pegadinha: dica,
        dificuldade: dif,
        status,
      })
      if (result.ok) {
        setSaved(true)
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {saved ? <span className="text-xs text-emerald-600">salvo ✓</span> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true)
        }}
      >
        Editar
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => {
            if (!pending) setOpen(false)
          }}
        >
          <div
            className="my-8 flex w-full max-w-xl flex-col gap-2 rounded-lg border border-border bg-card p-5 text-left shadow-xl"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <h3 className="text-sm font-semibold">Editar flashcard</h3>
            <label className="text-xs font-medium text-foreground/60">Frente</label>
            <textarea
              className={fieldCls}
              rows={3}
              value={front}
              onChange={(e) => {
                setFront(e.target.value)
              }}
            />
            <label className="text-xs font-medium text-foreground/60">Verso</label>
            <textarea
              className={fieldCls}
              rows={3}
              value={back}
              onChange={(e) => {
                setBack(e.target.value)
              }}
            />
            <label className="text-xs font-medium text-foreground/60">Fundamento legal</label>
            <input
              className={fieldCls}
              value={fund}
              onChange={(e) => {
                setFund(e.target.value)
              }}
            />
            <label className="text-xs font-medium text-foreground/60">Explicação</label>
            <textarea
              className={fieldCls}
              rows={3}
              value={expl}
              onChange={(e) => {
                setExpl(e.target.value)
              }}
            />
            <label className="text-xs font-medium text-foreground/60">Dica / pegadinha</label>
            <input
              className={fieldCls}
              value={dica}
              onChange={(e) => {
                setDica(e.target.value)
              }}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-foreground/60">Dificuldade</label>
                <select
                  className={fieldCls}
                  value={dif}
                  onChange={(e) => {
                    setDif(e.target.value)
                  }}
                >
                  {DIF_OPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-foreground/60">Status</label>
                <select
                  className={fieldCls}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value)
                  }}
                >
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setOpen(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={pending} onClick={save}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Batch archive by legislation — type a law/term and archive every
 * active/review card that references it (fundamento_legal, legislacao_ref
 * or front_text). For when a law is revoked.
 */
export function BatchArchive({ concursoId }: { concursoId?: string }) {
  const [term, setTerm] = useState('')
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run() {
    if (pending || term.trim().length < 3) return
    setError(null)
    setMsg(null)
    startTransition(async () => {
      const result = await archiveByLegislacaoAction({
        term,
        ...(concursoId ? { concursoId } : {}),
      })
      if (result.ok) {
        setMsg(`${String(result.count)} card(s) arquivado(s) para "${term}".`)
        setTerm('')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">Arquivar em lote por legislação</p>
      <p className="text-xs text-foreground/60">
        Lei revogada/alterada? Digite a referência (ex: <code>Lei 8.112</code>,{' '}
        <code>art. 940</code>) e arquive todos os cards ativos/review que a citam.
      </p>
      <div className="flex gap-2">
        <input
          className={fieldCls}
          placeholder="Lei 8.112/90"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || term.trim().length < 3}
          onClick={run}
        >
          {pending ? 'Arquivando…' : 'Arquivar'}
        </Button>
      </div>
      {msg ? <p className="text-xs text-emerald-600">{msg}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
