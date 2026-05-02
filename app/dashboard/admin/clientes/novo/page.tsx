"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarClienteEContrato } from "./actions";

type Step = 1 | 2 | 3;

const STATUS_OPCOES = ["rascunho", "ativo", "suspenso", "encerrado"] as const;

type Status = (typeof STATUS_OPCOES)[number];



function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}

function formatCPF(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  const p1 = v.slice(0, 3);
  const p2 = v.slice(3, 6);
  const p3 = v.slice(6, 9);
  const p4 = v.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

function formatCNPJ(value: string) {
  const v = onlyDigits(value).slice(0, 14);
  const p1 = v.slice(0, 2);
  const p2 = v.slice(2, 5);
  const p3 = v.slice(5, 8);
  const p4 = v.slice(8, 12);
  const p5 = v.slice(12, 14);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "/" + p4;
  if (p5) out += "-" + p5;
  return out;
}

function formatPhoneBR(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  const ddd = v.slice(0, 2);
  const part1 = v.length > 10 ? v.slice(2, 7) : v.slice(2, 6);
  const part2 = v.length > 10 ? v.slice(7, 11) : v.slice(6, 10);
  let out = "";
  if (ddd) out += `(${ddd})`;
  if (part1) out += ` ${part1}`;
  if (part2) out += `-${part2}`;
  return out.trim();
}

function parseMoneyToNumber(input: string) {
  // aceita "1.234,56" ou "1234.56"
  const v = (input || "").trim();
  if (!v) return null;
  const normalized = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-500">{children}</p>;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export default function NovoClientePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  // Cliente (UI mostra CPF/CNPJ, mas envia pf/pj)
  const [tipo, setTipo] = useState<"pf" | "pj">("pj");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [ativo, setAtivo] = useState(true);

  // Contrato
  const [numeroContrato, setNumeroContrato] = useState("");
  const [tipoContrato, setTipoContrato] = useState(""); // você pode virar select se quiser
  const [status, setStatus] =
    useState<(typeof STATUS_OPCOES)[number]>("rascunho");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(false);
  const [moeda, setMoeda] = useState("BRL");
  const [valorMensal, setValorMensal] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [limiteUsuarios, setLimiteUsuarios] = useState("");
  const [limiteGestores, setLimiteGestores] = useState("");
  const [limiteDepartamentos, setLimiteDepartamentos] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [clausulasEspeciais, setClausulasEspeciais] = useState("");

  const documentoFormatado = useMemo(() => {
    return tipo === "pf" ? formatCPF(documento) : formatCNPJ(documento);
  }, [documento, tipo]);

  const telefoneFormatado = useMemo(() => formatPhoneBR(telefone), [telefone]);

  function validateStep1() {
    if (!nome.trim()) return "Informe o nome / razão social.";
    const docDigits = onlyDigits(documento);
    if (tipo === "pf" && docDigits.length !== 11)
      return "CPF deve ter 11 dígitos.";
    if (tipo === "pj" && docDigits.length !== 14)
      return "CNPJ deve ter 14 dígitos.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "E-mail inválido.";
    if (
      telefone &&
      (onlyDigits(telefone).length < 10 || onlyDigits(telefone).length > 11)
    )
      return "Telefone deve ter DDD + número (10 ou 11 dígitos).";
    return "";
  }

  function validateStep2() {
    if (!numeroContrato.trim()) return "Informe o número do contrato.";
    if (!tipoContrato.trim()) return "Informe o tipo de contrato.";
    if (!dataInicio) return "Informe a data de início.";
    const dv = diaVencimento ? Number(diaVencimento) : null;
    if (dv !== null && (!Number.isInteger(dv) || dv < 1 || dv > 31))
      return "Dia de vencimento deve ser um número entre 1 e 31.";
    // datas
    if (dataFim && dataFim < dataInicio)
      return "Data fim não pode ser anterior à data início.";
    // valores
    const vm = parseMoneyToNumber(valorMensal);
    const vt = parseMoneyToNumber(valorTotal);
    if (valorMensal && vm === null)
      return "Valor mensal inválido (ex.: 199,90).";
    if (valorTotal && vt === null)
      return "Valor total inválido (ex.: 2399,00).";
    return "";
  }

  function next() {
    setError("");
    if (step === 1) {
      const msg = validateStep1();
      if (msg) return setError(msg);
      setStep(2);
      return;
    }
    if (step === 2) {
      const msg = validateStep2();
      if (msg) return setError(msg);
      setStep(3);
      return;
    }
  }

  function back() {
    setError("");
    setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)));
  }

  async function submitAll() {
    setError("");

    const msg1 = validateStep1();
    if (msg1) return setError(msg1);
    const msg2 = validateStep2();
    if (msg2) return setError(msg2);

    const fd = new FormData();
    // cliente
    fd.set("tipo", tipo); // pf | pj (conforme check constraint)
    fd.set("nome", nome.trim());
    fd.set("documento", onlyDigits(documento));
    if (email.trim()) fd.set("email", email.trim().toLowerCase());
    if (telefone.trim()) fd.set("telefone", onlyDigits(telefone));
    fd.set("ativo", ativo ? "true" : "false");

    // contrato
    fd.set("numero_contrato", numeroContrato.trim());
    fd.set("tipo_contrato", tipoContrato.trim());
    fd.set("status", status);
    fd.set("data_inicio", dataInicio);
    if (dataFim) fd.set("data_fim", dataFim);
    fd.set("renovacao_automatica", renovacaoAutomatica ? "true" : "false");
    fd.set("moeda", moeda || "BRL");
    if (valorMensal.trim()) fd.set("valor_mensal", valorMensal.trim());
    if (valorTotal.trim()) fd.set("valor_total", valorTotal.trim());
    if (formaPagamento.trim()) fd.set("forma_pagamento", formaPagamento.trim());
    if (diaVencimento.trim()) fd.set("dia_vencimento", diaVencimento.trim());
    if (limiteUsuarios.trim()) fd.set("limite_usuarios", limiteUsuarios.trim());
    if (limiteGestores.trim()) fd.set("limite_gestores", limiteGestores.trim());
    if (limiteDepartamentos.trim())
      fd.set("limite_departamentos", limiteDepartamentos.trim());
    if (observacoes.trim()) fd.set("observacoes", observacoes.trim());
    if (clausulasEspeciais.trim())
      fd.set("clausulas_especiais", clausulasEspeciais.trim());

    startTransition(async () => {
      try {
        await criarClienteEContrato(fd);
        router.push("/dashboard/admin/clientes");
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "Não foi possível salvar. Tente novamente.";
        setError(message);
      }

    });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand">
          Novo cliente + contrato
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Fluxo guiado para cadastrar o cliente e já registrar o contrato com
          validações e revisão final.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-3">
        {[
          { n: 1, label: "Cliente" },
          { n: 2, label: "Contrato" },
          { n: 3, label: "Revisão" },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-3">
            <div
              className={classNames(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border",
                step === s.n
                  ? "bg-brand text-white border-brand"
                  : step > s.n
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-600 border-slate-200",
              )}
            >
              {s.n}
            </div>
            <div
              className={classNames(
                "text-sm font-semibold",
                step === s.n ? "text-slate-900" : "text-slate-600",
              )}
            >
              {s.label}
            </div>
            {s.n !== 3 && <div className="h-px w-10 bg-slate-200" />}
          </div>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      {/* Step 1 - Cliente */}
      {step === 1 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-semibold">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "pf" | "pj")}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
              >
                <option value="pj">CNPJ (Pessoa Jurídica)</option>
                <option value="pf">CPF (Pessoa Física)</option>
              </select>
              <FieldHint>
                O banco aceita apenas: pf ou pj (já alinhado com o schema).
              </FieldHint>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">
                {tipo === "pf" ? "CPF" : "CNPJ"}
              </span>
              <input
                value={documentoFormatado}
                onChange={(e) => setDocumento(e.target.value)}
                pattern={
                  tipo === "pf"
                    ? "\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}"
                    : "\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}"
                }
                placeholder={
                  tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"
                }
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                required
              />
              <FieldHint>Unicidade no banco: documento é único.</FieldHint>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-sm font-semibold">Nome / Razão social</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Nome da Empresa Ltda"
              className="w-full rounded-lg border border-slate-200 bg-white p-2"
              required
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-semibold">E-mail (opcional)</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex.: contato@empresa.com"
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
              />
              <FieldHint>Se preencher, precisa ser único no banco.</FieldHint>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">Telefone (opcional)</span>
              <input
                value={telefoneFormatado}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
              />
              <FieldHint>Se preencher, precisa ser único no banco.</FieldHint>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Cliente ativo</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-brand px-4 py-2 text-white font-semibold hover:opacity-95"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 2 - Contrato */}
      {step === 2 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-semibold">Número do contrato</span>
              <input
                value={numeroContrato}
                onChange={(e) => setNumeroContrato(e.target.value)}
                placeholder="Ex.: ALMA-2026-001"
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                required
              />
              <FieldHint>Único no banco (index unique).</FieldHint>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">Tipo de contrato</span>
              <input
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                placeholder="Ex.: SaaS / Consultoria / Corporativo"
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                required
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-semibold">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FieldHint>
                Validação do banco: rascunho/ativo/suspenso/encerrado.
              </FieldHint>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">Data início</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">Data fim (opcional)</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={renovacaoAutomatica}
              onChange={(e) => setRenovacaoAutomatica(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Renovação automática</span>
          </label>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-semibold">Moeda</span>
              <input
                value={moeda}
                onChange={(e) => setMoeda(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                placeholder="BRL"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">
                Valor mensal (opcional)
              </span>
              <input
                value={valorMensal}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[0-9.,]*$/.test(v)) {
                    setValorMensal(v);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                placeholder="ex.: 199,90"
                step="0.01"
                inputMode="decimal"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">
                Valor total (opcional)
              </span>
              <input
                value={valorTotal}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[0-9.,]*$/.test(v)) {
                    setValorTotal(v);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                placeholder="ex.: 2399,00"
                step="0.01"
                inputMode="decimal"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-semibold">
                Forma de pagamento (opcional)
              </span>
              <input
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                placeholder="Ex.: boleto, cartão, pix, transferência"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">
                Dia vencimento (opcional)
              </span>
              <input
                value={diaVencimento}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[0-9]*$/.test(v)) {
                    setDiaVencimento(v);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                placeholder="1–31"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-semibold">
                Limite usuários (opcional)
              </span>
              <input
                value={limiteUsuarios}
                onChange={(e) => setLimiteUsuarios(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">
                Limite gestores (opcional)
              </span>
              <input
                value={limiteGestores}
                onChange={(e) => setLimiteGestores(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold">
                Limite departamentos (opcional)
              </span>
              <input
                value={limiteDepartamentos}
                onChange={(e) => setLimiteDepartamentos(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2"
                inputMode="numeric"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-sm font-semibold">
              Observações (opcional)
            </span>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 min-h-24"
              placeholder="Notas internas sobre este contrato..."
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-sm font-semibold">
              Cláusulas especiais (opcional)
            </span>
            <textarea
              value={clausulasEspeciais}
              onChange={(e) => setClausulasEspeciais(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 min-h-24"
              placeholder="Texto de cláusulas especiais, se aplicável..."
            />
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-brand px-4 py-2 text-white font-semibold hover:opacity-95"
            >
              Revisar
            </button>
          </div>
        </div>
      )}

      {/* Step 3 - Review */}
      {step === 3 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-brand">Revisão</h2>
            <p className="text-sm text-slate-600 mt-1">
              Confirme os dados antes de criar. Se houver conflito de unicidade
              (documento/e-mail/telefone ou número do contrato), você verá a
              mensagem aqui.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Cliente
              </p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Tipo:</span>{" "}
                {tipo === "pf" ? "CPF (PF)" : "CNPJ (PJ)"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">
                  {tipo === "pf" ? "CPF:" : "CNPJ:"}
                </span>{" "}
                {documentoFormatado}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Nome:</span> {nome}
              </p>
              <p className="text-sm">
                <span className="font-semibold">E-mail:</span>{" "}
                {email?.trim() ? email : "—"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Telefone:</span>{" "}
                {telefone?.trim() ? telefoneFormatado : "—"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Ativo:</span>{" "}
                {ativo ? "Sim" : "Não"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Contrato
              </p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Número:</span> {numeroContrato}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Tipo:</span> {tipoContrato}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Status:</span> {status}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Início:</span> {dataInicio}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Fim:</span> {dataFim || "—"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Renovação automática:</span>{" "}
                {renovacaoAutomatica ? "Sim" : "Não"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Moeda:</span> {moeda}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Valor mensal:</span>{" "}
                {valorMensal || "—"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Valor total:</span>{" "}
                {valorTotal || "—"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Pagamento:</span>{" "}
                {formaPagamento || "—"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Vencimento:</span>{" "}
                {diaVencimento || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
              disabled={pending}
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={submitAll}
              className={classNames(
                "rounded-xl px-4 py-2 font-semibold text-white",
                pending ? "bg-slate-400" : "bg-emerald-600 hover:opacity-95",
              )}
              disabled={pending}
            >
              {pending ? "Salvando..." : "Criar cliente e contrato"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
