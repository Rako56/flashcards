import { redirect } from 'next/navigation'

import { buildQueue, type QueueCardWithProgress } from '@/lib/srs/queue'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { getRecentMistakes } from '@/lib/mistakes/get-recent'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'
import { createClient } from '@/lib/supabase/server'

import { StudySession } from './study-session'

export const metadata = {
  title: 'Estudar — Flashcards',
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

const SESSION_LIMIT = 20

/**
 * /study and /study?mode=mistakes
 *
 * - default mode → 200-card sample of the concurso bank (DUE + NEW + filler).
 * - `mode=mistakes` → only cards the user rated 'again' in the last 90 days.
 *   The "Revisar todos" CTA on /erros points here. The queue is still built
 *   via the same FSRS logic so cards inside the mistake set respect their
 *   real due_at — we don't override SRS scheduling, just narrow the pool.
 */
export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    redirect('/')
  }

  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/study')
  }

  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) {
    redirect('/')
  }

  const params = await searchParams
  const mistakesMode = params.mode === 'mistakes'

  // For mistakes mode, fetch the user's wrong-card ids first and narrow
  // the admin_flashcards query to those ids. For default mode, pull a
  // 200-card sample of the bank.
  let mistakeIds: string[] | null = null
  if (mistakesMode) {
    const mistakes = await getRecentMistakes(user.id, concurso.id, {
      limit: 200,
      windowDays: 90,
    })
    // Dedup by card_id
    const idSet = new Set<string>()
    for (const m of mistakes) idSet.add(m.card_id)
    mistakeIds = Array.from(idSet)
    if (mistakeIds.length === 0) {
      return (
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Sem erros recentes</h1>
            <p className="mt-3 text-sm text-foreground/70">
              Você não errou nenhum card nos últimos 90 dias. Continue assim.
            </p>
          </div>
        </main>
      )
    }
  }

  // Fetch active flashcards for this concurso + the user's progress in
  // a single query via the LEFT JOIN on user_flashcard_progress filtered
  // to current user_id. We need a sample, not all 4000+ cards — a
  // 200-row sample keeps payload reasonable while letting buildQueue
  // pick from a fresh pool each session.
  const supabase = await createClient()
  let query = supabase
    .from('admin_flashcards')
    .select(
      'id, front_text, back_text, tipo_card, topico_id, disciplina_id, fundamento_legal, user_flashcard_progress(stability, difficulty, lapses, last_reviewed_at, due_at)',
    )
    .eq('concurso_id', concurso.id)
    .eq('status', 'active')

  if (mistakeIds !== null) {
    query = query.in('id', mistakeIds)
  } else {
    query = query.limit(200)
  }

  const { data: cards, error } = await query

  if (error) {
    // Show a degraded view rather than throwing into the framework boundary
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Não foi possível carregar os cards. Tente recarregar a página.
        </div>
      </main>
    )
  }

  // Filter user_flashcard_progress to current user (Supabase's nested
  // select returns ALL related rows; we filter client-side because the
  // typegen doesn't expose a way to apply per-relation eq() server-side
  // without the foreign table being declared in admin_flashcards FK).
  interface ProgressRow {
    stability: number
    difficulty: number
    lapses: number
    last_reviewed_at: string | null
    due_at: string | null
  }
  const withProgress: QueueCardWithProgress[] = cards.map((c) => {
    const progressArray = (c.user_flashcard_progress as ProgressRow[] | null) ?? []
    const userProgress = progressArray[0] // assume RLS already filtered to current user
    return {
      id: c.id,
      front_text: c.front_text,
      back_text: c.back_text,
      tipo_card: c.tipo_card,
      topico_id: c.topico_id,
      disciplina_id: c.disciplina_id,
      fundamento_legal: c.fundamento_legal,
      progress: userProgress
        ? {
            stability: userProgress.stability,
            difficulty: userProgress.difficulty,
            lapses: userProgress.lapses,
            last_reviewed_at: userProgress.last_reviewed_at,
            due_at: userProgress.due_at,
          }
        : null,
    }
  })

  const queue = buildQueue(withProgress, { limit: SESSION_LIMIT })

  if (queue.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Sem cards prontos agora</h1>
          <p className="mt-3 text-sm text-foreground/70">
            Você está em dia com os cards desse concurso. Volte mais tarde quando o intervalo de
            revisão acumular novos cards.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">{concurso.title}</h1>
        <p className="text-sm text-foreground/60">
          {mistakesMode ? 'Revisando erros' : 'Sessão de estudo'} · {queue.length} cards
        </p>
      </div>
      <StudySession initialQueue={queue} />
    </main>
  )
}
