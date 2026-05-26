import Link from 'next/link'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'
import { getSimuladoById } from '@/lib/simulados/get-by-id'
import { getSimuladoQuestions } from '@/lib/simulados/get-questions'

import { cloneSimuladoAction } from './actions'

export const dynamic = 'force-dynamic'

interface BreakdownEntry {
  answer: string
  correct: boolean
  gabarito: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  abandoned: 'Abandonado',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-foreground/10 text-foreground/70',
  in_progress: 'bg-brand-primary/15 text-brand-primary',
  completed: 'bg-emerald-500/15 text-emerald-600',
  abandoned: 'bg-destructive/15 text-destructive',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Simulado ${id.slice(0, 8)} — Flashcards`, ...NOINDEX_METADATA }
}

export default async function SimuladoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const concurso = await getConcursoFromHeaders()
  if (!concurso) redirect('/')
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/simulado/${id}`)
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) redirect('/')

  const simulado = await getSimuladoById(id, user.id)
  if (!simulado) notFound()

  const answered = simulado.total_answered ?? 0
  const correct = simulado.total_correct ?? 0
  const total = simulado.total_questions
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  // For completed simulados, load the question content so we can render
  // a rich breakdown (enunciado + gabarito + user answer side by side).
  // Pending/in_progress simulados skip this query — runner page handles
  // the active session.
  const breakdownByQid = parseBreakdown(simulado.results_json)
  const completed = simulado.status === 'completed'
  const questions = completed ? await getSimuladoQuestions(simulado.question_ids) : []

  const created = formatDate(simulado.created_at)
  const finished = simulado.finished_at ? formatDate(simulado.finished_at) : null
  const minutes = simulado.time_spent_seconds ? Math.round(simulado.time_spent_seconds / 60) : null

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <Breadcrumb
        items={[
          { name: 'Início', href: '/' },
          { name: 'Simulados', href: '/simulado' },
          { name: simulado.title },
        ]}
      />
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/simulado">← Simulados</Link>
          </Button>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${
              STATUS_STYLE[simulado.status] ?? 'bg-foreground/10 text-foreground/70'
            }`}
          >
            {STATUS_LABEL[simulado.status] ?? simulado.status}
          </span>
        </div>
        <h1 className="text-2xl font-semibold">{simulado.title}</h1>
        {simulado.description ? (
          <p className="text-sm text-foreground/70">{simulado.description}</p>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Questões" value={String(total)} />
        <Stat label="Respondidas" value={`${String(answered)}/${String(total)}`} />
        <Stat label="Acertos" value={answered > 0 ? `${String(pct)}%` : '—'} />
        <Stat label="Tempo gasto" value={minutes !== null ? `${String(minutes)} min` : '—'} />
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-medium">Detalhes</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Criado em" value={created} />
          <Row
            label="Limite de tempo"
            value={
              simulado.time_limit_minutes
                ? `${String(simulado.time_limit_minutes)} min`
                : 'Sem limite'
            }
          />
          <Row
            label="Iniciado"
            value={simulado.started_at ? formatDate(simulado.started_at) : '—'}
          />
          <Row label="Concluído" value={finished ?? '—'} />
        </dl>
      </section>

      {simulado.status === 'pending' || simulado.status === 'in_progress' ? (
        <section className="rounded-lg border border-brand-primary/40 bg-brand-primary/5 p-5">
          <h2 className="text-sm font-medium">
            {simulado.status === 'in_progress' ? 'Continuar de onde parou?' : 'Pronto pra começar?'}
          </h2>
          <p className="mt-2 text-sm text-foreground/70">
            {simulado.status === 'in_progress'
              ? 'Suas respostas ficam salvas localmente no navegador. Clique abaixo pra retomar a sessão.'
              : `Cronômetro ${
                  simulado.time_limit_minutes
                    ? `de ${String(simulado.time_limit_minutes)} min, `
                    : ''
                }navegação livre, respostas em radio. Você pode pausar e voltar — o progresso fica salvo no navegador até finalizar.`}
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href={`/simulado/${simulado.id}/run`}>
                {simulado.status === 'in_progress' ? 'Continuar' : 'Iniciar simulado'}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {completed ? (
        <section className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium">Quer tentar de novo?</h2>
              <p className="mt-1 text-xs text-foreground/60">
                Cria um simulado novo com as mesmas questões — o original fica intacto pra
                comparação.
              </p>
            </div>
            <form action={cloneSimuladoAction}>
              <input type="hidden" name="simulado_id" value={simulado.id} />
              <Button type="submit" variant="outline">
                Refazer simulado
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      {completed && questions.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">Gabarito comentado</h2>
            <p className="text-xs text-foreground/60">
              {correct} de {total} acertos ({pct}%)
            </p>
          </div>
          <ol className="mt-4 flex flex-col gap-3">
            {questions.map((q, idx) => {
              const entry = breakdownByQid.get(q.id)
              return (
                <BreakdownItem
                  key={q.id}
                  index={idx}
                  enunciado={q.enunciado}
                  gabarito={q.gabarito}
                  explicacao={q.explicacao}
                  entry={entry}
                  anulada={q.anulada}
                />
              )
            })}
          </ol>
        </section>
      ) : null}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-foreground/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wider text-foreground/50">{label}</dt>
      <dd className="text-foreground/90">{value}</dd>
    </>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function BreakdownItem({
  index,
  enunciado,
  gabarito,
  explicacao,
  entry,
  anulada,
}: {
  index: number
  enunciado: string
  gabarito: string | null
  explicacao: string | null
  entry: BreakdownEntry | undefined
  anulada: boolean
}) {
  // 4 states: anulada, correct, wrong, skipped.
  let tone: 'success' | 'fail' | 'skip' | 'anulada' = 'skip'
  let label = 'Em branco'
  if (anulada) {
    tone = 'anulada'
    label = 'Anulada'
  } else if (!entry) {
    tone = 'skip'
    label = 'Em branco'
  } else if (entry.correct) {
    tone = 'success'
    label = 'Acerto'
  } else {
    tone = 'fail'
    label = 'Erro'
  }

  const toneClass: Record<typeof tone, string> = {
    success: 'border-emerald-500/40 bg-emerald-500/5',
    fail: 'border-destructive/40 bg-destructive/5',
    skip: 'border-border bg-card',
    anulada: 'border-brand-primary/40 bg-brand-primary/5',
  }
  const badgeClass: Record<typeof tone, string> = {
    success: 'bg-emerald-500/15 text-emerald-600',
    fail: 'bg-destructive/15 text-destructive',
    skip: 'bg-foreground/10 text-foreground/60',
    anulada: 'bg-brand-primary/15 text-brand-primary',
  }

  return (
    <li className={`rounded-md border p-4 ${toneClass[tone]}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-foreground/50">
          Questão {index + 1}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass[tone]}`}>
          {label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{enunciado}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-foreground/50">Sua resposta</dt>
        <dd className="font-mono text-foreground/90">{entry?.answer ?? '—'}</dd>
        <dt className="text-foreground/50">Gabarito</dt>
        <dd className="font-mono text-foreground/90">{gabarito ?? '—'}</dd>
      </dl>
      {explicacao ? (
        <details className="group mt-3">
          <summary className="cursor-pointer text-xs text-foreground/60 hover:text-foreground">
            Ver explicação
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{explicacao}</p>
        </details>
      ) : null}
    </li>
  )
}

function parseBreakdown(raw: unknown): Map<string, BreakdownEntry> {
  const map = new Map<string, BreakdownEntry>()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return map
  const rawObj = raw as Record<string, unknown>
  const breakdown = rawObj['breakdown']
  if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return map
  for (const [qid, value] of Object.entries(breakdown)) {
    if (!value || typeof value !== 'object') continue
    const v = value as Record<string, unknown>
    if (typeof v['answer'] !== 'string' || typeof v['correct'] !== 'boolean') continue
    map.set(qid, {
      answer: v['answer'],
      correct: v['correct'],
      gabarito: typeof v['gabarito'] === 'string' ? v['gabarito'] : null,
    })
  }
  return map
}
