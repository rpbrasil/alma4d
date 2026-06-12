"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

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
  parceiro_id: string;

  tipo: "desconto" | "comissao";

  percentual: number; // ✅ principal campo
  valor: number;

  ativo: boolean;

  plano: string | null;
  minimo_valor: number | null;
  maximo_desconto: number | null;

  limite_total: number | null;
  usos_total: number;

  valido_de: string | null;
  valido_ate: string | null;

  comissao_percentual: number;

  created_at: string;
};

type CupomDB = Cupom & { parceiro_id?: string | null };

type Empresa = {
  id: string;
  parceiro_id: string;
  cnpj: string;
  razao_social: string | null;
  ativo: boolean;
  created_at: string;
};

type BulkEmpresa = {
  cnpj: string;
  percentual: number;
  nome: string | null;
};

// ================== Utils BR (CPF/CNPJ/Telefone) ==================
function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

function formatCpfCnpj(input: string) {
  const d = onlyDigits(input);

  // CPF: 000.000.000-00
  if (d.length <= 11) {
    const cpf = d.slice(0, 11);
    return cpf
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  // CNPJ: 00.000.000/0000-00
  const cnpj = d.slice(0, 14);
  return cnpj
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function isValidCPF(cpfDigits: string) {
  const cpf = onlyDigits(cpfDigits);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base9 = cpf.slice(0, 9);
  const d1 = calc(base9, 10);
  const d2 = calc(base9 + d1, 11);

  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function isValidCNPJ(cnpjDigits: string) {
  const cnpj = onlyDigits(cnpjDigits);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base: string, factors: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, dig, i) => acc + Number(dig) * factors[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = cnpj.slice(0, 12);
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function isValidDocumentoBR(doc: string) {
  const d = onlyDigits(doc);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

/** (11) 99999-9999 ou (11) 9999-9999 */
function formatPhoneBR(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;

  const ddd = d.slice(0, 2);
  const rest = d.slice(2);

  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Normaliza telefone para E.164 (+55...). Aceita já vir +55 */
function normalizePhoneBRToE164(input: string) {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw.replace(/\s+/g, "");

  const digits = onlyDigits(raw);
  if (!digits) return "";

  // se já veio com 55...
  if (digits.startsWith("55")) return `+${digits}`;

  // assume BR
  return `+55${digits}`;
}

function isValidE164(phone: string) {
  return /^\+\d{10,15}$/.test(phone);
}

/** Para exibir telefone salvo (pode estar em +55..., ou só dígitos) */
function formatPhoneDisplay(stored: string | null) {
  if (!stored) return "";
  const s = stored.trim();
  if (!s) return "";

  // se for E.164 +55DDDN...
  if (s.startsWith("+")) {
    const digits = onlyDigits(s);
    // remove 55 se existir
    const br = digits.startsWith("55") ? digits.slice(2) : digits;
    return formatPhoneBR(br);
  }

  return formatPhoneBR(s);
}

function isValidEmailLoose(email: string) {
  const s = (email ?? "").trim();
  if (!s) return true; // email opcional
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);
}

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
  const [empresaRazaoSocial, setEmpresaRazaoSocial] = useState("");
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [empresaPercentual, setEmpresaPercentual] = useState<number | "">(10);
  const [paste, setPaste] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkEmpresa[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [search, setSearch] = useState("");
  const [cupomSearch, setCupomSearch] = useState("");
  const [empresaSearch, setEmpresaSearch] = useState("");

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
    } catch (e) {
      console.error("❌ erro refresh:", e);
    } finally {
      isRefreshingRef.current = false;
      setBusy(false);
    }
  }, [getAccessToken]);

  const parceirosFiltrados = parceiros.filter((p) => {
    const termo = search.toLowerCase();

    return (
      p.nome.toLowerCase().includes(termo) ||
      (p.documento ?? "").includes(termo)
    );
  });

  const cuponsFiltradosMap = Object.fromEntries(
    Object.entries(cuponsMap).map(([pid, list]) => [
      pid,
      list.filter((c) => {
        const termo = cupomSearch.toLowerCase();

        const matchBusca =
          !cupomSearch ||
          c.codigo.toLowerCase().includes(termo) ||
          (parceiros
            .find((p) => p.id === pid)
            ?.nome?.toLowerCase()
            .includes(termo) ??
            false);

        const matchParceiro = !cupomParceiroId || pid === cupomParceiroId;

        return matchBusca && matchParceiro;
      }),
    ]),
  );

  const empresasFiltradasMap = Object.fromEntries(
    Object.entries(empresasMap).map(([pid, list]) => [
      pid,
      list.filter((e) => {
        if (!empresaSearch) return false;

        const termo = empresaSearch.toLowerCase();

        return (
          e.cnpj.includes(onlyDigits(termo)) ||
          (e.razao_social ?? "").toLowerCase().includes(termo) ||
          (parceiros
            .find((p) => p.id === pid)
            ?.nome?.toLowerCase()
            .includes(termo) ??
            false)
        );
      }),
    ]),
  );
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
          razao_social: empresaRazaoSocial || null,
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
    const nome = novoNome.trim();
    if (!nome) return alert("Informe o nome do parceiro.");

    // documento: armazenar apenas dígitos (ou null)
    const docDigits = onlyDigits(novoDocumento);
    const documento = docDigits ? docDigits : null;

    // valida documento se preenchido
    if (documento && !isValidDocumentoBR(documento)) {
      return alert(
        "Documento inválido. Informe um CPF (11) ou CNPJ (14) válido.",
      );
    }

    // email opcional, mas se preencher tem que ser válido
    if (!isValidEmailLoose(novoEmail)) {
      return alert("E-mail inválido.");
    }

    // telefone opcional, mas se preencher tem que ser válido
    const phoneDigits = onlyDigits(novoTelefone);
    const telefoneE164 = phoneDigits ? normalizePhoneBRToE164(phoneDigits) : "";

    if (phoneDigits && !isValidE164(telefoneE164)) {
      return alert("Telefone inválido. Use DDD + número (ex.: 11 99999-9999).");
    }

    // exige pelo menos um contato
    if (!novoEmail.trim() && !phoneDigits) {
      return alert("Informe ao menos um contato: e-mail ou telefone.");
    }

    // tipo: se tiver documento, inferir; senão deixa default pj
    const tipo =
      documento?.length === 11 ? "pf" : documento?.length === 14 ? "pj" : "pj";

    setBusy(true);
    try {
      const payload = {
        nome: nome.toUpperCase(), // ✅ padroniza no banco também
        documento,
        email: novoEmail.trim() || null,
        telefone: telefoneE164 || null, // ✅ salva normalizado
        aprovado: true,
        tipo,
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
      const payload = {
        codigo: cupomCodigo.trim().toUpperCase(),
        parceiro_id: cupomParceiroId,
        tipo: cupomTipo,
        percentual: Number(cupomValor) || 0,
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
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Esquerda */}
          <div>
            <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              <Users className="mr-2 h-4 w-4" />
              Gestão Express
            </span>

            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Parceiros e associados
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Cadastre parceiros, gerencie cupons e controle empresas elegíveis
              para descontos.
            </p>
          </div>

          {/* Direita (mini dashboard) */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Parceiros</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {parceiros.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Cupons</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {Object.values(cuponsMap).flat().length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Empresas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {Object.values(empresasMap).flat().length}
              </p>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={refreshAll}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Atualizar dados
          </button>
        </div>
      </section>

      {/* ================= PARCEIROS ================= */}
      <div
        className="rounded-3xl border border-border bg-white p-6 shadow-sm
"
      >
        <h1 className="text-md font-semibold text-slate-900">Parceiros</h1>

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
            placeholder="E-mail"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />

          {/* ✅ máscara automática BR */}
          <input
            value={formatPhoneBR(novoTelefone)}
            onChange={(e) => setNovoTelefone(onlyDigits(e.target.value))}
            placeholder="Telefone (DDD + número)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            inputMode="numeric"
          />

          {/* ✅ CPF/CNPJ com máscara e validação */}
          <input
            value={formatCpfCnpj(novoDocumento)}
            onChange={(e) => setNovoDocumento(onlyDigits(e.target.value))}
            placeholder="Documento (CPF/CNPJ)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm sm:col-span-2"
            inputMode="numeric"
          />

          <button
            onClick={createParceiro}
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
          >
            Criar parceiro
          </button>

          {/* feedback rápido de validação (opcional, mas bem útil) */}
          <div className="sm:col-span-3 text-xs text-slate-500">
            {novoDocumento && onlyDigits(novoDocumento).length > 0 && (
              <span
                className={
                  isValidDocumentoBR(novoDocumento)
                    ? "text-green-700"
                    : "text-amber-700"
                }
              >
                {isValidDocumentoBR(novoDocumento)
                  ? "Documento válido"
                  : "Documento inválido"}
              </span>
            )}
          </div>
        </div>
        {/* BUSCA (lista inicia vazia) */}
        <div className="mt-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou documento"
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>
        {/* LISTA (compacta) */}
        <div className="mt-4 space-y-2">
          {!search && (
            <p className="text-sm text-slate-500">
              Digite para buscar parceiros.
            </p>
          )}

          {search && parceirosFiltrados.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhum parceiro encontrado.
            </p>
          )}

          {search &&
            parceirosFiltrados.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {/* linha 1 */}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 leading-tight">
                    {(p.nome ?? "").toUpperCase()}
                  </span>

                  {/* ✅ botão desativar forte (laranja) */}
                  <button
                    onClick={() => toggleParceiroAtivo(p.id, p.aprovado)}
                    className={`text-xs px-3 py-1 rounded-md font-semibold transition ${
                      p.aprovado
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {p.aprovado ? "Desativar" : "Ativar"}
                  </button>
                </div>

                {/* linha 2 */}
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 mt-1">
                  <span>
                    {p.tipo} • {p.documento ? formatCpfCnpj(p.documento) : "—"}
                  </span>

                  {p.email && <span>📧 {p.email}</span>}

                  {/* ✅ telefone sempre formatado bonito */}
                  {p.telefone && (
                    <span>📞 {formatPhoneDisplay(p.telefone)}</span>
                  )}
                </div>

                {/* linha 3 */}
                <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 mt-1">
                  <span>
                    desde {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>

                  {p.pagarme_recipient_id && (
                    <span>💳 {p.pagarme_recipient_id}</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ================= CUPONS ================= */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-md font-semibold text-slate-900">Cupons</h1>

        {/* FORM */}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <select
            value={cupomParceiroId ?? ""}
            onChange={(e) => setCupomParceiroId(e.target.value || null)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="">Parceiro</option>
            {parceiros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome.toUpperCase()}
              </option>
            ))}
          </select>

          <input
            value={cupomCodigo}
            onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
            placeholder="Código"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm uppercase"
          />

          <select
            value={cupomTipo}
            onChange={(e) => setCupomTipo(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="desconto">Desconto (%)</option>
            <option value="comissao">Comissão (%)</option>
          </select>

          <input
            type="number"
            value={cupomValor}
            onChange={(e) =>
              setCupomValor(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Percentual"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />

          <div className="sm:col-span-4">
            <button
              onClick={createCupom}
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              Criar cupom
            </button>
          </div>
        </div>

        {/* BUSCA */}
        <div className="mt-5">
          <input
            value={cupomSearch}
            onChange={(e) => setCupomSearch(e.target.value)}
            placeholder="Buscar por código ou parceiro"
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>

        {/* LISTA */}
        <div className="mt-6 space-y-3">
          {/* estado inicial */}
          {!cupomSearch && (
            <p className="text-sm text-slate-500">Digite para buscar cupons</p>
          )}

          {/* nenhum resultado */}
          {cupomSearch &&
            Object.values(cuponsFiltradosMap).flat().length === 0 && (
              <p className="text-sm text-slate-500">Nenhum cupom encontrado</p>
            )}

          {/* lista */}
          {cupomSearch &&
            Object.entries(cuponsFiltradosMap).map(([pid, list]) => {
              if (list.length === 0) return null;

              const parceiro = parceiros.find((p) => p.id === pid);

              return (
                <div key={pid}>
                  {/* parceiro */}
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {parceiro?.nome.toUpperCase() ?? "SEM PARCEIRO"}
                  </div>

                  <div className="space-y-1">
                    {list.map((c) => {
                      const expirado =
                        c.valido_ate && new Date(c.valido_ate) < new Date();

                      return (
                        <div
                          key={c.id}
                          className="flex justify-between items-center border border-slate-200 rounded px-3 py-2 text-sm"
                        >
                          <div className="flex flex-col leading-tight">
                            <span className="font-semibold text-slate-800">
                              {c.codigo.toUpperCase()}
                            </span>

                            <span className="text-xs text-slate-500">
                              {c.tipo === "desconto" &&
                                `${c.percentual}% desconto`}
                              {c.tipo === "comissao" &&
                                `${c.percentual}% comissão`}
                            </span>

                            <span className="text-xs text-slate-400">
                              usos: {c.usos_total}
                              {c.limite_total && ` / ${c.limite_total}`}
                              {c.valido_ate &&
                                ` • até ${new Date(
                                  c.valido_ate,
                                ).toLocaleDateString("pt-BR")}`}
                            </span>
                          </div>
                          <button
                            // eslint-disable-next-line react-hooks/refs
                            onClick={() => toggleCupomAtivo(c.id, c.ativo)}
                            className={`text-xs px-3 py-1 rounded-md font-semibold ${
                              c.ativo && !expirado
                                ? "bg-orange-500 text-white hover:bg-orange-600"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {c.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ================= EMPRESAS ================= */}
      {/* ================= EMPRESAS LISTA ================= */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-md font-semibold text-slate-900">
          Empresas elegíveis
        </h1>

        {/* BUSCA */}
        <div className="mt-4">
          <input
            value={empresaSearch}
            onChange={(e) => setEmpresaSearch(e.target.value)}
            placeholder="Buscar por CNPJ, nome ou parceiro"
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>

        <div className="mt-6 space-y-3">
          {!empresaSearch && (
            <p className="text-sm text-slate-500">
              Digite para buscar empresas
            </p>
          )}

          {empresaSearch &&
            Object.values(empresasFiltradasMap).flat().length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma empresa encontrada
              </p>
            )}

          {empresaSearch &&
            Object.entries(empresasFiltradasMap).map(([pid, list]) => {
              if (list.length === 0) return null;

              const parceiro = parceiros.find((p) => p.id === pid);

              return (
                <div key={pid}>
                  {/* parceiro */}
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {parceiro?.nome.toUpperCase() ?? "SEM PARCEIRO"}
                  </div>

                  <div className="space-y-1">
                    {list.map((e) => (
                      <div
                        key={e.id}
                        className="flex justify-between items-center border border-slate-200 rounded px-3 py-2 text-sm"
                      >
                        {/* info */}
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold text-slate-800">
                            {formatCpfCnpj(e.cnpj)}
                          </span>

                          {e.razao_social && (
                            <span className="text-xs text-slate-500">
                              {e.razao_social.toUpperCase()}
                            </span>
                          )}

                          <span className="text-xs text-slate-400">
                            desde{" "}
                            {new Date(e.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        {/* ações */}
                        <div className="flex gap-2">
                          <button
                            // eslint-disable-next-line react-hooks/refs
                            onClick={() => toggleEmpresaAtivo(e.id, e.ativo)}
                            className={`text-xs px-3 py-1 rounded-md font-semibold ${
                              e.ativo
                                ? "bg-orange-500 text-white hover:bg-orange-600"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {e.ativo ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            onClick={() => deleteEmpresa(e.id)}
                            className="text-xs px-3 py-1 rounded-md font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <select
          value={empresaParceiroId ?? ""}
          onChange={(e) => setEmpresaParceiroId(e.target.value || null)}
          className="h-10 mb-4 rounded-lg border border-slate-200 px-3 text-sm bg-white"
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
                value={formatCpfCnpj(empresaCnpj)}
                onChange={(e) => setEmpresaCnpj(onlyDigits(e.target.value))}
                placeholder="CNPJ"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              />

              <input
                value={empresaRazaoSocial}
                onChange={(e) => setEmpresaRazaoSocial(e.target.value)}
                placeholder="Razão social"
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

              <div className="sm:col-span-3">
                <button
                  onClick={createEmpresa}
                  disabled={busy}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
                >
                  Adicionar
                </button>
              </div>
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
    </div>
  );
}
