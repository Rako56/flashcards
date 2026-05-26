import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'

import { CreateSimuladoForm } from './create-form'

export const metadata = {
  title: 'Criar simulado — Flashcards',
}

export const dynamic = 'force-dynamic'

export default async function NewSimuladoPage() {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    redirect('/')
  }
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/simulado/novo')
  }
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)
  if (!hasAccess) {
    redirect('/')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Criar simulado</h1>
          <p className="mt-1 text-sm text-foreground/70">
            Sorteamos questões aleatórias do banco de <strong>{concurso.title}</strong>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/simulado">Voltar</Link>
        </Button>
      </header>

      <CreateSimuladoForm />

      <p className="text-xs text-foreground/50">
        Tela de execução do simulado ainda em desenvolvimento. Por enquanto, criação registra o
        sorteio das questões pra você acompanhar progresso quando o runner ficar pronto.
      </p>
    </main>
  )
}
