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
import {
  getConcursoContentStats,
  getFirstPublishedConcurso,
  getGlobalContentStats,
} from '@/lib/landing/get-content-stats'
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
    // Live counts so we never display stale hardcoded numbers, and the
    // first published concurso so the CTA can link directly into a
    // subdomain instead of just naming it.
    const [stats, firstConcurso] = await Promise.all([
      getGlobalContentStats(),
      getFirstPublishedConcurso(),
    ])
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdToScript(orgJsonLd) }}
        />

        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Concurso público <span className="italic text-brand-primary">sem ruído</span>.
          </h1>
          <p className="max-w-2xl text-lg text-foreground/70">
            Flashcards inteligentes, simulados e caderno de erros — só o que move sua nota.
            Preparações curadas por especialistas, uma por concurso.
          </p>
          {firstConcurso ? (
            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={`https://${firstConcurso.slug}.flashcards.com.br/`}>
                  Começar com {firstConcurso.title} →
                </Link>
              </Button>
              <span className="text-xs text-foreground/50">R$ 297/ano · 7 dias de garantia</span>
            </div>
          ) : (
            <p className="text-sm font-medium text-foreground/60">
              Preparações em breve — acompanhe em{' '}
              <Link href="/sobre" className="underline">
                /sobre
              </Link>
              .
            </p>
          )}
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

        {/* FAQ */}
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
            q="Funciona no celular?"
            a="Sim. É um site responsivo — abre em qualquer navegador moderno (Chrome, Safari, Edge). Não tem app pra instalar; salve o atalho na tela inicial e use offline-friendly o que estiver em cache."
          />
          <FaqItem
            q="Aceita PIX?"
            a="Sim. PIX (aprovação instantânea), boleto (1-2 dias úteis) e cartão de crédito em até 12x. Tudo processado pela Asaas — sem dados de cartão tocando nossos servidores."
          />
          <FaqItem
            q="Acompanha o edital?"
            a="Sim. Quando a banca publica retificação ou atualização do edital, ajustamos o banco de cards e marcamos os tópicos afetados pra revisão prioritária."
          />
          <FaqItem
            q="Quanto tempo de estudo por dia?"
            a="O algoritmo se adapta ao seu ritmo — 20 a 40 minutos/dia mantém revisões em dia. Quanto mais consistente, menor o tempo necessário por sessão."
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
            {firstConcurso
              ? `Crie sua conta e desbloqueia ${firstConcurso.title} em menos de 1 minuto.`
              : 'Crie sua conta em menos de 1 minuto.'}
          </p>
          {firstConcurso ? (
            <div className="mt-5">
              <Button asChild size="lg">
                <Link href={`https://${firstConcurso.slug}.flashcards.com.br/signup`}>
                  Criar conta · R$ 297/ano
                </Link>
              </Button>
            </div>
          ) : null}
          <p className="mt-5 text-xs text-foreground/50">
            {stats.concursosCount > 0
              ? `Disponível: ${formatNumber(stats.concursosCount)} ${
                  stats.concursosCount === 1 ? 'concurso' : 'concursos'
                } · ${formatNumber(stats.flashcardsCount)} flashcards · ${formatNumber(
                  stats.questoesCount,
                )} questões reais`
              : 'Banco de flashcards e questões em curadoria — em breve.'}
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

  // STATE 2: concurso resolved + user NOT logged in → per-concurso landing
  // This is the page that converts. Treat it as the real money page —
  // not a thin login card. Hero + how it works + pricing + FAQ + CTA,
  // all personalized to the concurso the visitor landed on.
  if (!user) {
    const stats = await getConcursoContentStats(concurso.id)
    const trimmedDesc = concurso.descricao?.trim() ?? ''
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdToScript(courseJsonLd) }}
        />

        {/* Hero — concurso-specific */}
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-brand-primary px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-primary-foreground">
            {concurso.banca ?? 'Concurso'} · {concurso.estado ?? 'BR'}
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {concurso.title}
          </h1>
          {concurso.cargo ? <p className="text-lg text-foreground/70">{concurso.cargo}</p> : null}
          {trimmedDesc.length > 0 ? (
            <p className="max-w-2xl text-base text-foreground/70">{trimmedDesc}</p>
          ) : (
            <p className="max-w-2xl text-base text-foreground/70">
              Preparação curada por especialistas. Flashcards inteligentes, simulados e caderno de
              erros — só o que move sua nota.
            </p>
          )}
          {stats.flashcardsCount + stats.questoesCount > 0 ? (
            <p className="text-sm text-foreground/60">
              {formatNumber(stats.flashcardsCount)} flashcards · {formatNumber(stats.questoesCount)}{' '}
              questões reais
            </p>
          ) : null}
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Criar conta · R$ 297/ano</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Já sou cliente</Link>
            </Button>
          </div>
          <p className="text-xs text-foreground/50">
            7 dias de garantia · PIX · boleto · cartão até 12x
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
              Preparação 12 meses · {concurso.title}
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
            <Button asChild size="lg" className="mt-4">
              <Link href="/signup">Começar agora →</Link>
            </Button>
          </div>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
          <FaqItem
            q="É um curso ou um app?"
            a={`Um app. Você assina a preparação ${concurso.title} e estuda no seu ritmo, com revisões agendadas pelo algoritmo.`}
          />
          <FaqItem
            q="Tem aula em vídeo?"
            a="Não. Foco em retenção via flashcards + simulados + correção dirigida. Aula em vídeo dá ilusão de progresso; nós damos progresso real."
          />
          <FaqItem
            q="Funciona no celular?"
            a="Sim. É um site responsivo — abre em qualquer navegador moderno (Chrome, Safari, Edge). Não tem app pra instalar; salve o atalho na tela inicial."
          />
          <FaqItem
            q="Aceita PIX?"
            a="Sim. PIX (aprovação instantânea), boleto (1-2 dias úteis) e cartão de crédito em até 12x. Tudo processado pela Asaas — sem dados de cartão tocando nossos servidores."
          />
          <FaqItem
            q="Acompanha o edital?"
            a={`Sim. Quando a ${concurso.banca ?? 'banca'} publica retificação ou atualização do edital, ajustamos o banco e marcamos tópicos afetados pra revisão prioritária.`}
          />
          <FaqItem
            q="Quanto tempo de estudo por dia?"
            a="O algoritmo se adapta ao seu ritmo — 20 a 40 minutos/dia mantém revisões em dia. Quanto mais consistente, menor o tempo necessário por sessão."
          />
          <FaqItem
            q="E se eu não gostar?"
            a="Você tem 7 dias de garantia (CDC art. 49) — reembolso integral sem perguntas. Pede em /reembolso."
          />
        </section>

        {/* Footer CTA */}
        <section className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Pronto pra começar com {concurso.title}?
          </h2>
          <p className="mt-2 text-sm text-foreground/70">
            Crie sua conta em menos de 1 minuto e estuda no mesmo dia.
          </p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/signup">Criar conta · R$ 297/ano</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </section>
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

// Pt-BR number formatting (thousands separator '.'). Pulled out as a
// helper so STATE 1 + STATE 2 stay consistent.
function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}
