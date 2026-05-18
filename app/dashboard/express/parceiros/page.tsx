"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";

type Parceiro = {
  id: string;
  nome: string;
  aprovado: boolean;
  tipo: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  pagarme_recipient_id: string | null;
  created_at: string;
  updated_at: string;
};

type Cupom = {
  id: string;
  codigo: string;
  tipo: string;
  valor: number;
  ativo: boolean;
  comissao_percentual: number | null;
};

type CupomDB = Cupom & { parceiro_id?: string | null };

type Empresa = {
  id: string;
  parceiro_id: string;
  cnpj: string;
  nome: string | null;
  percentual: number;
  ativo: boolean;
};

type BulkEmpresa = {
  cnpj: string;
  percentual: number;
  nome: string | null;
};

export default function DashboardExpressParceirosPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [cuponsMap, setCuponsMap] = useState<Record<string, Cupom[]>>({});

  const [busy, setBusy] = useState(false);

  // form state
  const [novoNome, setNovoNome] = useState("");
  const [novoDocumento, setNovoDocumento] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");

  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomTipo, setCupomTipo] = useState("desconto");
  const [cupomValor, setCupomValor] = useState<number | "">(10);
  const [cupomParceiroId, setCupomParceiroId] = useState<string | null>(null);

  // empresas elegíveis
  const [empresasMap, setEmpresasMap] = useState<Record<string, Empresa[]>>({});
  const [empresaParceiroId, setEmpresaParceiroId] = useState<string | null>(
    null,
  );
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [empresaPercentual, setEmpresaPercentual] = useState<number | "">(10);
  const [paste, setPaste] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkEmpresa[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [tab, setTab] = useState<"single" | "bulk">("single");

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const isRefreshingRef = React.useRef(false);

  const refreshAll = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setBusy(true);

    try {
      console.log("🔄 refresh start");

      const { data: p, error } = await supabase.from("parceiros").select("*");

      if (error) throw new Error(error.message);

      setParceiros((p ?? []) as Parceiro[]);

      const { data: c } = await supabase.from("cupons").select("*");

      const map: Record<string, Cupom[]> = {};
      (c as CupomDB[] | null)?.forEach((row) => {
        if (!row.parceiro_id) return;
        if (!map[row.parceiro_id]) map[row.parceiro_id] = [];
        map[row.parceiro_id].push(row);
      });

      setCuponsMap(map);

      const token = await getAccessToken();

      const res = await fetch("/api/parceiros/empresas", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar empresas");
      }
      const j = await res.json().catch(() => null);

      const empresas: Empresa[] = res.ok && j?.empresas ? j.empresas : [];

      const emap: Record<string, Empresa[]> = {};

      empresas.forEach((row) => {
        if (!emap[row.parceiro_id]) emap[row.parceiro_id] = [];
        emap[row.parceiro_id].push(row);
      });

      setEmpresasMap(emap);

      console.log("✅ refresh ok");
    } catch (e) {
      console.error("❌ erro refresh:", e);
    } finally {
      isRefreshingRef.current = false;
      setBusy(false);
    }
  }, [getAccessToken]);

  // only allow admin
  useEffect(() => {
    if (!loading && role !== "admin") router.replace("/dashboard");
  }, [loading, role, router]);

  // initial load
  useEffect(() => {
    async function load() {
      await refreshAll();
    }

    void load();
  }, [refreshAll]);

  function parseCompanyPaste(text: string): BulkEmpresa[] {
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

      const cnpj = (parts[0] ?? "").replace(/\D/g, "");

      const percentualRaw = String(parts[1] ?? "")
        .replace(/[^0-9\.,]/g, "")
        .replace(",", ".");
      const percentual = Number(percentualRaw);

      const nome = (parts[2] ?? "").trim() || null;

      return { cnpj, percentual, nome };
    });

    // ✅ type guard garante que o retorno é BulkEmpresa[]
    return regs.filter(
      (r): r is BulkEmpresa =>
        r.cnpj.length === 14 && Number.isFinite(r.percentual),
    );
  }

  async function onBuildPreviewCompanies() {
    setBulkError(null);

    const total = paste.split(/\r?\n/).filter(Boolean).length;
    const regs = parseCompanyPaste(paste); // BulkEmpresa[]

    if (regs.length < total) {
      setBulkError(`${total - regs.length} linhas ignoradas por erro.`);
    }
    if (!regs.length) {
      setBulkError("Nenhuma linha válida. Use: cnpj;percentual;nome");
      setBulkPreview([]);
      return;
    }

    setBulkPreview(regs.slice(0, 100)); // ✅ agora tipa OK
  }

  async function importCompaniesBulk() {
    setBulkError(null);
    setImportBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const rows = parseCompanyPaste(paste);
      if (!rows.length) throw new Error("Nenhuma linha válida para importar.");
      // attach parceiro_id if selected
      const payload = rows.map((r) => ({
        ...r,
        parceiro_id: empresaParceiroId,
      }));
      const res = await fetch("/api/parceiros/empresas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha na importação");
      setPaste("");
      setBulkPreview([]);
      await refreshAll();
      alert("Importação concluída.");
    } catch (e: unknown) {
      setBulkError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  }

  async function createEmpresa() {
    if (!empresaParceiroId) return alert("Selecione um parceiro");
    const cnpj = (empresaCnpj || "").replace(/\D/g, "");
    if (cnpj.length !== 14) return alert("CNPJ inválido");
    const perc = Number(empresaPercentual) || 0;
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/parceiros/empresas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parceiro_id: empresaParceiroId,
          cnpj,
          percentual: perc,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j.error || "Falha ao criar empresa elegível");
      setEmpresaCnpj("");
      setEmpresaPercentual(10);
      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEmpresaAtivo(id: string, atual: boolean) {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `/api/parceiros/empresas/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ativo: !atual }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Erro");
      }
      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmpresa(id: string) {
    if (!confirm("Confirma exclusão desta empresa elegível?")) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `/api/parceiros/empresas/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Erro");
      }
      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createParceiro() {
    if (!novoNome.trim()) return alert("Informe o nome do parceiro");
    if (!novoEmail && !novoTelefone) {
      return alert("Informe email ou telefone");
    }

    setBusy(true);

    try {
      const payload = {
        nome: novoNome.trim(),
        documento: novoDocumento || null,
        email: novoEmail || null,
        telefone: novoTelefone || null,
        aprovado: true,
        tipo: "pj",
      };

      const { error } = await supabase.from("parceiros").insert([payload]);

      if (error) throw error;

      setNovoNome("");
      setNovoDocumento("");
      setNovoEmail("");
      setNovoTelefone("");

      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleParceiroAtivo(id: string, atual: boolean) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("parceiros")
        .update({ aprovado: !atual })
        .eq("id", id);
      if (error) throw error;
      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createCupom() {
    if (!cupomParceiroId) return alert("Selecione um parceiro");
    if (!cupomCodigo.trim()) return alert("Informe o código do cupom");
    setBusy(true);
    try {
      const payload: unknown = {
        codigo: cupomCodigo.trim().toUpperCase(),
        parceiro_id: cupomParceiroId,
        tipo: cupomTipo,
        valor: Number(cupomValor) || 0,
        ativo: true,
      };
      const { error } = await supabase.from("cupons").insert([payload]);
      if (error) throw error;
      setCupomCodigo("");
      setCupomValor(10);
      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleCupomAtivo(id: string, atual: boolean) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("cupons")
        .update({ ativo: !atual })
        .eq("id", id);
      if (error) throw error;
      await refreshAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Gestão de parceiros
            </h1>
          </div>

          <div className="text-sm text-slate-600">
            Parceiros: <strong>{parceiros.length}</strong>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={refreshAll}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? "Atualizando..." : "Atualizar dados"}
          </button>
        </div>
      </div>

      {/* ================= PARCEIROS ================= */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Parceiros</h2>

        {/* FORM */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />

          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="Email"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />

          <input
            value={novoDocumento}
            onChange={(e) => setNovoDocumento(e.target.value)}
            placeholder="Documento (CPF/CNPJ)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />

          <div className="sm:col-span-3">
            <button
              onClick={createParceiro}
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
            >
              Criar parceiro
            </button>
          </div>
        </div>

        {/* LISTA */}
        <div className="mt-6 space-y-3">
          {parceiros.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum parceiro cadastrado</p>
          )}

          {parceiros.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-slate-200 p-3 text-sm space-y-2"
            >
              {/* HEADER */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-slate-800">{p.nome}</div>

                  <div className="text-xs text-slate-500">
                    {p.tipo} • {p.documento ?? "sem documento"}
                  </div>
                </div>

                <button
                  onClick={() => toggleParceiroAtivo(p.id, p.aprovado)}
                  className="text-xs text-slate-700 hover:text-slate-900"
                >
                  {p.aprovado ? "Desativar" : "Ativar"}
                </button>
              </div>

              {/* CONTATO */}
              <div className="text-xs text-slate-500 space-y-1">
                {p.email && <div>📧 {p.email}</div>}
                {p.telefone && <div>📞 {p.telefone}</div>}
              </div>

              {/* FINANCEIRO */}
              {p.pagarme_recipient_id && (
                <div className="text-xs text-slate-500">
                  💳 recipient: {p.pagarme_recipient_id}
                </div>
              )}

              {/* META */}
              <div className="text-xs text-slate-400">
                criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CUPONS ================= */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Cupons</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <select
            value={cupomParceiroId ?? ""}
            onChange={(e) => setCupomParceiroId(e.target.value || null)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="">Parceiro</option>
            {parceiros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            value={cupomCodigo}
            onChange={(e) => setCupomCodigo(e.target.value)}
            placeholder="Código"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />

          <select
            value={cupomTipo}
            onChange={(e) => setCupomTipo(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="desconto">Desconto</option>
            <option value="fixo">Fixo</option>
          </select>

          <button
            onClick={createCupom}
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Criar
          </button>
        </div>

        {Object.entries(cuponsMap).map(([pid, list]) => (
          <div key={pid} className="mt-4">
            <div className="text-sm font-semibold text-slate-700">
              {parceiros.find((p) => p.id === pid)?.nome}
            </div>

            {list.map((c) => (
              <div
                key={c.id}
                className="flex justify-between text-sm border border-slate-200 rounded p-2 mt-1"
              >
                <span>{c.codigo}</span>

                <button onClick={() => toggleCupomAtivo(c.id, c.ativo)}>
                  {c.ativo ? "Off" : "On"}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* ================= EMPRESAS ================= */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <select
          value={empresaParceiroId ?? ""}
          onChange={(e) => setEmpresaParceiroId(e.target.value || null)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
        >
          <option value="">Selecione parceiro</option>
          {parceiros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        {/* TABS */}
        <div className="flex gap-2 border-b border-slate-200 mb-4">
          <button
            onClick={() => setTab("single")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${
              tab === "single"
                ? "bg-white border border-slate-200 border-b-white text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Adicionar empresa
          </button>

          <button
            onClick={() => setTab("bulk")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${
              tab === "bulk"
                ? "bg-white border border-slate-200 border-b-white text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Importação em massa
          </button>
        </div>

        {/* SINGLE */}
        {tab === "single" && (
          <>
            <p className="text-sm text-slate-500">Cadastro manual de empresa</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                value={empresaCnpj}
                onChange={(e) => setEmpresaCnpj(e.target.value)}
                placeholder="CNPJ"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              />

              <input
                type="number"
                value={String(empresaPercentual)}
                onChange={(e) =>
                  setEmpresaPercentual(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="Percentual"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              />

              <button
                onClick={createEmpresa}
                disabled={busy}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
              >
                Adicionar
              </button>
            </div>
          </>
        )}

        {/* BULK */}
        {tab === "bulk" && (
          <>
            <p className="text-sm text-slate-500">
              Importação em massa de empresas
            </p>

            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              className="mt-4 min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm bg-white"
              placeholder="cnpj;percentual;nome"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={onBuildPreviewCompanies}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Prévia
              </button>

              <button
                onClick={importCompaniesBulk}
                disabled={importBusy}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
              >
                Importar
              </button>
            </div>

            {bulkError && (
              <p className="mt-2 text-sm text-red-600">{bulkError}</p>
            )}

            {!!bulkPreview.length && (
              <div className="mt-4 text-sm border border-slate-200 rounded-lg p-3 bg-slate-50">
                {bulkPreview.map((r, i) => (
                  <div key={i}>
                    {r.cnpj} — {r.percentual}% — {r.nome}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* ================= EMPRESAS LISTA ================= */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Empresas elegíveis
        </h2>

        {Object.entries(empresasMap).map(([pid, list]) => (
          <div key={pid} className="mt-4">
            <div className="text-sm font-semibold text-slate-700">
              {parceiros.find((p) => p.id === pid)?.nome}
            </div>

            {list.map((e) => (
              <div
                key={e.id}
                className="flex justify-between text-sm border border-slate-200 rounded p-2 mt-1"
              >
                <span>{e.cnpj}</span>

                <div className="flex gap-2">
                  <button onClick={() => toggleEmpresaAtivo(e.id, e.ativo)}>
                    {e.ativo ? "Off" : "On"}
                  </button>

                  <button onClick={() => deleteEmpresa(e.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
