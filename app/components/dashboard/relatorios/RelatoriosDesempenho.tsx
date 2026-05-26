"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Role = "admin" | "cliente" | "gestor";

type UsuarioMe = {
  id: string;
  role: Role;
  cliente_id: string | null;
};

type ClienteRow = { id: string; nome: string; ativo?: boolean | null };
type DepartamentoRow = {
  id: string;
  nome: string;
  cliente_id: string;
  ativo: boolean;
};
type SetorRow = {
  id: string;
  nome: string;
  departamento_id: string;
  ativo: boolean;
};

type UsuarioRow = {
  id: string;
  nome_completo: string | null;
  role: string | null;
  ativo: boolean | null;
  cliente_id: string | null;
  gestor_id: string | null;
};

type UsuarioOrgRow = {
  usuario_id: string;
  cliente_id: string | null;
  departamento_id: string | null;
  setor_id: string | null;
  gestor_id: string | null;
  ativo: boolean | null;
};

type AvaliacaoRow = {
  id: string;
  user_id: string;
  created_at: string;
  media_total: number | null;
  media_fisico: number | null;
  media_vital: number | null;
  media_emocional: number | null;
  media_mental: number | null;
  // caso exista no seu schema:
  cliente_id?: string | null;
  gestor_id?: string | null;
};

type PeriodPreset = "30d" | "90d" | "365d" | "all";

type IdNome = { id: string; nome: string };

function isoFromDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function fmtDateBR(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function toNum(v: number | null | undefined) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function clamp01to10(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

/* =========================
   COMPONENTE PRINCIPAL
========================= */

export default function RelatoriosDesempenho() {
  const { user, role: authRole } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<UsuarioMe | null>(null);
  // filtros
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [departamentoId, setDepartamentoId] = useState<string | null>(null);
  const [setorId, setSetorId] = useState<string | null>(null);
  const [gestorId, setGestorId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<PeriodPreset>("90d");

  // carrega "me" (role + tenant)
  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      if (!user?.id) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, role, cliente_id")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        if (error || !data?.role) {
          setMe(null);
          return;
        }

        const roleDb = data.role as Role;
        setMe({
          id: data.id,
          role: roleDb,
          cliente_id: data.cliente_id,
        });

        // escopo inicial por role
        if (roleDb === "cliente" || roleDb === "gestor") {
          setClienteId(data.cliente_id ?? null);
        }
        if (roleDb === "gestor") {
          setGestorId(data.id); // escopo de gestor (seus usuários)
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [supabase, user?.id]);

  const role: Role | null = (me?.role ??
    (authRole as Role | undefined) ??
    null) as Role | null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-(--brand)" />
      </div>
    );
  }

  if (!role) return null;

  // UX: admin precisa selecionar cliente para consolidar
  const needsCliente = role === "admin" && !clienteId && !usuarioId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Relatórios de Desempenho
        </h2>
        <p className="text-sm text-slate-500">
          Consolidação por empresa, departamento, setor e usuário
        </p>
      </div>

      {/* Context Bar */}
      <ContextBar
        role={role}
        meId={me?.id ?? null}
        clienteId={clienteId}
        setClienteId={(v) => {
          setClienteId(v);
          // reset cascata
          setDepartamentoId(null);
          setSetorId(null);
          setGestorId(role === "gestor" ? (me?.id ?? null) : null);
          setUsuarioId(null);
        }}
        departamentoId={departamentoId}
        setDepartamentoId={(v) => {
          setDepartamentoId(v);
          setSetorId(null);
          setUsuarioId(null);
        }}
        setorId={setorId}
        setSetorId={(v) => {
          setSetorId(v);
          setUsuarioId(null);
        }}
        gestorId={gestorId}
        setGestorId={(v) => {
          setGestorId(v);
          setUsuarioId(null);
        }}
        usuarioId={usuarioId}
        setUsuarioId={setUsuarioId}
        periodo={periodo}
        setPeriodo={setPeriodo}
      />

      {/* Conteúdo */}
      {needsCliente ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-700 font-medium">
            Selecione um cliente para visualizar o consolidado.
          </p>
          <p className="text-sm text-slate-500 mt-1">
            (Admin vê múltiplos tenants; cliente/gestor já vêm com o tenant
            fixo.)
          </p>
        </div>
      ) : !usuarioId ? (
        <ConsolidadoDesempenho
          role={role}
          meId={me?.id ?? null}
          clienteId={clienteId}
          departamentoId={departamentoId}
          setorId={setorId}
          gestorId={gestorId}
          periodo={periodo}
        />
      ) : (
        <EvolucaoUsuario
          usuarioId={usuarioId}
          onBack={() => setUsuarioId(null)}
          periodo={periodo}
        />
      )}
    </div>
  );
}

