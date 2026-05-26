import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'
import { getSimuladoById } from '@/lib/simulados/get-by-id'
import { getSimuladoQuestions } from '@/lib/simulados/get-questions'

import { SimuladoRunner } from './runner'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Executar simulado ${id.slice(0, 8)} — Flashcards`, ...NOINDEX_METADATA }
}

/**
 * /simulado/[id]/run — interactive runner.
 *
 * Pre-runner gate: load the simulado + user gate. If status='completed',
 * we redirect back to the detail page (re-running a completed simulado
 * isn't supported — user creates a new one if they want to retry).
 *
 * Otherwise we hand off to the Client Component runner with the
 * questions array (gabarito intentionally NOT included so it doesn't
 * leak into the JS bundle the user inspects mid-run).
 */
export default async function SimuladoRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const concurso = await getConcursoFromHeaders()
  if (!concurso) redirect('/')
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/simulado/${id}/run`)
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) redirect('/')

  const simulado = await getSimuladoById(id, user.id)
  if (!simulado) notFound()

  // Already finished — nothing to do here.
  if (simulado.status === 'completed' || simulado.status === 'abandoned') {
    redirect(`/simulado/${id}`)
  }

  const fullQuestions = await getSimuladoQuestions(simulado.question_ids)

  // Strip gabarito + explicacao before handing to the Client Component —
  // these are answer-key fields and shouldn't be in the runtime bundle.
  const safeQuestions = fullQuestions.map((q) => ({
    id: q.id,
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    disciplina_sugerida: q.disciplina_sugerida,
    anulada: q.anulada,
    dificuldade: q.dificuldade,
  }))

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <Breadcrumb
        items={[
          { name: 'Início', href: '/' },
          { name: 'Simulados', href: '/simulado' },
          { name: simulado.title, href: `/simulado/${id}` },
          { name: 'Executar' },
        ]}
      />
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{simulado.title}</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {safeQuestions.length} questão{safeQuestions.length === 1 ? '' : 'ões'}
            {simulado.time_limit_minutes ? (
              <span className="ml-2 text-foreground/50">
                · limite {simulado.time_limit_minutes} min
              </span>
            ) : null}
            {safeQuestions.length !== simulado.question_ids.length ? (
              <span className="ml-2 text-foreground/50">
                ({simulado.question_ids.length - safeQuestions.length} indisponíve
                {simulado.question_ids.length - safeQuestions.length === 1 ? 'l' : 'is'})
              </span>
            ) : null}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/simulado/${id}`}>← Detalhe</Link>
        </Button>
      </header>

      {safeQuestions.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-foreground/60">
          Nenhuma questão disponível para esse simulado. Talvez tenham sido arquivadas.
        </p>
      ) : (
        <SimuladoRunner
          simuladoId={id}
          questions={safeQuestions}
          alreadyStarted={simulado.status === 'in_progress'}
          timeLimitMinutes={simulado.time_limit_minutes}
        />
      )}
    </main>
  )
}
