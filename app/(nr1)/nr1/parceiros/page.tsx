"use client";

import Image from "next/image";
import Link from "next/link";

export default function ParceirosNR1Page() {
  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* 🔙 VOLTAR */}
        <div className="mb-6">
          <Link
            href="/nr1/mapeamento-riscos-psicossociais"
            className="inline-flex items-center gap-3 text-sm text-slate-500 hover:text-brand transition"
          >
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={48}
              height={48}
              className="opacity-90"
              priority
            />
            ← Voltar para NR‑1 Home
          </Link>
        </div>

        {/* 🧠 HEADER PRINCIPAL */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand tracking-tight">
            Programa de Parceiros alma4D
          </h1>

          <p className="max-w-2xl mx-auto text-slate-600 text-sm sm:text-base">
            Faça parte da nossa rede e leve a avaliação de riscos psicossociais
            da NR‑1 para empresas de forma rápida, segura e com alta qualidade.
          </p>

          {/* BADGES */}
          <div className="flex justify-center gap-6 text-xs text-slate-500 pt-2">
            <span>✔ Sem burocracia</span>
            <span>✔ Modelo flexível</span>
            <span>✔ Ganhos recorrentes</span>
          </div>
        </div>

        {/* 💡 CARD PRINCIPAL */}
        <div className="mt-10 rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-brand">
            Parceria NR‑1
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Estamos ampliando nossa rede de parceiros para conectar empresas à
            solução de avaliação psicossocial conforme a NR‑1 — com agilidade,
            segurança e suporte especializado.
          </p>

          {/* 🎯 PÚBLICO */}
          <div className="text-sm text-slate-600 space-y-2">
            <p>✔ Associações e entidades</p>
            <p>✔ Consultores e profissionais de SST</p>
            <p>✔ Corretores e parceiros comerciais</p>
          </div>

          {/* 🔄 MODELO FLEX */}
          <div className="rounded-xl bg-surface-muted border border-border p-4 text-xs text-slate-500 leading-relaxed">
            Você pode escolher entre receber comissão pelas indicações ou
            oferecer o benefício como desconto direto ao cliente final.
          </div>

          {/* 🚀 CTA PRINCIPAL */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://alma4d.com.br/contato"
              className="h-11 px-6 rounded-xl bg-brand text-white font-semibold flex items-center justify-center
              hover:brightness-95 active:brightness-90 transition"
            >
              Falar com a equipe
            </a>

            <a
              href="https://wa.me/55XXXXXXXXXX"
              className="h-11 px-6 rounded-xl border border-border text-brand font-semibold flex items-center justify-center
              hover:bg-surface-muted transition"
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* ✨ DIFERENCIAL / PROVA */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-xs text-slate-500">
            ✔ Solução alinhada à NR‑1 • ✔ Metodologia validada • ✔ LGPD
          </p>

          <p className="text-xs text-slate-400">
            A alma4D já apoia empresas na gestão de riscos psicossociais com
            tecnologia e metodologia própria.
          </p>
        </div>
      </div>
    </main>
  );
}
