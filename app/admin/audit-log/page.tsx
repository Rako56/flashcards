import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listAuditLog } from '@/lib/admin/list-audit-log'

export const metadata = {
  title: 'Audit log — Admin Flashcards',
}

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

/**
 * /admin/audit-log — read-only list of audit_log entries.
 *
 * Surfaces LGPD-relevant actions (user_deletion, role_change, etc.)
 * for compliance audit trails. Same structural shape as
 * /admin/webhooks: filter chips + paginated table + selectable
 * row with payload (metadata) panel.
 *
 * No client JS — server-rendered with URL params for filter state.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string
    user?: string
    page?: string
    selected?: string
  }>
}) {
  const sp = await searchParams
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0)
  const offset = page * PAGE_SIZE
  const actionFilter = sp.action?.trim() ?? null
  const userFilter = sp.user?.trim() ?? null
  const selectedId = sp.selected ?? null

  const { rows, total, actions } = await listAuditLog({
    limit: PAGE_SIZE,
    offset,
    action: actionFilter,
    userId: userFilter,
  })

  const selectedRow = selectedId ? rows.find((r) => r.id === selectedId) : null

  const hasPrev = page > 0
  const hasNext = (page + 1) * PAGE_SIZE < total

  const buildHref = (overrides: Record<string, string | null | undefined>): string => {
    const params = new URLSearchParams()
    const merged: Record<string, string | null | undefined> = {
      action: actionFilter ?? undefined,
      user: userFilter ?? undefined,
      page: page > 0 ? String(page) : undefined,
      selected: selectedId ?? undefined,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `?${qs}` : '/admin/audit-log'
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Audit log</h2>
          <p className="text-sm text-foreground/60">
            {total} entrada(s) no total · página {page + 1} · ordenado por mais recente
          </p>
        </div>
      </header>

      {/* Action filter chips */}
      {actions.length > 0 ? (
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground/60">Action:</span>
          <FilterChip
            active={!actionFilter}
            href={buildHref({ action: null, page: null })}
            label="Todas"
          />
          {actions.map((a) => (
            <FilterChip
              key={a}
              active={actionFilter === a}
              href={buildHref({ action: a, page: null })}
              label={a}
            />
          ))}
        </nav>
      ) : null}

      {/* Active user filter */}
      {userFilter ? (
        <p className="text-sm">
          <span className="text-foreground/60">user_id:</span>{' '}
          <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-xs">
            {userFilter}
          </code>{' '}
          <Link
            href={buildHref({ user: null, page: null })}
            className="text-foreground/60 underline hover:text-foreground"
          >
            (limpar)
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-foreground/60">
          Nenhuma entrada encontrada com esses filtros.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50">
              <tr>
                <Th>Quando</Th>
                <Th>Action</Th>
                <Th>User</Th>
                <Th>Resource</Th>
                <Th>Correlation</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = row.id === selectedId
                return (
                  <tr
                    key={row.id}
                    className={
                      isSelected
                        ? 'bg-brand-primary/5'
                        : 'border-b border-border/40 last:border-b-0 hover:bg-background/40'
                    }
                  >
                    <Td className="whitespace-nowrap text-xs text-foreground/70">
                      <Link
                        href={buildHref({
                          selected: isSelected ? null : row.id,
                        })}
                        className="underline-offset-2 hover:underline"
                      >
                        {formatDate(row.created_at)}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={buildHref({ action: row.action, page: null })}
                        className="text-foreground/80 hover:text-foreground hover:underline"
                      >
                        <code className="font-mono text-xs">{row.action}</code>
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">
                      {row.user_id ? (
                        <Link
                          href={buildHref({ user: row.user_id, page: null })}
                          className="text-foreground/80 hover:underline"
                          title={row.user_id}
                        >
                          {row.user_id.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </Td>
                    <Td className="text-xs text-foreground/70">
                      {row.resource_type ?? '—'}
                      {row.resource_id ? (
                        <span className="ml-1 text-foreground/40">
                          {row.resource_id.slice(0, 8)}…
                        </span>
                      ) : null}
                    </Td>
                    <Td className="max-w-[16ch] truncate font-mono text-xs text-foreground/60">
                      {row.correlation_id ?? '—'}
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

      {/* Selected entry detail */}
      {selectedRow ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium">
              {selectedRow.action} — {formatDate(selectedRow.created_at)}
            </h3>
            <Link
              href={buildHref({ selected: null })}
              className="text-xs text-foreground/60 hover:text-foreground"
            >
              Fechar
            </Link>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            <Row label="ID" value={selectedRow.id} mono />
            <Row label="User" value={selectedRow.user_id ?? '—'} mono />
            <Row label="Resource type" value={selectedRow.resource_type ?? '—'} />
            <Row label="Resource ID" value={selectedRow.resource_id ?? '—'} mono />
            <Row label="Correlation ID" value={selectedRow.correlation_id ?? '—'} mono />
            <Row label="IP address" value={formatIp(selectedRow.ip_address)} mono />
            <Row label="User agent" value={selectedRow.user_agent ?? '—'} fullWidth />
          </dl>
          {selectedRow.metadata &&
          typeof selectedRow.metadata === 'object' &&
          Object.keys(selectedRow.metadata).length > 0 ? (
            <>
              <h4 className="mt-4 text-xs font-medium uppercase tracking-wider text-foreground/60">
                Metadata
              </h4>
              <pre className="mt-2 max-h-[40vh] overflow-x-auto overflow-y-auto rounded bg-foreground/5 p-3 text-xs">
                {JSON.stringify(selectedRow.metadata, null, 2)}
              </pre>
            </>
          ) : null}
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

function Row({
  label,
  value,
  mono = false,
  fullWidth = false,
}: {
  label: string
  value: string
  mono?: boolean
  fullWidth?: boolean
}) {
  return (
    <>
      <dt className={`text-foreground/50 ${fullWidth ? 'sm:col-span-2' : ''}`}>{label}</dt>
      <dd
        className={`${mono ? 'font-mono' : ''} ${fullWidth ? '-mt-1 break-all sm:col-span-2' : 'truncate'}`}
        title={value}
      >
        {value}
      </dd>
    </>
  )
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

function formatIp(raw: unknown): string {
  // PostgreSQL inet/cidar columns come back as strings via PostgREST;
  // typed as `unknown` because the database.types.ts default is `unknown`
  // for those column types. Defensively narrow before render.
  if (typeof raw === 'string') return raw
  if (raw === null || raw === undefined) return '—'
  return '—'
}
