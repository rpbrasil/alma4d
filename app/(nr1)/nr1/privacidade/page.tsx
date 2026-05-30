import BackFloatingButton from "@/components/public/BackFloatingButton";

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
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
          Política de Privacidade — alma4D
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          <em>Última atualização: Abril de 2026</em>
        </p>
      </header>

      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        <Card>
          <p>
            Esta Política de Privacidade descreve como o aplicativo{" "}
            <strong>alma4D</strong> (“Aplicativo”, “Plataforma” ou “Serviço”)
            coleta, utiliza, armazena, compartilha e protege dados pessoais, em
            conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD —
            Lei nº 13.709/2018). Também foi estruturada para dar transparência
            compatível com exigências de lojas, como o Google Play (divulgações
            de coleta/uso/compartilhamento) e a App Store (informações de
            privacidade do app).
            [1](https://developers.google.com/android/guides/play-data-disclosure)[2](https://play.google/developer-content-policy/)[3](https://developer.apple.com/app-store/app-privacy-details/)
          </p>
        </Card>

        <Card title="1. Controlador (Responsável) e Contato">
          <p>
            O aplicativo alma4D é operado e administrado pelo responsável pelo
            Serviço (“Controlador”), que define as finalidades e meios de
            tratamento de dados pessoais.
          </p>
          <p className="mt-3">
            Canal de contato para privacidade e proteção de dados:
          </p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
        </Card>

        <Card title="2. Escopo e Premissas de Tratamento">
          <ul className="mt-3 list-disc pl-6">
            <li>
              Esta Política se aplica ao uso do aplicativo e aos dados tratados
              no contexto do Serviço.
            </li>
            <li>
              O tratamento ocorre apenas pelo tempo e extensão necessários às
              finalidades descritas, observando bases legais aplicáveis.
            </li>
            <li>
              Caso você não concorde com esta Política, recomenda-se interromper
              o uso do aplicativo.
            </li>
          </ul>
        </Card>

        <Card title="3. Dados Coletados">
          <h3 className="mt-1 font-bold text-slate-900">
            3.1 Dados fornecidos diretamente pelo usuário
          </h3>
          <ul className="mt-3 list-disc pl-6">
            <li>Número de telefone</li>
            <li>Dados inseridos voluntariamente durante o uso do Serviço</li>
            <li>Preferências e configurações pessoais</li>
          </ul>
          <p className="mt-3">
            O número de telefone é utilizado exclusivamente para autenticação
            via código OTP (One-Time Password), gerenciamento de acesso e
            segurança da conta. Os códigos OTP são temporários e não são
            armazenados como credenciais permanentes.
          </p>
          <p className="mt-2">
            O número de telefone não é utilizado para marketing, publicidade,
            prospecção comercial ou envio de comunicações promocionais.
          </p>

          <h3 className="mt-5 font-bold text-slate-900">
            3.2 Dados coletados automaticamente
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

          <h3 className="mt-5 font-bold text-slate-900">3.3 Dados sensíveis</h3>
          <p className="mt-2">
            O alma4D não solicita intencionalmente dados sensíveis, salvo quando
            estritamente necessários para funcionalidades específicas e mediante
            consentimento adequado, conforme a legislação aplicável.
          </p>
        </Card>

        <Card title="4. Finalidades do Tratamento">
          <p>Os dados pessoais poderão ser utilizados para:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Autenticar usuários e administrar acesso</li>
            <li>Garantir segurança e prevenção a fraudes</li>
            <li>Operar funcionalidades do aplicativo</li>
            <li>Manter, proteger e melhorar o Serviço</li>
            <li>Diagnosticar falhas e melhorar desempenho</li>
            <li>Produzir análises estatísticas e operacionais</li>
            <li>Cumprir obrigações legais, regulatórias ou judiciais</li>
            <li>Responder solicitações administrativas ou judiciais</li>
          </ul>
        </Card>

        <Card title="5. Bases Legais (LGPD)">
          <p>O tratamento de dados poderá ocorrer com fundamento em:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Consentimento do usuário (quando aplicável)</li>
            <li>Execução de contrato ou procedimentos preliminares</li>
            <li>Cumprimento de obrigação legal ou regulatória</li>
            <li>Exercício regular de direitos</li>
            <li>Legítimo interesse do controlador</li>
            <li>Prevenção à fraude e segurança do titular/serviço</li>
          </ul>
        </Card>

        <Card title="6. Compartilhamento de Dados e Operadores">
          <p>
            Os dados pessoais podem ser compartilhados exclusivamente quando
            necessário para operação do Serviço, com fornecedores e parceiros
            tecnológicos (“Operadores”), incluindo:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              <strong>Firebase (Google LLC)</strong> — infraestrutura, segurança
              e notificações
            </li>
            <li>
              <strong>Supabase</strong> — autenticação e armazenamento de dados
            </li>
          </ul>
          <p className="mt-3">
            O alma4D não vende, aluga ou comercializa dados pessoais.
          </p>
        </Card>

        <Card title="7. Transferência Internacional">
          <p>
            Dados podem ser armazenados ou processados fora do país de
            residência do usuário, quando necessário para a operação do Serviço,
            respeitando os requisitos legais aplicáveis à transferência
            internacional.
          </p>
        </Card>

        <Card title="8. Notificações">
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
            As notificações podem ser gerenciadas diretamente nas configurações
            do dispositivo.
          </p>
        </Card>

        <Card title="9. Armazenamento e Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais adequadas para proteger
            os dados pessoais contra acessos não autorizados, perda, uso
            indevido ou divulgação indevida.
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
            Apesar das boas práticas, nenhum sistema é absolutamente
            invulnerável. Em caso de incidente relevante, medidas razoáveis
            poderão ser adotadas, incluindo comunicações exigidas por lei.
          </p>
        </Card>

        <Card title="10. Retenção de Dados">
          <p>
            Os dados pessoais serão armazenados apenas pelo período necessário
            para:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Cumprimento das finalidades descritas</li>
            <li>Atendimento a obrigações legais e regulatórias</li>
            <li>Exercício regular de direitos</li>
            <li>Auditoria, segurança e prevenção à fraude</li>
          </ul>
          <p className="mt-3">
            Após o término da necessidade de retenção, os dados poderão ser
            eliminados, anonimizados ou bloqueados, conforme aplicável.
          </p>
        </Card>

        <Card title="11. Direitos do Titular (LGPD)">
          <p>
            Nos termos do art. 18 da LGPD, o titular pode solicitar, entre
            outros direitos: confirmação da existência de tratamento, acesso,
            correção, anonimização/bloqueio/eliminação, portabilidade,
            informação sobre compartilhamento e revogação do consentimento.
            [4](https://www.gov.br/mds/pt-br/acesso-a-informacao/lgpd/direitos-do-titular)
          </p>
          <p className="mt-3">Solicitações podem ser encaminhadas para:</p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
          <p className="mt-3">
            Para segurança, o controlador poderá solicitar comprovação de
            identidade antes do atendimento.
          </p>
        </Card>

        <Card title="12. Exclusão de Conta e Dados">
          <p>
            O usuário pode solicitar a exclusão definitiva da conta e de seus
            dados pessoais a qualquer momento.
          </p>
          <p className="mt-3">
            A exclusão poderá não ocorrer imediatamente quando houver:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Obrigação legal de retenção</li>
            <li>Necessidade de cumprimento regulatório</li>
            <li>Prevenção a fraudes e segurança</li>
            <li>Exercício regular de direitos em processos</li>
          </ul>
          <p className="mt-3">Solicitações devem ser encaminhadas para:</p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
        </Card>

        <Card title="13. Encarregado pelo Tratamento de Dados (LGPD)">
          <p>
            Responsável:{" "}
            <strong>Renato Augusto Jessouroun Purchio – RG 13774600</strong>
            <br />
            E-mail: <strong>cliente@voss.digital</strong>
            <br />
            Canal de atendimento LGPD: <strong>cliente@voss.digital</strong>
          </p>
        </Card>

        <Card title="14. Crianças e Adolescentes">
          <p>
            O aplicativo não é direcionado a menores de idade. Quando aplicável,
            o uso por menor deve ocorrer com autorização e supervisão de
            responsável legal, conforme a legislação aplicável.
          </p>
        </Card>

        <Card title="15. Alterações nesta Política">
          <p>
            Esta Política poderá ser atualizada periodicamente. Recomendamos que
            o usuário revise este conteúdo sempre que necessário.
          </p>
          <p className="mt-2 italic">Última atualização: Abril de 2026</p>
        </Card>

        <Card title="16. Lei Aplicável e Foro">
          <p>Esta Política é regida pela legislação brasileira.</p>
          <p className="mt-2">
            Eventuais controvérsias relacionadas a esta Política serão tratadas,
            sempre que possível, no foro do domicílio do controlador do
            aplicativo,
            <strong> salvo disposição legal em contrário</strong>.
          </p>
        </Card>

        <Card title="17. Contato">
          <p>
            Para dúvidas, solicitações ou exercício de direitos relacionados à
            privacidade:
          </p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
        </Card>
      </section>
      <BackFloatingButton />
    </main>
  );
}
