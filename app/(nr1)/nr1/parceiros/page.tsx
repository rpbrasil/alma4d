"use client";

import Image from "next/image";
import Link from "next/link";

//import { useState } from "react";

//type Modelo = "commission" | "discount";

export default function ParceirosNR1Page() {
  // const [form, setForm] = useState({
  //   nome: "",
  //   email: "",
  //   telefone: "",
  //   modelo: "" as Modelo | "",
  //   percentual: "",
  //   aceiteTermos: false,
  // });

  // function validar(): string | null {
  //   if (!form.nome.trim()) return "Informe seu nome completo.";
  //   if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  //     return "Informe um e‑mail válido.";
  //   if (!form.telefone.match(/^\+?[0-9()\-\s]{8,}$/))
  //     return "Informe um telefone válido.";
  //   if (!form.modelo)
  //     return "Selecione o modelo de parceria (comissão ou desconto).";

  //   const percentual = Number(form.percentual);
  //   if (isNaN(percentual) || percentual <= 0 || percentual > 50)
  //     return "O percentual deve ser entre 1% e 50%.";

  //   if (!form.aceiteTermos)
  //     return "É necessário aceitar os termos para continuar.";

  //   return null;
  // }

  // async function handleSubmit(e: React.FormEvent) {
  //   e.preventDefault();
  //   setErrorMsg(null);

  //   const erro = validar();
  //   if (erro) {
  //     setErrorMsg(erro);
  //     return;
  //   }

  //   try {
  //     setState("submitting");

  //     // 🔜 Integração futura: salvar parceiro no Supabase
  //     await new Promise((res) => setTimeout(res, 1200));

  //     setState("success");
  //   } catch {
  //     setState("error");
  //     setErrorMsg("Erro ao enviar os dados. Tente novamente.");
  //   }
  // }

  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-3xl mx-auto px-6 py-6">
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
        {/* ================= HEADER ================= */}
        <div className="text-center">
          <h1 className="mt-4 text-3xl font-extrabold text-brand">
            Programa de Parceiros alma4D
          </h1>
          <p className="mt-4 text-slate-600">
            Cadastre‑se como parceiro para indicar empresas no mapeamento de
            riscos psicossociais conforme a NR‑1, utilizando seu cupom
            exclusivo.
          </p>
        </div>

        <div className="mt-10 max-w-xl mx-auto text-center space-y-6">
          {/* TÍTULO */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
            Parceria NR‑1
          </h1>

          {/* DESCRIÇÃO */}
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Estamos ampliando nossa rede de parceiros para levar a avaliação
            psicossocial NR‑1 a mais empresas com qualidade, agilidade e
            segurança.
          </p>

          {/* BENEFÍCIO */}
          <div className="text-sm text-slate-600 space-y-2">
            <p>✔ Indicado para associações, consultores, corretores...</p>
            <p>✔ Processo simples, sem burocracia</p>
          </div>

          {/* DIFERENCIAL (DISCRETO) */}
          <p className="text-xs text-slate-500 leading-relaxed">
            O parceiro pode optar por ser remunerado pela indicação ou
            transferir o benefício como desconto direto ao cliente final.
          </p>

          {/* CTA */}
          <div className="pt-4">
            <a
              href="https://alma4d.com.br/contato"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-brand text-white font-semibold hover:bg-brand-highlight transition"
            >
              Falar com a equipe
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
