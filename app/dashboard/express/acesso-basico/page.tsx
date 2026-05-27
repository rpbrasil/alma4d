"use client";

export default function ExpressAcessoBasicoPage() {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-sm p-5 sm:p-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">
            Acesso inicial
          </h1>
          <p className="text-sm text-foreground/60">
            Antes de continuar, revise as diretrizes de uso e proteção de dados.
          </p>
        </header>

        <section className="space-y-3 text-sm text-foreground/80 leading-relaxed">
          <div>
            <h2 className="font-medium text-foreground">
              Proteção de dados (LGPD)
            </h2>
            <p>
              Seus dados são tratados com base na Lei Geral de Proteção de Dados
              (LGPD). As informações coletadas são utilizadas exclusivamente
              para fins operacionais e não são compartilhadas sem consentimento
              ou base legal aplicável.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-foreground">
              Sigilo e responsabilidade
            </h2>
            <p>
              O acesso à plataforma é individual e intransferível. É
              responsabilidade do usuário manter suas credenciais seguras e não
              compartilhar dados sensíveis com terceiros.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-foreground">Uso adequado</h2>
            <p>
              As informações disponibilizadas devem ser usadas apenas para os
              fins autorizados pela organização. Qualquer uso indevido poderá
              resultar em bloqueio de acesso.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-foreground">Canal de denúncias</h2>
            <p>
              Caso identifique qualquer uso indevido ou comportamento suspeito,
              entre em contato pelo canal de denúncias da sua organização.
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              (Você pode personalizar aqui com e-mail, link externo ou
              formulário)
            </p>
          </div>
        </section>

        <footer className="pt-3">
          <button
            onClick={() => {
              // fallback simples por enquanto
              window.location.href = "/dashboard/express";
            }}
            className="w-full h-10 rounded-xl bg-brand text-white text-sm font-medium transition hover:opacity-95 active:scale-[0.99]"
          >
            Entendi e continuar
          </button>
        </footer>
      </div>
    </div>
  );
}
