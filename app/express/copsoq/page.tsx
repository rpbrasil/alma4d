"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, Lock, Send, RefreshCw } from "lucide-react";

type LinkInfo = {
  id: string;
  contrato_id: string;
  max_respostas: number;
  usadas: number;
  ativo: boolean;
};

type Question = {
  id: string;
  label: string;
};

type Answers = Record<string, string>;

const QUESTIONS: Question[] = [
  {
    id: "q1",
    label:
      "No meu trabalho, tenho tempo suficiente para realizar minhas tarefas no ritmo esperado.",
  },
  {
    id: "q2",
    label:
      "Sinto que posso influenciar decisões importantes relacionadas ao meu trabalho.",
  },
  {
    id: "q3",
    label:
      "Recebo apoio suficiente do meu chefe para lidar com as demandas diárias.",
  },
  {
    id: "q4",
    label:
      "Consigo equilibrar as exigências do trabalho com minha vida pessoal.",
  },
  {
    id: "q5",
    label: "Minha carga de trabalho é distribuída de forma justa e razoável.",
  },
];

const OPTIONS = [
  { value: "1", label: "Nunca" },
  { value: "2", label: "Raramente" },
  { value: "3", label: "Às vezes" },
  { value: "4", label: "Frequentemente" },
  { value: "5", label: "Sempre" },
];

export default function ExpressCopsoqQuizPage() {
  const searchParams = useSearchParams();
  const rawLinkId = searchParams.get("linkId");
  const linkId = rawLinkId && rawLinkId !== "null" ? rawLinkId : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const [contratoNumero, setContratoNumero] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [existsCompleted, setExistsCompleted] = useState(false);
  const allAnswered = useMemo(
    () => QUESTIONS.every((question) => Boolean(answers[question.id])),
    [answers],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!linkId) {
        setError(
          "Link inválido. Verifique se o URL contém o parâmetro linkId.",
        );
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const uid = sessionData.session?.user?.id;
        if (!uid) {
          setError(
            "Usuário não autenticado. Faça login pelo seu celular com OTP.",
          );
          return;
        }
        const [
          { data: usuario, error: usuarioError },
          { data: link, error: linkError },
        ] = await Promise.all([
          supabase
            .from("usuarios")
            .select("id, cliente_id, ativo")
            .eq("id", uid)
            .maybeSingle(),
          supabase
            .from("copsoq_links")
            .select("id, contrato_id, max_respostas, usadas, ativo")
            .eq("id", linkId)
            .maybeSingle(),
        ]);

        if (usuarioError) throw usuarioError;
        if (linkError) throw linkError;

        if (!usuario || !usuario.cliente_id) {
          setError(
            "Seu usuário não está vinculado a um cliente ativo. Contate o administrador.",
          );
          return;
        }
        if (usuario.ativo === false) {
          setError("Seu usuário está inativo. Contate o administrador.");
          return;
        }

        if (!link) {
          setError("Link de aplicação inválido ou desativado.");
          return;
        }

        if (!link.ativo) {
          setError("Link de aplicação inválido ou desativado.");
          return;
        }
        const { data: contrato, error: contratoError } = await supabase
          .from("contratos")
          .select("id, numero_contrato, status, cliente_id")
          .eq("id", link.contrato_id)
          .maybeSingle();

        if (contratoError) throw contratoError;
        if (!contrato || contrato.status !== "ativo") {
          setError("O contrato associado ao link não está ativo.");
          return;
        }

        if (contrato.cliente_id !== usuario.cliente_id) {
          setError("Este link não pertence ao cliente associado ao seu login.");
          return;
        }

        const { data: cliente, error: clienteError } = await supabase
          .from("clientes")
          .select("nome, ativo")
          .eq("id", usuario.cliente_id)
          .maybeSingle();

        if (clienteError) throw clienteError;
        if (!cliente || cliente.ativo === false) {
          setError("O cliente associado está inativo.");
          return;
        }
        // 1) Verifica se já existe vínculo (reserva) para esse usuário+link
        const { data: linkBind, error: bindError } = await supabase
          .from("copsoq_aplicacoes_links")
          .select("id, aplicacao_id")
          .eq("link_id", linkId)
          .eq("usuario_id", uid)
          .maybeSingle();

        if (bindError) throw bindError;

        if (linkBind?.aplicacao_id) {
          setExistsCompleted(true);
          setSuccess(
            "Você já concluiu este questionário. Obrigado pela participação.",
          );
        } else {
          // cria reserva idempotente (exige UNIQUE (link_id, usuario_id))
          await supabase
            .from("copsoq_aplicacoes_links")
            .upsert(
              { link_id: linkId, usuario_id: uid, aplicacao_id: null },
              { onConflict: "link_id,usuario_id", ignoreDuplicates: true },
            );
        }

        if (active) {
          setLinkInfo(link as LinkInfo);
          setClienteNome(cliente.nome ?? null);
          setContratoNumero(contrato.numero_contrato ?? null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar o questionário.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [linkId]);

  async function handleSubmit() {
    if (!linkId) return;
    if (existsCompleted) return;

    if (!allAnswered) {
      setError("Por favor, responda todas as questões antes de enviar.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      const response = await fetch("/api/copsoq/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, answers }),
      });

      type SubmitResponse = {
        ok?: boolean;
        error?: string;
        aplicacaoId?: string;
      };

      const data: SubmitResponse = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok !== true) {
        throw new Error(data?.error ?? "Falha ao enviar as respostas.");
      }

      setSubmitted(true);
      setSuccess(
        "Perguntas enviadas com sucesso. Obrigado por contribuir com o COPSOQ.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao enviar. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Validando seu acesso e carregando o questionário…</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h1 className="text-lg font-semibold text-red-900">
              Erro de acesso ao COPSOQ
            </h1>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">
              COPSOQ II BR • Preenchimento
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Questionário COPSOQ
            </h1>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Acesso protegido</p>
            <p className="mt-1 flex items-center gap-2">
              <Lock size={16} /> Autenticação por telefone (OTP)
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Cliente</p>
            <p className="mt-1 font-semibold text-slate-900">
              {clienteNome ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Contrato</p>
            <p className="mt-1 font-semibold text-slate-900">
              {contratoNumero ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Link de aplicação</p>
            <p className="mt-1 font-semibold text-slate-900">
              {linkInfo?.usadas ?? 0}/{linkInfo?.max_respostas ?? 0}
            </p>
          </div>
        </div>
      </header>

      {submitted || existsCompleted ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600" size={24} />
            <div>
              <h2 className="text-lg font-semibold">Resposta recebida</h2>
              <p className="mt-2 text-sm text-slate-700">{success}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Instruções</p>
            <p className="mt-2">
              Responda todas as questões usando a escala abaixo. As respostas
              são confidenciais e serão usadas apenas para análise agregada de
              risco.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700"
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>

          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {QUESTIONS.map((question, index) => (
              <div
                key={question.id}
                className="rounded-3xl border border-slate-200 p-5"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {index + 1}. {question.label}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer flex-col rounded-2xl border p-3 text-center text-sm transition ${
                        answers[question.id] === option.value
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-semibold">{option.value}</span>
                      <span className="mt-2 text-xs">{option.label}</span>
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={answers[question.id] === option.value}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: option.value,
                          }))
                        }
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {allAnswered
                  ? "Todas as questões foram respondidas."
                  : "Responda todos os itens antes de enviar."}
              </p>
              <button
                type="submit"
                disabled={submitting || !allAnswered}
                className="inline-flex items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar respostas
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
