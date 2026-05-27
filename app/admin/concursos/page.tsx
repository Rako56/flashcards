import { createClient } from '@/lib/supabase/server'

import { ConcursoStatusToggle } from './concurso-actions'

export const metadata = {
  title: 'Concursos — Admin',
}

export const dynamic = 'force-dynamic'

export default async function AdminConcursosPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_concursos')
    .select('id, slug, title, status, banca, orgao, estado, cargo, data_prova, prioridade')
    .order('prioridade', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true })
    .limit(200)

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Erro ao carregar concursos: {error.message}
        </p>
      </main>
    )
  }

  const concursos = data

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Concursos ({concursos.length})</h2>
        <p className="text-xs text-foreground/60">Read-only · ordem por prioridade</p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Banca</th>
              <th className="px-4 py-3 text-left">Órgão</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Prio</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {concursos.map((c) => (
              <tr key={c.id} className="hover:bg-foreground/5">
                <td className="px-4 py-3 font-mono text-xs text-foreground/70">{c.slug}</td>
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3 text-foreground/70">{c.banca ?? '—'}</td>
                <td className="px-4 py-3 text-foreground/70">{c.orgao ?? '—'}</td>
                <td className="px-4 py-3 text-foreground/70">{c.estado ?? '—'}</td>
                <td className="px-4 py-3 text-foreground/70">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'publicado'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-foreground/10 text-foreground/70'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground/60">
                  {c.prioridade ?? '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <ConcursoStatusToggle concursoId={c.id} currentStatus={c.status} />
                </td>
              </tr>
            ))}
            {concursos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-foreground/50">
                  Nenhum concurso cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  )
}
