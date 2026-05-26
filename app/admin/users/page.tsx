import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Usuários — Admin',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function AdminUsersPage({
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
    .from('user_profiles')
    .select('user_id, full_name, phone_e164, created_at, daily_goal_minutes', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Erro ao carregar usuários: {error.message}
        </p>
      </main>
    )
  }

  const users = data
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Usuários ({totalCount.toLocaleString('pt-BR')})</h2>
        <p className="text-xs text-foreground/60">
          Página {page} de {totalPages.toLocaleString('pt-BR')} · {PAGE_SIZE}/página
        </p>
      </header>

      <p className="text-xs text-foreground/60">
        ⚠️ Lista visível com base na RLS — exibimos apenas perfis que sua role tem direito de ver
        (admin = todos; user = só o próprio).
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-foreground/50">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">User ID</th>
              <th className="px-4 py-3 text-left">Cadastro</th>
              <th className="px-4 py-3 text-right">Meta diária (min)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.user_id} className="hover:bg-foreground/5">
                <td className="px-4 py-3 font-medium">{u.full_name ?? '(sem nome)'}</td>
                <td className="px-4 py-3 font-mono text-xs text-foreground/70">
                  {u.user_id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground/70">
                  {u.daily_goal_minutes}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-foreground/50">
                  Nenhum usuário ainda.
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
  const prev = page > 1 ? `/admin/users?page=${String(page - 1)}` : null
  const next = page < totalPages ? `/admin/users?page=${String(page + 1)}` : null
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
