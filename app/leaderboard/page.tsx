import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { getWeeklyLeaderboard, type LeaderboardRow } from '@/lib/leaderboard/get-weekly'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'

export const metadata = {
  title: 'Ranking semanal — Flashcards',
  // LGPD: the leaderboard renders real full_name values and is anon-viewable.
  // noindex keeps user names out of search engines (still shown in-app).
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

/**
 * /leaderboard — top 50 da semana corrente para o concurso resolvido.
 *
 * Acessível mesmo sem assinatura ativa (so leitura pública) — incentiva
 * usuários do paywall a verem progresso de outros.
 */
export default async function LeaderboardPage() {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) redirect('/')
  const user = await getCurrentUser()

  const rows = await getWeeklyLeaderboard(concurso.id, undefined, 50)
  const myRank = user ? rows.findIndex((r) => r.user_id === user.id) : -1

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <Breadcrumb items={[{ name: 'Início', href: '/' }, { name: 'Ranking' }]} />

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Ranking semanal</h1>
        <p className="text-sm text-foreground/70">
          Top 50 alunos de {concurso.title} nesta semana — ordenado por pontos.
        </p>
      </header>

      {myRank >= 0 ? (
        <div className="rounded-lg border border-brand-primary/40 bg-brand-primary/5 p-4 text-sm">
          Você está em <strong>#{String(myRank + 1)}</strong> nesta semana com{' '}
          <strong>{String(rows[myRank]?.points ?? 0)} pontos</strong>.
        </div>
      ) : user ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground/70">
          Você ainda não pontuou nesta semana.{' '}
          <Link href="/study" className="text-brand-primary hover:underline">
            Comece estudando agora →
          </Link>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-foreground/60">
          Ninguém pontuou nesta semana ainda. Seja o primeiro!
        </div>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((row, idx) => (
            <LeaderboardRowCard
              key={row.user_id}
              row={row}
              rank={idx + 1}
              isMe={user?.id === row.user_id}
            />
          ))}
        </ol>
      )}

      <p className="text-xs text-foreground/50">
        Pontos calculados pela soma de XP por review na semana. Reseta toda segunda-feira (UTC).
      </p>
    </main>
  )
}

function LeaderboardRowCard({
  row,
  rank,
  isMe,
}: {
  row: LeaderboardRow
  rank: number
  isMe: boolean
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  return (
    <li className={`flex items-center gap-4 px-5 py-3 ${isMe ? 'bg-brand-primary/5' : ''}`}>
      <span className="w-8 text-center text-sm font-medium tabular-nums text-foreground/60">
        {medal ?? `#${String(rank)}`}
      </span>
      <span className="flex-1 truncate text-sm font-medium text-foreground/90">
        {row.full_name ?? '(sem nome)'}{' '}
        {isMe ? <span className="text-xs text-brand-primary">(você)</span> : null}
      </span>
      <span className="hidden text-xs text-foreground/60 sm:inline">
        {row.reviews_count} reviews · 🔥 {row.streak_days}d
      </span>
      <span className="text-sm font-semibold tabular-nums">{row.points}</span>
    </li>
  )
}
