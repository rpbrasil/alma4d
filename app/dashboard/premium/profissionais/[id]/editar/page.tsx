"use client";

import { useRouter, useParams } from "next/navigation";
import { ProfessionalForm } from "@/components/dashboard/ProfessionalForm";
import { useAuth } from "@/context/auth";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ProfissionalFormData, Profissional } from "@/types/profissional";

export default function EditarProfissionalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { role, loading: authLoading } = useAuth();

  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Permissões alinhadas ao resto do dashboard (admin e gestor podem gerenciar)
  const canEdit = role === "admin" || role === "cliente";

  useEffect(() => {
    let mounted = true;

    async function loadProfissional() {
      if (!id) return;

      try {
        setLoadingData(true);
        setError(null);

        // ✅ Busca direta na tabela profissionais (schema real)
        const { data, error } = await supabase
          .from("profissionais")
          .select(
            "id,nome,email,especialidade,bio_resumida,foto_url,calendly_url,website_url,linkedin_url,instagram_url,whatsapp_url,documento,numero_conselho,ativo,created_at",
          )
          .eq("id", id)
          .single();

        if (!mounted) return;

        if (error) throw new Error(error.message);

        setProfissional((data ?? null) as Profissional | null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar profissional";
        if (mounted) setError(message);
      } finally {
        if (mounted) setLoadingData(false);
      }
    }

    loadProfissional();
    return () => {
      mounted = false;
    };
  }, [id, supabase]);

  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#030870] mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
        <p className="text-yellow-800 font-semibold">
          Você não tem permissão para editar profissionais.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-3">
        <AlertCircle className="text-red-600 shrink-0" size={24} />
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

  const handleSubmit = async (form: ProfissionalFormData) => {
    try {
      setSaving(true);
      setError(null);

      // ✅ Update direto em profissionais
      const { error } = await supabase
        .from("profissionais")
        .update({
          nome: form.nome,
          email: form.email,
          especialidade: form.especialidade,
          bio_resumida: form.bio_resumida ?? null,
          foto_url: form.foto_url ?? null,
          calendly_url: form.calendly_url,
          website_url: form.website_url ?? null,
          linkedin_url: form.linkedin_url ?? null,
          instagram_url: form.instagram_url ?? null,
          whatsapp_url: form.whatsapp_url ?? null,
          documento: form.documento,
          numero_conselho: form.numero_conselho ?? null,
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      router.push("/dashboard/profissionais");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar profissional";
      setError(message);
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
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Editar Profissional
          </h2>
          <p className="text-sm text-slate-500">
            Atualize dados cadastrais e links do profissional
          </p>
        </div>
      </div>

      {/* Error inline (se falhar ao salvar) */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Atenção</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ProfessionalForm
          initialData={profissional}
          isLoading={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
