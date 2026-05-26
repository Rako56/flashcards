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

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Executar simulado ${id.slice(0, 8)} — Flashcards`, ...NOINDEX_METADATA }
}

/**
 * /simulado/[id]/run — read-only question list for now.
 *
 * Phase 9.3 full will wire the answer-collection UI (radio per
 * alternativa, timer, navigation, submit). This stub at least lets
 * the user CONFIRM the question set was sorted correctly before the
 * runner exists.
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

  const questions = await getSimuladoQuestions(simulado.question_ids)

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
            {questions.length} questão{questions.length === 1 ? '' : 'ões'} carregada
            {questions.length === 1 ? '' : 's'}
            {questions.length !== simulado.question_ids.length ? (
              <span className="ml-2 text-foreground/50">
                ({simulado.question_ids.length - questions.length} indisponíve
                {simulado.question_ids.length - questions.length === 1 ? 'l' : 'is'})
              </span>
            ) : null}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/simulado/${id}`}>← Detalhe</Link>
        </Button>
      </header>

      <section className="rounded-lg border border-brand-primary/40 bg-brand-primary/5 p-5">
        <h2 className="text-sm font-semibold">Modo preview (read-only)</h2>
        <p className="mt-2 text-sm text-foreground/70">
          A interface de execução do simulado (radio, cronômetro, navegação) está em
          desenvolvimento. Por enquanto você visualiza as questões sorteadas — útil pra confirmar o
          conteúdo antes do runner ficar pronto.
        </p>
      </section>

      <ol className="flex flex-col gap-4">
        {questions.map((q, idx) => (
          <QuestionCard key={q.id} index={idx} question={q} />
        ))}
        {questions.length === 0 ? (
          <li className="rounded-lg border border-border bg-card p-8 text-center text-sm text-foreground/60">
            Nenhuma questão disponível para esse simulado. Talvez tenham sido arquivadas.
          </li>
        ) : null}
      </ol>
    </main>
  )
}

function QuestionCard({
  index,
  question,
}: {
  index: number
  question: {
    id: string
    enunciado: string
    alternativas: unknown
    disciplina_sugerida: string | null
    anulada: boolean
    dificuldade: string | null
  }
}) {
  const alternatives = parseAlternatives(question.alternativas)
  return (
    <li className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-foreground/50">
          Questão {index + 1}
        </span>
        <span className="text-xs text-foreground/50">
          {question.disciplina_sugerida ?? '—'}
          {question.dificuldade ? ` · ${question.dificuldade}` : null}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{question.enunciado}</p>
      {alternatives.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {alternatives.map((alt, i) => (
            <li
              key={`${question.id}-${String(i)}`}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/80"
            >
              <span className="mr-2 inline-block min-w-[1rem] font-mono text-xs text-foreground/50">
                {String.fromCharCode(65 + i)}.
              </span>
              {alt}
            </li>
          ))}
        </ul>
      ) : null}
      {question.anulada ? (
        <p className="mt-3 inline-flex rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
          Anulada
        </p>
      ) : null}
    </li>
  )
}

function parseAlternatives(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      if (typeof entry === 'string') return entry
      if (
        entry &&
        typeof entry === 'object' &&
        'texto' in entry &&
        typeof (entry as { texto: unknown }).texto === 'string'
      ) {
        return (entry as { texto: string }).texto
      }
      return JSON.stringify(entry)
    })
  }
  return []
}
