"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function RelatoriosPsicossocial() {
  const { user, role } = useAuth();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const normalizedRole = role?.toLowerCase();

  const isCliente = normalizedRole === "cliente";
  const isGestor = normalizedRole === "gestor";
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("id", user.id)
        .single();

      setClienteId(usuario?.cliente_id || null);
      setLoading(false);
    };
    init();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#019499]" />
      </div>
    );
  }

  if (isGestor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Relatório Psicossocial</h2>
        <p className="text-gray-600">
          Você ainda não tem acesso a este relatório.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Em breve vamos liberar uma versão para gestores (somente agregados).
        </p>
      </div>
    );
  }

  if (isCliente && !clienteId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">
          Usuário cliente sem cliente_id vinculado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Relatório Psicossocial</h2>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
          <p className="text-sm text-gray-700 leading-relaxed text-left">
            <strong>SIGILO, CONFIDENCIALIDADE E USO RESPONSÁVEL</strong>
            <br />
            <br />
            Este relatório apresenta informações agregadas relacionadas a
            fatores de risco psicossociais no trabalho, em conformidade com a
            NR‑01 (GRO/PGR).
            <br />
            <br />
            Em respeito à Constituição Federal (art. 5º, X e XII) e à Lei Geral
            de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018), é vedada
            qualquer tentativa de identificação individual, uso punitivo ou
            desvio de finalidade.
            <br />
            <br />
            Os dados destinam‑se exclusivamente à análise organizacional e
            preventiva, devendo ser tratados com confidencialidade, ética e
            responsabilidade legal.
          </p>
        </div>

        <button
          className="bg-[#019499] text-white px-6 py-3 rounded-lg hover:bg-[#017a7d] transition-colors font-medium"
          disabled={!clienteId}
          onClick={() =>
            router.push("/dashboard/relatorios/psicossocial/copsoq")
          }
        >
          Dashboard Psicossocial
        </button>
      </div>
    </div>
  );
}
