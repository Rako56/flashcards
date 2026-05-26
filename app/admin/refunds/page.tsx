import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listRefundRequests } from '@/lib/admin/list-refund-requests'

import { RefundRowActions } from './refund-row-actions'

export const metadata = {
  title: 'Refunds — Admin Flashcards',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-foreground/10 text-foreground/70',
  approved: 'bg-emerald-500/15 text-emerald-600',
  rejected: 'bg-destructive/15 text-destructive',
}

/**
 * /admin/refunds — triage queue for CDC art. 49 refund requests.
 *
 * The runtime money movement happens out-of-band (admin clicks
 * Aprovar here → goes to Asaas dashboard → fires the refund manually).
 * This page records the DECISION + admin notes for audit/compliance.
 *
 * Filter chips for status. Default landing is pending=true so admin
 * sees the queue immediately. Click any chip to switch.
 */
export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0)
  const offset = page * PAGE_SIZE
  const rawStatus = sp.status?.trim() ?? 'pending'
  const statusFilter: 'pending' | 'approved' | 'rejected' | null =
    rawStatus === 'pending' || rawStatus === 'approved' || rawStatus === 'rejected'
      ? rawStatus
      : null

  const { rows, total } = await listRefundRequests({
    limit: PAGE_SIZE,
    offset,
    status: statusFilter,
  })

  const hasPrev = page > 0
  const hasNext = (page + 1) * PAGE_SIZE < total

  const buildHref = (overrides: Record<string, string | null | undefined>): string => {
    const params = new URLSearchParams()
    const merged: Record<string, string | null | undefined> = {
      status: statusFilter ?? 'todos',
      page: page > 0 ? String(page) : undefined,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'todos') params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `?${qs}` : '/admin/refunds'
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Solicitações de reembolso</h2>
          <p className="text-sm text-foreground/60">
            {total} solicitação(ões)
            {statusFilter ? ` · ${STATUS_LABEL[statusFilter] ?? statusFilter}` : ''}
            {' · página '}
            {page + 1}
          </p>
        </div>
      </header>

      {/* Status filter chips */}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-foreground/60">Status:</span>
        <FilterChip
          active={!statusFilter}
          href={buildHref({ status: 'todos', page: null })}
          label="Todos"
        />
        <FilterChip
          active={statusFilter === 'pending'}
          href={buildHref({ status: 'pending', page: null })}
          label="Pendentes"
        />
        <FilterChip
          active={statusFilter === 'approved'}
          href={buildHref({ status: 'approved', page: null })}
          label="Aprovados"
        />
        <FilterChip
          active={statusFilter === 'rejected'}
          href={buildHref({ status: 'rejected', page: null })}
          label="Rejeitados"
        />
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-foreground/60">
          Nenhuma solicitação encontrada
          {statusFilter ? ` com status "${STATUS_LABEL[statusFilter] ?? statusFilter}"` : ''}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const created = formatDate(row.created_at)
            const processed = row.processed_at ? formatDate(row.processed_at) : null
            return (
              <li key={row.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLE[row.status] ?? 'bg-foreground/10 text-foreground/70'
                        }`}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                      <span className="text-xs text-foreground/50">{created}</span>
                      {processed ? (
                        <span className="text-xs text-foreground/50">· processado {processed}</span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-foreground/90">{row.email}</p>
                    <p className="text-xs text-foreground/60">
                      {row.concurso_slug ? `Concurso: ${row.concurso_slug} · ` : ''}
                      {row.cpf_digits ? `CPF: ${row.cpf_digits} · ` : ''}
                      ID: <code className="font-mono">{row.id.slice(0, 8)}…</code>
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground/80">{row.motivo}</p>
                    {row.admin_notes ? (
                      <p className="rounded-md border border-foreground/10 bg-foreground/5 p-2 text-xs text-foreground/70">
                        <span className="font-medium text-foreground/60">Nota interna:</span>{' '}
                        {row.admin_notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <RefundRowActions refundId={row.id} currentStatus={row.status} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-foreground/60">
          Mostrando {offset + 1}–{Math.min(offset + rows.length, total)} de {total}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
            <Link
              href={buildHref({ page: page > 1 ? String(page - 1) : null })}
              aria-disabled={!hasPrev}
            >
              ← Anterior
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!hasNext}>
            <Link href={buildHref({ page: String(page + 1) })} aria-disabled={!hasNext}>
              Próxima →
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

function FilterChip({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? 'bg-brand-primary text-brand-primary-foreground'
          : 'border border-border bg-card text-foreground/70 hover:border-foreground/30'
      }`}
    >
      {label}
    </Link>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
