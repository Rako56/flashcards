'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { saveStudyPreferencesAction, type StudyPreferencesResult } from './actions'

const INITIAL_STATE: StudyPreferencesResult | null = null

export function StudyPrefsForm({
  initial,
}: {
  initial: {
    daily_goal_minutes: number
    default_session_size: number
    default_new_per_day: number
  }
}) {
  const [state, formAction, pending] = useActionState(saveStudyPreferencesAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const isSuccess = state?.ok === true
  const fieldErrors = isError ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="daily_goal_minutes">Meta diária (minutos)</Label>
        <Input
          id="daily_goal_minutes"
          name="daily_goal_minutes"
          type="number"
          required
          min={5}
          max={240}
          defaultValue={initial.daily_goal_minutes}
          aria-invalid={fieldErrors?.daily_goal_minutes ? 'true' : undefined}
        />
        {fieldErrors?.daily_goal_minutes ? (
          <p className="text-xs text-destructive">{fieldErrors.daily_goal_minutes}</p>
        ) : (
          <p className="text-xs text-foreground/60">5–240 min</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="default_session_size">Tamanho padrão da sessão</Label>
        <Input
          id="default_session_size"
          name="default_session_size"
          type="number"
          required
          min={5}
          max={100}
          defaultValue={initial.default_session_size}
          aria-invalid={fieldErrors?.default_session_size ? 'true' : undefined}
        />
        {fieldErrors?.default_session_size ? (
          <p className="text-xs text-destructive">{fieldErrors.default_session_size}</p>
        ) : (
          <p className="text-xs text-foreground/60">5–100 cards por sessão</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="default_new_per_day">Cards novos por dia</Label>
        <Input
          id="default_new_per_day"
          name="default_new_per_day"
          type="number"
          required
          min={0}
          max={50}
          defaultValue={initial.default_new_per_day}
          aria-invalid={fieldErrors?.default_new_per_day ? 'true' : undefined}
        />
        {fieldErrors?.default_new_per_day ? (
          <p className="text-xs text-destructive">{fieldErrors.default_new_per_day}</p>
        ) : (
          <p className="text-xs text-foreground/60">
            0 = só revisa (sem novos). 5 é equilibrado. 20+ é pesado.
          </p>
        )}
      </div>

      {isError && !fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {isSuccess ? (
        <p
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Salvando…' : 'Salvar preferências'}
      </Button>
    </form>
  )
}
