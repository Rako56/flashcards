'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'

/**
 * Root error boundary — Next.js renders this when a top-level layout
 * (RootLayout, Providers, etc.) throws. Critical: this file MUST
 * include `<html>` and `<body>` because it replaces the entire app
 * shell when active.
 *
 * Inline styles (not Tailwind) because globals.css may not have
 * loaded if the failure happened early in the render tree.
 *
 * Reports to Sentry just like the route-segment boundary, with a
 * distinct `boundary` tag so we can filter in the dashboard.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    const id = Sentry.captureException(error, (scope) => {
      if (error.digest) scope.setTag('next.digest', error.digest)
      scope.setTag('boundary', 'app/global-error.tsx')
      return scope
    })
    if (id) setEventId(id)
  }, [error])

  const ref = eventId ?? error.digest ?? null

  return (
    <html lang="pt-BR">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Erro fatal</h2>
          <p style={{ maxWidth: '28rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Nossa equipe foi notificada automaticamente. Você pode tentar de novo abaixo.
          </p>
          {ref ? (
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Referência: <code style={{ fontFamily: 'monospace' }}>{ref}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  )
}
