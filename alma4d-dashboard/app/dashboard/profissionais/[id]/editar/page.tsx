"use client";

import { useRouter, useParams } from "next/navigation";
import { ProfessionalForm } from "@/components/dashboard/ProfessionalForm";
import { useAuth } from "@/context/auth";
import { useProfissionais } from "@/hooks/useProfissionais";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfissionalById } from "@/services/profissionais";
import type { ProfissionalFormData, Profissional } from "@/types/profissional";

export default function EditarProfissionalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { clienteId, role, loading: authLoading } = useAuth();
  const { update, loading } = useProfissionais({
    clienteId: "",
    autoLoad: false,
  });

  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do profissional
  useEffect(() => {
    if (!id) return;

    const loadProfissional = async () => {
      try {
        const data = await getProfissionalById(id);
        setProfissional(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar profissional";
        setError(message);
      } finally {
        setLoadingData(false);
      }
    };

    loadProfissional();
  }, [id]);

  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#030870] mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
        <div>
          <p className="font-semibold text-red-900">Erro</p>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!profissional) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-900">Profissional não encontrado.</p>
      </div>
    );
  }

  // Apenas cliente e admin podem editar
  if (role !== "cliente" && role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-900">
          Você não tem permissão para editar profissionais.
        </p>
      </div>
    );
  }

  const handleSubmit = async (data: ProfissionalFormData) => {
    await update(id, data);
    router.push("/dashboard/profissionais");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profissionais"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Editar Profissional
          </h1>
          <p className="text-gray-600 mt-1">{profissional.nome}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ProfessionalForm
          initialData={profissional}
          isLoading={loading}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
