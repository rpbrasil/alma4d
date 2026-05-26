"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search, Loader2, AlertTriangle, Users } from "lucide-react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";

type Usuario = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  cliente_nome: string | null;
  email: string | null;
  telefone: string | null;
  role: string | null;
  ativo: boolean | null;
};

export default function AdminDeleteUserPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const role = user?.app_metadata?.claims?.role?.toLowerCase();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Usuario[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, isAdmin, router]);

  // ====================
  // SEARCH
  // ====================
  async function handleSearch() {
    const term = query.trim();
    if (!term) return;

    setLoadingSearch(true);

    try {
      const safe = term.replace(/[,()]/g, "");

      const filters = [
        `nome_completo.ilike.%${safe}%`,
        `cliente_nome.ilike.%${safe}%`,
        `email.ilike.%${safe}%`,
        `cpf.ilike.%${safe}%`,
      ];

      const isUUID = /^[0-9a-f-]{36}$/i.test(safe);
      if (isUUID) {
        filters.push(`id.eq.${safe}`);
      }

      const { data, error } = await supabase
        .from("vw_admin_busca_usuarios")
        .select("*")
        .or(filters.join(","))
        .limit(30);

      if (error) throw error;

      setResults(data || []);
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar usuários");
    } finally {
      setLoadingSearch(false);
    }
  }

  // ====================
  // DELETE
  // ====================
  async function handleDelete(userItem: Usuario) {
    if (userItem.id === user?.id) {
      alert("Você não pode se deletar aqui.");
      return;
    }

    const confirmDelete = window.confirm(
      `Confirma deletar:\n\n${userItem.nome_completo}\n${userItem.cliente_nome}\n\nIRREVERSÍVEL`,
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(userItem.id);

      const { error } = await supabase.rpc("delete_user", {
        p_user_id: userItem.id,
      });

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setResults((prev) => prev.filter((u) => u.id !== userItem.id));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Administração • Usuários
          </h1>
          <p className="text-sm text-slate-500">
            Busca e exclusão controlada de usuários
          </p>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, CPF, email, cliente ou ID"
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loadingSearch}
            className="px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 transition"
          >
            {loadingSearch ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Buscar"
            )}
          </button>
        </div>

        {/* ALERT */}
        <div className="flex gap-2 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          <AlertTriangle size={16} />A deleção remove permanentemente o usuário
          e reatribui dados críticos
        </div>
      </div>

      {/* RESULTS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* HEADER TABLE */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex justify-between">
          <span>Resultados</span>
          <span>{results.length} encontrados</span>
        </div>

        {loadingSearch ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-slate-400" />
          </div>
        ) : results.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Users className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="font-medium">Nenhum usuário encontrado</p>
            <p className="text-sm">Tente buscar por nome, CPF ou cliente</p>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((u) => (
              <div
                key={u.id}
                className="flex justify-between items-center px-4 py-4 hover:bg-slate-100/60 transition"
              >
                {/* INFO */}
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {u.nome_completo || "Sem nome"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {u.cliente_nome || "Sem cliente"}
                  </p>

                  <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                    <p>{u.email || "-"}</p>
                    <p>{u.cpf || "-"}</p>
                  </div>

                  {/* BADGES */}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-lg bg-slate-200 text-slate-700">
                      {u.role || "user"}
                    </span>

                    <span
                      className={`text-xs px-2 py-1 rounded-lg ${
                        u.ativo
                          ? "bg-green-100 text-brand-secondary-700"
                          : "bg-red-100 text-brand-accent-700"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 break-all">
                    {u.id}
                  </p>
                </div>

                {/* ACTION */}
                <button
                  onClick={() => handleDelete(u)}
                  disabled={deletingId === u.id}
                  className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-50 transition"
                >
                  {deletingId === u.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Deletar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
