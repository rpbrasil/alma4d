"use client";

import Image from "next/image";
import Link from "next/link";
import { Users, Network, HeartHandshake, GraduationCap } from "lucide-react";

export default function ParceirosAlma4DPage() {
  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* VOLTAR */}
        <div className="mb-8">
          <Link
            href="/nr1/mapeamento-riscos-psicossociais"
            className="inline-flex items-center gap-3 text-sm text-slate-500 hover:text-brand transition"
          >
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={64}
              height={64}
              className="opacity-90"
              priority
            />
            ← Voltar
          </Link>
        </div>

        {/* HEADER */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand tracking-tight">
            Programa de Parcerias alma4D
          </h1>

          <p className="max-w-2xl mx-auto text-slate-600 text-sm sm:text-base leading-relaxed">
            Construímos parcerias para ampliar o cuidado com pessoas e integrar
            tecnologia, método e operação em contextos reais — com foco em
            bem‑estar, indicadores consistentes e aplicação prática.
          </p>

          {/* BADGES */}
          <div className="flex justify-center gap-6 text-xs text-slate-500 pt-2">
            <span>✔ Parcerias consistentes</span>
            <span>✔ Integração simples</span>
            <span>✔ Valor compartilhado</span>
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="mt-10 rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-brand">
            Construir juntos, com clareza e consistência
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Buscamos parceiros que agreguem valor por relacionamento,
            conhecimento ou execução. O modelo é flexível, com estrutura leve,
            alinhamento objetivo e foco em resultados sustentáveis.
          </p>

          {/* MINI FLOW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              {
                title: "Alinhamento",
                text: "Definição clara do formato da parceria e objetivos comuns.",
              },
              {
                title: "Estrutura",
                text: "Organização simples, respeitando contexto e governança.",
              },
              {
                title: "Execução",
                text: "Implementação com qualidade e evolução progressiva.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-surface-muted border border-border p-4"
              >
                <p className="text-sm font-semibold text-brand">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://alma4d.com.br/contato/"
              className="h-11 px-6 rounded-xl bg-brand text-white font-semibold flex items-center justify-center
              hover:bg-brand-secondary transition"
            >
              Falar com a equipe
            </a>

            <a
              href="/mapeamento-riscos-psicossociais"
              className="h-11 px-6 rounded-xl border border-border text-brand font-semibold flex items-center justify-center
              hover:bg-surface-muted transition"
            >
              Conhecer a solução
            </a>
          </div>
        </div>

        {/* CARDS DE PARCERIA */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: Users,
              title: "Associações e Corretores",
              text: "Para quem tem capilaridade e relacionamento ativo, estruturamos parcerias baseadas em expansão de valor para associados.",
            },
            {
              icon: Network,
              title: "Empresas para Affinity",
              text: "Integração ao seu procurement para participação em RFQs: Permita que coloquemos propostas de valor na sua estrategia de compras.",
            },
            {
              icon: HeartHandshake,
              title: "Consultorias de Saúde e Bem‑Estar",
              text: "Co-criação de projetos com especialistas e consultorias, combinando metodologia, acompanhamento e execução integrada ao contexto do cliente.",
            },
            {
              icon: GraduationCap,
              title: "Terceiro Setor Educacional",
              text: "Parcerias com foco em formação, impacto e acesso ao cuidado, com projetos estruturados e linguagem adaptada aos públicos atendidos.",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="group rounded-2xl bg-surface border border-border p-6 shadow-sm space-y-4 
                hover:border-brand-highlight hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand/5 text-brand">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-sm font-semibold text-brand">
                    {item.title}
                  </h3>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed min-h-72px">
                  {item.text}
                </p>

                <div className="pt-2">
                  <a
                    href="https://alma4d.com.br/contato/"
                    className="inline-flex h-10 px-5 rounded-xl text-sm font-semibold items-center justify-center 
                    bg-brand-secondary text-white hover:opacity-90 transition"
                  >
                    Fale conosco
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="mt-10 text-center space-y-3">
          <p className="text-xs text-slate-500">
            ✔ Cuidado aplicado • ✔ Inteligência de dados • ✔ Conformidade
          </p>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            O alma4D integra método e tecnologia para apoiar pessoas e
            organizações com consistência, clareza e responsabilidade.
          </p>
        </div>
      </div>
    </main>
  );
}
