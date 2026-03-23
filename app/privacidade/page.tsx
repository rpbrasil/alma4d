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
        {/* Coleta */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📥 Coleta de Dados
          </h2>
          <p>
            Ao utilizar o aplicativo, podemos coletar os seguintes dados
            pessoais:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Nome, e-mail e informações de login</li>
            <li>Dados de uso e navegação no aplicativo</li>
            <li>
              Informações fornecidas voluntariamente em formulários ou pesquisas
            </li>
          </ul>
          <p className="mt-2">
            A coleta ocorre com base no seu consentimento ou para cumprimento de
            obrigações legais e contratuais.
          </p>
        </article>

        {/* Uso */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🧠 Uso dos Dados
          </h2>
          <p>Os dados coletados são utilizados para:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Melhorar a experiência do usuário</li>
            <li>Personalizar conteúdos e funcionalidades</li>
            <li>Realizar análises estatísticas e operacionais</li>
            <li>Garantir segurança e prevenção contra fraudes</li>
          </ul>
          <p className="mt-2">
            Não utilizamos seus dados para fins discriminatórios ou abusivos.
          </p>
        </article>

        {/* Segurança */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🔒 Armazenamento e Segurança
          </h2>
          <p>
            Seus dados são armazenados em ambientes seguros e protegidos por
            medidas técnicas e administrativas adequadas. Adotamos práticas de
            segurança da informação para evitar acessos não autorizados,
            vazamentos ou alterações indevidas.
          </p>
        </article>

        {/* Compartilhamento */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🤝 Compartilhamento de Dados
          </h2>
          <p>Seus dados não são compartilhados com terceiros, exceto:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Quando exigido por lei ou ordem judicial</li>
            <li>
              Com parceiros que atuam na operação do app, sob cláusulas de
              confidencialidade
            </li>
            <li>Com seu consentimento explícito</li>
          </ul>
        </article>

        {/* Retenção */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📅 Retenção de Dados
          </h2>
          <p>
            Os dados são mantidos pelo tempo necessário para cumprir as
            finalidades descritas nesta política ou conforme exigido por
            obrigações legais.
          </p>
        </article>

        {/* Direitos */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            🧾 Seus Direitos
          </h2>
          <p>Você tem direito a:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Confirmar a existência de tratamento de dados</li>
            <li>Acessar, corrigir ou excluir seus dados pessoais</li>
            <li>Solicitar anonimização ou portabilidade</li>
            <li>Revogar consentimento a qualquer momento</li>
          </ul>
          <p className="mt-2">
            Para exercer seus direitos, utilize os canais de suporte disponíveis
            no aplicativo.
          </p>
        </article>

        {/* Alterações */}
        <article className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-extrabold text-brand mb-2">
            📌 Alterações nesta Política
          </h2>
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente.
            Recomendamos que você revise esta página regularmente para estar
            ciente de eventuais mudanças.
          </p>
        </article>
      </section>
    </main>
  );
}
