"use client";

import React, { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";

type Parceiro = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  aprovado: boolean;
};

type Cupom = {
  id: string;
  codigo: string;
  tipo: string;
  valor: number;
  ativo: boolean;
  comissao_percentual: number | null;
};

type CupomDB = Cupom & { parceiro_id: string };

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

  useEffect(() => {
    if (!loading && role !== "admin") router.replace("/dashboard");
  }, [loading, role, router]);

  useEffect(() => {
    refreshAll();
  }, []);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function refreshAll() {
    setBusy(true);
    try {
      const { data: p } = await supabase
        .from("parceiros")
        .select("id,nome,documento,email,telefone,aprovado");
      setParceiros(p ?? []);

      const { data: c } = await supabase
        .from("cupons")
        .select("id,codigo,tipo,valor,ativo,comissao_percentual,parceiro_id");
      const map: Record<string, Cupom[]> = {};
      ((c as CupomDB[]) ?? []).forEach((row) => {
        const pid = row.parceiro_id;
        if (!map[pid]) map[pid] = [];
        map[pid].push(row as Cupom);
      });
      setCuponsMap(map);

      // fetch empresas elegiveis via server API
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/parceiros/empresas", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const j = await res.json().catch(() => null);
        const empresas = res.ok && j && j.empresas ? (j.empresas as Empresa[]) : [];
        const emap: Record<string, Empresa[]> = {};
        (empresas ?? []).forEach((row) => {
          const pid = row.parceiro_id;
          if (!emap[pid]) emap[pid] = [];
          emap[pid].push(row);
        });
        setEmpresasMap(emap);
      } catch (e) {
        console.warn("Falha ao carregar empresas elegíveis", e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function parseCompanyPaste(text: string) {
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
      const percentual = parts[1]
        ? Number((parts[1] || "").replace(/[^0-9\.,]/g, "").replace(",", "."))
        : null;
      const nome = (parts[2] ?? "").trim() || null;
      return { cnpj, percentual, nome };
    });

    const valid = regs.filter(
      (r) =>
        r.cnpj &&
        r.cnpj.length === 14 &&
        r.percentual !== null &&
        !isNaN(r.percentual),
    );
    return valid;
  }

  async function onBuildPreviewCompanies() {
    setBulkError(null);
    const total = paste.split(/\r?\n/).filter(Boolean).length;
    const regs = parseCompanyPaste(paste);

    if (regs.length < total) {
      setBulkError(`${total - regs.length} linhas ignoradas por erro.`);
    }
    if (!regs.length) {
      setBulkError("Nenhuma linha válida. Use: cnpj;percentual;nome");
      setBulkPreview([]);
      return;
    }
    setBulkPreview(regs.slice(0, 100));
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
    setBusy(true);
    try {
      const { error } = await supabase
        .from("parceiros")
        .insert([
          {
            nome: novoNome.trim(),
            documento: novoDocumento || null,
            email: novoEmail || null,
            telefone: novoTelefone || null,
            aprovado: true,
          },
        ]);
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
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createCupom() {
    if (!cupomParceiroId) return alert("Selecione um parceiro");
    if (!cupomCodigo.trim()) return alert("Informe o código do cupom");
    setBusy(true);
    try {
      const payload: any = {
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
    } catch (e: any) {
      alert(e.message ?? String(e));
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
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Parceiros e Cupons</h1>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Novo Parceiro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome"
            className="col-span-2 h-10 p-2 border rounded"
          />
          <input
            value={novoDocumento}
            onChange={(e) => setNovoDocumento(e.target.value)}
            placeholder="Documento (CNPJ/CPF)"
            className="h-10 p-2 border rounded"
          />
          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="E-mail"
            className="h-10 p-2 border rounded"
          />
          <input
            value={novoTelefone}
            onChange={(e) => setNovoTelefone(e.target.value)}
            placeholder="Telefone"
            className="h-10 p-2 border rounded"
          />
          <div className="col-span-1 sm:col-span-4">
            <button
              disabled={busy}
              onClick={createParceiro}
              className="px-4 py-2 bg-brand text-white rounded"
            >
              Criar Parceiro
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Novo Cupom</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            value={cupomParceiroId ?? ""}
            onChange={(e) => setCupomParceiroId(e.target.value)}
            className="h-10 p-2 border rounded"
          >
            <option value="">Selecione parceiro</option>
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
            className="h-10 p-2 border rounded"
          />
          <select
            value={cupomTipo}
            onChange={(e) => setCupomTipo(e.target.value)}
            className="h-10 p-2 border rounded"
          >
            <option value="desconto">Desconto (%)</option>
            <option value="fixo">Fixo (R$)</option>
            <option value="comissao">Comissão (%)</option>
          </select>
          <input
            type="number"
            value={String(cupomValor)}
            onChange={(e) =>
              setCupomValor(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Valor"
            className="h-10 p-2 border rounded"
          />
          <div className="col-span-1 sm:col-span-4">
            <button
              disabled={busy}
              onClick={createCupom}
              className="px-4 py-2 bg-brand text-white rounded"
            >
              Criar Cupom
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Empresas elegíveis (parceiros)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
          <select
            value={empresaParceiroId ?? ""}
            onChange={(e) => setEmpresaParceiroId(e.target.value)}
            className="h-10 p-2 border rounded"
          >
            <option value="">Selecione parceiro (opcional)</option>
            {parceiros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            value={empresaCnpj}
            onChange={(e) => setEmpresaCnpj(e.target.value)}
            placeholder="CNPJ (somente dígitos)"
            className="h-10 p-2 border rounded"
          />
          <input
            type="number"
            value={String(empresaPercentual)}
            onChange={(e) =>
              setEmpresaPercentual(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            placeholder="Percentual (%)"
            className="h-10 p-2 border rounded"
          />
          <div className="col-span-1 sm:col-span-4">
            <button
              disabled={busy}
              onClick={createEmpresa}
              className="px-4 py-2 bg-brand text-white rounded"
            >
              Adicionar Empresa
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium mb-2">Importar via CSV / colar</h3>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="CNPJ;percentual;nome (uma linha por empresa)"
            className="w-full h-28 p-2 border rounded mb-2"
          />
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onBuildPreviewCompanies}
              className="px-3 py-1 bg-gray-100 rounded"
            >
              Pré-visualizar
            </button>
            <button
              disabled={importBusy}
              onClick={importCompaniesBulk}
              className="px-3 py-1 bg-brand text-white rounded"
            >
              Importar
            </button>
            {bulkError && (
              <div className="text-sm text-red-600">{bulkError}</div>
            )}
          </div>
          {bulkPreview.length > 0 && (
            <div className="max-h-48 overflow-auto border rounded p-2 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-1">CNPJ</th>
                    <th className="p-1">Percentual</th>
                    <th className="p-1">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((r, i) => (
                    <tr key={i}>
                      <td className="p-1">{r.cnpj}</td>
                      <td className="p-1">{r.percentual}</td>
                      <td className="p-1">{r.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Parceiros</h2>
        <div className="space-y-3">
          {parceiros.map((p) => (
            <div key={p.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.nome}</div>
                  <div className="text-xs text-slate-500">
                    {p.documento} • {p.email} • {p.telefone}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleParceiroAtivo(p.id, p.aprovado)}
                    className="px-3 py-1 bg-gray-100 rounded"
                  >
                    {p.aprovado ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Cupons</div>
                <div className="space-y-2">
                  {(cuponsMap[p.id] ?? []).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-surface-muted p-2 rounded"
                    >
                      <div>
                        <div className="font-semibold">
                          {c.codigo} — {c.tipo}{" "}
                          {c.tipo !== "comissao" ? `(${c.valor})` : ``}
                        </div>
                        <div className="text-xs text-slate-500">
                          Comissão: {c.comissao_percentual ?? 0}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCupomAtivo(c.id, c.ativo)}
                          className="px-3 py-1 bg-gray-100 rounded"
                        >
                          {c.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-2">Todas as empresas elegíveis</h2>
        <div className="space-y-2">
          {Object.keys(empresasMap).length === 0 && (
            <div className="text-sm text-slate-500">
              Nenhuma empresa cadastrada.
            </div>
          )}
          {Object.entries(empresasMap).map(([pid, list]) => (
            <div key={pid} className="border rounded p-3">
              <div className="font-semibold mb-2">
                {parceiros.find((x) => x.id === pid)?.nome ?? pid}
              </div>
              <div className="space-y-1">
                {list.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-2 bg-white rounded"
                  >
                    <div>
                      <div className="font-medium">
                        {e.cnpj} — {e.nome ?? "(sem nome)"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Desconto: {e.percentual ?? 0}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEmpresaAtivo(e.id, e.ativo)}
                        className="px-3 py-1 bg-gray-100 rounded"
                      >
                        {e.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => deleteEmpresa(e.id)}
                        className="px-3 py-1 bg-red-100 rounded"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
