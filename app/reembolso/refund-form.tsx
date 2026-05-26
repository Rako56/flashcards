'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { submitRefundRequestAction, type SubmitRefundResult } from './actions'

interface RefundFormProps {
  initialEmail?: string | undefined
  initialConcurso?: string | undefined
}

/**
 * Self-serve refund form.
 *
 * Uses `useActionState` so the Server Action result flows back into
 * the UI without manual fetch glue. Success state renders a thank-you
 * card with the request ID (for the user to reference if they email
 * us). Inline field-level errors come from the action's `fieldErrors`.
 */
export function RefundForm({ initialEmail, initialConcurso }: RefundFormProps) {
  const [state, formAction, pending] = useActionState<SubmitRefundResult | null, FormData>(
    submitRefundRequestAction,
    null,
  )

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6">
        <h2 className="text-lg font-semibold text-emerald-700">Solicitação registrada</h2>
        <p className="mt-2 text-sm text-foreground/80">
          Recebemos seu pedido. Nossa equipe vai entrar em contato pelo e-mail informado em até 2
          dias úteis. Guarde o ID abaixo caso precise referenciar a solicitação.
        </p>
        <p className="mt-3 font-mono text-xs text-foreground/60">ID: {state.id}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.ok === false && state.error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail do cadastro</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={initialEmail}
          aria-invalid={Boolean(state?.ok === false && state.fieldErrors?.['email'])}
          aria-describedby={
            state?.ok === false && state.fieldErrors?.['email'] ? 'email-error' : undefined
          }
        />
        {state?.ok === false && state.fieldErrors?.['email'] ? (
          <p id="email-error" className="text-xs text-destructive">
            {state.fieldErrors['email']}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="concurso_slug">Concurso comprado (opcional)</Label>
        <Input
          id="concurso_slug"
          name="concurso_slug"
          type="text"
          placeholder="ex: tjsp"
          defaultValue={initialConcurso}
          maxLength={80}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cpf_digits">CPF do cadastro (opcional, só dígitos)</Label>
        <Input
          id="cpf_digits"
          name="cpf_digits"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={11}
          aria-invalid={Boolean(state?.ok === false && state.fieldErrors?.['cpfDigits'])}
        />
        {state?.ok === false && state.fieldErrors?.['cpfDigits'] ? (
          <p className="text-xs text-destructive">{state.fieldErrors['cpfDigits']}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motivo">Motivo</Label>
        <textarea
          id="motivo"
          name="motivo"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Conta resumidamente o que aconteceu — pelo menos 20 caracteres."
          aria-invalid={Boolean(state?.ok === false && state.fieldErrors?.['motivo'])}
          aria-describedby={
            state?.ok === false && state.fieldErrors?.['motivo'] ? 'motivo-error' : undefined
          }
        />
        {state?.ok === false && state.fieldErrors?.['motivo'] ? (
          <p id="motivo-error" className="text-xs text-destructive">
            {state.fieldErrors['motivo']}
          </p>
        ) : null}
        <p className="text-xs text-foreground/50">
          Pedido feito em até 7 dias do pagamento? Não precisa justificar — só preenche e confirma.
          CDC art. 49.
        </p>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar solicitação'}
        </Button>
      </div>
    </form>
  )
}
