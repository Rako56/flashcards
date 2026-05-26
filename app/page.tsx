import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { PrepPaywall } from '@/components/paywall/prep-paywall'
import { ActivityFeed } from '@/components/widgets/activity-feed'
import { DailyGoalWidget } from '@/components/widgets/daily-goal'
import { getRecentActivity } from '@/lib/activity/get-recent-activity'
import { getTodayProgress } from '@/lib/activity/get-today-progress'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'
import { getCurrentUser } from '@/lib/access/get-current-user'
import { hasUserConcursoAccess } from '@/lib/access/has-concurso-access'
import { buildCourseJsonLd, buildOrganizationJsonLd, jsonLdToScript } from '@/lib/seo/jsonld'

export async function generateMetadata(): Promise<Metadata> {
  const concurso = await getConcursoFromHeaders()
  if (!concurso) {
    return {
      title: 'Flashcards — Preparação para concursos públicos',
      description:
        'Marketplace de preparações curadas para concursos públicos brasileiros. Flashcards inteligentes, simulados e caderno de erros.',
    }
  }
  const banca = concurso.banca ? ` (${concurso.banca})` : ''
  const cargo = concurso.cargo ? ` — ${concurso.cargo}` : ''
  const trimmed = concurso.descricao?.trim()
  const desc =
    trimmed && trimmed.length > 0
      ? trimmed
      : `Preparação curada para ${concurso.title}${banca}${cargo}. Flashcards inteligentes, simulados e caderno de erros.`
  return {
    title: `${concurso.title} | Flashcards`,
    description: desc,
    openGraph: {
      title: `${concurso.title} | Flashcards`,
      description: desc,
      type: 'website',
    },
  }
}

export default async function HomePage() {
  const concurso = await getConcursoFromHeaders()

  // STATE 1: apex / reserved subdomain → marketing landing
  if (!concurso) {
    const orgJsonLd = buildOrganizationJsonLd()
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdToScript(orgJsonLd) }}
        />

        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Concurso público <span className="text-brand-primary">sem ruído</span>.
          </h1>
          <p className="max-w-2xl text-lg text-foreground/70">
            Flashcards inteligentes, simulados e caderno de erros — só o que move sua nota.
            Preparações curadas por especialistas, uma por concurso.
          </p>
          <p className="text-sm font-medium text-foreground/60">
            Acesse via o subdomínio do seu concurso · Ex:{' '}
            <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-xs">
              tjsp.flashcards.com.br
            </code>
          </p>
        </section>

        {/* Como funciona */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            title="1. Aprende"
            description="Flashcards inteligentes com algoritmo FSRS-5 calibram revisões pro seu ponto exato de esquecimento."
          />
          <FeatureCard
            title="2. Treina"
            description="Simulados sob medida com tempo cronometrado e questões reais do banco da banca."
          />
          <FeatureCard
            title="3. Corrige"
            description="Caderno de erros separa o que você precisa revisar urgente do que já dominou."
          />
        </section>

        {/* Pricing */}
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-brand-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Preparação 12 meses
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">R$ 297</span>
              <span className="text-base text-foreground/60">/ano</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-foreground/70">
              <li>✓ Banco completo de flashcards + questões</li>
              <li>✓ Simulados ilimitados</li>
              <li>✓ Caderno de erros automático</li>
              <li>✓ Atualizado conforme edital</li>
              <li>✓ Cancelamento a qualquer momento (CDC art. 49)</li>
            </ul>
          </div>
        </section>

        {/* FAQ short */}
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
          <FaqItem
            q="É um curso ou um app?"
            a="Um app. Você assina uma preparação específica do seu concurso e estuda no seu ritmo, com revisões agendadas pelo algoritmo."
          />
          <FaqItem
            q="Tem aula em vídeo?"
            a="Não. Foco em retenção via flashcards + simulados + correção dirigida. Aula em vídeo dá ilusão de progresso; nós damos progresso real."
          />
          <FaqItem
            q="Que concursos vocês cobrem?"
            a="Começamos com TJSP Escrevente. Novos concursos abrem por demanda — peça o seu em /sobre."
          />
          <FaqItem
            q="E se eu não gostar?"
            a="Você tem 7 dias de garantia (CDC art. 49) — reembolso integral sem perguntas. Pede em /reembolso."
          />
        </section>

        {/* Footer CTA */}
        <section className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Pronto pra começar?</h2>
          <p className="mt-2 text-sm text-foreground/70">
            Encontre seu concurso e cria sua conta em menos de 1 minuto.
          </p>
          <p className="mt-4 text-xs text-foreground/50">
            Disponível: TJSP Escrevente Técnico · 4.265 flashcards · 343 questões reais
          </p>
        </section>
      </main>
    )
  }

  // Concurso resolved — inject Course JSON-LD wrapper around all states
  const courseJsonLd = buildCourseJsonLd({
    title: concurso.title,
    slug: concurso.slug,
    banca: concurso.banca,
    estado: concurso.estado,
    cargo: concurso.cargo,
    descricao: concurso.descricao,
  })

  // We have a concurso (e.g., tjsp.flashcards.com.br).
  // Resolve the current user. If not logged in, show login CTA.
  const user = await getCurrentUser()

  // STATE 2: concurso resolved + user NOT logged in → login CTA
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdToScript(courseJsonLd) }}
        />
        <div className="rounded-full bg-brand-primary px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-primary-foreground">
          {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
        </div>
        <h1 className="text-center text-4xl font-semibold tracking-tight">{concurso.title}</h1>
        {concurso.cargo ? (
          <p className="text-center text-lg text-foreground/70">{concurso.cargo}</p>
        ) : null}
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </main>
    )
  }

  // User is logged in. Check whether they have access to THIS concurso.
  const hasAccess = await hasUserConcursoAccess(user.id, concurso.id)

  // STATE 3: logged in but no access → paywall
  if (!hasAccess) {
    return <PrepPaywall concurso={concurso} userEmail={user.email ?? '(sem e-mail)'} />
  }

  // STATE 4: full access — render the app shell with study CTA + activity widgets
  const [activity, progress] = await Promise.all([
    getRecentActivity(user.id, concurso.id, 7),
    getTodayProgress(user.id, concurso.id),
  ])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-6 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdToScript(courseJsonLd) }}
      />
      <div className="rounded-full bg-brand-primary px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-primary-foreground">
        {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
      </div>
      <h1 className="text-center text-4xl font-semibold tracking-tight">{concurso.title}</h1>
      <p className="text-center text-sm text-foreground/70">
        Bem-vindo, <span className="font-medium">{user.email}</span>
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/study">Iniciar sessão de estudo</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/erros">Caderno de erros</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/simulado">Simulados</Link>
        </Button>
      </div>

      <div className="mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <DailyGoalWidget progress={progress} />
        <ActivityFeed buckets={activity} />
      </div>
    </main>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-foreground/70">{description}</p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg border border-border bg-card p-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground/90">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
        {q}
      </summary>
      <p className="mt-3 pl-5 text-sm leading-relaxed text-foreground/70">{a}</p>
    </details>
  )
}
