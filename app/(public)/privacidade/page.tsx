export const metadata = {
  title: "Política de Privacidade | alma4D",
  description:
    "Política de Privacidade e tratamento de dados do aplicativo alma4D",
};

export default function PrivacidadePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
          Política de Privacidade
        </h1>
      </header>

      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        {/* Introdução */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <p>
            Esta Política de Privacidade descreve como o aplicativo{" "}
            <strong>alma4D</strong>
            coleta, utiliza, armazena e protege os dados pessoais de seus
            usuários.
          </p>
        </article>

        {/* Coleta */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📥 Coleta de Dados
          </h2>
          <p>Podemos coletar os seguintes dados pessoais:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              Número de telefone, utilizado exclusivamente para autenticação via
              código de uso único (OTP)
            </li>
            <li>Dados básicos de uso e navegação no aplicativo</li>
            <li>
              Informações fornecidas voluntariamente pelo usuário durante o uso
              do aplicativo
            </li>
          </ul>
          <p className="mt-2">
            O número de telefone não é utilizado para marketing, publicidade ou
            contato comercial.
          </p>
        </article>

        {/* Uso */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🧠 Uso dos Dados
          </h2>
          <p>Os dados coletados podem ser utilizados para:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Autenticação segura de usuários</li>
            <li>Funcionamento e melhoria do aplicativo</li>
            <li>Análises operacionais e de desempenho</li>
            <li>Segurança e prevenção contra fraudes</li>
          </ul>
          <p className="mt-2">
            O aplicativo não utiliza dados pessoais para fins discriminatórios,
            abusivos ou ilícitos.
          </p>
        </article>

        {/* Notificações */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🔔 Notificações
          </h2>
          <ul className="mt-3 list-disc pl-6">
            <li>Lembretes configurados pelo próprio usuário</li>
            <li>Atualizações e informações relevantes sobre o aplicativo</li>
            <li>Mensagens importantes relacionadas ao uso do serviço</li>
          </ul>
          <p className="mt-2">
            As notificações podem ser gerenciadas ou desativadas a qualquer
            momento nas configurações do dispositivo.
          </p>
        </article>

        {/* Compartilhamento */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🤝 Compartilhamento de Dados
          </h2>
          <p>
            Os dados pessoais podem ser compartilhados exclusivamente com
            provedores de tecnologia essenciais ao funcionamento do aplicativo,
            incluindo:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              <strong>Firebase (Google LLC)</strong> – infraestrutura e
              notificações
            </li>
            <li>
              <strong>Supabase</strong> – autenticação e armazenamento de dados
            </li>
          </ul>
          <p className="mt-2">O alma4D não vende dados pessoais a terceiros.</p>
        </article>

        {/* Segurança */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🔒 Armazenamento e Segurança
          </h2>
          <p>
            Os dados são armazenados em ambientes seguros, protegidos por
            medidas técnicas e administrativas adequadas para prevenir acessos
            não autorizados, perda ou uso indevido.
          </p>
        </article>

        {/* Retenção */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📅 Retenção de Dados
          </h2>
          <p>
            Os dados pessoais são mantidos apenas pelo tempo necessário para
            cumprir as finalidades descritas nesta política ou conforme exigido
            por lei.
          </p>
        </article>

        {/* Direitos */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🧾 Seus Direitos
          </h2>
          <ul className="mt-3 list-disc pl-6">
            <li>Confirmar a existência de tratamento de dados pessoais</li>
            <li>Acessar, corrigir ou excluir seus dados</li>
            <li>Revogar consentimentos concedidos</li>
          </ul>
          <p className="mt-2">
            Para exercer seus direitos, utilize os canais de suporte disponíveis
            no aplicativo.
          </p>
        </article>
        {/* Exclusão de Dados */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🗑️ Exclusão de Dados
          </h2>
          <p>
            O usuário pode solicitar a exclusão definitiva de seus dados
            pessoais a qualquer momento.
          </p>
          <p className="mt-2">
            Para solicitar a exclusão de dados, entre em contato pelo e-mail:
            <br />
            <strong>cliente@voss.digital</strong>
          </p>
          <p className="mt-2">
            A solicitação será analisada e processada em conformidade com a
            legislação aplicável, podendo haver retenção temporária de
            determinados dados quando exigido por obrigações legais ou
            regulatórias.
          </p>
        </article>
        {/* Alterações */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📌 Alterações nesta Política
          </h2>
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente.
            Recomendamos que o usuário revise este conteúdo sempre que
            necessário.
          </p>
          <p className="mt-2 italic">Última atualização: Abril de 2026</p>
        </article>
      </section>
    </main>
  );
}
