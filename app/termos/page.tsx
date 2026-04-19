export const metadata = {
  title: "Termos de Uso | alma4D",
  description: "Termos e Condições de Uso do aplicativo alma4D",
};

export default function TermosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
          Termos de Uso
        </h1>
      </header>

      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        {/* Introdução */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <p>
            Estes Termos de Uso regulam o acesso e a utilização do aplicativo
            <strong> alma4D</strong>. Ao acessar ou utilizar o aplicativo, o
            usuário declara estar ciente e de acordo com as condições aqui
            estabelecidas.
          </p>
        </article>

        {/* Conta e acesso */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            👤 Conta e Acesso
          </h2>
          <p>
            O acesso ao aplicativo ocorre por meio de autenticação via número de
            telefone, utilizando código de uso único (OTP). O usuário é
            responsável por manter a confidencialidade de suas credenciais e
            pelas atividades realizadas em sua conta.
          </p>
        </article>

        {/* IA */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🤖 Uso de Sistemas Automatizados e Inteligência Artificial
          </h2>
          <p>
            O aplicativo pode utilizar sistemas automatizados, incluindo
            recursos de inteligência artificial, com a finalidade de oferecer
            sugestões, respostas ou análises de apoio ao usuário.
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              As informações fornecidas possuem caráter informativo e
              orientativo
            </li>
            <li>
              Não constituem aconselhamento médico, psicológico, jurídico ou
              profissional
            </li>
            <li>Não substituem a avaliação de profissionais qualificados</li>
            <li>
              A tomada de decisões é de exclusiva responsabilidade do usuário
            </li>
          </ul>
        </article>

        {/* Responsabilidade */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🧭 Responsabilidade do Usuário
          </h2>
          <p>
            O usuário é responsável por avaliar criticamente as informações
            apresentadas no aplicativo e, quando necessário, buscar orientação
            especializada de profissionais devidamente habilitados.
          </p>
          <p className="mt-2">
            O alma4D não se responsabiliza por decisões tomadas com base nas
            informações disponibilizadas nem por serviços prestados por
            terceiros.
          </p>
          <p className="mt-2">
            É vedada a utilização do aplicativo para fins ilegais, abusivos,
            discriminatórios ou que violem direitos de terceiros.
          </p>
        </article>

        {/* Teste e assinatura */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            💳 Período de Teste e Assinaturas
          </h2>
          <p>
            O aplicativo pode oferecer um período de teste gratuito, durante o
            qual determinadas funcionalidades estarão disponíveis sem custo.
          </p>
          <p className="mt-2">
            Após o término do período de teste, o acesso completo poderá estar
            condicionado a uma assinatura ativa. Pagamentos e assinaturas são
            processados pela plataforma de distribuição utilizada (Google Play
            ou Apple App Store), estando sujeitos aos seus respectivos termos.
          </p>
        </article>

        {/* Limitação */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            ⚠️ Limitação de Responsabilidade
          </h2>
          <p>
            O aplicativo é fornecido “como está”, sem garantias de funcionamento
            ininterrupto ou livre de erros. O alma4D poderá, a seu critério,
            modificar, suspender ou descontinuar funcionalidades do aplicativo.
          </p>
        </article>

        {/* Alterações */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🔄 Alterações nos Termos
          </h2>
          <p>
            Estes Termos de Uso podem ser atualizados periodicamente. O uso
            contínuo do aplicativo após alterações implica a aceitação das novas
            versões.
          </p>
          <p className="mt-2 italic">Última atualização: Abril de 2026</p>
        </article>
      </section>
    </main>
  );
}
