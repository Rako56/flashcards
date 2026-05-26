import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'

export const metadata = {
  title: 'Pagamento confirmado — Flashcards',
}

export const dynamic = 'force-dynamic'

/**
 * Post-checkout landing page.
 *
 * User lands here after returning from Asaas hosted checkout. The
 * actual access grant happens server-side when Asaas calls our
 * /api/webhooks/asaas with status='RECEIVED' / 'CONFIRMED' (already
 * wired since Plan 4.1).
 *
 * This page does a quick access check on server-side render. If
 * access exists, show the success card with a CTA to /study. If not
 * yet (webhook still processing), show "aguardando confirmação" with
 * a manual refresh hint — we DON'T polling-loop on the client because
 * it burns Supabase RPS for nothing; the user can refresh themselves.
 */
export default async function PaymentSuccessPage() {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) redirect('/')
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/sucesso')

  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        {hasAccess ? (
          <>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600">
              ✓
            </div>
            <h1 className="text-2xl font-semibold">Pagamento confirmado!</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Bem-vindo à preparação <strong>{concurso.title}</strong>. Seu acesso já está ativo.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/study">Iniciar primeira sessão</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-foreground/60">
              Você pode cancelar nos primeiros 7 dias com reembolso integral (CDC art. 49).
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-foreground/10 text-2xl">
              ⏳
            </div>
            <h1 className="text-2xl font-semibold">Aguardando confirmação</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Recebemos seu pedido. O Asaas confirma o pagamento em até 1 minuto (PIX) ou alguns
              dias (boleto). Você verá seu acesso aparecer aqui automaticamente.
            </p>
            <p className="mt-4 text-sm text-foreground/60">
              Atualize a página em 1 minuto. Se demorar mais que isso, fale com a gente em{' '}
              <Link href="/sobre" className="underline hover:no-underline">
                /sobre
              </Link>
              .
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button asChild variant="outline">
                <Link href="/sucesso">Atualizar</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/">Voltar ao início</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
