import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Admin — Flashcards',
}

export const dynamic = 'force-dynamic'

export default async function AdminIndexPage() {
  const supabase = await createClient()

  // Read counts in parallel via head: true (cheap — no row fetch, just count).
  const [
    { count: concursoCount },
    { count: flashcardCount },
    { count: questionCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('admin_concursos').select('*', { count: 'exact', head: true }),
    supabase
      .from('admin_flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('admin_questoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header>
        <h2 className="text-lg font-semibold">Visão geral</h2>
        <p className="text-sm text-foreground/60">
          Estatísticas rápidas — clique nas seções pra detalhe.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/admin/concursos" label="Concursos" value={concursoCount ?? 0} />
        <StatCard href="/admin/flashcards" label="Flashcards ativos" value={flashcardCount ?? 0} />
        <StatCard href="/admin/questoes" label="Questões ativas" value={questionCount ?? 0} />
        <StatCard href="/admin/users" label="Usuários" value={userCount ?? 0} />
      </div>
    </main>
  )
}

function StatCard({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:border-foreground/30"
    >
      <div className="text-xs uppercase tracking-wider text-foreground/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">
        {value.toLocaleString('pt-BR')}
      </div>
    </Link>
  )
}
