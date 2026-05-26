import { getCurrentUser } from '@/lib/access/get-current-user'
import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'

import { RefundForm } from './refund-form'

export const metadata = {
  title: 'Solicitar reembolso — Flashcards',
  description: 'Solicite reembolso integral em até 7 dias do pagamento (CDC art. 49).',
}

export const dynamic = 'force-dynamic'

export default async function ReembolsoPage() {
  // Best-effort pre-fill from session + concurso context. Form still
  // works for anonymous users (e.g. user already deleted account but
  // wants to request the refund anyway).
  const user = await getCurrentUser()
  const concurso = await getConcursoFromHeaders()

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Solicitar reembolso</h1>

      <article className="prose prose-sm mt-6 max-w-none text-foreground/80">
        <p className="text-lg leading-relaxed">
          O Código de Defesa do Consumidor (Lei 8.078/90, art. 49) garante o direito a reembolso
          integral em compras a distância, em até <strong>7 dias corridos</strong> a partir do
          pagamento.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Como solicitar</h2>
        <p>
          Preencha o formulário abaixo. Nossa equipe responde em até <strong>2 dias úteis</strong> e
          o estorno é iniciado em até <strong>5 dias úteis</strong> após confirmação dos dados.
        </p>
      </article>

      <section className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <RefundForm
          initialEmail={user?.email ?? undefined}
          initialConcurso={concurso?.slug ?? undefined}
        />
      </section>

      <article className="prose prose-sm mt-8 max-w-none text-foreground/80">
        <h2 className="text-lg font-semibold text-foreground">Prazo do estorno</h2>
        <p>O prazo total para o valor cair na sua conta depende do método original:</p>
        <ul>
          <li>PIX: 1-3 dias úteis após estorno</li>
          <li>Cartão de crédito: 1-2 faturas (até 60 dias)</li>
          <li>Boleto: 5-7 dias úteis para o crédito em conta</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-foreground">Após o prazo de 7 dias</h2>
        <p>
          Reembolsos solicitados após os 7 dias corridos são avaliados caso a caso. Não há reembolso
          parcial pré-determinado — use o mesmo formulário e descreva a situação no motivo. A equipe
          retorna em até 2 dias úteis com a decisão.
        </p>
      </article>
    </main>
  )
}
