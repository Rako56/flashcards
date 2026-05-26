'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { saveProfileAction, type ProfileResult } from './actions'

const INITIAL_STATE: ProfileResult | null = null

export function ProfileForm({
  initialFullName,
  initialCpf,
}: {
  initialFullName: string
  initialCpf: string
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const isSuccess = state?.ok === true
  const fieldErrors = isError ? state.fieldErrors : undefined

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
          aria-invalid={fieldErrors?.full_name ? 'true' : undefined}
          aria-describedby={fieldErrors?.full_name ? 'full_name-error' : undefined}
        />
        {fieldErrors?.full_name ? (
          <p id="full_name-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.full_name}
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
          aria-invalid={fieldErrors?.cpf ? 'true' : undefined}
          aria-describedby={fieldErrors?.cpf ? 'cpf-error' : 'cpf-help'}
        />
        {fieldErrors?.cpf ? (
          <p id="cpf-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.cpf}
          </p>
        ) : (
          <p id="cpf-help" className="text-xs text-foreground/60">
            Usamos seu CPF apenas para faturamento (nota fiscal).
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
        {pending ? 'Salvando…' : 'Salvar perfil'}
      </Button>
    </form>
  )
}
