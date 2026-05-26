import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/access/get-current-user'

import { DeleteAccountForm } from './delete-account-form'

export const metadata = {
  title: 'Conta — Flashcards',
}

export const dynamic = 'force-dynamic'

/**
 * Account settings — currently scoped to LGPD deletion (AUTH-06).
 * Other settings (password change, email change, etc.) land later.
 */
export default async function AccountSettingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/settings/account')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <Breadcrumb items={[{ name: 'Início', href: '/' }, { name: 'Conta' }]} />
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Sua conta</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Voltar</Link>
        </Button>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-foreground/50">E-mail</div>
        <p className="mt-1 text-base font-medium">{user.email}</p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Perfil</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Edite seu nome completo e CPF — usados para faturamento.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/profile">Editar perfil</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Estudo</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Meta diária, tamanho da sessão e ritmo de cards novos por dia.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/study">Ajustar preferências</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Segurança</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Mantenha sua senha forte e única. Senhas vazadas em incidentes públicos são rejeitadas
          automaticamente.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/password">Alterar senha</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">Zona de risco</h2>
        <p className="mt-2 text-sm text-foreground/80">
          Ao excluir sua conta, removemos permanentemente <strong>todos os seus dados</strong>:
          progresso de estudo, caderno de erros, simulados, XP, streak e histórico de pagamentos.
          Esta ação é irreversível e cumprimos a LGPD (art. 18, VI) em até 15 dias úteis para
          remover qualquer cópia residual.
        </p>
        <p className="mt-2 text-sm text-foreground/80">
          Você <strong>não</strong> será reembolsado(a) ao excluir. Se quer reembolso, peça em{' '}
          <Link href="/reembolso" className="underline hover:no-underline">
            /reembolso
          </Link>{' '}
          antes.
        </p>
        <div className="mt-6">
          <DeleteAccountForm />
        </div>
      </section>
    </main>
  )
}
