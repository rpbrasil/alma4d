"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

type Cliente = {
  id: string;
  nome: string;
};

type Gestor = {
  id: string;
  nome_completo: string;
};

type Usuario = {
  id: string;
  nome_completo: string;
};

type Step = "CLIENTES" | "GESTORES" | "USUARIOS" | "EVOLUCAO";

type Role = "admin" | "cliente" | "gestor";

type UsuarioMe = {
  id: string;
  role: Role;
  cliente_id: string | null;
};

type ClienteRow = {
  id: string;
  nome: string;
};

type GestorRow = {
  id: string;
  nome_completo: string | null;
};

type UsuarioRow = {
  id: string;
  nome_completo: string | null;
};

type Avaliacao = {
  id: string;
  user_id: string;
  created_at: string;
  ratings: Record<string, unknown>; // Estrutura de ratings pode variar
  media_total: number | null;
  media_fisico: number | null;
  media_vital: number | null;
  media_emocional: number | null;
  media_mental: number | null;
};

export default function RelatoriosDesempenho() {
  const { user, role: authRole } = useAuth(); // ✅ evita conflito de nome
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("CLIENTES");

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(
    null,
  );
  const [gestorSelecionado, setGestorSelecionado] = useState<Gestor | null>(
    null,
  );
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(
    null,
  );

  const [me, setMe] = useState<UsuarioMe | null>(null);

  // ✅ role normalizado (prioriza "me.role" vindo do banco; fallback para authRole se existir)
  const normalizedRole: Role | null = (me?.role ??
    (authRole as Role | undefined) ??
    null) as Role | null;

  const isAdmin = normalizedRole === "admin";
  const isCliente = normalizedRole === "cliente";
  const isGestor = normalizedRole === "gestor";

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!user?.id) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);

      try {
        
        const { data: usuario, error } = await supabase
          .from("usuarios")
          .select("id, role, cliente_id")
          .eq("id", user.id)
          .single();

        if (error || !usuario?.role) {
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) {
          setMe({
            id: usuario.id as string,
            role: usuario.role as Role,
            cliente_id:
              (usuario as { cliente_id: string | null }).cliente_id ?? null,
          });
        }

        // ... (suas regras de step aqui)
      } finally {
        if (!cancelled) setLoading(false); // ✅ garante que sempre sai do loading
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [user?.id]); // ✅ melhor: depende só do id

  const erroVinculo = useMemo(() => {
    if (!me) return null;
    if ((isCliente || isGestor) && !me.cliente_id) {
      return "Usuário sem cliente_id vinculado.";
    }
    return null;
  }, [me, isCliente, isGestor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#019499]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      {step !== "CLIENTES" && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => {
              setClienteSelecionado(null);
              setGestorSelecionado(null);
              setUsuarioSelecionado(null);
              setStep("CLIENTES");
            }}
            className="hover:text-[#019499] hover:underline transition"
          >
            Clientes
          </button>
          {clienteSelecionado && (
            <>
              <span className="text-gray-400">/</span>
              <span className="font-medium text-gray-900">
                {clienteSelecionado.nome}
              </span>
            </>
          )}
          {step !== "GESTORES" && gestorSelecionado && (
            <>
              <span className="text-gray-400">/</span>
              <button
                onClick={() => {
                  setGestorSelecionado(null);
                  setUsuarioSelecionado(null);
                  setStep("GESTORES");
                }}
                className="hover:text-[#019499] hover:underline transition"
              >
                Gestores
              </button>
            </>
          )}
          {step !== "GESTORES" && gestorSelecionado && (
            <>
              <span className="text-gray-400">/</span>
              <span className="font-medium text-gray-900">
                {gestorSelecionado.nome_completo}
              </span>
            </>
          )}
          {step === "USUARIOS" && usuarioSelecionado && (
            <>
              <span className="text-gray-400">/</span>
              <span className="font-medium text-gray-900">
                {usuarioSelecionado.nome_completo}
              </span>
            </>
          )}
        </div>
      )}

      {erroVinculo && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{erroVinculo}</p>
        </div>
      )}

      {isAdmin && step === "CLIENTES" && (
        <ListaClientes
          onSelect={(cliente) => {
            setClienteSelecionado(cliente);
            setGestorSelecionado(null);
            setUsuarioSelecionado(null);
            setStep("GESTORES");
          }}
        />
      )}

      {step === "GESTORES" && clienteSelecionado && (
        <ListaGestores
          cliente={clienteSelecionado}
          onSelect={(gestor) => {
            setGestorSelecionado(gestor);
            setUsuarioSelecionado(null);
            setStep("USUARIOS");
          }}
          onBack={() => {
            setClienteSelecionado(null);
            setStep("CLIENTES");
          }}
        />
      )}

      {step === "USUARIOS" && gestorSelecionado && (
        <ListaUsuarios
          gestor={gestorSelecionado}
          cliente={clienteSelecionado!}
          onSelect={(usuario) => {
            setUsuarioSelecionado(usuario);
            setStep("EVOLUCAO");
          }}
          onBack={() => {
            setGestorSelecionado(null);
            setStep("GESTORES");
          }}
        />
      )}

      {step === "EVOLUCAO" && usuarioSelecionado && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                setUsuarioSelecionado(null);
                setStep("USUARIOS");
              }}
              className="text-sm text-[#019499] hover:underline transition"
            >
              ← Voltar
            </button>
          </div>
          <EvolucaoUsuario usuario={usuarioSelecionado} />
        </>
      )}
    </div>
  );
}

