"use client";

import { useState } from "react";
import { ArrowRight, Building2, Mail, CheckCircle2 } from "lucide-react";
import { NR1SubNav } from "../_components/NR1SubNav";

type FormState = "idle" | "submitting" | "success" | "error";

type EmpresaForm = {
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
  responsavel: string;
  funcionarios: number;
  aceiteLgpd: boolean;
};

export default function EmpresaNR1Page() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<EmpresaForm>({
    razaoSocial: "",
    cnpj: "",
    email: "",
    telefone: "",
    responsavel: "",
    funcionarios: 0,
    aceiteLgpd: false,
  });

  function update<K extends keyof EmpresaForm>(key: K, value: EmpresaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validarFormulario(form: EmpresaForm): string | null {
    if (!form.razaoSocial.trim()) return "Informe a razão social.";

    if (!/^\d{14}$/.test(form.cnpj))
      return "CNPJ inválido. Use apenas números.";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "E‑mail inválido.";

    if (!/^\+?[0-9()\-\s]{8,}$/.test(form.telefone))
      return "Telefone inválido.";

    if (!form.responsavel.trim())
      return "Informe o responsável pelo preenchimento.";

    if (!Number.isInteger(form.funcionarios) || form.funcionarios <= 0)
      return "Número de funcionários inválido.";

    if (!form.aceiteLgpd) return "É obrigatório aceitar a LGPD.";

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const erro = validarFormulario(form);
    if (erro) {
      setErrorMsg(erro);
      return;
    }

    try {
      setState("submitting");

      const res = await fetch("/api/nr1/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Erro desconhecido");
      }

      setState("success");
    } catch (err) {
      console.error(err);
      setState("error");
      setErrorMsg("Não foi possível enviar os dados. Tente novamente.");
    }
  }

  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <NR1SubNav />
        {/* ================= HEADER ================= */}
        <div className="text-center">
          <Building2 size={40} className="mx-auto text-brand" />
          <h1 className="mt-4 text-3xl font-extrabold text-brand">
            Aplicação do COPSOQ II BR — NR‑1
          </h1>
          <p className="mt-4 text-slate-600">
            Preencha os dados da empresa para iniciar o processo de aplicação do
            questionário e geração de evidências técnicas para o GRO/PGR.
          </p>
        </div>

        {/* ================= FORM ================= */}
        {(state === "idle" || state === "submitting") && (
          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-2xl bg-surface border border-border p-8 space-y-6"
          >
            {/* Razão social */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Razão social
              </label>
              <input
                type="text"
                value={form.razaoSocial}
                onChange={(e) => update("razaoSocial", e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                required
              />
            </div>

            {/* CNPJ + Funcionários */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) =>
                    update("cnpj", e.target.value.replace(/\D/g, ""))
                  }
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nº de funcionários
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.funcionarios || ""}
                  onChange={(e) =>
                    update("funcionarios", Number(e.target.value))
                  }
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
                />
              </div>
            </div>

            {/* Responsável */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Responsável pelo preenchimento
              </label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => update("responsavel", e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                E‑mail de contato
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="pl-9 mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Telefone
              </label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => update("telefone", e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                required
              />
            </div>

            {/* LGPD */}
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={form.aceiteLgpd}
                onChange={(e) => update("aceiteLgpd", e.target.checked)}
                className="mt-1"
              />
              <p className="text-sm text-slate-600">
                Declaro que os dados serão utilizados exclusivamente para fins
                de gestão de riscos ocupacionais, conforme a LGPD.
              </p>
            </div>

            {/* Erro */}
            {errorMsg && (
              <div className="rounded-lg bg-brand-accent/10 text-brand-accent p-3 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full inline-flex items-center justify-center gap-2 h-11
                         rounded-xl bg-brand text-white font-semibold
                         hover:bg-brand-highlight transition disabled:opacity-60"
            >
              {state === "submitting" ? (
                "Enviando..."
              ) : (
                <>
                  Continuar <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= SUCCESS ================= */}
        {state === "success" && (
          <div className="mt-10 rounded-2xl bg-surface border border-border p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-brand-secondary" />
            <h2 className="mt-4 text-2xl font-extrabold text-brand">
              Dados recebidos com sucesso
            </h2>
            <p className="mt-4 text-slate-600">
              O próximo passo é a assinatura digital do contrato e o pagamento.
              Você receberá as instruções por e‑mail.
            </p>
          </div>
        )}

        {/* ================= FOOTNOTE ================= */}
        <div className="mt-10 text-xs text-slate-500 text-center">
          ✔ Metodologia validada • ✔ Conformidade NR‑1 • ✔ LGPD
        </div>
      </div>
    </main>
  );
}
