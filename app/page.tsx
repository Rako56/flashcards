import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { PrepPaywall } from '@/components/paywall/prep-paywall'
import { logoutAction } from '@/app/auth/actions'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'

export default async function HomePage() {
  const concurso = await getConcursoFromHeaders()

  // STATE 1: apex / reserved subdomain → marketing landing
  if (!concurso) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-4xl font-semibold tracking-tight">flashcards.com.br</h1>
        <p className="max-w-md text-center text-lg text-foreground/70">
          Marketplace de preparações curadas para concursos públicos brasileiros.
        </p>
        <p className="mt-4 text-sm text-foreground/50">
          Em construção · Acesse via subdomínio do seu concurso
        </p>
      </main>
    )
  }

  // We have a concurso (e.g., tjsp.flashcards.com.br).
  // Resolve the current user. If not logged in, show login CTA.
  const user = await getCurrentUser()

  // STATE 2: concurso resolved + user NOT logged in → login CTA
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <div className="rounded-full bg-brand-primary px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-primary-foreground">
          {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
        </div>
        <h1 className="text-center text-4xl font-semibold tracking-tight">{concurso.title}</h1>
        {concurso.cargo ? (
          <p className="text-center text-lg text-foreground/70">{concurso.cargo}</p>
        ) : null}
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </main>
    )
  }

  // User is logged in. Check whether they have access to THIS concurso.
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)

  // STATE 3: logged in but no access → paywall
  if (!hasAccess) {
    return <PrepPaywall concurso={concurso} userEmail={user.email ?? '(sem e-mail)'} />
  }

  // STATE 4: full access — render the app shell with study CTA
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full bg-brand-primary px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-primary-foreground">
        {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
      </div>
      <h1 className="text-center text-4xl font-semibold tracking-tight">{concurso.title}</h1>
      <p className="text-center text-sm text-foreground/70">
        Bem-vindo, <span className="font-medium">{user.email}</span>
      </p>
      <div className="mt-4 flex gap-3">
        <Button asChild size="lg">
          <Link href="/study">Iniciar sessão de estudo</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/erros">Caderno de erros</Link>
        </Button>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm">
          Sair
        </Button>
      </form>
    </main>
  )
}
