import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { getCurrentUser } from '@/lib/access/get-current-user'

export const metadata = {
  title: 'Configurações — Flashcards',
}

export const dynamic = 'force-dynamic'

/**
 * /settings — hub landing. Lists every settings sub-page in cards.
 *
 * Single source of truth for "where do I edit X" — eliminates the
 * users-go-to-/settings/account-then-click-around pattern. Each card
 * is a one-line description + CTA so the user lands in the right
 * deep page directly from the header email link.
 */
export default async function SettingsHubPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/settings')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <Breadcrumb items={[{ name: 'Início', href: '/' }, { name: 'Configurações' }]} />

      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Logado como <span className="font-medium">{user.email}</span>
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <SettingsCard
          href="/settings/profile"
          title="Perfil"
          description="Nome completo e CPF (usados para faturamento)."
        />
        <SettingsCard
          href="/settings/study"
          title="Preferências de estudo"
          description="Meta diária, tamanho da sessão e ritmo de cards novos."
        />
        <SettingsCard
          href="/settings/password"
          title="Senha"
          description="Trocar sua senha de acesso."
        />
        <SettingsCard
          href="/settings/account"
          title="Conta"
          description="Email, exclusão LGPD e outros controles sensíveis."
          tone="destructive"
        />
      </div>
    </main>
  )
}

function SettingsCard({
  href,
  title,
  description,
  tone,
}: {
  href: string
  title: string
  description: string
  tone?: 'destructive'
}) {
  const borderClass =
    tone === 'destructive'
      ? 'border-destructive/40 hover:border-destructive/60'
      : 'border-border hover:border-foreground/30'
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-lg border bg-card p-5 shadow-sm transition-colors ${borderClass}`}
    >
      <div className="flex-1">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-1 text-sm text-foreground/60">{description}</p>
      </div>
      <span aria-hidden="true" className="text-foreground/40">
        →
      </span>
    </Link>
  )
}
