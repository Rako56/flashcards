import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listWebhookEvents } from '@/lib/admin/list-webhook-events'

export const metadata = {
  title: 'Webhooks — Admin Flashcards',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const STATUS_LABEL: Record<string, string> = {
  success: 'Sucesso',
  failed: 'Falhou',
  pending: 'Pendente',
  duplicate: 'Duplicado',
}

const STATUS_STYLE: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-600',
  failed: 'bg-destructive/15 text-destructive',
  pending: 'bg-foreground/10 text-foreground/70',
  duplicate: 'bg-brand-primary/15 text-brand-primary',
}

/**
 * /admin/webhooks — read-only list of Asaas webhook events.
 *
 * Operational visibility for payment debugging. Filters: by
 * processed_status (success/failed/pending) and by event_type
 * prefix (e.g. PAYMENT_).
 *
 * Click on event_id to expand the raw payload (server-rendered
 * details panel via search param). No client JS — keeps Phase 8
 * footprint minimal.
 */
export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string; selected?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0)
  const offset = page * PAGE_SIZE
  const statusFilter = isValidStatus(sp.status) ? sp.status : null
  const typeFilter = sp.type?.trim() ?? null
  const selectedEventId = sp.selected ?? null

  const { rows, total } = await listWebhookEvents({
    limit: PAGE_SIZE,
    offset,
    status: statusFilter,
    eventTypePrefix: typeFilter,
  })

  const selectedRow = selectedEventId ? rows.find((r) => r.event_id === selectedEventId) : null

  const hasPrev = page > 0
  const hasNext = (page + 1) * PAGE_SIZE < total

  const buildHref = (overrides: Record<string, string | null | undefined>): string => {
    const params = new URLSearchParams()
    const merged: Record<string, string | null | undefined> = {
      status: statusFilter ?? undefined,
      type: typeFilter ?? undefined,
      page: page > 0 ? String(page) : undefined,
      selected: selectedEventId ?? undefined,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `?${qs}` : '/admin/webhooks'
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Webhook events (Asaas)</h2>
          <p className="text-sm text-foreground/60">
            {total} eventos no total · página {page + 1} · ordenado por mais recente
          </p>
        </div>
      </header>

      {/* Filters */}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-foreground/60">Status:</span>
        <FilterChip
          active={!statusFilter}
          href={buildHref({ status: null, page: null })}
          label="Todos"
        />
        <FilterChip
          active={statusFilter === 'success'}
          href={buildHref({ status: 'success', page: null })}
          label="Sucesso"
        />
        <FilterChip
          active={statusFilter === 'failed'}
          href={buildHref({ status: 'failed', page: null })}
          label="Falhou"
        />
        <FilterChip
          active={statusFilter === 'pending'}
          href={buildHref({ status: 'pending', page: null })}
          label="Pendente"
        />
        {typeFilter ? (
          <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-3 py-1 text-xs text-brand-primary">
            type: {typeFilter}
            <Link
              href={buildHref({ type: null, page: null })}
              className="ml-1 text-brand-primary/70 hover:text-brand-primary"
              aria-label="Remover filtro de tipo"
            >
              ×
            </Link>
          </span>
        ) : null}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-foreground/60">
          Nenhum evento encontrado{statusFilter ? ` com status "${statusFilter}"` : ''}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50">
              <tr>
                <Th>Event ID</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th>Recebido em</Th>
                <Th>Processado em</Th>
                <Th>Erro</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = row.processed_status
                const isSelected = row.event_id === selectedEventId
                return (
                  <tr
                    key={row.event_id}
                    className={
                      isSelected
                        ? 'bg-brand-primary/5'
                        : 'border-b border-border/40 last:border-b-0 hover:bg-background/40'
                    }
                  >
                    <Td className="font-mono text-xs">
                      <Link
                        href={buildHref({
                          selected: isSelected ? null : row.event_id,
                        })}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.event_id.slice(0, 16)}
                        {row.event_id.length > 16 ? '…' : ''}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={buildHref({
                          type: extractPrefix(row.event_type),
                          page: null,
                        })}
                        className="text-foreground/80 hover:text-foreground hover:underline"
                      >
                        {row.event_type}
                      </Link>
                    </Td>
                    <Td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLE[status] ?? 'bg-foreground/10 text-foreground/70'
                        }`}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-foreground/60">
                      {formatDate(row.received_at)}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-foreground/60">
                      {row.processed_at ? formatDate(row.processed_at) : '—'}
                    </Td>
                    <Td className="max-w-[20ch] truncate text-xs text-destructive/80">
                      {row.processing_error ?? ''}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

      {/* Selected event payload */}
      {selectedRow ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium">Payload — {selectedRow.event_id}</h3>
            <Link
              href={buildHref({ selected: null })}
              className="text-xs text-foreground/60 hover:text-foreground"
            >
              Fechar
            </Link>
          </div>
          <pre className="mt-3 max-h-[60vh] overflow-x-auto overflow-y-auto rounded bg-foreground/5 p-3 text-xs">
            {JSON.stringify(selectedRow.payload, null, 2)}
          </pre>
        </section>
      ) : null}
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground/60">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ''}`}>{children}</td>
}

function isValidStatus(s: string | undefined): s is 'success' | 'failed' | 'pending' {
  return s === 'success' || s === 'failed' || s === 'pending'
}

function extractPrefix(eventType: string): string {
  // PAYMENT_RECEIVED → PAYMENT_; CHARGE_X → CHARGE_; etc.
  // Falls back to the full type if no underscore (rare).
  const us = eventType.indexOf('_')
  return us > 0 ? eventType.slice(0, us + 1) : eventType
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}
