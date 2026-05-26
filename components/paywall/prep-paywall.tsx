import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/auth/actions'
import type { ConcursoPublic } from '@/lib/concurso/get-by-slug'

interface PrepPaywallProps {
  concurso: ConcursoPublic
  userEmail: string
}

/**
 * Full-screen paywall shown when an authenticated user hits a
 * concurso subdomain WITHOUT an active access grant in
 * user_concurso_access.
 *
 * Phase 4 (Asaas checkout) wires the actual purchase flow to the
 * "Comprar acesso" button. For now it links to /checkout as a
 * placeholder — the page itself comes in Phase 4.
 *
 * Server Component — logoutAction is a Server Action passed via the
 * <form action={logoutAction}> pattern (no useActionState needed since
 * we don't need feedback state).
 */
export function PrepPaywall({ concurso, userEmail }: PrepPaywallProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-brand-primary px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-primary-foreground">
            {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight">{concurso.title}</h1>
        {concurso.cargo ? (
          <p className="mt-2 text-center text-sm text-foreground/70">{concurso.cargo}</p>
        ) : null}

        <div className="mt-8 rounded-md border border-border bg-background/50 p-5">
          <p className="text-sm text-foreground/80">
            Você ainda não tem acesso a essa preparação. Para começar a estudar com flashcards
            curados pela equipe Cowork, simulado real e painel premium, ative sua assinatura.
          </p>
        </div>

        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/checkout">Comprar acesso · R$ 297/ano</Link>
        </Button>

        <p className="mt-4 text-center text-xs text-foreground/60">
          Pagamento via PIX, boleto ou cartão. Reembolso garantido em 7 dias (CDC art. 49).
        </p>

        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-foreground/60">
          Logado como <span className="font-medium">{userEmail}</span>{' '}
          <form action={logoutAction} className="mt-2 inline-block">
            <button type="submit" className="text-brand-primary underline-offset-4 hover:underline">
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
