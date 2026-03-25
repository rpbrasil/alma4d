export const metadata = {
  title: "Termos de Uso | alma4D",
  description: "Termos e Condições de Uso do aplicativo alma4D",
};

export default function TermosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}

      <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
        Termos de Uso
      </h1>
      {/* Se quiser, pode colocar o logo aqui */}

      {/* Card base */}
      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        {/* Termo Geral */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📜 Termos e Condições de Uso
          </h2>
          <p>
            Ao utilizar este aplicativo, você concorda com os seguintes termos e
            condições de uso. Estes termos regem o relacionamento entre você
            (usuário) e os responsáveis pelo aplicativo, garantindo
            transparência, segurança e conformidade com a legislação vigente,
            incluindo:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
            <li>
              Lei Geral de Proteção de Dados Pessoais – LGPD (Lei nº
              13.709/2018)
            </li>
          </ul>
        </article>

        {/* IA */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🤖 Uso de Inteligência Artificial
          </h2>
          <p>
            O aplicativo pode utilizar agentes de inteligência artificial para
            fornecer informações, sugestões, respostas e interações
            automatizadas.
          </p>
          <p className="mt-2">
            Embora busquemos oferecer conteúdos úteis e relevantes, não
            garantimos:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Veracidade</li>
            <li>Precisão</li>
            <li>Atualidade</li>
            <li>Consistência</li>
          </ul>
          <p className="mt-2">
            As respostas não devem ser interpretadas como aconselhamento
            profissional, jurídico, médico, financeiro ou técnico.
          </p>
        </article>

        {/* Responsabilidade */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🧭 Responsabilidade do Usuário
          </h2>
          <p>
            O usuário é responsável por avaliar criticamente as informações
            apresentadas e, quando necessário, buscar orientação especializada.
          </p>
          <p className="mt-2">É proibido utilizar o aplicativo para:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Atividades ilegais</li>
            <li>Conteúdos ofensivos ou discriminatórios</li>
            <li>Violações de direitos de terceiros</li>
          </ul>
        </article>

        {/* Atualizações */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🔄 Atualizações dos Termos
          </h2>
          <p>
            Podemos atualizar estes termos periodicamente. Recomendamos que você
            revise esta página com frequência para estar ciente de eventuais
            alterações.
          </p>
        </article>

        {/* Aceite (informativo) */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            ✅ Aceite dos Termos
          </h2>
          <p>
            O aceite destes termos é realizado durante o cadastro no site ou no
            aplicativo. Ao continuar utilizando nossos serviços, você declara
            estar ciente e de acordo com todos os termos apresentados acima.
          </p>
        </article>
      </section>
    </main>
  );
}
