"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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

function isValidCPF(cpf: string) {
  if (!cpf || cpf.length !== 11) return false;

  // bloqueia CPF fake tipo 11111111111
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }

  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;

  return rest === Number(cpf[10]);
}
function isValidPhone(phone: string) {
  return /^\+55\d{10,11}$/.test(phone);
}
function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
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

  const seenCpf = new Set<string>();
  const seenPhone = new Set<string>();

  return regs.filter((r) => {
    if (normalizeName(r.nome_completo).length < 3) return false;
    if (!isValidCPF(r.documento)) return false;
    if (!isValidPhone(r.telefone)) return false;
    if (!r.telefone.startsWith("+")) return false;

    // 🚫 CPF duplicado
    if (seenCpf.has(r.documento)) return false;
    seenCpf.add(r.documento);

    // 🚫 Telefone duplicado
    if (seenPhone.has(r.telefone)) return false;
    seenPhone.add(r.telefone);

    return true;
  });
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

  const [limiteUsuarios, setLimiteUsuarios] = useState<number | null>(null);
  const [usuariosAtuais, setUsuariosAtuais] = useState<number>(0);

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await getAccessToken();
        const r = await fetch("/api/entitlements", {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });

        const j = (await r.json().catch(() => null)) as {
          limite_usuarios: number | null;
          usuarios_ativos: number;
        } | null;

        if (!cancelled && r.ok && j) {
          setLimiteUsuarios(j.limite_usuarios);
          setUsuariosAtuais(j.usuarios_ativos);
        }
      } catch {
        // não derruba a página
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

      if (limiteUsuarios !== null && usuariosAtuais >= limiteUsuarios) {
        setMsg("Limite de usuários do seu plano atingido.");
        return;
      }

      const nomeNorm = normalizeName(nome);
      const cpfNorm = onlyDigits(cpf);
      const phoneNorm = normalizePhoneBR(tel);

      // ✅ nome
      if (nomeNorm.length < 3) {
        setMsg("Digite um nome válido.");
        return;
      }

      // ✅ CPF real
      if (!isValidCPF(cpfNorm)) {
        setMsg("CPF inválido.");
        return;
      }

      // ✅ telefone
      if (!isValidPhone(phoneNorm)) {
        setMsg("Telefone inválido. Use DDD + número.");
        return;
      }


      if (onlyDigits(cpf).length !== 11) {
        setMsg("CPF inválido");
        return;
      }

      if (!normalizePhoneBR(tel)) {
        setMsg("Telefone inválido");
        return;
      }
      const payload = {
        nome_completo: nomeNorm,
        documento: onlyDigits(cpf),
        telefone: normalizePhoneBR(tel),
        role: "usuario",
      };

      if (bulkPreview.some((u) => u.documento === cpfNorm)) {
        setMsg("CPF já adicionado na lista.");
        return;
      }

      if (bulkPreview.some((u) => u.telefone === phoneNorm)) {
        setMsg("Telefone já adicionado.");
        return;
      }
      // 🚀 chamada da sua edge
      const r = await fetch(
        "https://ljpiesdyfhukffwlujfy.supabase.co/functions/v1/gerenciarusuarios",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(j.error ?? "Erro ao criar usuário.");
      }

      setMsg("Usuário cadastrado.");
      setUsuariosAtuais((prev) => prev + 1);
      await refreshEntitlements();
      setNome("");
      setCpf("");
      setTel("");
    } catch (e: unknown) {
      if (e instanceof Error) setMsg(e.message);
      else setMsg("Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  async function onBuildPreview() {
    setBulkError(null);
    const total = paste.split(/\r?\n/).filter(Boolean).length;
    const regs = parsePaste(paste);

    if (regs.length < total) {
      setBulkError(
        `${total - regs.length} linhas ignoradas por erro ou duplicidade.`,
      );
    }
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
      if (
        limiteUsuarios !== null &&
        usuariosAtuais + regs.length > limiteUsuarios
      ) {
        const restante = limiteUsuarios - usuariosAtuais;
        throw new Error(
          `Você pode adicionar no máximo ${restante} usuários no seu plano.`,
        );
      }
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
      await refreshEntitlements();
    } catch (e: unknown) {
      if (e instanceof Error) setMsg(e.message);
      else setMsg("Erro inesperado");
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
    } catch (e: unknown) {
      if (e instanceof Error) setMsg(e.message);
      else setMsg("Erro inesperado");
    } finally {
      setBusy(false);
      await refreshEntitlements();
    }
  }

  async function refreshEntitlements() {
    try {
      const token = await getAccessToken();

      const r = await fetch("/api/entitlements", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      const j = await r.json();

      if (r.ok && j) {
        setLimiteUsuarios(j.limite_usuarios ?? null);
        setUsuariosAtuais(j.usuarios_ativos ?? 0);
      }
    } catch {
      // silencioso
    }
  }
// auto-polling
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     refreshEntitlements();
  //   }, 5000); // 5s

  //   return () => clearInterval(interval);
  // }, []);

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
              acesso via link / qrCode.
            </p>
          </div>
          <div className="mt-2 text-md text-slate-600">
            Usuários cadastrados: <strong>{usuariosAtuais}</strong>
            {limiteUsuarios !== null && (
              <>
                {" "}
                / <strong>{limiteUsuarios}</strong>
              </>
            )}
          </div>
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
          Ideal para poucos usuários.
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
            onChange={(e) => setCpf(onlyDigits(e.target.value))}
            placeholder="CPF (somente números)"
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
          <input
            value={tel}
            onChange={(e) => setTel(onlyDigits(e.target.value))}
            placeholder="Celular com DDD (ex: 11999999999)"
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4">
          <button
            disabled={
              busy ||
              (limiteUsuarios !== null && usuariosAtuais >= limiteUsuarios)
            }
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
