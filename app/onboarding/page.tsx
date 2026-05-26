import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/access/get-current-user'
import { NOINDEX_METADATA } from '@/lib/seo/noindex'
import { createClient } from '@/lib/supabase/server'
import { formatCpf } from '@/lib/validation/cpf'

import { OnboardingForm } from './onboarding-form'

export const metadata = {
  title: 'Bem-vindo — Flashcards',
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

/**
 * Onboarding — collects full_name + CPF after signup. If the user
 * already has both fields filled (returning user that hit /onboarding
 * by accident), we bounce them straight to /.
 *
 * Read fills the form with whatever's already saved so re-edits are
 * a single field change rather than re-typing everything.
 */
export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/onboarding')
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, cpf')
    .eq('user_id', user.id)
    .maybeSingle()

  // Already onboarded → don't bother them again
  if (profile?.full_name && profile.cpf) {
    redirect('/')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Falta pouco</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Precisamos do seu nome completo e CPF para emitir nota fiscal quando você assinar uma
          preparação.
        </p>
      </div>

      <OnboardingForm
        initialFullName={profile?.full_name ?? ''}
        initialCpf={profile?.cpf ? formatCpf(profile.cpf) : ''}
      />

      <p className="text-xs text-foreground/50">
        Sua privacidade é levada a sério —{' '}
        <a href="/privacidade" className="underline hover:no-underline">
          política
        </a>
        .
      </p>
    </main>
  )
}
