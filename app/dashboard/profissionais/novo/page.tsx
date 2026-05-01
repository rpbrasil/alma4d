"use client";

import { useRouter } from "next/navigation";
import { ProfessionalForm } from "@/components/dashboard/ProfessionalForm";
import { useAuth } from "@/context/auth";
import { createProfissional } from "@/services/profissionais";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ProfissionalFormData } from "@/types/profissional";
import { useState } from "react";

export default function NovoProfissionalPage() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
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
    try {
      setSaving(true);
      await createProfissional(data);
      router.push("/dashboard/profissionais");
      router.refresh();
    } catch {
      alert("Erro ao criar profissional");
    } finally {
      setSaving(false);
    }
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
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ProfessionalForm
          isLoading={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