/* =========================
   CONTEXT BAR
========================= */

function ContextBar(props: {
  role: Role;
  meId: string | null;
  clienteId: string | null;
  setClienteId: (v: string | null) => void;
  departamentoId: string | null;
  setDepartamentoId: (v: string | null) => void;
  setorId: string | null;
  setSetorId: (v: string | null) => void;
  gestorId: string | null;
  setGestorId: (v: string | null) => void;
  usuarioId: string | null;
  setUsuarioId: (v: string | null) => void;
  periodo: PeriodPreset;
  setPeriodo: (v: PeriodPreset) => void;
}) {
  const {
    role,
    meId,
    clienteId,
    setClienteId,
    departamentoId,
    setDepartamentoId,
    setorId,
    setSetorId,
    gestorId,
    setGestorId,
    usuarioId,
    setUsuarioId,
    periodo,
    setPeriodo,
  } = props;

  return (
    <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-lg p-4">
      {role === "admin" && (
        <SelectCliente value={clienteId} onChange={setClienteId} />
      )}

      {(role === "admin" || role === "cliente") && (
        <SelectDepartamento
          clienteId={clienteId}
          value={departamentoId}
          onChange={setDepartamentoId}
        />
      )}

      {(role === "admin" || role === "cliente") && (
        <SelectSetor
          departamentoId={departamentoId}
          value={setorId}
          onChange={setSetorId}
        />
      )}

      {/* Gestor filter: admin/cliente podem filtrar por gestor; gestor já vem fixo */}
      {role !== "gestor" && (
        <SelectGestor
          clienteId={clienteId}
          value={gestorId}
          onChange={setGestorId}
        />
      )}

      <SelectUsuario
        role={role}
        meId={meId}
        clienteId={clienteId}
        departamentoId={departamentoId}
        setorId={setorId}
        gestorId={gestorId}
        value={usuarioId}
        onChange={setUsuarioId}
      />

      <SelectPeriodo value={periodo} onChange={setPeriodo} />
    </div>
  );
}

function FieldWrap(props: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {props.label}
      </span>
      {props.children}
      {props.hint ? (
        <span className="text-[11px] text-slate-400">{props.hint}</span>
      ) : null}
    </div>
  );
}

/* =========================
   SELECTS IMPLEMENTADOS
========================= */

