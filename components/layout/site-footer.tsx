import Link from 'next/link'

/**
 * Site footer with legal/marketing links.
 * Static — no DB / user lookups.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} Flashcards · Marketplace de preparações para concursos.
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/sobre" className="hover:text-foreground">
            Sobre
          </Link>
          <Link href="/termos" className="hover:text-foreground">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/reembolso" className="hover:text-foreground">
            Reembolso
          </Link>
        </nav>
      </div>
    </footer>
  )
}
