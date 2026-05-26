import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/auth/actions'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getUserStats } from '@/lib/gamification/get-user-stats'

/**
 * Top navigation. Server Component — reads user + concurso server-side.
 *
 * Behavior:
 *  - Logo links to / (apex) or current concurso landing
 *  - If concurso resolved + user logged in: shows "Estudar" + "Caderno"
 *  - User menu (right): "Entrar"/"Criar conta" OR "Sair" form
 *  - On apex (no concurso): no product nav, only logo + auth CTAs
 *  - When logged in + concurso: shows XP total + week streak inline.
 */
export async function SiteHeader() {
  const concurso = await getConcursoFromHeaders()
  const user = await getCurrentUser()
  const stats = user ? await getUserStats(user.id, concurso?.id ?? null) : null

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-semibold tracking-tight text-foreground hover:text-brand-primary"
          >
            Flashcards
            {concurso ? (
              <span className="ml-2 text-xs font-normal text-foreground/50">· {concurso.slug}</span>
            ) : null}
          </Link>

          {concurso && user ? (
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/study"
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                Estudar
              </Link>
              <Link
                href="/simulado"
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                Simulados
              </Link>
              <Link
                href="/erros"
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                Caderno
              </Link>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {stats && (stats.totalXp > 0 || stats.weekStreak > 0) ? (
                <div className="hidden items-center gap-3 text-xs text-foreground/60 md:flex">
                  {stats.totalXp > 0 ? (
                    <span title="Total de XP acumulado">
                      <span className="font-semibold text-foreground/80">{stats.totalXp}</span> XP
                    </span>
                  ) : null}
                  {stats.weekStreak > 0 ? (
                    <span title="Dias consecutivos de estudo na semana">
                      <span aria-hidden="true">🔥</span>{' '}
                      <span className="font-semibold text-foreground/80">{stats.weekStreak}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
              <Link
                href="/settings"
                className="hidden text-foreground/60 transition-colors hover:text-foreground sm:inline"
                title="Configurações"
              >
                {user.email}
              </Link>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Sair
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
