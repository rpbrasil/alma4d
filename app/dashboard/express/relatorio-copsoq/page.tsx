"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ExportToolbar } from "@/components/dashboard/ExportToolbar";
import { AlertCircle, Building2, Layers, ShieldAlert } from "lucide-react";
import { CopsoqOfficialReport } from "@/dashboard/premium/relatorios/psicossocial/copsoq/CopsoqOfficialReport";

type Role = "admin" | "cliente" | "gestor" | "usuario";

type UsuarioAuth = {
  id: string;
  role: Role;
  cliente_id: string | null;
};

type RowRisco = {
  cliente_id: string;
  departamento_id: string | null;
  setor_id: string | null;
  departamento_nome?: string | null;
  setor_nome?: string | null;
  escala: string;
  n_respostas: number;
  media: number | null;
  nivel_risco: "baixo" | "medio" | "alto" | null;
  prioridade: number | null;
};

function formatNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2).replace(".", ",");
}

function riskLabel(nivel: RowRisco["nivel_risco"]) {
  if (nivel === "alto") return "Alto";
  if (nivel === "medio") return "Médio";
  if (nivel === "baixo") return "Baixo";
  return "—";
}

function riskClass(nivel: RowRisco["nivel_risco"]) {
  if (nivel === "alto")
    return "bg-[#DF633F]/10 border-[#DF633F] text-[#DF633F]";
  if (nivel === "medio")
    return "bg-[#6126E2]/10 border-[#6126E2] text-[#6126E2]";
  if (nivel === "baixo")
    return "bg-[#019499]/10 border-[#019499] text-[#019499]";
  return "bg-slate-50 border-slate-200 text-slate-700";
}