function SelectCliente(props: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [items, setItems] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("id,nome,ativo")
        .order("nome", { ascending: true });

      if (mounted) {
        setItems((data ?? []).filter((c) => c.ativo !== false));
        setLoading(false);
      }
      if (error) {
        // silencioso; RLS pode restringir
        if (mounted) setItems([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <FieldWrap label="Cliente">
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value || null)}
        disabled={loading}
      >
        <option value="">{loading ? "Carregando…" : "Selecionar…"}</option>
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

function SelectDepartamento(props: {
  clienteId: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [items, setItems] = useState<DepartamentoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!props.clienteId) {
        if (mounted) setItems([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("departamentos")
        .select("id,nome,cliente_id,ativo")
        .eq("cliente_id", props.clienteId)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (mounted) {
        setItems((data ?? []) as DepartamentoRow[]);
        setLoading(false);
      }
      if (error && mounted) setItems([]);
    })();

    return () => {
      mounted = false;
    };
  }, [props.clienteId, supabase]);

  const disabled = !props.clienteId;

  return (
    <FieldWrap label="Departamento">
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
        disabled={disabled || loading}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value || null)}
      >
        <option value="">
          {disabled ? "Selecione cliente…" : loading ? "Carregando…" : "Todos"}
        </option>
        {items.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nome}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

function SelectSetor(props: {
  departamentoId: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [items, setItems] = useState<SetorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!props.departamentoId) {
        if (mounted) setItems([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("setores")
        .select("id,nome,departamento_id,ativo")
        .eq("departamento_id", props.departamentoId)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (mounted) {
        setItems((data ?? []) as SetorRow[]);
        setLoading(false);
      }
      if (error && mounted) setItems([]);
    })();

    return () => {
      mounted = false;
    };
  }, [props.departamentoId, supabase]);

  const disabled = !props.departamentoId;

  return (
    <FieldWrap label="Setor">
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
        disabled={disabled || loading}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value || null)}
      >
        <option value="">
          {disabled ? "Selecione depto…" : loading ? "Carregando…" : "Todos"}
        </option>
        {items.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

function SelectGestor(props: {
  clienteId: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [items, setItems] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!props.clienteId) {
        if (mounted) setItems([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("usuarios")
        .select("id,nome_completo,ativo,role,cliente_id")
        .eq("role", "gestor")
        .eq("cliente_id", props.clienteId)
        .eq("ativo", true)
        .order("nome_completo", { ascending: true });

      if (mounted) {
        setItems(
          (data ?? []).map((u) => ({
            id: u.id,
            nome: u.nome_completo ?? "(sem nome)",
          })),
        );
        setLoading(false);
      }
      if (error && mounted) setItems([]);
    })();

    return () => {
      mounted = false;
    };
  }, [props.clienteId, supabase]);

  const disabled = !props.clienteId;

  return (
    <FieldWrap label="Gestor">
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
        disabled={disabled || loading}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value || null)}
      >
        <option value="">
          {disabled ? "Selecione cliente…" : loading ? "Carregando…" : "Todos"}
        </option>
        {items.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

function SelectUsuario(props: {
  role: Role;
  meId: string | null;
  clienteId: string | null;
  departamentoId: string | null;
  setorId: string | null;
  gestorId: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [items, setItems] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const disabledAdmin = props.role === "admin" && !props.clienteId;

  useEffect(() => {
    let mounted = true;

    (async () => {
      // admin precisa escolher cliente
      if (disabledAdmin) {
        if (mounted) setItems([]);
        return;
      }

      setLoading(true);
      // Base: pegar usuários a partir de usuario_organizacao para permitir dept/setor
      // (e também filtrar por gestorId quando vier)
      let q = supabase
        .from("usuario_organizacao")
        .select(
          "usuario_id,cliente_id,departamento_id,setor_id,gestor_id,ativo",
        );

      if (props.clienteId) q = q.eq("cliente_id", props.clienteId);
      if (props.departamentoId)
        q = q.eq("departamento_id", props.departamentoId);
      if (props.setorId) q = q.eq("setor_id", props.setorId);
      if (props.gestorId) q = q.eq("gestor_id", props.gestorId);
      q = q.eq("ativo", true);

      const { data: orgRows, error: orgErr } = await q;

      if (orgErr || !orgRows) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const org = orgRows as UsuarioOrgRow[];
      const ids = uniq(org.map((r) => r.usuario_id));

      if (!ids.length) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      // Buscar nomes na tabela usuarios
      const { data: users, error: uErr } = await supabase
        .from("usuarios")
        .select("id,nome_completo,ativo,role,gestor_id,cliente_id")
        .in("id", ids)
        .eq("ativo", true)
        .order("nome_completo", { ascending: true });

      if (uErr || !users) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      // Filtrar para "role=usuario" por padrão (você pode abrir para gestores depois)
      const filtered = (users as UsuarioRow[])
        .filter((u) => (u.role ?? "").toLowerCase() === "usuario")
        .map((u) => ({
          id: u.id,
          nome: u.nome_completo ?? "(sem nome)",
        }));

      // gestor: opcionalmente incluir "meu próprio desempenho"
      if (props.role === "gestor" && props.meId) {
        filtered.unshift({ id: props.meId, nome: "Meu próprio desempenho" });
      }

      if (mounted) {
        setItems(filtered);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    props.role,
    props.meId,
    props.clienteId,
    props.departamentoId,
    props.setorId,
    props.gestorId,
    disabledAdmin,
    supabase,
  ]);

  return (
    <FieldWrap label="Usuário">
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
        disabled={disabledAdmin || loading}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value || null)}
      >
        <option value="">
          {disabledAdmin
            ? "Selecione cliente…"
            : loading
              ? "Carregando…"
              : "Selecionar…"}
        </option>
        {items.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

function SelectPeriodo(props: {
  value: PeriodPreset;
  onChange: (v: PeriodPreset) => void;
}) {
  return (
    <FieldWrap label="Período">
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as PeriodPreset)}
      >
        <option value="30d">Últimos 30 dias</option>
        <option value="90d">Últimos 90 dias</option>
        <option value="365d">Últimos 12 meses</option>
        <option value="all">Tudo</option>
      </select>
    </FieldWrap>
  );
}

/* =========================
   CONSOLIDADO IMPLEMENTADO
========================= */

function ConsolidadoDesempenho(props: {
  role: Role;
  meId: string | null;
  clienteId: string | null;
  departamentoId: string | null;
  setorId: string | null;
  gestorId: string | null;
  periodo: PeriodPreset;
}) {
  const { role, meId, clienteId, departamentoId, setorId, gestorId, periodo } =
    props;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [kpis, setKpis] = useState({
    avaliacoes: 0,
    usuarios: 0,
    media_total: 0,
    media_fisico: 0,
    media_vital: 0,
    media_emocional: 0,
    media_mental: 0,
    lastDate: null as string | null,
  });

  const [breakdown, setBreakdown] = useState<
    {
      label: string;
      usuarios: number;
      avaliacoes: number;
      media_total: number;
    }[]
  >([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErro(null);

      try {
        // 1) Determinar user_ids do escopo quando dept/setor/gestor estiverem em jogo
        // Se não houver dept/setor, e houver gestorId, podemos filtrar diretamente por avaliacoes_completas.gestor_id (se existir)
        // Mas para garantir, sempre conseguimos via usuario_organizacao -> user_ids
        if (!clienteId && role === "admin") {
          // admin sem cliente: não carrega
          if (mounted) {
            setKpis({
              avaliacoes: 0,
              usuarios: 0,
              media_total: 0,
              media_fisico: 0,
              media_vital: 0,
              media_emocional: 0,
              media_mental: 0,
              lastDate: null,
            });
            setBreakdown([]);
            setLoading(false);
          }
          return;
        }
        const supabase = getSupabaseClient();
        let orgQ = supabase
          .from("usuario_organizacao")
          .select(
            "usuario_id,departamento_id,setor_id,gestor_id,cliente_id,ativo",
          );

        if (clienteId) orgQ = orgQ.eq("cliente_id", clienteId);
        if (departamentoId) orgQ = orgQ.eq("departamento_id", departamentoId);
        if (setorId) orgQ = orgQ.eq("setor_id", setorId);

        // gestor:
        // - role gestor: gestorId já é o próprio id
        // - admin/cliente: gestorId pode ser filtro
        if (gestorId) orgQ = orgQ.eq("gestor_id", gestorId);

        orgQ = orgQ.eq("ativo", true);

        const { data: orgRows, error: orgErr } = await orgQ;
        if (orgErr) throw new Error(orgErr.message);

        const org = (orgRows ?? []) as UsuarioOrgRow[];
        let userIds = uniq(org.map((r) => r.usuario_id));

        // gestor deve incluir ele mesmo no consolidado (regra que você descreveu)
        if (role === "gestor" && meId && !userIds.includes(meId)) {
          userIds = [meId, ...userIds];
        }

        if (!userIds.length) {
          if (mounted) {
            setKpis({
              avaliacoes: 0,
              usuarios: 0,
              media_total: 0,
              media_fisico: 0,
              media_vital: 0,
              media_emocional: 0,
              media_mental: 0,
              lastDate: null,
            });
            setBreakdown([]);
            setLoading(false);
          }
          return;
        }

        // 2) Buscar avaliações do escopo
        let avQ = supabase
          .from("avaliacoes_completas")
          .select(
            "id,user_id,created_at,media_total,media_fisico,media_vital,media_emocional,media_mental",
          )
          .in("user_id", userIds);

        if (periodo !== "all") {
          const days = periodo === "30d" ? 30 : periodo === "90d" ? 90 : 365;
          avQ = avQ.gte("created_at", isoFromDaysAgo(days));
        }

        const { data: avRows, error: avErr } = await avQ.order("created_at", {
          ascending: true,
        });
        if (avErr) throw new Error(avErr.message);

        const avs = (avRows ?? []) as AvaliacaoRow[];

        // 3) KPIs compactos
        const totals = {
          avaliacoes: avs.length,
          usuarios: uniq(avs.map((a) => a.user_id)).length,
          media_total: mean(avs.map((a) => toNum(a.media_total))),
          media_fisico: mean(avs.map((a) => toNum(a.media_fisico))),
          media_vital: mean(avs.map((a) => toNum(a.media_vital))),
          media_emocional: mean(avs.map((a) => toNum(a.media_emocional))),
          media_mental: mean(avs.map((a) => toNum(a.media_mental))),
          lastDate: avs.length ? avs[avs.length - 1].created_at : null,
        };

        // 4) Breakdown: por departamento (se dept não selecionado), por setor (se dept selecionado e setor não), ou por usuário (se setor selecionado)
        // Para isso precisamos mapear user -> dept/setor via orgRows.
        const byUser = new Map<
          string,
          { dept: string | null; setor: string | null }
        >();
        org.forEach((r) =>
          byUser.set(r.usuario_id, {
            dept: r.departamento_id ?? null,
            setor: r.setor_id ?? null,
          }),
        );

        // dicionários de nomes
        const deptIds = uniq(
          org.map((r) => r.departamento_id).filter(Boolean) as string[],
        );
        const setorIds = uniq(
          org.map((r) => r.setor_id).filter(Boolean) as string[],
        );

        const [deptNames, setorNames, userNames] = await Promise.all([
          deptIds.length
            ? supabase.from("departamentos").select("id,nome").in("id", deptIds)
            : Promise.resolve({
                data: [] as IdNome[],
                error: null as IdNome | null,
              }),
          setorIds.length
            ? supabase.from("setores").select("id,nome").in("id", setorIds)
            : Promise.resolve({
                data: [] as IdNome[],
                error: null as IdNome | null,
              }),
          // nomes usuários para breakdown por usuário
          supabase
            .from("usuarios")
            .select("id,nome_completo")
            .in("id", userIds),
        ]);

        const deptMap = new Map<string, string>();
        (deptNames.data ?? []).forEach((d) => deptMap.set(d.id, d.nome));
        const setorMap = new Map<string, string>();
        (setorNames.data ?? []).forEach((s) => setorMap.set(s.id, s.nome));
        const userMap = new Map<string, string>();
        (userNames.data ?? []).forEach((u) =>
          userMap.set(u.id, u.nome_completo ?? "(sem nome)"),
        );

        type GroupKey = string;
        const groups = new Map<
          GroupKey,
          { label: string; users: Set<string>; avs: AvaliacaoRow[] }
        >();

        const groupMode: "DEPARTAMENTO" | "SETOR" | "USUARIO" = !departamentoId
          ? "DEPARTAMENTO"
          : !setorId
            ? "SETOR"
            : "USUARIO";

        const pushToGroup = (
          key: string,
          label: string,
          userId: string,
          av: AvaliacaoRow,
        ) => {
          if (!groups.has(key))
            groups.set(key, { label, users: new Set(), avs: [] });
          const g = groups.get(key)!;
          g.users.add(userId);
          g.avs.push(av);
        };

        for (const av of avs) {
          const meta = byUser.get(av.user_id) ?? { dept: null, setor: null };

          if (groupMode === "DEPARTAMENTO") {
            const k = meta.dept ?? "SEM_DEPARTAMENTO";
            const label = meta.dept
              ? (deptMap.get(meta.dept) ?? "Departamento")
              : "Sem departamento";
            pushToGroup(k, label, av.user_id, av);
          } else if (groupMode === "SETOR") {
            const k = meta.setor ?? "SEM_SETOR";
            const label = meta.setor
              ? (setorMap.get(meta.setor) ?? "Setor")
              : "Sem setor";
            pushToGroup(k, label, av.user_id, av);
          } else {
            const k = av.user_id;
            const label = userMap.get(av.user_id) ?? "(sem nome)";
            pushToGroup(k, label, av.user_id, av);
          }
        }

        const breakdownRows = Array.from(groups.values())
          .map((g) => ({
            label: g.label,
            usuarios: g.users.size,
            avaliacoes: g.avs.length,
            media_total: mean(g.avs.map((a) => toNum(a.media_total))),
          }))
          .sort((a, b) => b.media_total - a.media_total);

        if (mounted) {
          setKpis(totals);
          setBreakdown(breakdownRows);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (mounted) {
          setErro(
            e instanceof Error ? e.message : "Erro ao carregar consolidado.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [role, meId, clienteId, departamentoId, setorId, gestorId, periodo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-(--brand-secondary)" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MiniKpi label="Avaliações" value={kpis.avaliacoes} tone="brand" />
        <MiniKpi
          label="Usuários avaliados"
          value={kpis.usuarios}
          tone="secondary"
        />
        <MiniKpi
          label="Média total"
          value={kpis.media_total.toFixed(1)}
          tone="highlight"
        />
        <MiniKpi
          label="Última avaliação"
          value={kpis.lastDate ? fmtDateBR(kpis.lastDate) : "—"}
          tone="muted"
        />
      </div>

      {/* Médias por dimensão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DimCard
          label="Físico"
          value={kpis.media_fisico}
          color="var(--brand-secondary)"
        />
        <DimCard
          label="Vital"
          value={kpis.media_vital}
          color="var(--brand-highlight)"
        />
        <DimCard
          label="Emocional"
          value={kpis.media_emocional}
          color="var(--brand-accent)"
        />
        <DimCard
          label="Mental"
          value={kpis.media_mental}
          color="var(--brand)"
        />
      </div>

      {/* Breakdown table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-900">
            Consolidado por{" "}
            {!departamentoId ? "Departamento" : !setorId ? "Setor" : "Usuário"}
          </p>
          <p className="text-xs text-slate-500">
            Ordenado por média total (desc)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Usuários
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Avaliações
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Média total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdown.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Nenhum dado encontrado para o filtro atual.
                  </td>
                </tr>
              ) : (
                breakdown.slice(0, 20).map((r) => (
                  <tr key={r.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {r.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {r.usuarios}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {r.avaliacoes}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
                      {r.media_total.toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {breakdown.length > 20 && (
          <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-200">
            Exibindo 20 de {breakdown.length} itens.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniKpi(props: {
  label: string;
  value: React.ReactNode;
  tone: "brand" | "secondary" | "highlight" | "muted";
}) {
  const toneClass =
    props.tone === "brand"
      ? "text-[var(--brand)]"
      : props.tone === "secondary"
        ? "text-[var(--brand-secondary)]"
        : props.tone === "highlight"
          ? "text-[var(--brand-highlight)]"
          : "text-slate-700";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {props.label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>
        {props.value}
      </p>
    </div>
  );
}

function DimCard(props: { label: string; value: number; color: string }) {
  const v = clamp01to10(props.value);
  const pct = Math.min((v / 10) * 100, 100);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{props.label}</p>
        <p className="text-lg font-bold" style={{ color: props.color }}>
          {v.toFixed(1)}
        </p>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: props.color }}
        />
      </div>
    </div>
  );
}

/* =========================
   EVOLUÇÃO DO USUÁRIO (IMPLEMENTADA)
========================= */

function EvolucaoUsuario(props: {
  usuarioId: string;
  onBack: () => void;
  periodo: PeriodPreset;
}) {
  const { usuarioId, onBack, periodo } = props;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [avs, setAvs] = useState<AvaliacaoRow[]>([]);
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErro(null);

      try {
        const supabase = getSupabaseClient();
        const [uRes, aRes] = await Promise.all([
          supabase
            .from("usuarios")
            .select("id,nome_completo")
            .eq("id", usuarioId)
            .single(),
          (async () => {
            let q = supabase
              .from("avaliacoes_completas")
              .select(
                "id,user_id,created_at,media_total,media_fisico,media_vital,media_emocional,media_mental",
              )
              .eq("user_id", usuarioId)
              .order("created_at", { ascending: true });

            if (periodo !== "all") {
              const days =
                periodo === "30d" ? 30 : periodo === "90d" ? 90 : 365;
              q = q.gte("created_at", isoFromDaysAgo(days));
            }
            return q;
          })(),
        ]);

        if (uRes.error) throw new Error(uRes.error.message);
        if (aRes.error) throw new Error(aRes.error.message);

        if (!mounted) return;

        setNome(uRes.data?.nome_completo ?? "(sem nome)");
        setAvs((aRes.data ?? []) as AvaliacaoRow[]);
      } catch (e: unknown) {
        if (mounted)
          setErro(
            e instanceof Error ? e.message : "Erro ao carregar evolução.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [usuarioId, periodo]);

  const chartData = useMemo(() => {
    return avs.map((a) => ({
      data: fmtDateBR(a.created_at),
      total: toNum(a.media_total),
      fisico: toNum(a.media_fisico),
      vital: toNum(a.media_vital),
      emocional: toNum(a.media_emocional),
      mental: toNum(a.media_mental),
    }));
  }, [avs]);

  const last = avs.length ? avs[avs.length - 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-(--brand-secondary)" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{erro}</p>
      </div>
    );
  }

  if (!avs.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <button
          onClick={onBack}
          className="text-sm text-(--brand-secondary) hover:underline"
        >
          ← Voltar
        </button>
        <div className="mt-4 text-center text-slate-600">
          Nenhuma avaliação encontrada para este usuário no período selecionado.
        </div>
      </div>
    );
  }

  const kpiTotal = mean(avs.map((a) => toNum(a.media_total)));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-(--brand-secondary) hover:underline"
            >
              ← Voltar
            </button>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {nome}
            </h3>
            <p className="text-xs text-slate-500">
              Última avaliação: {last ? fmtDateBR(last.created_at) : "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniKpi label="Avaliações" value={avs.length} tone="muted" />
            <MiniKpi
              label="Média total (período)"
              value={kpiTotal.toFixed(1)}
              tone="brand"
            />
            <MiniKpi
              label="Última total"
              value={toNum(last?.media_total).toFixed(1)}
              tone="highlight"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">
          Evolução (Total e Dimensões)
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--brand)"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="fisico"
                stroke="var(--brand-secondary)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="vital"
                stroke="var(--brand-highlight)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="emocional"
                stroke="var(--brand-accent)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="mental"
                stroke="#64748b"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Observação: valores de 0–10 conforme médias consolidadas em{" "}
          <code>avaliacoes_completas</code>.
        </p>
      </div>
    </div>
  );
}
