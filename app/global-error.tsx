'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // P7 wires Sentry.captureException here.
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

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
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Erro fatal</h2>
          {error.digest ? (
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Referência: {error.digest}</p>
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
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  )
}
