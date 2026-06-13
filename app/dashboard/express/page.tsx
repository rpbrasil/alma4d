"use client";

import { useMemo, useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { trackConsent } from "@/lib/trackConsent";
import { useAccessGuard } from "@/hooks/useAccessGuard";
import { setStorageItem } from "@/lib/storage";
import { UpgradeLicencasModal } from "@/(nr1)/nr1/_components/UpgradeLicensasModal";

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
  departamento_nome?: string | null; // ✅ agora é texto
};

type BulkLineError = {
  linha: number;
  error: string | null;
  payload: Record<string, unknown>;
};

type TabKey = "single" | "bulk";

type ParseResult = {
  validos: CsvRegistro[];
  erros: {
    linha: number;
    erro: string;
    raw: string;
  }[];
};
type UsuarioPerfil = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  cliente_id: string;
};

function normalizeText(v: string) {
  if (!v) return "";

  const fixed = v
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFFFD/g, ""); // caractere inválido correto

  return fixed.replace(/\s+/g, " ").trim();
}

function parsePasteDetailed(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const validos: CsvRegistro[] = [];
  const erros: ParseResult["erros"] = [];

  const seenCpf = new Set<string>();
  const seenPhone = new Set<string>();

  lines.forEach((line, index) => {
    const linha = index + 1;

    const parts = line.includes(";")
      ? line.split(";")
      : line.includes(",")
        ? line.split(",")
        : line.split(/\t+/);

    const nome = normalizeText(parts[0] ?? "");
    const cpf = onlyDigits(parts[1] ?? "");
    const telefone = normalizePhoneBR(parts[2] ?? "");
    const dept = normalizeText(parts[3] ?? "");

    // ✅ validações
    if (normalizeName(nome).length < 3) {
      erros.push({ linha, erro: "Nome inválido", raw: line });
      return;
    }

    if (!isValidCPF(cpf)) {
      erros.push({ linha, erro: "CPF inválido", raw: line });
      return;
    }

    if (!isValidPhone(telefone)) {
      erros.push({
        linha,
        erro: "Telefone inválido (DDD + número)",
        raw: line,
      });
      return;
    }

    if (!telefone.startsWith("+")) {
      erros.push({ linha, erro: "Telefone sem +55", raw: line });
      return;
    }

    if (seenCpf.has(cpf)) {
      erros.push({ linha, erro: "CPF duplicado na lista", raw: line });
      return;
    }
    seenCpf.add(cpf);

    if (seenPhone.has(telefone)) {
      erros.push({ linha, erro: "Telefone duplicado na lista", raw: line });
      return;
    }
    seenPhone.add(telefone);

    validos.push({
      nome_completo: normalizeName(nome),
      documento: cpf,
      telefone,
      role: "usuario",
      departamento_nome: dept || null,
    });
  });

  return { validos, erros };
}

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
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizePhoneBR(v: string) {
  const d = onlyDigits(v);
  if (!d) return "";
  if (d.startsWith("55")) return `+${d}`;
  return `+55${d}`;
}

function normalizeDeptName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

