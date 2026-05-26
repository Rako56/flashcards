export const metadata = {
  title: 'Política de Privacidade — Flashcards',
  description: 'Política de privacidade e tratamento de dados pessoais do Flashcards (LGPD).',
}

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Última atualização: 2026-05-26 · LGPD-compliant
      </p>

      <article className="prose prose-sm mt-8 max-w-none text-foreground/80">
        <h2 className="text-lg font-semibold text-foreground">1. Quem somos</h2>
        <p>
          O Flashcards (flashcards.com.br) é controlador dos seus dados pessoais quando você cria
          uma conta, paga pelo acesso ou usa o produto. Operador: equipe Cowork.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">2. Dados que coletamos</h2>
        <ul>
          <li>
            <strong>Cadastro:</strong> e-mail, senha (hash bcrypt + HIBP-checked), nome.
          </li>
          <li>
            <strong>Pagamento:</strong> processado integralmente pela Asaas (PCI-DSS Level 1). Não
            armazenamos dados completos de cartão. Recebemos apenas confirmação + ID do pagamento.
          </li>
          <li>
            <strong>Uso:</strong> ratings de flashcards (Again/Hard/Good/Easy), datas de revisão,
            tempo de sessão — para o algoritmo SRS funcionar.
          </li>
          <li>
            <strong>Técnicos:</strong> IP, user agent, correlationId de cada requisição — para
            depuração + segurança (logs retidos por 30 dias).
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-foreground">
          3. Bases legais (LGPD art. 7º)
        </h2>
        <ul>
          <li>
            <strong>Execução de contrato</strong> (inc. V) — para entregar o produto pago.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (inc. IX) — segurança, prevenção de fraude.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (inc. II) — guarda fiscal.
          </li>
          <li>
            <strong>Consentimento</strong> (inc. I) — apenas para envios de marketing opcional.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-foreground">4. Compartilhamento</h2>
        <ul>
          <li>Supabase (hospedagem do banco de dados, região EU).</li>
          <li>Vercel (hospedagem do app, região global).</li>
          <li>Asaas (processador de pagamento, Brasil).</li>
          <li>Sentry (monitoramento de erros, região EU).</li>
          <li>Resend (envio de e-mails transacionais, EU/US).</li>
        </ul>
        <p>
          Nenhum dado é vendido. Nenhum dado é compartilhado para finalidade publicitária de
          terceiros.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">
          5. Direitos do titular (LGPD art. 18)
        </h2>
        <p>
          Você pode pedir confirmação, acesso, correção, anonimização, portabilidade ou exclusão dos
          seus dados a qualquer momento. A exclusão é processada em até 15 dias úteis via{' '}
          <a href="/conta/excluir">/conta/excluir</a> (link disponível após login).
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">6. Retenção</h2>
        <p>
          Dados de cadastro e progresso são mantidos enquanto a conta estiver ativa + 30 dias após
          deleção. Logs de auditoria legal (LGPD art. 41) são mantidos por 5 anos. Dados fiscais
          conforme legislação aplicável (Lei 8.846/94).
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">7. Cookies</h2>
        <p>
          Usamos cookies essenciais para autenticação (sessão Supabase) e funcionamento do produto.
          Não usamos cookies de terceiros para publicidade.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">
          8. Contato do Encarregado (DPO)
        </h2>
        <p>
          <a href="mailto:dpo@flashcards.com.br">dpo@flashcards.com.br</a>
        </p>
      </article>
    </main>
  )
}
