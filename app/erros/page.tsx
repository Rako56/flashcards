import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { getRecentMistakes, type MistakeReview } from '@/lib/mistakes/get-recent'

export const metadata = {
  title: 'Caderno de erros — Flashcards',
}

export const dynamic = 'force-dynamic'

export default async function MistakesPage() {
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

  const mistakes = await getRecentMistakes(user.id, concurso.id, {
    limit: 100,
    windowDays: 90,
  })

  // Group by card_id — show each unique card once with count + latest
  const groupedMap = new Map<string, { card: MistakeReview; count: number; latest: string }>()
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
  const grouped = Array.from(groupedMap.values()).sort((a, b) => b.latest.localeCompare(a.latest))

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Caderno de erros</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {concurso.title} · {grouped.length} card(s) errado(s) nos últimos 90 dias
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Voltar</Link>
        </Button>
      </header>

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-foreground/70">
            Você ainda não errou nenhum card nas últimas 90 dias. Continue assim.
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
                    {entry.card.front_text}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                  {entry.count}×
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
