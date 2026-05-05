"use client";

import { useState } from "react";
import {
  Handshake,
  Mail,
  User,
  Percent,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { NR1SubNav } from "../_components/NR1SubNav";

type FormState = "idle" | "submitting" | "success" | "error";
type Modelo = "commission" | "discount";

export default function ParceirosNR1Page() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    modelo: "" as Modelo | "",
    percentual: "",
    aceiteTermos: false,
  });

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validar(): string | null {
    if (!form.nome.trim()) return "Informe seu nome completo.";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      return "Informe um e‑mail válido.";
    if (!form.telefone.match(/^\+?[0-9()\-\s]{8,}$/))
      return "Informe um telefone válido.";
    if (!form.modelo)
      return "Selecione o modelo de parceria (comissão ou desconto).";

    const percentual = Number(form.percentual);
    if (isNaN(percentual) || percentual <= 0 || percentual > 50)
      return "O percentual deve ser entre 1% e 50%.";

    if (!form.aceiteTermos)
      return "É necessário aceitar os termos para continuar.";

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const erro = validar();
    if (erro) {
      setErrorMsg(erro);
      return;
    }

    try {
      setState("submitting");

      // 🔜 Integração futura: salvar parceiro no Supabase
      await new Promise((res) => setTimeout(res, 1200));

      setState("success");
    } catch {
      setState("error");
      setErrorMsg("Erro ao enviar os dados. Tente novamente.");
    }
  }

  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <NR1SubNav />
        {/* ================= HEADER ================= */}
        <div className="text-center">
          <Handshake size={40} className="mx-auto text-brand" />
          <h1 className="mt-4 text-3xl font-extrabold text-brand">
            Programa de Parceiros alma4D — NR‑1
          </h1>
          <p className="mt-4 text-slate-600">
            Cadastre‑se como parceiro para indicar empresas no mapeamento de
            riscos psicossociais conforme a NR‑1, utilizando seu cupom
            exclusivo.
          </p>
        </div>

        {/* ================= FORM ================= */}
        {state === "idle" || state === "submitting" ? (
          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-2xl bg-surface border border-border p-8 space-y-6"
          >
            {/* Nome */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Nome completo
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  className="pl-9 mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                E‑mail
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="pl-9 mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                required
                placeholder="+55 11 99999‑9999"
                value={form.telefone}
                onChange={(e) => update("telefone", e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Modelo de parceria
              </label>

              <div className="mt-2 space-y-2">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="modelo"
                    value="commission"
                    checked={form.modelo === "commission"}
                    onChange={() => update("modelo", "commission")}
                  />
                  <span>
                    <b>Receber comissão</b> sobre cada venda realizada
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="modelo"
                    value="discount"
                    checked={form.modelo === "discount"}
                    onChange={() => update("modelo", "discount")}
                  />
                  <span>
                    <b>Transferir desconto</b> para a empresa indicada
                  </span>
                </label>
              </div>
            </div>

            {/* Percentual */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Percentual (%)
              </label>
              <div className="relative">
                <Percent
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={form.percentual}
                  onChange={(e) => update("percentual", e.target.value)}
                  className="pl-9 mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Máximo permitido: 50%
              </p>
            </div>

            {/* Termos */}
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={form.aceiteTermos}
                onChange={(e) => update("aceiteTermos", e.target.checked)}
                className="mt-1"
              />
              <p className="text-sm text-slate-600">
                Concordo com os termos do programa de parceiros alma4D.
              </p>
            </div>

            {/* Erro */}
            {errorMsg && (
              <div className="rounded-lg bg-brand-accent/10 text-brand-accent p-3 text-sm flex gap-2">
                <AlertTriangle size={18} />
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
                  Cadastrar parceiro <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : null}

        {/* ================= SUCCESS ================= */}
        {state === "success" && (
          <div className="mt-10 rounded-2xl bg-surface border border-border p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-brand-secondary" />
            <h2 className="mt-4 text-2xl font-extrabold text-brand">
              Cadastro enviado com sucesso
            </h2>
            <p className="mt-4 text-slate-600">
              Em breve você receberá acesso à área do parceiro para gerar cupons
              e acompanhar indicações.
            </p>
          </div>
        )}

        {/* ================= FOOTNOTE ================= */}
        <div className="mt-10 text-xs text-slate-500 text-center">
          ✔ Comissão ou desconto • ✔ Split automático • ✔ Transparência
        </div>
      </div>
    </main>
  );
}
