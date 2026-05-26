export const metadata = {
  title: 'Termos de Uso — Flashcards',
  description:
    'Termos de uso do Flashcards, marketplace de preparações curadas para concursos públicos brasileiros.',
}

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Termos de Uso</h1>
      <p className="mt-2 text-sm text-foreground/60">Última atualização: 2026-05-26</p>

      <article className="prose prose-sm mt-8 max-w-none text-foreground/80">
        <h2 className="text-lg font-semibold text-foreground">1. Sobre o serviço</h2>
        <p>
          O Flashcards (flashcards.com.br) é um marketplace de preparações curadas para concursos
          públicos brasileiros, mantido pela equipe Cowork. Cada concurso ativo é acessado pelo
          subdomínio próprio (ex: <code>tjsp.flashcards.com.br</code>).
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">2. Plano e pagamento</h2>
        <p>
          O acesso é único por concurso, com duração de 12 meses a contar da confirmação do
          pagamento. Aceitamos PIX, boleto e cartão via Asaas. Não há renovação automática.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">3. Direito de reembolso</h2>
        <p>
          Em atendimento ao Código de Defesa do Consumidor (Lei 8.078/90, art. 49), o reembolso
          integral pode ser solicitado em até 7 (sete) dias corridos a partir da confirmação do
          pagamento. Solicite em <a href="/reembolso">/reembolso</a>.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">4. Conteúdo</h2>
        <p>
          Todo o conteúdo (flashcards, simulados, questões, comentários) é curado por humanos da
          equipe Cowork. Não há geração por IA visível ao aluno. Erros podem ser reportados pelo
          botão de feedback dentro de cada card.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">5. Limitação de uso</h2>
        <p>
          A conta é pessoal e intransferível. É proibido revender, redistribuir ou compartilhar
          acesso. Práticas de scraping automatizado, engenharia reversa de dados e uso comercial do
          conteúdo violam estes termos e podem resultar em cancelamento sem reembolso.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">6. Privacidade</h2>
        <p>
          Tratamos dados pessoais conforme a LGPD (Lei 13.709/18). Detalhes em{' '}
          <a href="/privacidade">/privacidade</a>.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">7. Contato</h2>
        <p>
          Dúvidas, suporte e solicitações:{' '}
          <a href="mailto:contato@flashcards.com.br">contato@flashcards.com.br</a>. Encarregada de
          dados (DPO): <a href="mailto:dpo@flashcards.com.br">dpo@flashcards.com.br</a>.
        </p>
      </article>
    </main>
  )
}
