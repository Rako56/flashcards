import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'

import { PasswordForm } from './password-form'

export const metadata = {
  title: 'Alterar senha — Flashcards',
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/settings/password')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <Breadcrumb
        items={[
          { name: 'Início', href: '/' },
          { name: 'Conta', href: '/settings/account' },
          { name: 'Senha' },
        ]}
      />
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Alterar senha</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/account">Voltar</Link>
        </Button>
      </header>

      <p className="text-sm text-foreground/70">
        Você precisa informar sua senha atual antes de definir uma nova.
      </p>

      <PasswordForm />
    </main>
  )
}
