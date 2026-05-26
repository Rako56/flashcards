import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { cn } from '@/lib/utils'

export default async function HomePage() {
  const concurso = await getConcursoFromHeaders()

  if (!concurso) {
    // Apex / reserved subdomain — marketing landing placeholder until
    // Phase 9 ships the real landing.
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

  // Concurso resolved via subdomain. Render the concurso shell.
  // Phase 3+ adds auth gate; Phase 5+ adds the SRS session UI here.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div
        className={cn(
          'rounded-full px-4 py-1 text-xs font-medium uppercase tracking-wider',
          'bg-brand-primary text-brand-primary-foreground',
        )}
      >
        {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
      </div>
      <h1 className="text-center text-4xl font-semibold tracking-tight">{concurso.title}</h1>
      {concurso.cargo ? (
        <p className="text-center text-lg text-foreground/70">{concurso.cargo}</p>
      ) : null}
      {concurso.descricao ? (
        <p className="max-w-xl text-center text-sm leading-relaxed text-foreground/60">
          {concurso.descricao}
        </p>
      ) : null}
      <p className="mt-8 text-xs text-foreground/50">
        Phase 2 · multi-tenant subdomínio resolvido · próxima fase: Auth + Onboarding
      </p>
    </main>
  )
}
