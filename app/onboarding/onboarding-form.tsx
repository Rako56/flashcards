'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { saveOnboardingAction, type OnboardingResult } from './actions'

const INITIAL_STATE: OnboardingResult | null = null

export function OnboardingForm({
  initialFullName,
  initialCpf,
}: {
  initialFullName: string
  initialCpf: string
}) {
  const [state, formAction, pending] = useActionState(saveOnboardingAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const fullNameError = isError ? state.fieldErrors?.full_name : undefined
  const cpfError = isError ? state.fieldErrors?.cpf : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          defaultValue={initialFullName}
          autoComplete="name"
          aria-invalid={fullNameError ? 'true' : undefined}
          aria-describedby={fullNameError ? 'full_name-error' : undefined}
        />
        {fullNameError ? (
          <p id="full_name-error" role="alert" className="text-xs text-destructive">
            {fullNameError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          name="cpf"
          required
          defaultValue={initialCpf}
          autoComplete="off"
          inputMode="numeric"
          placeholder="000.000.000-00"
          aria-invalid={cpfError ? 'true' : undefined}
          aria-describedby={cpfError ? 'cpf-error' : 'cpf-help'}
        />
        {cpfError ? (
          <p id="cpf-error" role="alert" className="text-xs text-destructive">
            {cpfError}
          </p>
        ) : (
          <p id="cpf-help" className="text-xs text-foreground/60">
            Usamos seu CPF apenas para faturamento (nota fiscal). Não compartilhamos.
          </p>
        )}
      </div>

      {isError && !state.fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Salvando...' : 'Continuar'}
      </Button>
    </form>
  )
}
