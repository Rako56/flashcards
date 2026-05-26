'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { startSimuladoAction, submitSimuladoFormAction } from './actions'

interface SimuladoQuestionLike {
  id: string
  enunciado: string
  alternativas: unknown
  disciplina_sugerida: string | null
  anulada: boolean
  dificuldade: string | null
}

interface RunnerProps {
  simuladoId: string
  questions: SimuladoQuestionLike[]
  alreadyStarted: boolean
  timeLimitMinutes: number | null
}

const ANSWERS_KEY_PREFIX = 'flashcards:simulado-answers:'

/**
 * Interactive simulado runner.
 *
 * Local state holds answers as `{ [questionId]: 'A' }`. Each change is
 * mirrored to localStorage so a refresh doesn't lose progress. Submit
 * is a single Server Action that scores + persists; on success the
 * route revalidates and the user lands back on /simulado/[id] with
 * the score visible.
 *
 * Timer is optional — if `timeLimitMinutes` is set, we surface a
 * countdown and auto-submit when it hits zero. Otherwise we just
 * track elapsed for reporting.
 */
export function SimuladoRunner({
  simuladoId,
  questions,
  alreadyStarted,
  timeLimitMinutes,
}: RunnerProps) {
  const storageKey = `${ANSWERS_KEY_PREFIX}${simuladoId}`
  const startedAtRef = useRef<number>(Date.now())
  const formRef = useRef<HTMLFormElement>(null)
  const [pendingStart, startStartTransition] = useTransition()
  const [pendingSubmit, startSubmitTransition] = useTransition()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsedSec, setElapsedSec] = useState<number>(0)
  const [confirming, setConfirming] = useState(false)

  // Rehydrate answers from localStorage on mount (refresh resilience).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const sanitised: Record<string, string> = {}
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === 'string') sanitised[k] = v
          }
          setAnswers(sanitised)
        }
      }
    } catch {
      /* ignore — start fresh */
    }
  }, [storageKey])

  // Persist answers on change.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(answers))
    } catch {
      /* swallow quota errors — runner stays usable, just no refresh resilience */
    }
  }, [answers, storageKey])

  // Flip status=in_progress on first mount if still pending.
  useEffect(() => {
    if (alreadyStarted) return
    startStartTransition(() => {
      void startSimuladoAction(simuladoId)
    })
    // Only on mount; we don't care if alreadyStarted flips later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simuladoId])

  // Elapsed seconds counter.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const timeLimitSec = timeLimitMinutes ? timeLimitMinutes * 60 : null
  const remainingSec = timeLimitSec !== null ? Math.max(0, timeLimitSec - elapsedSec) : null

  const onSelect = useCallback((questionId: string, letter: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: letter }))
  }, [])

  const onClear = useCallback((questionId: string) => {
    setAnswers((prev) => {
      // Rebuild without the cleared id rather than `delete` — lint forbids
      // dynamic delete (perf trap on engines that de-opt the object).
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (k !== questionId) next[k] = v
      }
      return next
    })
  }, [])

  const answeredCount = Object.keys(answers).length
  const unanswered = questions.length - answeredCount

  const onSubmit = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear the localStorage answer cache before navigating away.
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        /* ignore */
      }
    }
    if (formRef.current) {
      startSubmitTransition(() => {
        formRef.current?.requestSubmit()
      })
    }
  }, [storageKey])

  // Auto-submit when timer hits zero.
  useEffect(() => {
    if (remainingSec === null) return
    if (remainingSec > 0) return
    if (pendingSubmit) return
    onSubmit()
  }, [remainingSec, pendingSubmit, onSubmit])

  // Memoized timer label avoids re-allocating per tick when prefix
  // stays the same — micro-optimisation, but cheap.
  const timerLabel = useMemo(() => {
    if (remainingSec === null) {
      return formatHms(elapsedSec)
    }
    return formatHms(remainingSec)
  }, [elapsedSec, remainingSec])

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky header with timer + progress */}
      <div className="sticky top-14 z-10 -mx-6 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="text-sm">
          <span className="font-medium">{answeredCount}</span>
          <span className="text-foreground/60">/{questions.length} respondidas</span>
          {unanswered > 0 ? (
            <span className="ml-2 text-foreground/50">· {unanswered} em branco</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-sm tabular-nums ${
              remainingSec !== null && remainingSec < 60 ? 'text-destructive' : 'text-foreground/80'
            }`}
            aria-label={remainingSec !== null ? 'Tempo restante' : 'Tempo decorrido'}
          >
            {timerLabel}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setConfirming(true)
            }}
            disabled={pendingSubmit || pendingStart}
          >
            Finalizar
          </Button>
        </div>
      </div>

      {/* Questions */}
      <ol className="flex flex-col gap-4">
        {questions.map((q, idx) => (
          <QuestionItem
            key={q.id}
            index={idx}
            question={q}
            selected={answers[q.id] ?? null}
            onSelect={onSelect}
            onClear={onClear}
          />
        ))}
      </ol>

      {/* Bottom sticky submit */}
      <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
        <p className="text-sm text-foreground/60">
          {unanswered > 0 ? `${String(unanswered)} questão(ões) em branco` : 'Tudo respondido'}
        </p>
        <Button
          type="button"
          onClick={() => {
            setConfirming(true)
          }}
          disabled={pendingSubmit || pendingStart}
        >
          Finalizar simulado
        </Button>
      </div>

      {/* Confirmation modal */}
      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-6"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 id="confirm-title" className="text-lg font-semibold">
              Finalizar simulado?
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              {unanswered > 0
                ? `${String(unanswered)} questão(ões) ainda em branco serão contadas como erradas.`
                : 'Pronto pra ver o resultado?'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirming(false)
                }}
                disabled={pendingSubmit}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  onSubmit()
                }}
                disabled={pendingSubmit}
              >
                {pendingSubmit ? 'Enviando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hidden form that carries answers to the Server Action */}
      <form ref={formRef} action={submitSimuladoFormAction} className="hidden">
        <input type="hidden" name="simulado_id" value={simuladoId} />
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />
        <input type="hidden" name="elapsed_seconds" value={String(elapsedSec)} />
      </form>
    </div>
  )
}

function QuestionItem({
  index,
  question,
  selected,
  onSelect,
  onClear,
}: {
  index: number
  question: SimuladoQuestionLike
  selected: string | null
  onSelect: (questionId: string, letter: string) => void
  onClear: (questionId: string) => void
}) {
  const alternatives = parseAlternatives(question.alternativas)
  return (
    <li className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-foreground/50">
          Questão {index + 1}
        </span>
        <span className="text-xs text-foreground/50">
          {question.disciplina_sugerida ?? '—'}
          {question.dificuldade ? ` · ${question.dificuldade}` : null}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{question.enunciado}</p>
      {alternatives.length > 0 ? (
        <fieldset className="mt-4">
          <legend className="sr-only">Alternativas da questão {index + 1}</legend>
          <ul className="flex flex-col gap-2">
            {alternatives.map((alt, i) => {
              const letter = String.fromCharCode(65 + i)
              const isSelected = selected === letter
              return (
                <li key={`${question.id}-${String(i)}`}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 text-foreground'
                        : 'border-border bg-background text-foreground/80 hover:border-foreground/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={letter}
                      checked={isSelected}
                      onChange={() => {
                        onSelect(question.id, letter)
                      }}
                      className="mt-1 h-4 w-4 cursor-pointer accent-brand-primary"
                    />
                    <span className="flex-1">
                      <span className="mr-2 font-mono text-xs text-foreground/50">{letter}.</span>
                      {alt}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs">
        {question.anulada ? (
          <span className="inline-flex rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
            Anulada
          </span>
        ) : (
          <span />
        )}
        {selected ? (
          <button
            type="button"
            onClick={() => {
              onClear(question.id)
            }}
            className="text-foreground/50 underline hover:text-foreground"
          >
            Limpar resposta
          </button>
        ) : null}
      </div>
    </li>
  )
}

function parseAlternatives(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      if (typeof entry === 'string') return entry
      if (
        entry &&
        typeof entry === 'object' &&
        'texto' in entry &&
        typeof (entry as { texto: unknown }).texto === 'string'
      ) {
        return (entry as { texto: string }).texto
      }
      return JSON.stringify(entry)
    })
  }
  return []
}

function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}
