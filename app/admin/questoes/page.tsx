import { createClient } from '@/lib/supabase/server'

import { QuestionStatusToggle } from './question-actions'

export const metadata = {
  title: 'Questões — Admin',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function AdminQuestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const pageRaw = Number(params.page ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('admin_questoes')
    .select(
      'id, enunciado, banca, ano, disciplina_sugerida, dificuldade, anulada, depende_visual, status',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Erro ao carregar questões: {error.message}
        </p>
      </main>
    )
  }

  const questions = data
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Questões ({totalCount.toLocaleString('pt-BR')})</h2>
        <p className="text-xs text-foreground/60">
          Página {page} de {totalPages.toLocaleString('pt-BR')} · {PAGE_SIZE}/página
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-4 py-3 text-left">Enunciado</th>
              <th className="px-4 py-3 text-left">Banca/Ano</th>
              <th className="px-4 py-3 text-left">Disciplina</th>
              <th className="px-4 py-3 text-left">Flags</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {questions.map((q) => (
              <tr key={q.id} className="hover:bg-foreground/5">
                <td className="max-w-md px-4 py-3 text-foreground/90">
                  <div className="truncate">{q.enunciado}</div>
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {q.banca ?? '—'}
                  {q.ano ? ` · ${String(q.ano)}` : null}
                </td>
                <td className="px-4 py-3 text-foreground/70">{q.disciplina_sugerida ?? '—'}</td>
                <td className="px-4 py-3 text-foreground/70">
                  <div className="flex flex-wrap gap-1">
                    {q.dificuldade ? (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs">
                        {q.dificuldade}
                      </span>
                    ) : null}
                    {q.anulada ? (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                        anulada
                      </span>
                    ) : null}
                    {q.depende_visual ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700">
                        visual
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      q.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-foreground/10 text-foreground/70'
                    }`}
                  >
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <QuestionStatusToggle questionId={q.id} currentStatus={q.status} />
                </td>
              </tr>
            ))}
            {questions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-foreground/50">
                  Nenhuma questão cadastrada.
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
  const prev = page > 1 ? `/admin/questoes?page=${String(page - 1)}` : null
  const next = page < totalPages ? `/admin/questoes?page=${String(page + 1)}` : null
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
