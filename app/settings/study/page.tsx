import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { createClient } from '@/lib/supabase/server'

import { StudyPrefsForm } from './study-prefs-form'

export const metadata = {
  title: 'Preferências de estudo — Flashcards',
}

export const dynamic = 'force-dynamic'

const DEFAULTS = {
  daily_goal_minutes: 30,
  default_session_size: 20,
  default_new_per_day: 5,
}

export default async function StudyPreferencesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/settings/study')
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('daily_goal_minutes, default_session_size, default_new_per_day')
    .eq('user_id', user.id)
    .maybeSingle()

  const initial = {
    daily_goal_minutes: profile?.daily_goal_minutes ?? DEFAULTS.daily_goal_minutes,
    default_session_size: profile?.default_session_size ?? DEFAULTS.default_session_size,
    default_new_per_day: profile?.default_new_per_day ?? DEFAULTS.default_new_per_day,
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Estudo</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/account">Voltar</Link>
        </Button>
      </header>

      <p className="text-sm text-foreground/70">
        Configure sua meta diária e o ritmo das sessões. Mudanças aplicam à próxima sessão.
      </p>

      <StudyPrefsForm initial={initial} />
    </main>
  )
}
