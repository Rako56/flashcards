import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-semibold">Página não encontrada</h2>
      <p className="text-sm text-muted-foreground">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        href="/"
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Voltar para a home
      </Link>
    </main>
  )
}
