'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { requestPasswordResetAction, type ForgotPasswordResult } from './actions'

const INITIAL_STATE: ForgotPasswordResult | null = null

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, INITIAL_STATE)
  const isError = state !== null && !state.ok
  const isSuccess = state?.ok === true

  if (isSuccess) {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Solicitação enviada</h1>
        <p className="mt-3 text-sm text-foreground/80">{state.message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-primary hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Informe o e-mail cadastrado para receber o link de recuperação.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          aria-invalid={isError && state.fieldErrors?.email ? 'true' : undefined}
        />
        {isError && state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      {isError && !state.fieldErrors ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar link de recuperação'}
      </Button>

      <p className="text-center text-sm text-foreground/70">
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
