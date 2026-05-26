import Link from 'next/link'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { getSimuladoById } from '@/lib/simulados/get-by-id'

export const dynamic = 'force-dynamic'

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
  return { title: `Simulado ${id.slice(0, 8)} — Flashcards` }
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

  const created = formatDate(simulado.created_at)
  const finished = simulado.finished_at ? formatDate(simulado.finished_at) : null
  const minutes = simulado.time_spent_seconds ? Math.round(simulado.time_spent_seconds / 60) : null

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
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
          <h2 className="text-sm font-medium">Pronto pra começar?</h2>
          <p className="mt-2 text-sm text-foreground/70">
            A tela de execução do simulado ainda está em desenvolvimento. Você verá suas questões
            aqui em breve.
          </p>
          <div className="mt-4">
            <Button disabled title="Em breve">
              Iniciar simulado
            </Button>
          </div>
        </section>
      ) : null}

      {simulado.status === 'completed' && simulado.results_json ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium">Resultado bruto</h2>
          <pre className="mt-3 overflow-x-auto rounded bg-foreground/5 p-3 text-xs">
            {JSON.stringify(simulado.results_json, null, 2)}
          </pre>
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
