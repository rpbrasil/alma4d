export const metadata = {
  title: "Política de Privacidade | alma4D",
  description:
    "Política de Privacidade e tratamento de dados do aplicativo alma4D (LGPD).",
};

function Card({
  title,
  children,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      {title ? (
        <h2 className="text-lg font-extrabold text-brand mb-2">{title}</h2>
      ) : null}
      {children}
    </article>
  );
}

export default function PrivacidadePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
          Política de Privacidade — alma4D
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          <em>Última atualização: Abril de 2026</em>
        </p>
      </header>

      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        {/* Introdução */}
        <Card>
          <p>
            Esta Política de Privacidade descreve como o aplicativo{" "}
            <strong>alma4D</strong> (“Aplicativo”, “Plataforma” ou “Serviço”)
            coleta, utiliza, armazena e protege os dados pessoais de seus
            usuários, conforme a legislação aplicável, incluindo a{" "}
            <strong>
              Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº
              13.709/2018)
            </strong>
            .
          </p>
        </Card>

        {/* 1. Identificação do Controlador */}
        <Card title="1. Identificação do Responsável pelo Tratamento de Dados">
          <p>
            O aplicativo alma4D é operado e administrado pela entidade
            responsável pelo Serviço (“Controlador”), responsável pelo
            tratamento de dados pessoais conforme a legislação aplicável,
            incluindo a LGPD.
          </p>
          <p className="mt-3">
            Contato para assuntos relacionados à privacidade e proteção de
            dados:
          </p>
          <p className="mt-2">
            <strong>E-mail: cliente@voss.digital</strong>
          </p>
        </Card>

        {/* 4. Coleta de Dados */}
        <Card title="4. Coleta de Dados">
          <p>O alma4D poderá coletar e tratar os seguintes dados pessoais:</p>

          <h3 className="mt-4 font-bold text-slate-900">
            4.1 Dados fornecidos diretamente pelo usuário
          </h3>
          <ul className="mt-3 list-disc pl-6">
            <li>Número de telefone</li>
            <li>Dados inseridos voluntariamente no uso da plataforma</li>
            <li>Preferências de uso e configurações pessoais</li>
          </ul>
          <p className="mt-3">
            O número de telefone é utilizado exclusivamente para autenticação
            via código OTP (One-Time Password), gerenciamento de acesso e
            segurança da conta.
          </p>
          <p className="mt-2">
            O número de telefone não é utilizado para campanhas publicitárias,
            marketing direto ou comercialização.
          </p>
          <p className="mt-2">
            Os códigos OTP utilizados para autenticação são temporários e não
            são armazenados como credenciais permanentes de acesso.
          </p>

          <h3 className="mt-5 font-bold text-slate-900">
            4.2 Dados coletados automaticamente
          </h3>
          <p className="mt-2">
            Durante a utilização do aplicativo, poderão ser coletadas
            informações técnicas e operacionais, incluindo:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Endereço IP</li>
            <li>Tipo de dispositivo</li>
            <li>Sistema operacional</li>
            <li>Modelo do aparelho</li>
            <li>Identificadores técnicos</li>
            <li>Logs de acesso</li>
            <li>Tempo de uso</li>
            <li>Dados de desempenho e falhas</li>
            <li>Interações dentro do aplicativo</li>
          </ul>

          <h3 className="mt-5 font-bold text-slate-900">4.3 Dados sensíveis</h3>
          <p className="mt-2">
            O alma4D não solicita intencionalmente dados sensíveis, conforme
            definição legal, salvo quando estritamente necessários para
            funcionalidades específicas e mediante consentimento adequado.
          </p>
        </Card>

        {/* 5. Finalidade */}
        <Card title="5. Finalidade do Tratamento de Dados">
          <p>Os dados pessoais poderão ser utilizados para:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Autenticar usuários</li>
            <li>Garantir segurança de acesso</li>
            <li>Prevenir fraudes e atividades indevidas</li>
            <li>Operar funcionalidades do aplicativo</li>
            <li>Melhorar desempenho e experiência do usuário</li>
            <li>Corrigir falhas técnicas</li>
            <li>Produzir análises estatísticas e operacionais</li>
            <li>Cumprir obrigações legais, regulatórias ou judiciais</li>
            <li>Responder solicitações administrativas ou judiciais</li>
          </ul>
          <p className="mt-3">
            O tratamento de dados ocorre com base nas hipóteses legais previstas
            na LGPD.
          </p>
        </Card>

        {/* 6. Base legal */}
        <Card title="6. Base Legal para Tratamento de Dados">
          <p>O tratamento de dados poderá ocorrer com fundamento em:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Consentimento do usuário</li>
            <li>Execução contratual</li>
            <li>Cumprimento de obrigação legal</li>
            <li>Exercício regular de direitos</li>
            <li>Legítimo interesse do controlador</li>
            <li>Proteção ao crédito, prevenção à fraude e segurança</li>
          </ul>
        </Card>

        {/* 7. Notificações */}
        <Card title="7. Notificações">
          <p>
            O aplicativo poderá enviar notificações relacionadas ao Serviço:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Lembretes configurados pelo usuário</li>
            <li>Informações relevantes sobre funcionalidades</li>
            <li>Alertas técnicos</li>
            <li>Comunicações relacionadas à conta</li>
            <li>Avisos operacionais e de segurança</li>
          </ul>
          <p className="mt-3">
            As notificações podem ser gerenciadas diretamente pelo usuário nas
            configurações do dispositivo.
          </p>
        </Card>

        {/* 8. Compartilhamento */}
        <Card title="8. Compartilhamento de Dados">
          <p>
            Os dados pessoais poderão ser compartilhados exclusivamente quando
            necessário para operação do Serviço, incluindo:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Prestadores de serviços tecnológicos</li>
            <li>Plataformas de autenticação</li>
            <li>Serviços de hospedagem e infraestrutura</li>
            <li>Ferramentas de monitoramento e análise</li>
            <li>
              Autoridades judiciais, administrativas ou regulatórias, quando
              exigido por lei
            </li>
          </ul>
          <p className="mt-3">Atualmente, o aplicativo pode utilizar:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              <strong>Firebase (Google LLC)</strong>
            </li>
            <li>
              <strong>Supabase</strong>
            </li>
          </ul>
          <p className="mt-3">
            Os dados poderão ser armazenados e processados fora do país de
            residência do usuário, respeitando requisitos legais de
            transferência internacional de dados.
          </p>
          <p className="mt-2">
            O alma4D não vende, aluga ou comercializa dados pessoais.
          </p>
        </Card>

        {/* 9. Segurança */}
        <Card title="9. Armazenamento e Segurança">
          <p>
            Os dados pessoais são armazenados em ambientes protegidos por
            medidas técnicas e organizacionais adequadas.
          </p>
          <p className="mt-3">Entre as medidas aplicadas podem estar:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Controle de acesso</li>
            <li>Criptografia</li>
            <li>Autenticação segura</li>
            <li>Monitoramento de atividades suspeitas</li>
            <li>Restrições internas de acesso</li>
          </ul>
          <p className="mt-3">
            Embora sejam adotadas boas práticas de segurança, nenhum sistema é
            absolutamente invulnerável.
          </p>
          <p className="mt-2">
            Em caso de incidente de segurança que possa acarretar risco ou dano
            relevante aos titulares de dados pessoais, medidas razoáveis poderão
            ser adotadas, incluindo comunicação às autoridades competentes e aos
            usuários afetados, conforme exigido pela legislação aplicável.
          </p>
          <p className="mt-2">
            O usuário reconhece que existe risco inerente ao uso de tecnologias
            digitais.
          </p>
        </Card>

        {/* 10. Retenção */}
        <Card title="10. Retenção de Dados">
          <p>
            Os dados pessoais serão armazenados apenas pelo período necessário
            para:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Cumprimento das finalidades previstas</li>
            <li>Atendimento a obrigações legais</li>
            <li>Exercício regular de direitos</li>
            <li>Auditoria, segurança e prevenção à fraude</li>
          </ul>
          <p className="mt-3">
            Após o término da necessidade de retenção, os dados poderão ser
            eliminados, anonimizados ou bloqueados.
          </p>
        </Card>

        {/* 11. Direitos */}
        <Card title="11. Direitos do Usuário">
          <p>Nos termos da legislação aplicável, o usuário poderá solicitar:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Confirmação da existência de tratamento</li>
            <li>Acesso aos dados pessoais</li>
            <li>Correção de informações incompletas</li>
            <li>Atualização de dados</li>
            <li>Exclusão de dados pessoais</li>
            <li>Portabilidade</li>
            <li>Anonimização ou bloqueio</li>
            <li>Revogação do consentimento</li>
            <li>Informações sobre compartilhamento de dados</li>
          </ul>
          <p className="mt-3">
            Solicitações poderão ser feitas por meio do contato:
          </p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
          <p className="mt-3">
            O controlador poderá solicitar comprovação de identidade antes do
            atendimento.
          </p>
        </Card>

        {/* 12. Exclusão */}
        <Card title="12. Exclusão de Conta e Dados">
          <p>
            O usuário poderá solicitar a exclusão definitiva da conta e dos
            dados pessoais a qualquer momento.
          </p>
          <p className="mt-3">
            A exclusão poderá não ocorrer imediatamente quando houver:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Obrigação legal de retenção</li>
            <li>Necessidade de cumprimento regulatório</li>
            <li>Prevenção a fraudes</li>
            <li>
              Exercício regular de direitos em processos administrativos,
              judiciais ou arbitrais
            </li>
          </ul>
          <p className="mt-3">
            Solicitações de exclusão devem ser encaminhadas para:
          </p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
        </Card>

        {/* 13. DPO / Encarregado */}
        <Card title="13. Encarregado pelo Tratamento de Dados (LGPD)">
          <p>
            Nos termos da LGPD, o alma4D poderá indicar formalmente um
            responsável pelo tratamento de dados pessoais (“Encarregado” ou “DPO
            — Data Protection Officer”), responsável pela comunicação entre:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Usuários titulares de dados</li>
            <li>Autoridades regulatórias</li>
            <li>O controlador do aplicativo</li>
          </ul>
          <p className="mt-3">
            O Encarregado poderá atuar no atendimento de solicitações
            relacionadas a:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Acesso aos dados</li>
            <li>Correção de informações</li>
            <li>Exclusão de dados</li>
            <li>Revogação de consentimento</li>
            <li>Dúvidas relacionadas à privacidade</li>
            <li>Incidentes de segurança envolvendo dados pessoais</li>
          </ul>

          <p className="mt-4 font-bold text-slate-900">Dados do responsável:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              Responsável pelo tratamento de dados:{" "}
              <strong>Renato Augusto Jessouroun Purchio – RG13774600</strong>
            </li>
            <li>
              E-mail de contato: <strong>cliente@voss.digital</strong>
            </li>
            <li>
              Canal de atendimento LGPD: <strong>cliente@voss.digital</strong>
            </li>
          </ul>
        </Card>

        {/* 24. Contato */}
        <Card title="Contato">
          <p>
            Para dúvidas, solicitações ou exercício de direitos relacionados à
            privacidade:
          </p>
          <p className="mt-2">
            <strong>E-mail: cliente@voss.digital</strong>
          </p>
        </Card>
      </section>
    </main>
  );
}
