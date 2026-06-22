"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";

type RollbackRow = {
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

export default function UploadRollbacksBanner() {
  const { clienteId, role } = useAuth();
  const [rollbacks, setRollbacks] = useState<RollbackRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!clienteId || role !== "cliente") {
        if (mounted) setRollbacks([]);
        return;
      }

      try {
        const supabase = getSupabaseClient();

        const { data, error: err } = await supabase
          .from("user_creation_rollbacks")
          .select("id, auth_user_id, reason, error_text, metadata, created_at")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (err) throw err;

        if (!mounted) return;
        setRollbacks((data as RollbackRow[]) || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (mounted) {
          setError(msg);
          setRollbacks([]);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [clienteId, role]);

  if (error) return null;
  if (!rollbacks) return null; // loading
  if (rollbacks.length === 0) return null;

  return (
    <div className="upload-rollbacks-banner" style={{ background: "#fff4e5", padding: 12, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontWeight: 600 }}>Atenção — detecção automática de rollbacks</div>
      <div style={{ marginTop: 6 }}>
        Foram detectados {rollbacks.length} rollbacks recentes ao criar usuários. Isso normalmente indica uma falha ao persistir dados após criação no Auth.
      </div>
      <div style={{ marginTop: 8 }}>
        <a href="/dashboard/cliente/rollbacks">Ver detalhes</a>
      </div>
    </div>
  );
}
