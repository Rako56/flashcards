import { createClient } from '@/lib/supabase/server'

import { CardStatusToggle } from './card-actions'
import { BatchArchive, CardEditor, type EditableCard } from './card-editor'

export const metadata = {
  title: 'Flashcards — Admin',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const STATUS_FILTERS = ['', 'active', 'review', 'archived', 'draft'] as const

interface SearchParams {
  page?: string
  concurso?: string
  q?: string
  disciplina?: string
  status?: string
}

export default async function AdminFlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const pageRaw = Number(params.page ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const offset = (page - 1) * PAGE_SIZE

  const q = (params.q ?? '').trim()
  const disciplina = (params.disciplina ?? '').trim()
  const status = (params.status ?? '').trim()

  const supabase = await createClient()
  let query = supabase
    .from('admin_flashcards')
    .select(
      'id, front_text, back_text, tipo_card, disciplina_titulo, topico_titulo, fundamento_legal, explicacao_detalhada, dica_pegadinha, dificuldade, status, concurso_id',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.concurso) query = query.eq('concurso_id', params.concurso)
  if (status) query = query.eq('status', status)
  if (disciplina) query = query.ilike('disciplina_titulo', `%${disciplina}%`)
  if (q) {
    // sanitize PostgREST `or` metachars then match across the searchable columns
    const safe = q.replace(/[%,()]/g, ' ')
    query = query.or(
      `front_text.ilike.%${safe}%,fundamento_legal.ilike.%${safe}%,legislacao_ref.ilike.%${safe}%`,
    )
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

      {/* Busca / filtros — GET form (server-rendered, sem JS) */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3"
      >
        {params.concurso ? <input type="hidden" name="concurso" value={params.concurso} /> : null}
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-medium text-foreground/60">
            Buscar (texto / fundamento / lei)
          </label>
          <input
            name="q"
            defaultValue={q}
            placeholder="ex: Lei 8.112, habeas corpus…"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-foreground/60">Disciplina</label>
          <input
            name="disciplina"
            defaultValue={disciplina}
            placeholder="ex: Trabalho"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground/60">Status</label>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'todos'}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-brand-primary-foreground"
        >
          Filtrar
        </button>
        {q || disciplina || status ? (
          <a
            href={
              params.concurso
                ? `/admin/flashcards?concurso=${params.concurso}`
                : '/admin/flashcards'
            }
            className="px-2 py-1.5 text-sm text-foreground/60 hover:underline"
          >
            limpar
          </a>
        ) : null}
      </form>

      <BatchArchive {...(params.concurso ? { concursoId: params.concurso } : {})} />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-4 py-3 text-left">Pergunta</th>
              <th className="px-4 py-3 text-left">Disciplina</th>
              <th className="px-4 py-3 text-left">Tópico</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cards.map((c) => (
              <tr key={c.id} className="hover:bg-foreground/5">
                <td className="max-w-md px-4 py-3 text-foreground/90">
                  <div className="truncate">{c.front_text}</div>
                </td>
                <td className="px-4 py-3 text-foreground/70">{c.disciplina_titulo ?? '—'}</td>
                <td className="max-w-[180px] px-4 py-3 text-foreground/70">
                  <div className="truncate">{c.topico_titulo ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : c.status === 'review'
                          ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-foreground/10 text-foreground/70'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <CardStatusToggle cardId={c.id} currentStatus={c.status} />
                    <CardEditor card={c as EditableCard} />
                  </div>
                </td>
              </tr>
            ))}
            {cards.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground/50">
                  Nenhum flashcard encontrado com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} params={params} /> : null}
    </main>
  )
}

function buildQs(params: SearchParams, page: number): string {
  const sp = new URLSearchParams()
  if (params.concurso) sp.set('concurso', params.concurso)
  if (params.q) sp.set('q', params.q)
  if (params.disciplina) sp.set('disciplina', params.disciplina)
  if (params.status) sp.set('status', params.status)
  sp.set('page', String(page))
  return `/admin/flashcards?${sp.toString()}`
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number
  totalPages: number
  params: SearchParams
}) {
  const prev = page > 1 ? buildQs(params, page - 1) : null
  const next = page < totalPages ? buildQs(params, page + 1) : null
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
