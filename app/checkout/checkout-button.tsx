'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { startCheckoutAction } from './actions'

/**
 * "Pagar com PIX/Boleto/Cartão" button. Calls startCheckoutAction
 * which redirects to Asaas hosted checkout on success.
 *
 * On error (Asaas not configured, missing profile, network), shows
 * inline error WITHOUT redirecting so the user can fix and retry.
 */
export function CheckoutButton({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const result = await startCheckoutAction()
      if (!result.ok) {
        setError(result.error)
        return
      }
      // On success, the action calls redirect() — control doesn't return here
    })
  }

  if (!enabled) {
    return (
      <>
        <Button className="mt-8 w-full" size="lg" disabled>
          Pagar — em breve
        </Button>
        <p className="mt-3 text-center text-xs text-foreground/60">
          Checkout completo (PIX + boleto + cartão) liga assim que a chave API for configurada.
        </p>
      </>
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending} size="lg" className="w-full">
        {pending ? 'Redirecionando…' : 'Pagar com PIX, Boleto ou Cartão'}
      </Button>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
