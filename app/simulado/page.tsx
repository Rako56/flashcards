import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { listSimuladosForUser, type SimuladoSummary } from '@/lib/simulados/list-for-user'

export const metadata = {
  title: 'Simulados — Flashcards',
}

export const dynamic = 'force-dynamic'

/**
 * Phase 9 — listing minimal.
 *
 * Same 3-redirect gate as /erros and /study (concurso + user + access).
 * Server Component fetches the user's simulados, renders a list with
 * status badge, score, and dates.
 *
 * "Criar simulado" CTA is currently a no-op (links to `#`) — the
 * creation flow (Phase 9 full) needs an architectural decision about
 * the `simulados` schema (jsonb vs normalized) before we can build it.
 * The empty/full states ship today; the create flow lands later.
 */
export default async function SimuladoListPage() {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    redirect('/')
  }
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/simulado')
  }
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) {
    redirect('/')
  }

  const simulados = await listSimuladosForUser(user.id, { limit: 50 })

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Simulados</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {concurso.title} · {simulados.length} simulado(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Voltar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/simulado/novo">Criar simulado</Link>
          </Button>
        </div>
      </header>

      {simulados.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {simulados.map((s) => (
            <SimuladoRow key={s.id} simulado={s} />
          ))}
        </ul>
      )}
    </main>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
      <p className="text-sm text-foreground/70">
        Você ainda não criou simulados. Em breve você poderá montar um simulado personalizado a
        partir do banco de questões.
      </p>
    </div>
  )
}

function SimuladoRow({ simulado }: { simulado: SimuladoSummary }) {
  const answered = simulado.total_answered ?? 0
  const correct = simulado.total_correct ?? 0
  const total = simulado.total_questions
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const created = formatDate(simulado.created_at)

  return (
    <li>
      <Link
        href={`/simulado/${simulado.id}`}
        className="block rounded-md border border-border bg-card p-5 shadow-sm transition-colors hover:border-foreground/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={simulado.status} />
              <span className="text-xs text-foreground/50">{created}</span>
            </div>
            <h2 className="mt-2 text-base font-medium leading-snug text-foreground/90">
              {simulado.title}
            </h2>
            {simulado.description ? (
              <p className="mt-1 text-sm text-foreground/60">{simulado.description}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs uppercase tracking-wider text-foreground/50">acertos</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground/90">
              {correct}
              <span className="text-sm font-normal text-foreground/50">/{total}</span>
            </div>
            {answered > 0 ? <div className="text-xs text-foreground/50">{pct}%</div> : null}
          </div>
        </div>
      </Link>
    </li>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const className = STATUS_STYLES[status] ?? 'bg-foreground/10 text-foreground/70'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  abandoned: 'Abandonado',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-foreground/10 text-foreground/70',
  in_progress: 'bg-brand-primary/15 text-brand-primary',
  completed: 'bg-emerald-500/15 text-emerald-600',
  abandoned: 'bg-destructive/15 text-destructive',
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}