export default function DashboardExpressRelatorioCopsoqPage() {
  const { user, role: authRole, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [clienteNome, setClienteNome] = useState<string>("—");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [me, setMe] = useState<UsuarioAuth | null>(null);
  const [error, setError] = useState<string>("");

  // Dados agregados (view)
  const [rows, setRows] = useState<RowRisco[]>([]);

  // Filtros de visualização (somente agregados)
  const [filterDepartamentoId, setFilterDepartamentoId] =
    useState<string>("todos");
  const [filterSetorId, setFilterSetorId] = useState<string>("todos");

  const normalizedRole = (
    me?.role ??
    (authRole as Role | undefined) ??
    ""
  ).toLowerCase() as Role;
  const isAdmin = normalizedRole === "admin";
  const isCliente = normalizedRole === "cliente";
  const isGestor = normalizedRole === "gestor";
  const isUsuario = normalizedRole === "usuario";

  const canViewDashboard = isAdmin || isCliente;
  const canExport = isAdmin || isCliente;

  const reportRef = useRef<HTMLDivElement>(null);

  const generatedAt = useMemo(() => new Date().toLocaleString("pt-BR"), []);
  // Cliente efetivo: sempre me.cliente_id (já que é express)
  const effectiveClienteId = useMemo(() => {
    return me?.cliente_id ?? null;
  }, [me?.cliente_id]);

  const [reportId] = useState(() => `COPSOQ_${Date.now()}`);

  // 1) carrega me
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.id) {
        if (mounted) {
          setLoading(false);
          setMe(null);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data: usuario, error: uErr } = await supabase
          .from("usuarios")
          .select("id, role, cliente_id")
          .eq("id", user.id)
          .single();

        if (uErr || !usuario?.role) {
          if (mounted)
            setError("Não foi possível carregar o perfil do usuário.");
          return;
        }

        const authUser: UsuarioAuth = {
          id: usuario.id,
          role: usuario.role as Role,
          cliente_id:
            (usuario as { cliente_id: string | null }).cliente_id ?? null,
        };

        if (!mounted) return;

        setMe(authUser);
      } catch (e: unknown) {
        if (mounted)
          setError(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id, supabase]);

  // 2) carrega rows agregadas quando cliente muda
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!canViewDashboard) return;

      if (!effectiveClienteId) {
        if (mounted) setRows([]);
        return;
      }

      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("copsoq_vw_risco_escalas")
        .select(
          "cliente_id, departamento_id, departamento_nome, setor_id, setor_nome, escala, n_respostas, media, nivel_risco, prioridade",
        )
        .eq("cliente_id", effectiveClienteId)
        .order("prioridade", { ascending: false });

      if (!mounted) return;

      if (error) {
        setError("Não foi possível carregar o relatório COPSOQ.");
        setRows([]);
      } else {
        setRows((data ?? []) as RowRisco[]);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [effectiveClienteId, canViewDashboard, supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!effectiveClienteId) {
        if (mounted) setClienteNome("—");
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .select("nome")
        .eq("id", effectiveClienteId)
        .single();

      if (!mounted) return;

      if (error) {
        setClienteNome("Cliente");
        return;
      }

      setClienteNome(data?.nome ?? "Cliente");
    })();

    return () => {
      mounted = false;
    };
  }, [effectiveClienteId, supabase]);

  // opções de depto/setor a partir das rows
  const departamentosOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!r.departamento_id) continue;
      const nome = (r.departamento_nome ?? "").trim() || "Departamento";
      map.set(r.departamento_id, nome);
    }
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rows]);

  const setoresOptions = useMemo(() => {
    const map = new Map<string, { nome: string; depId: string | null }>();
    for (const r of rows) {
      if (!r.setor_id) continue;
      const nome = (r.setor_nome ?? "").trim() || "Setor";
      map.set(r.setor_id, { nome, depId: r.departamento_id ?? null });
    }

    const list = Array.from(map.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      depId: v.depId,
    }));

    // se filtro depto ativo, reduz opções
    const filtered =
      filterDepartamentoId === "todos"
        ? list
        : list.filter((s) => s.depId === filterDepartamentoId);

    return filtered.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rows, filterDepartamentoId]);

  // aplica filtros (depto/setor) no agregado
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (
        filterDepartamentoId !== "todos" &&
        r.departamento_id !== filterDepartamentoId
      )
        return false;
      if (filterSetorId !== "todos" && r.setor_id !== filterSetorId)
        return false;
      return true;
    });
  }, [rows, filterDepartamentoId, filterSetorId]);

  const resumo = useMemo(() => {
    const totalRespostas = filteredRows.reduce(
      (acc, r) => acc + (r.n_respostas ?? 0),
      0,
    );
    const altos = filteredRows.filter((r) => r.nivel_risco === "alto").length;
    const medios = filteredRows.filter((r) => r.nivel_risco === "medio").length;
    const baixos = filteredRows.filter((r) => r.nivel_risco === "baixo").length;
    return {
      totalRespostas,
      altos,
      medios,
      baixos,
      escalas: filteredRows.length,
    };
  }, [filteredRows]);

  const gruposOrg = useMemo(() => {
    const depMap = new Map<
      string,
      {
        departamento_id: string | null;
        departamento_nome: string;
        setores: {
          setor_id: string | null;
          setor_nome: string;
          rows: RowRisco[];
        }[];
      }
    >();

    for (const r of filteredRows) {
      const depKey = r.departamento_id ?? "__sem_departamento__";
      const depNome = (r.departamento_nome ?? "").trim() || "Sem departamento";

      if (!depMap.has(depKey)) {
        depMap.set(depKey, {
          departamento_id: r.departamento_id ?? null,
          departamento_nome: depNome,
          setores: [],
        });
      }

      const dep = depMap.get(depKey)!;

      const setKey = r.setor_id ?? "__sem_setor__";
      const setNome = (r.setor_nome ?? "").trim() || "Sem setor";

      let setor = dep.setores.find(
        (s) => (s.setor_id ?? "__sem_setor__") === setKey,
      );
      if (!setor) {
        setor = { setor_id: r.setor_id ?? null, setor_nome: setNome, rows: [] };
        dep.setores.push(setor);
      }
      setor.rows.push(r);
    }

    const deps = Array.from(depMap.values()).sort((a, b) =>
      a.departamento_nome.localeCompare(b.departamento_nome, "pt-BR"),
    );

    for (const d of deps) {
      d.setores.sort((a, b) =>
        a.setor_nome.localeCompare(b.setor_nome, "pt-BR"),
      );
      for (const s of d.setores) {
        s.rows.sort((a, b) => (b.prioridade ?? -1) - (a.prioridade ?? -1));
      }
    }

    return deps;
  }, [filteredRows]);

  // UX: bloqueio de acesso (gestor/usuario)
  if (!authLoading && (isGestor || isUsuario)) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <ShieldAlert className="mx-auto text-yellow-700 mb-2" size={22} />
        <p className="text-yellow-900 font-semibold">Relatório Psicossocial</p>
        <p className="text-yellow-800 text-sm mt-1">
          Você ainda não tem acesso a este relatório (somente agregados).
        </p>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#019499]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Relatório COPSOQ
          </h2>
          <p className="text-sm text-slate-500">
            Agregado por departamento e setor • uso organizacional (LGPD/NR‑01)
          </p>
        </div>

        {canExport ? (
          <div className="flex items-center gap-2">
            {/* Print */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              Imprimir
            </button>

            {/* PDF */}
            <style>{`
        .btn-pdf {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #030870;
          background: #030870;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-pdf:hover:not(:disabled) {
          background: #02065a;
        }

        .btn-pdf:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

            <button
              type="button"
              disabled={pdfLoading}
              onClick={async () => {
                try {
                  if (!reportRef.current) {
                    alert("Relatório não encontrado.");
                    return;
                  }
                  setPdfLoading(true);
                  // HTML do relatório (fonte única da verdade)
                  const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body>
            ${reportRef.current.outerHTML}
          </body>
        </html>
      `;

                  const safeCliente = clienteNome.replace(/[^a-zA-Z0-9]/g, "");
                  const dataImpressao = new Date()
                    .toLocaleDateString("pt-BR")
                    .replace(/\//g, "-");
                  const filename = `RelatorioCOPSOQ_${safeCliente}_${dataImpressao}.pdf`;

                  await fetch("/api/copsoq/pdf", {
                    method: "POST",
                    headers: { "Content-Type": "text/html" },
                    body: html,
                  }).then(async (res) => {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  });
                } catch (err) {
                  console.error(err);
                  alert("Erro ao gerar o PDF. Tente novamente.");
                } finally {
                  setPdfLoading(false);
                }
              }}
              className="btn-pdf"
            >
              {pdfLoading ? (
                <>
                  <span className="spinner" />
                  Gerando PDF…
                </>
              ) : (
                <>Gerar Relatório</>
              )}
            </button>

            {/* Excel */}
            <ExportToolbar
              title="COPSOQ_Psicossocial"
              rows={filteredRows}
              showPrint={false}
              showExcel={true}
              columns={[
                {
                  label: "Departamento",
                  getValue: (r) => r.departamento_nome ?? "Sem departamento",
                },
                {
                  label: "Setor",
                  getValue: (r) => r.setor_nome ?? "Sem setor",
                },
                { label: "Escala", key: "escala" },
                { label: "N respostas", key: "n_respostas" },
                {
                  label: "Média",
                  getValue: (r) =>
                    r.media === null ? null : Number(r.media.toFixed(2)),
                },
                { label: "Nível", getValue: (r) => riskLabel(r.nivel_risco) },
                { label: "Prioridade", getValue: (r) => r.prioridade ?? null },
              ]}
            />
          </div>
        ) : null}
      </div>

      {/* Aviso de sigilo */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
        <b>Confidencialidade:</b> resultados agregados (sem identificação
        individual). Uso exclusivo para análise organizacional e preventiva.
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Departamento
          </label>
          <select
            value={filterDepartamentoId}
            onChange={(e) => {
              setFilterDepartamentoId(e.target.value);
              setFilterSetorId("todos");
            }}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="todos">Todos</option>
            {departamentosOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Setor
          </label>
          <select
            value={filterSetorId}
            onChange={(e) => setFilterSetorId(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="todos">Todos</option>
            {setoresOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Layers className="text-slate-600" size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Escalas no recorte
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {resumo.escalas}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Building2 className="text-slate-600" size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Cliente
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {clienteNome}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Total de respostas
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {resumo.totalRespostas}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Risco alto
          </p>
          <p className="mt-1 text-2xl font-extrabold text-[#DF633F]">
            {resumo.altos}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Risco médio
          </p>
          <p className="mt-1 text-2xl font-extrabold text-[#6126E2]">
            {resumo.medios}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Risco baixo
          </p>
          <p className="mt-1 text-2xl font-extrabold text-[#019499]">
            {resumo.baixos}
          </p>
        </div>
      </div>

      {/* Conteúdo por departamento/setor */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">Sem dados no recorte atual.</p>
          <p className="text-xs text-gray-500 mt-2">
            (Nenhuma aplicação concluída ou filtros muito restritivos.)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {gruposOrg.map((dep) => (
            <div
              key={dep.departamento_id ?? "dep-null"}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <p className="text-sm font-extrabold text-[#030870]">
                {dep.departamento_nome}
              </p>

              <div className="mt-4 space-y-4">
                {dep.setores.map((set) => (
                  <div
                    key={set.setor_id ?? "set-null"}
                    className="border-l-4 border-slate-200 pl-4"
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {set.setor_nome}
                    </p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {set.rows.map((r, idx) => (
                        <div
                          key={`${r.escala}-${idx}`}
                          className={`rounded-xl border p-4 ${riskClass(r.nivel_risco)}`}
                        >
                          <p className="font-extrabold text-slate-900">
                            {r.escala}
                          </p>

                          <div className="mt-2 text-sm text-slate-700 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Nível</span>
                              <span className="font-semibold">
                                {riskLabel(r.nivel_risco)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Prioridade</span>
                              <span className="font-semibold">
                                {r.prioridade !== null
                                  ? `${Number(r.prioridade).toFixed(0)}%`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Média</span>
                              <span className="font-semibold">
                                {formatNum(r.media)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">
                                N respostas
                              </span>
                              <span className="font-semibold">
                                {r.n_respostas}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                * Resultados agregados por escala, setor e departamento.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Relatório oficial (offscreen) para geração do PDF */}
      <div
        style={{
          position: "absolute",
          left: -100000,
          top: 0,
          width: 900,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <CopsoqOfficialReport
          ref={reportRef}
          clienteNome={clienteNome}
          rows={filteredRows}
          generatedAt={generatedAt}
          reportId={reportId}
        />
      </div>
    </div>
  );
}
