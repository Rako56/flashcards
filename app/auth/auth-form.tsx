'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { AuthActionResult } from './actions'
import { GoogleButton } from './google-button'

type AuthAction = (state: AuthActionResult | null, formData: FormData) => Promise<AuthActionResult>

interface AuthFormProps {
  action: AuthAction
  mode: 'login' | 'signup'
  altHref: string
  altLabel: string
}

const SUBMIT_LABEL: Record<AuthFormProps['mode'], string> = {
  login: 'Entrar',
  signup: 'Criar conta',
}

const TITLE: Record<AuthFormProps['mode'], string> = {
  login: 'Entrar no Flashcards',
  signup: 'Criar conta',
}

const SUBTITLE: Record<AuthFormProps['mode'], string> = {
  login: 'Use o e-mail e a senha cadastrados no seu acesso.',
  signup: 'Crie sua conta para acessar suas preparações pagas.',
}

export function AuthForm({ action, mode, altHref, altLabel }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    action,
    null,
  )

  // On signup success (email confirmation pending), show a confirmation
  // panel instead of the form.
  if (state?.ok && mode === 'signup') {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Quase lá!</h1>
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
        <h1 className="text-xl font-semibold">{TITLE[mode]}</h1>
        <p className="mt-1 text-sm text-foreground/70">{SUBTITLE[mode]}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state && !state.ok && state.fieldErrors?.email ? 'true' : undefined}
          disabled={isPending}
        />
        {state && !state.ok && state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'signup' ? 10 : undefined}
          aria-invalid={state && !state.ok && state.fieldErrors?.password ? 'true' : undefined}
          disabled={isPending}
        />
        {state && !state.ok && state.fieldErrors?.password ? (
          <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
        ) : mode === 'signup' ? (
          <p className="text-xs text-foreground/60">
            Mínimo 10 caracteres. Senhas vazadas em incidentes públicos serão rejeitadas.
          </p>
        ) : null}
      </div>

      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Aguarde…' : SUBMIT_LABEL[mode]}
      </Button>

      <div className="flex items-center gap-3 text-xs text-foreground/40">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span>ou</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <GoogleButton label={mode === 'login' ? 'Entrar com Google' : 'Criar conta com Google'} />

      <p className="text-center text-sm text-foreground/70">
        <Link href={altHref} className="font-medium text-brand-primary hover:underline">
          {altLabel}
        </Link>
      </p>
    </form>
  )
}
