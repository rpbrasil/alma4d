"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

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
    boleto?: {
      boleto_url?: string | null;
      line?: string | null;
    } | null;
  } | null;
};

export function useContratoStatus(contratoId: string | null) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(!!contratoId);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchStatus = useCallback(async () => {
    if (!contratoId) return;
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/contrato/status?contratoId=${contratoId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setError("Erro ao carregar status do contrato.");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      setError("Erro ao carregar status do contrato.");
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  async function verificarPix() {
    if (!contratoId) return;

    setChecking(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch("/api/pagarme/verificar-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contrato_id: contratoId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro verificarPix:", text);
        setError("Erro ao verificar status do PIX.");
      }

      await fetchStatus();
    } catch (error) {
      console.error("Erro verificarPix:", error);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!contratoId) {
      return;
    }
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await fetchStatus();
    })();

    return () => {
      cancelled = true;
    };
  }, [contratoId, fetchStatus]);

  return {
    data,
    loading,
    checking,
    error,
    verificarPix,
    refetch: fetchStatus,
  };
}
