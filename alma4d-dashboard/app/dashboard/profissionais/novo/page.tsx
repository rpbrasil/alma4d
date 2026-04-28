"use client";

import { useRouter } from "next/navigation";
import { ProfessionalForm } from "@/components/dashboard/ProfessionalForm";
import { useAuth } from "@/context/auth";
import { useProfissionais } from "@/hooks/useProfissionais";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ProfissionalFormData } from "@/types/profissional";

export default function NovoProfissionalPage() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const { create, loading } = useProfissionais({
    autoLoad: false,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#030870] mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Apenas cliente e admin podem criar
  if (role !== "cliente" && role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-900">
          Você não tem permissão para criar profissionais.
        </p>
      </div>
    );
  }

  const handleSubmit = async (data: ProfissionalFormData) => {
    const profAberta = await create(data);

    // Redirecionar após criar
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
            Novo Profissional
          </h1>
          <p className="text-gray-600 mt-1">
            Cadastre um novo profissional na sua organização
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ProfessionalForm
          isLoading={loading}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
