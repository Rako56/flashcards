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
          Cada concurso ativo tem o seu próprio subdomínio (ex: <code>tjsp.flashcards.com.br</code>)
          com flashcards autorais, simulado fiel à banca, caderno de erros automático e painel de
          métricas.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Como funciona</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Você acessa o subdomínio do concurso e cria uma conta.</li>
          <li>Compra o acesso anual (R$ 297/ano, com 7 dias de reembolso garantido).</li>
          <li>Estuda os flashcards no algoritmo SRS (Spaced Repetition System — FSRS-5).</li>
          <li>Faz simulado real próximo da prova; revisita os cards que mais errou.</li>
        </ol>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Curadoria humana</h2>
        <p>
          Todo o conteúdo é produzido pela equipe Cowork: advogados, professores e especialistas em
          cada banca. Não usamos geração por IA visível ao aluno. Cada card passa por revisão antes
          de chegar ao banco de produção.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Stack</h2>
        <p>
          Next.js + TypeScript + Supabase + Asaas + Vercel. Open-source onde possível; algoritmo SRS
          via ts-fsrs (FSRS-5). Monitoramento por Sentry, logs estruturados via pino, infraestrutura
          em conformidade com LGPD.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-foreground">Contato</h2>
        <p>
          <a href="mailto:contato@flashcards.com.br">contato@flashcards.com.br</a>
        </p>
      </article>
    </main>
  )
}
