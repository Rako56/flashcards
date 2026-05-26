import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'

export const metadata = {
  title: 'Checkout — Flashcards',
}

/**
 * Checkout placeholder for Phase 4.1.
 *
 * Phase 4.2 will:
 *  - Call Asaas API to create Customer (if not yet) + Payment
 *  - Build externalReference = `${user.id}:${concurso.slug}:${plan}`
 *  - Redirect user to Asaas checkout invoiceUrl (PIX/boleto/cartão)
 *  - On return, /sucesso page polls user_concurso_access (the legacy
 *    bug class — see bugs-from-vite-version.md #9)
 *
 * For now this is just a confirmation card with a "next step" message.
 */
export default async function CheckoutPage() {
  const concurso = await getConcursoFromHeaders()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/checkout')
  }

  if (!concurso) {
    redirect('/')
  }

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

        <Button className="mt-8 w-full" size="lg" disabled>
          Pagar com PIX · em breve
        </Button>

        <p className="mt-3 text-center text-xs text-foreground/60">
          Phase 4.2: integração Asaas (PIX + boleto + cartão) chega em PR separado quando a chave de
          API sandbox for configurada.
        </p>

        <p className="mt-6 border-t border-border pt-4 text-center text-xs text-foreground/60">
          Logado como <span className="font-medium">{user.email}</span>
        </p>
      </div>
    </main>
  )
}
