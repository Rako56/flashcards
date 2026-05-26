export const metadata = {
  title: 'Solicitar reembolso — Flashcards',
  description: 'Solicite reembolso integral em até 7 dias do pagamento (CDC art. 49).',
}

export default function ReembolsoPage() {
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
          Envie um e-mail para{' '}
          <a href="mailto:contato@flashcards.com.br">contato@flashcards.com.br</a> com:
        </p>
        <ul>
          <li>
            Assunto: <em>"Reembolso CDC"</em>
          </li>
          <li>E-mail usado no cadastro</li>
          <li>Concurso comprado</li>
          <li>Data aproximada do pagamento</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Prazo de processamento</h2>
        <p>
          Após confirmação dos dados, o estorno é iniciado em até <strong>5 dias úteis</strong>. O
          prazo total para o valor cair na sua conta depende do método original:
        </p>
        <ul>
          <li>PIX: 1-3 dias úteis após estorno</li>
          <li>Cartão de crédito: 1-2 faturas (até 60 dias)</li>
          <li>Boleto: 5-7 dias úteis para o crédito em conta</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Após o prazo de 7 dias</h2>
        <p>
          Reembolsos solicitados após os 7 dias corridos são avaliados caso a caso. Não há reembolso
          parcial pré-determinado — entre em contato e analisaremos a situação.
        </p>
      </article>
    </main>
  )
}
