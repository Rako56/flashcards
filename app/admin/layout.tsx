import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getCurrentUser } from '@/lib/access/get-current-user'
import { isAdmin } from '@/lib/access/is-admin'

export const dynamic = 'force-dynamic'

/**
 * Admin shell — Server Component layout that gates every `/admin/*`
 * route behind `has_role(user.id, 'admin')`.
 *
 * Fail-closed: if the user is not logged in OR not admin, redirect to /.
 * Renders a tabs strip + content area for child routes.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/admin')
  }
  const admin = await isAdmin(user.id)
  if (!admin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Admin</h1>
            <p className="text-xs text-foreground/60">
              Acesso somente para usuários com role <code className="font-mono">admin</code>.
            </p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin/concursos"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Concursos
            </Link>
            <Link
              href="/admin/flashcards"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Flashcards
            </Link>
            <Link
              href="/admin/questoes"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Questões
            </Link>
            <Link
              href="/admin/users"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Usuários
            </Link>
            <Link
              href="/admin/webhooks"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Webhooks
            </Link>
            <Link
              href="/"
              className="text-xs text-foreground/50 transition-colors hover:text-foreground"
            >
              ← Voltar
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  )
}
