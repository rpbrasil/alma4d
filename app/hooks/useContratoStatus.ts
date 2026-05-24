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
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const fetchStatus = useCallback(async () => {
    if (!contratoId) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/contrato/status?contratoId=${contratoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  async function verificarPix() {
    if (!contratoId) return;

    setChecking(true);

    try {
      const res = await fetch("/api/pagarme/verificar-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contrato_id: contratoId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro verificarPix:", text);
      }

      await fetchStatus();
    } catch (err) {
      console.error("Erro verificarPix:", err);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!contratoId) return;

    let ignore = false;

    (async () => {
      await fetchStatus();
    })();

    return () => {
      ignore = true;
    };
  }, [contratoId, fetchStatus]);

  return {
    data,
    loading,
    checking,
    verificarPix,
    refetch: fetchStatus,
  };
}
