'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { deleteAccountAction, type DeleteAccountResult } from './actions'

const INITIAL_STATE: DeleteAccountResult | null = null

async function action(
  _prev: DeleteAccountResult | null,
  formData: FormData,
): Promise<DeleteAccountResult | null> {
  const result = await deleteAccountAction(formData)
  return result
}

/**
 * Client form — bound to deleteAccountAction. Uses useActionState so a
 * failed deletion surfaces the friendly error inline without a full
 * navigation. On success the action throws via `redirect('/?deleted=1')`
 * and React Router takes over.
 */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const isError = state !== null && !state.ok

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Motivo (opcional)</Label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={500}
          placeholder="Conte porquê está saindo — usamos pra melhorar (opcional)."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmation">
          Para confirmar, digite <span className="font-bold">EXCLUIR</span> abaixo
        </Label>
        <Input
          id="confirmation"
          name="confirmation"
          required
          autoComplete="off"
          aria-describedby={isError ? 'delete-error' : undefined}
        />
      </div>

      {isError ? (
        <p id="delete-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? 'Excluindo...' : 'Excluir conta permanentemente'}
      </Button>
    </form>
  )
}
