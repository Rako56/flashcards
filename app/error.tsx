'use client'

import { useEffect } from 'react'

export default function GlobalErrorBoundary({
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-semibold">Algo deu errado</h2>
      {error.digest ? (
        <p className="text-sm text-muted-foreground">Referência: {error.digest}</p>
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