function ListaClientes({ onSelect }: { onSelect: (cliente: Cliente) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [gestoresCount, setGestoresCount] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome");

      if (!error && data) {
        const rows = data as ClienteRow[];
        setClientes(rows.map((c) => ({ id: c.id, nome: c.nome })));

        // Get count of gestores per cliente
        const counts: Record<string, number> = {};
        for (const cliente of rows) {
          const { count } = await supabase
            .from("usuarios")
            .select("*", { count: "exact", head: true })
            .eq("role", "gestor")
            .eq("cliente_id", cliente.id);
          counts[cliente.id] = count || 0;
        }
        setGestoresCount(counts);
      } else {
        setClientes([]);
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#019499]" />
      </div>
    );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Seleção de Clientes
        </h2>
        <p className="text-gray-600">
          Escolha um cliente para visualizar seus gestores e usuários
        </p>
      </div>

      {clientes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Nenhum cliente disponível</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-[#019499] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-[#019499] to-[#017d7b] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🏢</span>
                </div>
                <span className="bg-[#019499] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {gestoresCount[c.id] || 0} gestor
                  {(gestoresCount[c.id] || 0) !== 1 ? "es" : ""}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#019499] transition">
                {c.nome}
              </h3>
              <p className="text-sm text-gray-500 mt-3 group-hover:text-[#019499]">
                Clique para continuar →
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListaGestores({
  cliente,
  onSelect,
  onBack,
}: {
  cliente: Cliente;
  onSelect: (gestor: Gestor) => void;
  onBack: () => void;
}) {
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [usuariosCount, setUsuariosCount] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome_completo")
        .eq("role", "gestor")
        .eq("cliente_id", cliente.id);

      if (!error && data) {
        const rows = data as GestorRow[];
        setGestores(
          rows.map((g) => ({
            id: g.id,
            nome_completo: g.nome_completo ?? "(sem nome)",
          })),
        );

        // Get count of usuarios per gestor
        const counts: Record<string, number> = {};
        for (const gestor of rows) {
          const { count } = await supabase
            .from("usuarios")
            .select("*", { count: "exact", head: true })
            .eq("gestor_id", gestor.id)
            .eq("ativo", true);
          counts[gestor.id] = count || 0;
        }
        setUsuariosCount(counts);
      } else {
        setGestores([]);
      }

      setLoading(false);
    };

    load();
  }, [cliente.id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#019499]" />
      </div>
    );

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-sm text-[#019499] hover:underline transition mb-4"
        >
          ← Voltar para clientes
        </button>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Gestores</h2>
        <p className="text-gray-600">
          Cliente: <span className="font-semibold">{cliente.nome}</span>
        </p>
      </div>

      {gestores.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Nenhum gestor disponível para este cliente
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gestores.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelect(g)}
              className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-[#019499] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-[#f71c86] to-[#d61863] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">👤</span>
                </div>
                <span className="bg-[#f71c86] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {usuariosCount[g.id] || 0} usuário
                  {(usuariosCount[g.id] || 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#019499] transition">
                {g.nome_completo}
              </h3>
              <p className="text-sm text-gray-500 mt-3 group-hover:text-[#019499]">
                Clique para continuar →
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListaUsuarios({
  gestor,
  cliente,
  onSelect,
  onBack,
}: {
  gestor: Gestor;
  cliente: Cliente;
  onSelect: (usuario: Usuario) => void;
  onBack: () => void;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [avaliacoesCount, setAvaliacoesCount] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome_completo")
        .eq("gestor_id", gestor.id)
        .eq("ativo", true);

      if (!error && data) {
        const rows = data as UsuarioRow[];
        setUsuarios(
          rows.map((u) => ({
            id: u.id,
            nome_completo: u.nome_completo ?? "(sem nome)",
          })),
        );

        // Get count of avaliacoes per usuario
        const counts: Record<string, number> = {};
        for (const usuario of rows) {
          const { count } = await supabase
            .from("avaliacoes_completas")
            .select("*", { count: "exact", head: true })
            .eq("user_id", usuario.id);
          counts[usuario.id] = count || 0;
        }
        setAvaliacoesCount(counts);
      } else {
        setUsuarios([]);
      }

      setLoading(false);
    };

    load();
  }, [gestor.id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#019499]" />
      </div>
    );

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-sm text-[#019499] hover:underline transition mb-4"
        >
          ← Voltar para gestores
        </button>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Usuários</h2>
        <p className="text-gray-600">
          Cliente: <span className="font-semibold">{cliente.nome}</span> •
          Gestor: <span className="font-semibold">{gestor.nome_completo}</span>
        </p>
      </div>

      {usuarios.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Nenhum usuário disponível para este gestor
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {usuarios.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-[#019499] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-[#8b5cf6] to-[#6d28d9] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">👨‍💼</span>
                </div>
                <span className="bg-[#8b5cf6] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {avaliacoesCount[u.id] || 0} avaliação
                  {(avaliacoesCount[u.id] || 0) !== 1 ? "ões" : ""}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#019499] transition">
                {u.nome_completo}
              </h3>
              <p className="text-sm text-gray-500 mt-3 group-hover:text-[#019499]">
                Ver relatório →
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EvolucaoUsuario({ usuario }: { usuario: Usuario }) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErro(null);

      const { data, error } = await supabase
        .from("avaliacoes_completas")
        .select(
          "id, user_id, created_at, ratings, media_total, media_fisico, media_vital, media_emocional, media_mental",
        )
        .eq("user_id", usuario.id)
        .order("created_at", { ascending: true });

      if (error) {
        setErro(error.message);
        setAvaliacoes([]);
      } else {
        setAvaliacoes((data as Avaliacao[]) ?? []);
      }

      setLoading(false);
    };

    load();
  }, [usuario.id]);

  const temDados = avaliacoes.length > 0;
  const last = temDados ? avaliacoes[avaliacoes.length - 1] : null;
  const prev = avaliacoes.length > 1 ? avaliacoes[avaliacoes.length - 2] : null;
  const first = temDados ? avaliacoes[0] : null;

  const dimensoes = useMemo(
    () => [
      {
        nome: "Físico",
        chave: "media_fisico" as const,
        icone: "heartbeat",
        cor: "#2e7af5ff",
      },
      {
        nome: "Vital",
        chave: "media_vital" as const,
        icone: "leaf",
        cor: "#79f537ff",
      },
      {
        nome: "Emocional",
        chave: "media_emocional" as const,
        icone: "smile-beam",
        cor: "#f71c86ff",
      },
      {
        nome: "Mental",
        chave: "media_mental" as const,
        icone: "brain",
        cor: "#8b5cf6",
      },
    ],
    [],
  );

  const toNum = (v: number | string | null | undefined): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatDateBR = (date: string | Date, withYear = true) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      ...(withYear ? { year: "2-digit" } : {}),
    });
  };

  const stats = useMemo(() => {
    if (!last || !first) return null;

    const lastTotal = toNum(last.media_total);
    const firstTotal = toNum(first.media_total);
    const prevTotal = prev ? toNum(prev.media_total) : null;

    const deltaFirst = lastTotal - firstTotal;
    const deltaPrev = prevTotal === null ? null : lastTotal - prevTotal;

    let trendLabel = "—";
    let trendArrow = "→";
    let trendColor = "#0f172a";

    if (deltaPrev !== null) {
      if (deltaPrev > 0.2) {
        trendLabel = "melhorando";
        trendArrow = "↑";
        trendColor = "#16a34a";
      } else if (deltaPrev < -0.2) {
        trendLabel = "piorando";
        trendArrow = "↓";
        trendColor = "#ef4444";
      } else {
        trendLabel = "estável";
        trendArrow = "→";
        trendColor = "#0f172a";
      }
    }

    return {
      lastTotal,
      deltaFirst,
      deltaPrev,
      trendLabel,
      trendArrow,
      trendColor,
    };
  }, [last, first, prev]);

  const chartLabels = useMemo(() => {
    if (!avaliacoes.length) return [];
    const n = avaliacoes.length;
    const step = n <= 8 ? 1 : n <= 14 ? 2 : n <= 24 ? 3 : Math.ceil(n / 8);

    return avaliacoes.map((a, i) => {
      if (i % step !== 0 && i !== n - 1) return "";
      return formatDateBR(a.created_at, false);
    });
  }, [avaliacoes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#019499]" />
        <p className="mt-4 text-gray-600">Carregando gráficos...</p>
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

  if (!temDados) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Nenhuma avaliação encontrada para este usuário.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatório Técnico</h2>
        <p className="text-lg text-gray-600 mt-2">{usuario.nome_completo}</p>
        <p className="text-sm text-gray-500 mt-1">
          Gerado em: {formatDateBR(new Date(), true)}
          {last &&
            ` • Última avaliação: ${formatDateBR(last.created_at, true)}`}
        </p>
      </div>

      {/* Situação Atual */}
      <div>
        <h3 className="text-xl font-bold text-center mb-6">Situação Atual</h3>
        <div className="space-y-4">
          {dimensoes.map((dim) => {
            const v = last
              ? toNum(
                  last[dim.chave as keyof Avaliacao] as
                    | number
                    | string
                    | null
                    | undefined,
                )
              : 0;
            const percentage = Math.min((v / 10) * 100, 100);

            return (
              <div
                key={dim.chave}
                className="bg-white rounded-lg p-4 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">
                    {dim.nome}
                  </span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: dim.cor }}
                  >
                    {v.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: dim.cor,
                    }}
                  />
                </div>
              </div>
            );
          })}

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-lg text-[#030870]">
                {toNum(last?.media_total).toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-[#030870] transition-all duration-300"
                style={{
                  width: `${Math.min((toNum(last?.media_total) / 10) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Evolução */}
      <div>
        <h3 className="text-xl font-bold text-center mb-6">Evolução</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dimensoes.map((dim) => {
            const atual = last
              ? toNum(
                  last[dim.chave as keyof Avaliacao] as
                    | number
                    | string
                    | null
                    | undefined,
                )
              : 0;
            const anterior = prev
              ? toNum(
                  prev[dim.chave as keyof Avaliacao] as
                    | number
                    | string
                    | null
                    | undefined,
                )
              : atual;
            const diff = atual - anterior;

            let arrow = "→";
            if (diff > 0.15) arrow = "↑";
            else if (diff < -0.15) arrow = "↓";

            return (
              <div
                key={dim.chave}
                className="bg-white rounded-lg p-6 border-l-4 shadow-sm"
                style={{ borderLeftColor: dim.cor }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${dim.cor}20` }}
                  >
                    <span className="text-2xl">{arrow}</span>
                  </div>
                </div>

                <h4 className="font-semibold text-gray-900 mb-2">{dim.nome}</h4>
                <p
                  className="text-3xl font-bold mb-3"
                  style={{ color: dim.cor }}
                >
                  {atual.toFixed(1)}
                </p>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((atual / 10) * 100, 100)}%`,
                      backgroundColor: dim.cor,
                    }}
                  />
                </div>

                <p className="text-sm text-gray-600">
                  {diff === 0
                    ? "Sem variação"
                    : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} vs anterior`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficos */}
      {avaliacoes.length > 1 && (
        <div>
          <h3 className="text-xl font-bold text-center mb-6">Gráficos</h3>

          {/* Gráfico de linha - Total */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
            <h4 className="text-lg font-semibold text-center mb-4">
              Média total (linha do tempo)
            </h4>
            <div className="h-64">
              <LineChart
                width={800}
                height={250}
                data={avaliacoes.map((a, i) => ({
                  name: chartLabels[i] || formatDateBR(a.created_at, false),
                  total: toNum(a.media_total),
                }))}
              >
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#030870"
                  strokeWidth={3}
                  dot={{ fill: "#030870", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </div>
          </div>

          {/* Gráfico de dimensões */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-center mb-4">
              Dimensões (evolução)
            </h4>
            <div className="h-64">
              <LineChart
                width={800}
                height={250}
                data={avaliacoes.map((a, i) => ({
                  name: chartLabels[i] || formatDateBR(a.created_at, false),
                  fisico: toNum(a.media_fisico),
                  vital: toNum(a.media_vital),
                  emocional: toNum(a.media_emocional),
                  mental: toNum(a.media_mental),
                }))}
              >
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                {dimensoes.map((dim) => (
                  <Line
                    key={dim.chave}
                    type="monotone"
                    dataKey={dim.chave.replace("media_", "")}
                    stroke={dim.cor}
                    strokeWidth={2}
                    dot={{ fill: dim.cor, strokeWidth: 2, r: 3 }}
                  />
                ))}
              </LineChart>
            </div>
            <div className="flex justify-center flex-wrap gap-4 mt-4">
              {dimensoes.map((dim) => (
                <div key={dim.chave} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dim.cor }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {dim.nome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      {stats && (
        <div>
          <h3 className="text-xl font-bold text-center mb-6">Resumo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
              <h4 className="font-semibold text-gray-900 mb-2">Média total</h4>
              <p className="text-3xl font-bold text-[#030870]">
                {stats.lastTotal.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
              <h4 className="font-semibold text-gray-900 mb-2">Desde a 1ª</h4>
              <p
                className={`text-3xl font-bold ${
                  stats.deltaFirst >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stats.deltaFirst >= 0 ? "+" : ""}
                {stats.deltaFirst.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
              <h4 className="font-semibold text-gray-900 mb-2">Tendência</h4>
              <p
                className="text-3xl font-bold"
                style={{ color: stats.trendColor }}
              >
                {stats.trendLabel} {stats.trendArrow}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-center text-sm text-gray-500 mt-8">
        Este conteúdo foi gerado com base nas respostas do usuário e não possui
        valor diagnóstico.
      </div>
    </div>
  );
}
