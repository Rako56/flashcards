'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'

/**
 * Route-segment error boundary — Next.js renders this whenever a
 * Server Component throws OR a Client Component renders an uncaught
 * error inside the layout boundary.
 *
 * Reports to Sentry on mount and surfaces the Sentry event ID to
 * the user (more actionable than Next's opaque `digest` because we
 * can paste it into the Sentry dashboard to find the trace).
 *
 * Falls back to the `digest` when capture is disabled (e.g. local
 * dev without SENTRY_DSN) so the UI is always coherent.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    // Sentry.captureException returns the event ID (or undefined if
    // DSN is unset / SDK init failed). We attach the digest as a tag
    // so the Sentry issue cross-references with the client console
    // log from Next.js itself.
    const id = Sentry.captureException(error, (scope) => {
      if (error.digest) scope.setTag('next.digest', error.digest)
      scope.setTag('boundary', 'app/error.tsx')
      return scope
    })
    if (id) setEventId(id)
  }, [error])

  const ref = eventId ?? error.digest ?? null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-semibold">Algo deu errado</h2>
      <p className="max-w-md text-center text-sm text-foreground/70">
        Nossa equipe foi notificada automaticamente. Você pode tentar de novo abaixo, ou recarregar
        a página.
      </p>
      {ref ? (
        <p className="text-xs text-foreground/50">
          Referência: <code className="font-mono">{ref}</code>
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Tentar novamente
      </button>
    </main>
  )
}
