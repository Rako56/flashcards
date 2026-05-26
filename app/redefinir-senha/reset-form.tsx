'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { resetPasswordAction, type ResetPasswordResult } from './actions'

const INITIAL_STATE: ResetPasswordResult | null = null

export function ResetForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const fieldErrors = isError ? state.fieldErrors : undefined

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold">Defina sua nova senha</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Use uma combinação que você não usa em outros sites.
        </p>
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
          disabled={pending}
          aria-invalid={fieldErrors?.next ? 'true' : undefined}
        />
        {fieldErrors?.next ? (
          <p className="text-xs text-destructive">{fieldErrors.next}</p>
        ) : (
          <p className="text-xs text-foreground/60">Mínimo 10 caracteres.</p>
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
          disabled={pending}
          aria-invalid={fieldErrors?.confirm ? 'true' : undefined}
        />
        {fieldErrors?.confirm ? (
          <p className="text-xs text-destructive">{fieldErrors.confirm}</p>
        ) : null}
      </div>

      {isError && !fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando…' : 'Definir nova senha'}
      </Button>

      <p className="text-center text-sm text-foreground/70">
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