function formatCPFInput(v: string) {
  const d = onlyDigits(v).slice(0, 11);

  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function normalizePhoneInput(v: string) {
  let d = onlyDigits(v);

  // se o usuário colar com 55 na frente, removemos do input
  // porque no submit você já aplica normalizePhoneBR()
  if (d.startsWith("55") && d.length > 11) {
    d = d.slice(2);
  }

  return d.slice(0, 11);
}

function formatPhoneInput(v: string) {
  const d = normalizePhoneInput(v);

  // fixo: (11) 1234-5678
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  // celular: (11) 91234-5678
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function hasEncodingIssue(text: string) {
  return text.includes("�");
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
  const [showLicencaModal, setShowLicencaModal] = useState(false);
  
  const [licencasContratadas, setlicencasContratadas] = useState<number | null>(null);
  const [licencasConsumidas, setlicencasConsumidas] = useState<number>(0);

  const [user, setUser] = useState<UsuarioPerfil | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [precoUnitario, setPrecoUnitario] = useState<number>(0);

  // bulk
  const [paste, setPaste] = useState("");
  const [bulkPreview, setBulkPreview] = useState<CsvRegistro[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const parsed = useMemo(() => parsePasteDetailed(paste), [paste]);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  // departamentos (opcional)
  const [deptEnabled, setDeptEnabled] = useState(false);
  const [departamentoNomePadrao, setDepartamentoNomePadrao] = useState("");
  const [deptAcknowledge, setDeptAcknowledge] = useState(false);
  // abas
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // job
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [jobErrors, setJobErrors] = useState<BulkLineError[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const gerenciarUsuariosUrl =
    process.env.NEXT_PUBLIC_FN_GERENCIAR_USUARIOS_URL ??
    `${baseUrl}/functions/v1/gerenciarusuarios`;

  const enqueueUrl =
    process.env.NEXT_PUBLIC_FN_IMPORT_ENQUEUE_URL ??
    `${baseUrl}/functions/v1/importarusuarioscsv`;

  const workerUrl =
    process.env.NEXT_PUBLIC_FN_IMPORT_WORKER_URL ??
    `${baseUrl}/functions/v1/importarusuarios_worker`;

  const { loading } = useAccessGuard({
    requirePlano: "express",
    allowAdmin: true,
    redirectIfFail: "/ativacao",
  });

  const [showDeptModal, setShowDeptModal] = useState(() => {
    if (typeof window === "undefined") return false;

    const CONSENT_KEY = "copsoq_consent_v1";
    const CONSENT_TTL = 1000 * 60 * 60 * 24; // 24h

    const stored = localStorage.getItem(CONSENT_KEY);

    if (!stored) return true;

    try {
      const parsed = JSON.parse(stored);

      const isExpired =
        !parsed.timestamp || Date.now() - parsed.timestamp > CONSENT_TTL;

      return isExpired;
    } catch {
      return true;
    }
  });

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
          licencas_contratadas: number | null;
          licencas_consumidas: number;
        } | null;

        if (!cancelled && r.ok && j) {
          setlicencasContratadas(j.licencas_contratadas);
          setlicencasConsumidas(j.licencas_consumidas);
        }
      } catch {
        // não derruba a página
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (showDeptModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showDeptModal]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/whoami");

        if (!res.ok) return;

        const data = await res.json();

        if (!data?.usuario_id) return;

        if (!cancelled) {
          setUser({
            id: data.usuario_id,
            nome: data.nome_completo ?? "",
            email: data.email ?? "",
            telefone: data.telefone ?? "",
            documento: data.documento ?? "",
            cliente_id: data.cliente_id,
          });

          setClienteId(data.cliente_id ?? null);
        }

        // ✅ buscar contrato ativo
        const { data: contrato } = await supabase
          .from("contratos")
          .select("id, preco_unitario")
          .eq("cliente_id", data.cliente_id)
          .eq("status", "ativo")
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (contrato && !cancelled) {
          setContratoId(contrato.id);
          setPrecoUnitario(Number(contrato.preco_unitario ?? 0));
        }
      } catch {
        // silencioso
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
      if (!nome.trim() || !cpf.trim() || !tel.trim()) {
        setMsg("Preencha nome, CPF e telefone.");
        return;
      }

      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      if (!gerenciarUsuariosUrl) {
        throw new Error("Endpoint de cadastro não configurado.");
      }
      if (licencasContratadas !== null && licencasConsumidas >= licencasContratadas) {
        setShowLicencaModal(true);
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

      const deptNome = deptEnabled
        ? normalizeDeptName(departamentoNomePadrao)
        : "";
      const payload = {
        nome_completo: nomeNorm,
        documento: cpfNorm,
        telefone: phoneNorm,
        role: "usuario",
        departamento_nome: deptNome || null,
      };

      if (bulkPreview.some((u) => u.documento === cpfNorm)) {
        setMsg("CPF já adicionado na lista.");
        return;
      }

      if (bulkPreview.some((u) => u.telefone === phoneNorm)) {
        setMsg("Telefone já adicionado.");
        return;
      }

      console.log("URL gerenciarUsuarios:", gerenciarUsuariosUrl);
      // 🚀 chamada da sua edge
      const r = await fetch(gerenciarUsuariosUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      let j: { error?: string; [key: string]: unknown } = {};
      try {
        j = JSON.parse(text);
      } catch {}

      console.log("RES POST USUARIO:", {
        status: r.status,
        url: gerenciarUsuariosUrl,
        raw: text,
      });

      if (!r.ok || j?.error) {
        throw new Error(j?.error ?? "Erro ao criar usuário.");
      }

      setMsg(`Usuário ${nomeNorm.split(" ")[0]} cadastrado com sucesso ✅`);
      setlicencasConsumidas((prev) => prev + 1);
      await refreshEntitlements();
      setNome("");
      setCpf("");
      setTel("");
      document.getElementById("input-nome")?.focus();
    } catch (e: unknown) {
      if (e instanceof Error) {
        const msg = e.message.toLowerCase();

        if (
          msg.includes("duplicate") ||
          msg.includes("duplicado") ||
          msg.includes("already exists") ||
          msg.includes("já existe") ||
          msg.includes("unique")
        ) {
          setMsg("Usuário já cadastrado com este CPF ou telefone.");
        } else {
          setMsg(e.message);
        }
      } else {
        setMsg("Erro inesperado");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onBuildPreview() {
    setBulkError(null);
    const { validos, erros } = parsed;

    if (!validos.length) {
      setBulkError("Nenhuma linha válida encontrada.");
    } else if (erros.length) {
      setBulkError(`❌ ${erros.length} linhas com erro.`);
    } else if (hasEncodingIssue(paste)) {
      setBulkError(
        "⚠️ Detectamos caracteres inválidos. Recomendamos salvar o arquivo como CSV UTF-8.",
      );
    }
    setPreviewGenerated(true);
    setBulkPreview(validos.slice(0, 20));
    setJobErrors(
      erros.slice(0, 5).map((e) => ({
        linha: e.linha,
        error: e.erro,
        payload: { raw: e.raw },
      })),
    );
    setMsg(`✅ ${validos.length} válidos • ❌ ${erros.length} com erro`);
  }

  async function onEnqueueBulk() {
    setMsg(null);
    setBusy(true);

    try {
      const { validos, erros } = parsed;

      if (!validos.length) {
        setJobErrors(
          erros.slice(0, 5).map((e) => ({
            linha: e.linha,
            error: e.erro,
            payload: { raw: e.raw },
          })),
        );
        throw new Error("Nenhuma linha válida para importar.");
      }

      if (licencasContratadas !== null && licencasConsumidas >= licencasContratadas) {
        setShowLicencaModal(true);
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (!gerenciarUsuariosUrl) {
        throw new Error("Endpoint de cadastro não configurado.");
      }

      // ✅ normaliza dept padrão (se houver)
      const deptPadrao = deptEnabled
        ? normalizeDeptName(departamentoNomePadrao)
        : "";

      // ✅ regra correta: linha > padrão
      const regsWithDept: CsvRegistro[] = validos.map((r) => ({
        ...r,
        departamento_nome:
          r.departamento_nome && r.departamento_nome.trim().length > 0
            ? normalizeDeptName(r.departamento_nome)
            : deptPadrao || null,
      }));

      const r = await fetch(enqueueUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registros: regsWithDept }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(j.error || "Falha ao enfileirar importação.");
      }

      setJobId(j.job_id);
      setMsg(`Importação enfileirada (job ${j.job_id}). Processando...`);

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
        setlicencasContratadas(j.licencas_contratadas ?? null);
        setlicencasConsumidas(j.licencas_consumidas ?? 0);
      }
    } catch {
      // silencioso
    }
  }

  async function closeDeptModal() {
    if (!deptAcknowledge) return;

    await trackConsent({
      type: "copsoq_departamento",
      version: "v1.0",
      page: "dashboard_express",
      metadata: {
        feature: "departamento_toggle",
      },
    });

    // ✅ salva no localStorage com timestamp
    setStorageItem(
      "copsoq_consent_v1",
      JSON.stringify({
        accepted: true,
        timestamp: Date.now(),
      }),
    );

    setShowDeptModal(false);
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">Validando acesso...</div>
    );
  }
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      if (text.length > 50000) {
        setBulkError(
          "Arquivo muito grande. Limite de processamento excedido. Fale com nossa equipe para forma mais eficiente de upload.",
        );
        return;
      }
      if (hasEncodingIssue(text)) {
        setBulkError(
          "⚠️ Detectamos caracteres inválidos no arquivo. Salve como CSV UTF‑8.",
        );
      }
      setMsg(`Arquivo carregado (${file.name})`);
    } catch {
      setMsg("Erro ao ler arquivo.");
    }
  }

  const bulkPlaceholder = deptEnabled
    ? `Ex (com departamento):\nJoão Silva;12345678901;11999999999;Produção\nMaria Lima;98765432100;11988887777;RH\n\nFormato: nome;cpf;telefone;departamento\n(Se não informar na linha, usamos o Departamento padrão acima — se preenchido)`
    : `Ex:\nJoão Silva;12345678901;11999999999\nMaria Lima;98765432100;11988887777\n\nFormato: nome;cpf;telefone`;
  const restantes =
    licencasContratadas !== null ? licencasContratadas - licencasConsumidas : null;

  const isLimitReached = restantes !== null && restantes <= 0;

  return (
    <div className="space-y-6">
      {/* MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-9999 bg-black/50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Sigilo e dados agregados
            </h3>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              O Mapeamento de Riscos Psicossociais deve garantir{" "}
              <strong>anonimato</strong> e <strong>confidencialidade</strong>.
              Evite identificação indireta em grupos pequenos.
            </p>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Ao continuar, você declara ciência e responsabilidade sobre o uso
              adequado.
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={deptAcknowledge}
                onChange={(e) => setDeptAcknowledge(e.target.checked)}
                className="mt-1"
              />
              Entendi e assumo a responsabilidade
            </label>

            <div className="mt-6 flex justify-end">
              <button
                disabled={!deptAcknowledge}
                onClick={closeDeptModal}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Esquerda */}
          <div>
            <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              👥 Inclusão Express
            </span>

            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Cadastro de usuários
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Adicione usuários de forma rápida ou em massa e gerencie o acesso
              ao sistema.
            </p>
          </div>

          {/* Direita (mini dashboard) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Licenças consumidas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {licencasConsumidas}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Licenças contratadas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {licencasContratadas ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={refreshEntitlements}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Atualizar dados
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={deptEnabled}
              onChange={(e) => setDeptEnabled(e.target.checked)}
            />
            Habilitar departamento
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </section>
      {licencasContratadas !== null && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Expansão de equipe
              </h3>

              <p className="mt-1 text-xs text-amber-800">
                Ao consumir todas as licenças, adquira novas para adicionar
                colaboradores.
              </p>
            </div>
          </div>

          <div className="mt-3 text-sm text-amber-900">
            {licencasContratadas - licencasConsumidas <= 5 &&
              licencasContratadas - licencasConsumidas > 0 && (
                <p className="font-semibold">⚠️ Poucas licenças restantes.</p>
              )}

            {licencasContratadas - licencasConsumidas === 0 && (
              <div className="mt-2 text-sm text-brand-accent font-semibold">
                Todas as licenças contratadas já estão em uso. Adquira novas
                licenças para continuar.
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={() => setShowLicencaModal(true)}
              className="bg-brand-accent font-semibold text-white px-4 py-2 rounded-lg mt-semibold"
            >
              Comprar licenças
            </button>
          </div>
        </div>
      )}
      {/* TABS */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex gap-2 border-b border-slate-200 mb-4">
          {[
            { key: "single", label: "Adicionar usuário" },
            { key: "bulk", label: "Importação em massa" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as TabKey);

                // ✅ limpar estados ao trocar
                setMsg(null);

                if (tab.key === "single") {
                  setBulkPreview([]);
                  setJobErrors([]);
                  setBulkError(null);
                }

                if (tab.key === "bulk") {
                  setNome("");
                  setCpf("");
                  setTel("");
                }
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${
                activeTab === tab.key
                  ? "bg-white border border-slate-200 border-b-white text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SINGLE */}
        {activeTab === "single" && (
          <>
            <p className="text-sm text-slate-500">Ideal para poucos usuários</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                id="input-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo do colaborador"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              />

              <input
                value={formatCPFInput(cpf)}
                onChange={(e) =>
                  setCpf(onlyDigits(e.target.value).slice(0, 11))
                }
                placeholder="CPF (somente números)"
                inputMode="numeric"
                autoComplete="off"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              />

              <input
                value={formatPhoneInput(tel)}
                onChange={(e) => setTel(normalizePhoneInput(e.target.value))}
                placeholder="Telefone com DDD (ex: 11999999999)"
                inputMode="numeric"
                autoComplete="off"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              />

              {deptEnabled && (
                <div className="sm:col-span-3">
                  <input
                    value={departamentoNomePadrao}
                    onChange={(e) => setDepartamentoNomePadrao(e.target.value)}
                    placeholder="Departamento"
                    className="mt-2 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={onQuickAdd}
                disabled={busy || isLimitReached}
                className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
              >
                {busy ? "Adicionando..." : "Adicionar usuário"}
              </button>
            </div>
          </>
        )}

        {/* BULK */}
        {activeTab === "bulk" && (
          <>
            <p className="text-sm text-slate-500">
              Para grandes volumes de usuários
            </p>
            <p className="text-xs text-slate-500">
              📄 Use arquivos ou textos no padrão Excel/CSV. Caso apareçam
              caracteres estranhos (�), salve como “CSV UTF-8”.
            </p>
            <div className="text-xs text-slate-500 mt-2 space-y-1">
              <p>⚠️ Problemas com acentos?</p>
              <ul className="list-disc pl-4">
                <li>Abra o arquivo no Excel</li>
                <li>Clique em “Salvar como”</li>
                <li>Escolha: CSV UTF-8</li>
              </ul>
            </div>
            <div className="mt-4">
              <input
                type="file"
                onChange={handleFile}
                className="hidden"
                id="upload"
              />

              <label
                htmlFor="upload"
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Buscar arquivo
              </label>
            </div>

            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={bulkPlaceholder}
              className="mt-4 min-h-35 w-full rounded-lg border border-slate-200 p-3 text-sm bg-white"
            />

            {job && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {bulkError && (
              <p className="mt-2 text-sm text-red-600">{bulkError}</p>
            )}

            {!!jobErrors.length && (
              <div className="mt-4 text-xs text-red-600">
                {jobErrors.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-semibold">Linha {e.linha}:</span>
                    <span>{e.error}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={onBuildPreview}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Gerar prévia
              </button>

              <button
                onClick={onEnqueueBulk}
                disabled={!previewGenerated || busy || isLimitReached}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Importando..." : "Importar"}
              </button>
              <button
                onClick={() => {
                  setPaste("");
                  setBulkPreview([]);
                  setJobErrors([]);
                  setBulkError(null);
                  setMsg(null);
                  setPreviewGenerated(false);
                }}
                disabled={!paste && bulkPreview.length === 0}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Limpar
              </button>

              {jobId && (
                <button
                  onClick={onContinueProcessing}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Processar mais
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {user && clienteId && contratoId && (
        <UpgradeLicencasModal
          open={showLicencaModal}
          onClose={() => setShowLicencaModal(false)}
          userId={user.id}
          clienteId={clienteId}
          contratoId={contratoId}
          nomeCompleto={user.nome}
          email={user.email}
          telefone={user.telefone}
          documento={user.documento}
          licencasContratadas={licencasContratadas ?? 0}
          precoUnitario={precoUnitario}
        />
      )}
    </div>
  );
}
