"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image"

type JobStatus = {
  id: string;
  status: string;
  total: number;
  processed: number;
  success: number;
  errors: number;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CsvRegistro = {
  nome_completo: string;
  documento: string;
  telefone: string;
  role: "usuario";
};


type BulkLineError = {
  linha: number;
  error: string | null;
  payload: Record<string, unknown>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

function normalizePhoneBR(v: string) {
  const d = onlyDigits(v);
  if (!d) return "";
  if (d.startsWith("55")) return `+${d}`;
  return `+55${d}`;
}

function parsePaste(text: string): CsvRegistro[] {
  // aceita "nome;cpf;telefone" ou "nome,cpf,telefone" ou com tabs
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const regs = lines.map((l) => {
    const parts = l.includes(";")
      ? l.split(";")
      : l.includes(",")
        ? l.split(",")
        : l.split(/\t+/);

    const nome = (parts[0] ?? "").trim();
    const cpf = onlyDigits(parts[1] ?? "");
    const tel = normalizePhoneBR(parts[2] ?? "");

    return {
      nome_completo: nome,
      documento: cpf,
      telefone: tel,
      role: "usuario" as const, // hardcoded via express
    };
  });

  return regs.filter(
    (r) =>
      r.nome_completo &&
      r.documento.length === 11 &&
      r.telefone.startsWith("+"),
  );
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function DashboardExpress() {
  // cadastro rápido
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [tel, setTel] = useState("");

  // bulk
  const [paste, setPaste] = useState("");
  const [bulkPreview, setBulkPreview] = useState<CsvRegistro[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // job
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [jobErrors, setJobErrors] = useState<BulkLineError[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const enqueueUrl = process.env.NEXT_PUBLIC_FN_IMPORT_ENQUEUE_URL!;
  const workerUrl = process.env.NEXT_PUBLIC_FN_IMPORT_WORKER_URL!;

  const progress = useMemo(() => {
    if (!job) return 0;
    if (!job.total) return 0;
    return Math.min(100, Math.round((job.processed / job.total) * 100));
  }, [job]);

  async function refreshJob(id: string) {
    // chama seu backend Next para consultar job/erros (código abaixo na seção 3)
    const token = await getAccessToken();
    const r = await fetch(
      `/api/importacao-usuarios/job?job_id=${encodeURIComponent(id)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      },
    );
    const j = await r.json();

    if (r.ok && j && typeof j === "object" && "job" in j) {
      setJob(j.job as JobStatus);
    }

    const r2 = await fetch(
      `/api/importacao-usuarios/erros?job_id=${encodeURIComponent(id)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      },
    );
    const j2 = await r2.json();
    if (r2.ok) setJobErrors(j2.errors ?? []);
  }

  async function runWorkerOnce(id: string) {
    const token = await getAccessToken();
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    // worker roda 1 lote (rows_per_run) por chamada
    const r = await fetch(workerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: id, rows_per_run: 200, concurrency: 5 }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Falha ao processar job.");
  }

  async function onQuickAdd() {
    setMsg(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      

      // usa sua edge "gerenciarusuarios" (não incluí a URL aqui — se quiser, faço também)
      // Para ficar consistente com seu stack atual, recomendo cadastrar 1 a 1 usando gerenciarusuarios.
      // Se você preferir, também posso adaptar para usar o mesmo pipeline de job.

      // Exemplo: fetch("/functions/v1/gerenciarusuarios", ...)

      setMsg("Usuário cadastrado. Ele já pode entrar com OTP no celular.");
      setNome("");
      setCpf("");
      setTel("");
    }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (e: any) {
      setMsg(e?.message ?? "Erro ao cadastrar usuário.");
    } finally {
      setBusy(false);
    }
  }

  async function onBuildPreview() {
    setBulkError(null);
    const regs = parsePaste(paste);
    if (!regs.length) {
      setBulkError("Nenhuma linha válida. Use: nome;cpf;telefone");
      setBulkPreview([]);
      return;
    }
    setBulkPreview(regs.slice(0, 20));
    setMsg(`Prévia pronta: ${regs.length} registros válidos.`);
  }

  async function onEnqueueBulk() {
    setMsg(null);
    setBusy(true);
    try {
      const regs = parsePaste(paste);
      if (!regs.length) throw new Error("Nenhuma linha válida para importar.");

      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const r = await fetch(enqueueUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registros: regs }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Falha ao enfileirar importação.");

      setJobId(j.job_id);
      setMsg(`Importação enfileirada (job ${j.job_id}). Processando...`);

      // roda worker 1x imediatamente para dar sensação de velocidade
      await runWorkerOnce(j.job_id);
      await refreshJob(j.job_id);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (e: any) {
      setMsg(e?.message ?? "Erro ao importar.");
    } finally {
      setBusy(false);
    }
  }

  async function onContinueProcessing() {
    if (!jobId) return;
    setBusy(true);
    try {
      await runWorkerOnce(jobId);
      await refreshJob(jobId);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (e: any) {
      setMsg(e?.message ?? "Erro ao processar job.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header / onboarding */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-brand tracking-tight">
              Dashboard Express — Primeiros passos
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Cadastre sua equipe rapidamente (2 usuários ou 500+) e libere
              acesso via OTP no celular.
            </p>
          </div>
          <Image
            src="/images/alma4d_express_nobground.png"
            alt="alma4D"
            width={72}
            height={72}
            className="opacity-90"
            priority
          />
        </div>

        {msg && (
          <div className="mt-4 rounded-xl border border-border bg-white p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </div>

      {/* Cadastro rápido */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-slate-800">
          Adicionar usuário (rápido)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ideal para poucos usuários. O colaborador entra usando OTP no celular.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="CPF (somente números)"
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
          <input
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="Celular com DDD (ex: 11999999999)"
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4">
          <button
            disabled={busy}
            onClick={onQuickAdd}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
          >
            Adicionar usuário
          </button>
        </div>
      </div>

      {/* Importação em massa */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-slate-800">
          Adicionar em massa (colar ou CSV)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Para 20, 200 ou 500+ usuários. Cole linhas no formato:{" "}
          <code>nome;cpf;telefone</code>.
        </p>

        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={`Ex:\nJoão Silva;12345678901;11999999999\nMaria Lima;98765432100;11988887777`}
          className="mt-4 min-h-35 w-full rounded-xl border border-border bg-white p-3 text-sm"
        />

        {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBuildPreview}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted"
          >
            Gerar prévia
          </button>

          <button
            disabled={busy}
            type="button"
            onClick={onEnqueueBulk}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
          >
            Enfileirar importação
          </button>

          {jobId && (
            <button
              disabled={busy}
              type="button"
              onClick={onContinueProcessing}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted disabled:opacity-60"
            >
              Processar mais (worker)
            </button>
          )}

          {jobId && (
            <button
              type="button"
              onClick={() => refreshJob(jobId)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted"
            >
              Atualizar status do job
            </button>
          )}
        </div>

        {!!bulkPreview.length && (
          <div className="mt-5 rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">
              Prévia (primeiras linhas)
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {bulkPreview.map((r, i) => (
                <li key={i}>
                  {r.nome_completo} — {r.documento} — {r.telefone}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* progresso do job */}
        {job && (
          <div className="mt-5 rounded-xl border border-border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Importação</p>
              <span className="text-xs font-semibold text-slate-500">
                {job.status}
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-brand"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
              <div>
                Total: <strong>{job.total}</strong>
              </div>
              <div>
                Processado: <strong>{job.processed}</strong>
              </div>
              <div>
                Sucesso: <strong>{job.success}</strong>
              </div>
              <div>
                Erros: <strong>{job.errors}</strong>
              </div>
            </div>

            {job.last_error && (
              <div className="mt-3 text-xs text-red-600">
                Último erro: {job.last_error}
              </div>
            )}
          </div>
        )}

        {!!jobErrors.length && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">
              Erros (amostra)
            </p>
            <ul className="mt-2 space-y-1 text-xs text-red-700">
              {jobErrors.slice(0, 10).map((e, i) => (
                <li key={i}>
                  Linha {e.linha}: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
