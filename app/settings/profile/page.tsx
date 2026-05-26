import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { formatCpf } from '@/lib/validation/cpf'

import { ProfileForm } from './profile-form'

export const metadata = {
  title: 'Perfil — Flashcards',
}

export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/settings/profile')
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, cpf')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/account">Voltar</Link>
        </Button>
      </header>

      <p className="text-sm text-foreground/70">
        Edite seu nome e CPF (usado para faturamento e nota fiscal).
      </p>

      <ProfileForm
        initialFullName={profile?.full_name ?? ''}
        initialCpf={profile?.cpf ? formatCpf(profile.cpf) : ''}
      />
    </main>
  )
}
