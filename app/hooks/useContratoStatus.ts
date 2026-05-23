"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

type StatusResponse = {
  contrato: {
    status: "rascunho" | "ativo" | "suspenso" | "encerrado";
    numero_contrato: string;
  } | null;
  pagamento: {
    status?: string | null;
    method?: string | null;
  } | null;
  payment_artifacts?: {
    pix?: {
      qr_code?: string | null;
      qr_code_url?: string | null;
      expires_at?: string | null;
    } | null;
    boleto?: { boleto_url?: string | null; line?: string | null } | null;
  } | null;
};

export function useContratoStatus(contratoId: string | null) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  async function fetchStatus() {
    if (!contratoId) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch(`/api/contrato/status?contratoId=${contratoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Erro fetchStatus:", err);
    } finally {
      setLoading(false);
    }
  }

  async function verificarPix() {
    if (!contratoId) return;

    setChecking(true);

    await fetch("/api/pagarme/verificar-pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-manual-verify-token": process.env.NEXT_PUBLIC_VERIFY_TOKEN || "",
      },
      body: JSON.stringify({ contrato_id: contratoId }),
    });

    await fetchStatus();
    setChecking(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!contratoId) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;

        const res = await fetch(
          `/api/contrato/status?contratoId=${contratoId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const json = await res.json();

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        console.error("Erro status:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [contratoId, supabase]);

  return {
    data,
    loading,
    checking,
    verificarPix,
    refetch: fetchStatus,
  };
}
