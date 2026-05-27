export const metadata = {
  title: 'Sobre — Flashcards',
  description: 'Sobre o Flashcards, marketplace de preparações curadas para concursos públicos.',
}

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Sobre o Flashcards</h1>

      <article className="prose prose-sm mt-8 max-w-none text-foreground/80">
        <p className="text-lg leading-relaxed">
          O Flashcards é um marketplace de preparações curadas para concursos públicos brasileiros.
          Cada concurso tem o seu próprio subdomínio (ex:{' '}
          <code>tjsp-escrevente.flashcards.com.br</code>) com flashcards autorais, simulado fiel à
          banca e caderno de erros automático.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Como funciona</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Você acessa o subdomínio do concurso e cria uma conta.</li>
          <li>Compra o acesso anual (R$ 297/ano, com 7 dias de reembolso garantido).</li>
          <li>Estuda os flashcards com algoritmo de repetição espaçada que calibra revisões.</li>
          <li>Faz simulado real próximo da prova; revisita os cards que mais errou.</li>
        </ol>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Curadoria humana</h2>
        <p>
          Todo o conteúdo é produzido pela equipe Cowork: advogados, professores e especialistas em
          cada banca. Não usamos geração por IA visível ao aluno. Cada card passa por revisão antes
          de chegar ao banco de produção.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Garantia</h2>
        <p>
          Você tem 7 dias após a compra pra testar e pedir reembolso integral sem perguntas (CDC
          art. 49). Pedido em <a href="/reembolso">/reembolso</a>.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Quer ver seu concurso aqui?</h2>
        <p>
          Manda um e-mail. A gente prioriza por demanda — quanto mais gente pedir, mais rápido a
          banca entra no roadmap.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Contato</h2>
        <p>
          <a href="mailto:contato@flashcards.com.br">contato@flashcards.com.br</a>
        </p>
      </article>
    </main>
  )
}
