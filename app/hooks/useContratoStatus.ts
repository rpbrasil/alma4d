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
  const [autoChecking, setAutoChecking] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!contratoId) return;

    setError(null);
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setError("Sessão inválida.");
        return;
      }

      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;

      const res = await fetch(`/api/contrato/status?contratoId=${contratoId}`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;

      const res = await fetch("/api/pagarme/verificar-pix", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contrato_id: contratoId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao verificar PIX");
      }

      await fetchStatus();
    } catch (error) {
      console.error("Erro verificarPix:", error);
      setError("Erro ao verificar status do PIX.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!contratoId) return;
    const run = async () => {
      await fetchStatus();
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId]);

  // Auto-poll a cada 5s enquanto o contrato estiver pendente (rascunho + PIX)
  useEffect(() => {
    const contratoStatus = data?.contrato?.status ?? null;
    const pagamentoMethod = (data?.pagamento?.method ?? "")
      .toString()
      .toLowerCase();

    // Apenas PIX: boleto leva 1-3 dias úteis, auto-poll a cada 5s seria desperdício
    // e o endpoint verificar-pix retorna imediato sem fazer nada para boleto
    const shouldPoll =
      contratoStatus === "rascunho" && pagamentoMethod === "pix";

    if (!shouldPoll || !contratoId) return;

    const interval = setInterval(async () => {
      if (checking) return;
      setAutoChecking(true);
      try {
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        const res = await fetch("/api/pagarme/verificar-pix", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ contrato_id: contratoId }),
        });
        if (res.ok) {
          await fetchStatus();
        }
      } catch {
        // silencioso — próximo tick tentará novamente
      } finally {
        setAutoChecking(false);
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.contrato?.status, data?.pagamento?.method, contratoId, checking]);

  return {
    data,
    loading,
    checking,
    autoChecking,
    error,
    verificarPix,
    refetch: fetchStatus,
  };
}
