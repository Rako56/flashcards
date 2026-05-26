import { redirect } from 'next/navigation'

import { NOINDEX_METADATA } from '@/lib/seo/noindex'

import { CheckoutButton } from './checkout-button'

export const metadata = {
  title: 'Checkout — Flashcards',
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

/**
 * Checkout page — initiates Asaas charge creation on button click.
 *
 * The actual server call lives in `actions.ts` (startCheckoutAction).
 * When ASAAS_API_KEY is present, clicking the button redirects to
 * Asaas hosted checkout (PIX + boleto + cartão); when missing, the
 * button stays disabled with a friendly "em breve" message.
 *
 * Server-side env check decides whether the button is enabled at
 * render time so the user gets immediate feedback without an extra
 * click + error round-trip.
 */
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'

function asaasConfigured(): boolean {
  return Boolean(process.env['ASAAS_API_KEY'] && process.env['ASAAS_API_BASE'])
}

export default async function CheckoutPage() {
  const concurso = await getConcursoFromHeaders()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/checkout')
  }

  if (!concurso) {
    redirect('/')
  }

  const checkoutEnabled = asaasConfigured()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="mt-2 text-sm text-foreground/70">
          {concurso.title} · {concurso.banca ?? '—'}
        </p>

        <div className="mt-6 rounded-md border border-border bg-background/50 p-4">
          <p className="text-3xl font-semibold">R$ 297</p>
          <p className="text-xs text-foreground/60">Acesso por 1 ano · renovação opcional</p>
        </div>

        <div className="mt-6 space-y-3 text-sm text-foreground/80">
          <p>Inclui:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/70">
            <li>Flashcards curados pela equipe Cowork</li>
            <li>Simulado fiel à banca</li>
            <li>Caderno de erros automático</li>
            <li>Painel premium com métricas</li>
            <li>Reembolso garantido em 7 dias (CDC art. 49)</li>
          </ul>
        </div>

        <CheckoutButton enabled={checkoutEnabled} />

        <p className="mt-6 border-t border-border pt-4 text-center text-xs text-foreground/60">
          Logado como <span className="font-medium">{user.email}</span>
        </p>
      </div>
    </main>
  )
}
