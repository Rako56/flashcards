import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Flashcards — Admin',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function AdminFlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; concurso?: string }>
}) {
  const params = await searchParams
  const pageRaw = Number(params.page ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  let query = supabase
    .from('admin_flashcards')
    .select('id, front_text, tipo_card, disciplina_titulo, topico_titulo, status, concurso_id', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.concurso) {
    query = query.eq('concurso_id', params.concurso)
  }

  const { data, error, count } = await query

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Erro ao carregar flashcards: {error.message}
        </p>
      </main>
    )
  }

  const cards = data
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Flashcards ({totalCount.toLocaleString('pt-BR')})</h2>
        <p className="text-xs text-foreground/60">
          Página {page} de {totalPages.toLocaleString('pt-BR')} · {PAGE_SIZE}/página
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-4 py-3 text-left">Pergunta</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Disciplina</th>
              <th className="px-4 py-3 text-left">Tópico</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cards.map((c) => (
              <tr key={c.id} className="hover:bg-foreground/5">
                <td className="max-w-md px-4 py-3 text-foreground/90">
                  <div className="truncate">{c.front_text}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground/70">{c.tipo_card}</td>
                <td className="px-4 py-3 text-foreground/70">{c.disciplina_titulo ?? '—'}</td>
                <td className="px-4 py-3 text-foreground/70">{c.topico_titulo ?? '—'}</td>
                <td className="px-4 py-3 text-foreground/70">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-foreground/10 text-foreground/70'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {cards.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground/50">
                  Nenhum flashcard {params.concurso ? 'para esse concurso' : ''}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} /> : null}
    </main>
  )
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const prev = page > 1 ? `/admin/flashcards?page=${String(page - 1)}` : null
  const next = page < totalPages ? `/admin/flashcards?page=${String(page + 1)}` : null
  return (
    <div className="flex items-center justify-between text-sm">
      {prev ? (
        <a href={prev} className="text-brand-primary hover:underline">
          ← Anterior
        </a>
      ) : (
        <span className="text-foreground/30">← Anterior</span>
      )}
      <span className="text-foreground/60">
        {page} / {totalPages}
      </span>
      {next ? (
        <a href={next} className="text-brand-primary hover:underline">
          Próxima →
        </a>
      ) : (
        <span className="text-foreground/30">Próxima →</span>
      )}
    </div>
  )
}
