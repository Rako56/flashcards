'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { changePasswordAction, type ChangePasswordResult } from './actions'

const INITIAL_STATE: ChangePasswordResult | null = null

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const isSuccess = state?.ok === true
  const fieldErrors = isError ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="current">Senha atual</Label>
        <Input
          id="current"
          name="current"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={fieldErrors?.current ? 'true' : undefined}
          aria-describedby={fieldErrors?.current ? 'current-error' : undefined}
        />
        {fieldErrors?.current ? (
          <p id="current-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.current}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="next">Nova senha</Label>
        <Input
          id="next"
          name="next"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          aria-invalid={fieldErrors?.next ? 'true' : undefined}
          aria-describedby={fieldErrors?.next ? 'next-error' : 'next-help'}
        />
        {fieldErrors?.next ? (
          <p id="next-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.next}
          </p>
        ) : (
          <p id="next-help" className="text-xs text-foreground/60">
            Mínimo 10 caracteres. Senhas vazadas em incidentes públicos serão rejeitadas.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          aria-invalid={fieldErrors?.confirm ? 'true' : undefined}
          aria-describedby={fieldErrors?.confirm ? 'confirm-error' : undefined}
        />
        {fieldErrors?.confirm ? (
          <p id="confirm-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.confirm}
          </p>
        ) : null}
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

      <Button type="submit" disabled={pending}>
        {pending ? 'Atualizando…' : 'Atualizar senha'}
      </Button>
    </form>
  )
}
