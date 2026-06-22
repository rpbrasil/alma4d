"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth";

type Rollback = {
  id: string;
  auth_user_id: string;
  caller_id?: string | null;
  cliente_id?: string | null;
  job_id?: string | null;
  reason?: string | null;
  error_text?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export default function RollbacksPage() {
  const { clienteId, role } = useAuth();
  const [rollbacks, setRollbacks] = useState<Rollback[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [availableReasons, setAvailableReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!clienteId || (role !== "cliente" && role !== "admin")) {
        setRollbacks([]);
        return;
      }

      setLoading(true);
      try {
        const supabase = getSupabaseClient();

        const from = page * pageSize;
        const to = from + pageSize - 1;

        // build query with optional filters
        let query = supabase
          .from("user_creation_rollbacks")
          .select(
            "id, auth_user_id, caller_id, job_id, reason, error_text, metadata, created_at",
          )
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (reasonFilter) query = query.eq("reason", reasonFilter);
        if (fromDate)
          query = query.gte("created_at", new Date(fromDate).toISOString());
        if (toDate)
          query = query.lte("created_at", new Date(toDate).toISOString());

        const { data, error: err } = await query;

        if (err) throw err;

        // get total count (head request) applying same filters
        let countQuery = supabase
          .from("user_creation_rollbacks")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", clienteId);
        if (reasonFilter) countQuery = countQuery.eq("reason", reasonFilter);
        if (fromDate)
          countQuery = countQuery.gte(
            "created_at",
            new Date(fromDate).toISOString(),
          );
        if (toDate)
          countQuery = countQuery.lte(
            "created_at",
            new Date(toDate).toISOString(),
          );

        const head = await countQuery;

        if (mounted) {
          setRollbacks((data as Rollback[]) || []);
          setTotal((head as any)?.count ?? null);
          setError(null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    // load available reasons for the filter (lightweight sampling)
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: sample } = await supabase
          .from("user_creation_rollbacks")
          .select("reason")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!mounted) return;
        const uniq = Array.from(
          new Set((sample || []).map((r: any) => r.reason).filter(Boolean)),
        );
        setAvailableReasons(uniq as string[]);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [clienteId, role, page, pageSize]);

  const totalPages = total ? Math.ceil(total / pageSize) : null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Rollbacks de criação de usuário
      </h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Erro ao carregar: {error}
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row md:items-center md:gap-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-slate-600">Reason:</label>
          <select
            value={reasonFilter ?? ""}
            onChange={(e) => {
              setReasonFilter(e.target.value || null);
              setPage(0);
            }}
            className="rounded border px-2 py-1"
          >
            <option value="">Todos</option>
            {availableReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center mt-2 md:mt-0">
          <label className="text-sm text-slate-600">De:</label>
          <input
            type="date"
            value={fromDate ?? ""}
            onChange={(e) => {
              setFromDate(e.target.value || null);
              setPage(0);
            }}
            className="rounded border px-2 py-1"
          />
          <label className="text-sm text-slate-600">Até:</label>
          <input
            type="date"
            value={toDate ?? ""}
            onChange={(e) => {
              setToDate(e.target.value || null);
              setPage(0);
            }}
            className="rounded border px-2 py-1"
          />
        </div>

        <div className="ml-auto mt-2 md:mt-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="mr-2 rounded border px-3 py-1"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={
              loading || (totalPages !== null && page + 1 >= totalPages)
            }
            className="rounded border px-3 py-1"
          >
            Próximo →
          </button>
          <span className="ml-4 text-sm text-slate-600">
            Página {page + 1}
            {totalPages ? ` de ${totalPages}` : ""}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : rollbacks.length === 0 ? (
          <div className="text-sm text-slate-500">
            Nenhum rollback encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-700">
                <th className="py-2">Quando</th>
                <th className="py-2">Reason</th>
                <th className="py-2">Detalhe</th>
                <th className="py-2">Flags</th>
                <th className="py-2">Job</th>
              </tr>
            </thead>
            <tbody>
              {rollbacks.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 align-top text-xs text-slate-600">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 font-medium">{r.reason ?? "—"}</td>
                  <td className="py-2 text-xs text-slate-700">
                    {r.error_text
                      ? r.error_text.length > 200
                        ? r.error_text.slice(0, 200) + "…"
                        : r.error_text
                      : "—"}
                  </td>
                  <td className="py-2 text-xs text-slate-700">
                    {r.metadata ? (
                      <div className="space-y-1">
                        {typeof r.metadata["has_email"] !== "undefined" && (
                          <div>
                            has_email: {String(r.metadata["has_email"])}
                          </div>
                        )}
                        {typeof r.metadata["has_phone"] !== "undefined" && (
                          <div>
                            has_phone: {String(r.metadata["has_phone"])}
                          </div>
                        )}
                        {typeof r.metadata["delete_ok"] !== "undefined" && (
                          <div>
                            delete_ok: {String(r.metadata["delete_ok"])}
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-xs">
                    {r.job_id ? (
                      <a className="text-brand" href={`?job_id=${r.job_id}`}>
                        {r.job_id}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
