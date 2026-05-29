import Link from 'next/link'
import { redirect } from 'next/navigation'

import { renderCloze } from '@/components/cloze'
import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { getRecentMistakes, type MistakeReview } from '@/lib/mistakes/get-recent'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'

import { MarkAllMasteredButton, MarkMasteredButton } from './mistake-row-actions'

export const metadata = {
  title: 'Caderno de erros — Flashcards',
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

interface GroupedMistake {
  card: MistakeReview
  count: number
  latest: string
}

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string }>
}) {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    redirect('/')
  }
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/erros')
  }
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) {
    redirect('/')
  }

  const params = await searchParams
  const disciplinaFilter = params.disciplina ?? null

  const mistakes = await getRecentMistakes(user.id, concurso.id, {
    limit: 100,
    windowDays: 90,
  })

  // Group by card_id — show each unique card once with count + latest
  const groupedMap = new Map<string, GroupedMistake>()
  for (const m of mistakes) {
    const existing = groupedMap.get(m.card_id)
    if (existing) {
      existing.count += 1
      if (m.reviewed_at > existing.latest) {
        existing.latest = m.reviewed_at
      }
    } else {
      groupedMap.set(m.card_id, { card: m, count: 1, latest: m.reviewed_at })
    }
  }
  const allGrouped = Array.from(groupedMap.values()).sort((a, b) =>
    b.latest.localeCompare(a.latest),
  )

  // Build disciplina facet counts (always against unfiltered list)
  const disciplinaCounts = new Map<string, number>()
  for (const entry of allGrouped) {
    const key = entry.card.disciplina_titulo ?? '(sem disciplina)'
    disciplinaCounts.set(key, (disciplinaCounts.get(key) ?? 0) + 1)
  }
  const disciplinas = Array.from(disciplinaCounts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )

  const grouped = disciplinaFilter
    ? allGrouped.filter(
        (e) => (e.card.disciplina_titulo ?? '(sem disciplina)') === disciplinaFilter,
      )
    : allGrouped

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Caderno de erros</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {concurso.title} · {grouped.length} card(s) errado(s)
            {disciplinaFilter ? ` · ${disciplinaFilter}` : ' nos últimos 90 dias'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Voltar</Link>
          </Button>
          {grouped.length > 0 ? (
            <Button asChild size="sm">
              <Link
                href={
                  disciplinaFilter
                    ? `/study?mode=mistakes&disciplina=${encodeURIComponent(disciplinaFilter)}`
                    : '/study?mode=mistakes'
                }
              >
                Revisar
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {disciplinas.length > 1 ? (
        <DisciplinaFilter
          disciplinas={disciplinas}
          active={disciplinaFilter}
          total={allGrouped.length}
        />
      ) : null}

      {grouped.length > 1 ? (
        <div className="flex justify-end">
          <MarkAllMasteredButton cardIds={grouped.map((g) => g.card.card_id)} />
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-foreground/70">
            {disciplinaFilter
              ? `Você não errou nenhum card de ${disciplinaFilter} nos últimos 90 dias.`
              : 'Você ainda não errou nenhum card nas últimas 90 dias. Continue assim.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {grouped.map((entry) => (
            <li
              key={entry.card.card_id}
              className="rounded-md border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-foreground/50">
                    {entry.card.disciplina_titulo ?? entry.card.tipo_card}
                    {entry.card.topico_titulo ? ` · ${entry.card.topico_titulo}` : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {renderCloze(entry.card.front_text, true)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                    {entry.count}×
                  </span>
                  <MarkMasteredButton cardId={entry.card.card_id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function DisciplinaFilter({
  disciplinas,
  active,
  total,
}: {
  disciplinas: [string, number][]
  active: string | null
  total: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill href="/erros" active={active === null} label="Todas" count={total} />
      {disciplinas.map(([name, count]) => (
        <FilterPill
          key={name}
          href={`/erros?disciplina=${encodeURIComponent(name)}`}
          active={active === name}
          label={name}
          count={count}
        />
      ))}
    </div>
  )
}

function FilterPill({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
      }`}
    >
      {label}
      <span className="ml-1 opacity-60">({count})</span>
    </Link>
  )
}
