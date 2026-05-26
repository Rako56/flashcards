'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createSimuladoAction, type CreateSimuladoResult } from './actions'

const INITIAL_STATE: CreateSimuladoResult | null = null

export function CreateSimuladoForm() {
  const [state, formAction, pending] = useActionState(createSimuladoAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const fieldErrors = isError ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Ex: Simulado direito civil — bloco 1"
          aria-invalid={fieldErrors?.title ? 'true' : undefined}
        />
        {fieldErrors?.title ? (
          <p className="text-xs text-destructive">{fieldErrors.title}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={500}
          placeholder="Notas sobre esse simulado (opcional)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="total_questions">Quantas questões?</Label>
          <Input
            id="total_questions"
            name="total_questions"
            type="number"
            required
            min={5}
            max={100}
            defaultValue={20}
            aria-invalid={fieldErrors?.total_questions ? 'true' : undefined}
          />
          {fieldErrors?.total_questions ? (
            <p className="text-xs text-destructive">{fieldErrors.total_questions}</p>
          ) : (
            <p className="text-xs text-foreground/60">5–100</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="time_limit_minutes">Tempo limite (min)</Label>
          <Input
            id="time_limit_minutes"
            name="time_limit_minutes"
            type="number"
            min={0}
            max={360}
            placeholder="0 = sem limite"
            aria-invalid={fieldErrors?.time_limit_minutes ? 'true' : undefined}
          />
          {fieldErrors?.time_limit_minutes ? (
            <p className="text-xs text-destructive">{fieldErrors.time_limit_minutes}</p>
          ) : (
            <p className="text-xs text-foreground/60">opcional</p>
          )}
        </div>
      </div>

      {isError && !fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Criando…' : 'Criar simulado'}
      </Button>
    </form>
  )
}
