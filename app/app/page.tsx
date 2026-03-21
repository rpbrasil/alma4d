import Link from "next/link";
import Image from "next/image";

export default function AppPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* ================= HERO ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            O Aplicativo alma4D
          </h1>

          <p className="text-xl text-foreground/80 leading-relaxed">
            Inteligência aplicada ao cuidado com pessoas e à gestão de riscos
            psicossociais
          </p>

          <p className="text-foreground/70 leading-relaxed">
            O alma4D é uma plataforma digital criada para ajudar organizações a
            cuidar melhor das pessoas, entender o ambiente de trabalho e tomar
            decisões responsáveis, com base em dados confiáveis, éticos e
            alinhados às exigências legais.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/download"
              className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
            >
              Baixar o App
            </Link>

            <Link
              href="/livro"
              className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
            >
              Conhecer o Livro
            </Link>
          </div>
        </div>

        {/* Mockup / vídeo */}
        <div className="aspect-video rounded-xl bg-surface-muted flex items-center justify-center text-foreground/50">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/images/kindlePhoto2.jpg"
              alt="alma4D"
              width={400}
              height={400}
              sizes="(max-width: 640px) 120px, (max-width: 768px) 140px, (max-width: 1024px) 170px, 220px"
              className="object-contain"
              priority
            />
          </Link>
        </div>
      </section>

      {/* ================= O QUE O APP FAZ ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Versões do Aplicativo</h2>
          <p className="text-foreground/70">
            No melhor conceito de ecossistema, o aplicativo contempla todos os
            componentes e tem versões para todos: indivíduos, profissionais e
            empresas.
          </p>
        </div>
        {/* 1. A Figura (Infográfico) - Otimizado para Visibilidade Máxima */}
        <div className="w-full bg-surface-muted rounded-3xl p-6 md:p-12 shadow-inner border border-border/50 flex items-center justify-center">
          <Link
            href="/"
            className="w-full flex items-center justify-center hover:opacity-95 transition-opacity"
          >
            <Image
              src="/images/alma4D_usuarios.png" // Certifique-se de que esta é a imagem do infográfico completo
              alt="Infográfico Ciclo de Inteligência e Cuidado Organizacional alma4D"
              // SE VOCÊ MANTER A IMAGEM QUADRADA (2038x1950):
              width={1000} // Reduzimos o width base para não exagerar no download
              height={957} // Mantendo a proporção quadrada aproximada
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1000px"
              className="object-contain w-full h-auto max-h-[70vh]"
              priority
            />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Individual</h3>
            <p className="text-foreground/70">
              Para a pessoa física, o aplicativo atua como um companheiro de
              viagem: faz a navegação estratégica, registra o percurso, traz
              análises, insights úteis e sugestões inteligentes, modeladas para
              seu perfil.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Profissional</h3>
            <p className="text-foreground/70">
              Médicos, Psicólogos, Terapêutas, Consultores podem acompanhar a
              jornada de seus clientes, acessar sua evolução ou permitir que
              estes marquem consultas ou reuniões diretamente em suas agendas.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Empresarial</h3>
            <p className="text-foreground/70">
              A empresa utiliza o aplicativo para seus Programas de bem-estar e
              qualidade de vida e resolve o mapeamento de risco psicossocial,
              inclusive com emissão de relatórios, conforme previsto na
              legislação.
            </p>
          </div>
        </div>
      </section>

      {/* ================= GALERIA / VÍDEO ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">
            Uma experiência segura desde o primeiro acesso
          </h2>
          <div className="text-foreground/70">
            Ao entrar no aplicativo, cada usuário acessa apenas o que faz
            sentido para o seu papel. Isso garante confidencialidade, clareza e
            uso responsável das informações.{" "}
          </div>
          <ul className="list-disc list-inside flex flex-col gap-2 text-foreground/80">
            <li>
              <strong>Administradores:</strong> têm visão ampla e estratégica.
            </li>
            <li>
              <strong>Clientes:</strong> visualizam exclusivamente seus próprios
              dados.
            </li>
            <li>
              <strong>Usuários com permissão:</strong> recebem acesso protegido.
            </li>
          </ul>{" "}
          <div className="text-foreground/70">
            Tudo é feito de forma automática, sem complicações e sem risco de
            exposição indevida.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
            <Link
              href="/"
              className="flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Image
                src="/images/alma4d_fluxo_site_semtxt.png"
                alt="Fluxo do método alma4D"
                width={1407}
                height={791}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1100px"
                className="w-full h-auto object-contain"
                priority
              />
            </Link>
          </div>

          <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/images/olhoClinicoPad2.jpeg"
                alt="alma4D"
                width={300}
                height={300}
                sizes="(max-width: 640px) 120px, (max-width: 768px) 140px, (max-width: 1024px) 170px, 220px"
                className="object-contain"
                priority
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= CONEXÃO COM O MÉTODO ================= */}
      <section className="flex flex-col items-center gap-16 py-16 px-4 md:px-8 max-w-7xl mx-auto">
        {/* 2. Conteúdo de Texto Centralizado Abaixo */}
        <div className="flex flex-col gap-12 text-center items-center max-w-5xl mx-auto py-8">
          {/* Cabeçalho da Seção */}
          <div className="flex flex-col gap-6 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-brand tracking-tight leading-tight">
              Visão clara da realidade organizacional
            </h2>
            <p className="text-xl md:text-2xl text-foreground/80 font-medium leading-relaxed">
              Mais do que um aplicativo, o{" "}
              <span className="text-brand">alma4D</span> é um
              <strong> instrumento estratégico de apoio à gestão</strong>, que
              transforma informações complexas em{" "}
              <strong>insights claros</strong>, relatórios profissionais para{" "}
              <strong>planos de ação concretos</strong>.
            </p>
          </div>

          {/* Grid de Diferenciais */}
          <div className="grid md:grid-cols-2 gap-10 text-left">
            {/* Coluna 1: Diagnóstico e Visualização */}
            <div className="bg-surface p-8 rounded-2xl border border-border flex flex-col gap-4 shadow-sm">
              <h3 className="text-2xl font-bold text-brand flex items-center gap-2">
                <span className="w-2 h-8 bg-brand rounded-full inline-block"></span>
                Diagnóstico e Inteligência
              </h3>
              <p className="text-foreground/70 mb-4">
                O coração do alma4D organiza e interpreta{" "}
                <strong>dados psicossociais</strong> de forma prática e visual:
              </p>
              <ul className="space-y-3.5 text-foreground/80">
                {[
                  "Indicadores de risco baixos, médios e altos.",
                  "Visão estruturada por área, departamento e setor.",
                  "Destaque automático para pontos críticos.",
                  "Dados sempre agregados e anônimos (LGPD).",
                ].map((item, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <span className="text-brand font-bold mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna 2: Relatórios e Conformidade */}
            <div className="bg-surface p-8 rounded-2xl border border-border flex flex-col gap-4 shadow-sm">
              <h3
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: "#019499" }}
              >
                <span
                  className="w-2 h-8 rounded-full inline-block"
                  style={{ backgroundColor: "#019499" }}
                ></span>
                Gestão e Conformidade
              </h3>
              <p className="text-foreground/70 mb-4">
                Gere <strong>documentação técnica</strong> completa em PDF com
                poucos cliques, pronta para uso institucional:
              </p>
              <ul className="space-y-3.5 text-foreground/80">
                {[
                  "Alinhado às exigências do GRO / PGR (NR‑1).",
                  "Inventário de Riscos e Plano de Ação estruturado.",
                  "Compartilhamento fácil com SESMT, RH e Auditorias.",
                  "Apoio jurídico e de compliance corporativo.",
                ].map((item, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <span
                      className="font-bold mt-0.5"
                      style={{ color: "#019499" }}
                    >
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Botão de Ação Final Otimizado */}
          <Link
            href="/metodo"
            className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
          >
            Conhecer o Método Completo
          </Link>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-border bg-surface p-10 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">A experiência completa do alma4D</h2>

        <p className="text-foreground/70 max-w-2xl">
          O aplicativo alcança seu potencial máximo quando utilizado em conjunto
          com o livro que fundamenta o método.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/oferta"
            className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
          >
            Livro + App
          </Link>

          <Link
            href="/download"
            className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
          >
            Baixar o App
          </Link>
        </div>
      </section>
    </div>
  );
}
