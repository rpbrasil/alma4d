"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, AlertCircle } from "lucide-react";
import type { ProfissionalFormData } from "@/types/profissional";

// Validação com Zod
const profissionalSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  especialidade: z.string().min(2, "Especialidade é obrigatória").max(100),
  bio_resumida: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  foto_url: z.string().url("URL inválida").optional().or(z.literal("")),
  calendly_url: z.string().url("URL inválida").optional().or(z.literal("")),
  website_url: z.string().url("URL inválida").optional().or(z.literal("")),
  linkedin_url: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram_url: z.string().url("URL inválida").optional().or(z.literal("")),
  whatsapp_url: z.string().optional().or(z.literal("")),
  cpf_cnpj: z.string().optional().or(z.literal("")),
});

type ProfissionalFormValues = z.infer<typeof profissionalSchema>;

interface ProfessionalFormProps {
  initialData?: ProfissionalFormData & { id?: string };
  isLoading?: boolean;
  onSubmit: (data: ProfissionalFormData) => Promise<void>;
  onCancel?: () => void;
}

export function ProfessionalForm({
  initialData,
  isLoading = false,
  onSubmit,
  onCancel,
}: ProfessionalFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfissionalFormValues>({
    resolver: zodResolver(profissionalSchema),
    defaultValues: initialData || {},
  });

  const handleFormSubmit = async (data: ProfessionalFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Remove campos vazios
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "" && v !== null),
      ) as ProfissionalFormData;

      await onSubmit(cleanData);
      setSubmitSuccess(true);

      if (!initialData?.id) {
        reset();
      }

      // Auto-limpar mensagem de sucesso
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar profissional";
      setSubmitError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Error Alert */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro ao salvar</p>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-900 font-semibold">
            Profissional salvo com sucesso! ✓
          </p>
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome *
        </label>
        <input
          {...register("nome")}
          type="text"
          placeholder="Ex: Dr. João Silva"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={isLoading}
        />
        {errors.nome && (
          <p className="text-red-600 text-sm mt-1">{errors.nome.message}</p>
        )}
      </div>

      {/* Especialidade */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Especialidade *
        </label>
        <input
          {...register("especialidade")}
          type="text"
          placeholder="Ex: Psicologia Clínica"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={isLoading}
        />
        {errors.especialidade && (
          <p className="text-red-600 text-sm mt-1">
            {errors.especialidade.message}
          </p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bio (até 500 caracteres)
        </label>
        <textarea
          {...register("bio_resumida")}
          placeholder="Breve descrição sobre o profissional..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={isLoading}
        />
        {errors.bio_resumida && (
          <p className="text-red-600 text-sm mt-1">
            {errors.bio_resumida.message}
          </p>
        )}
      </div>

      {/* URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto (URL)
          </label>
          <input
            {...register("foto_url")}
            type="text"
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={isLoading}
          />
          {errors.foto_url && (
            <p className="text-red-600 text-sm mt-1">
              {errors.foto_url.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            {...register("website_url")}
            type="text"
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={isLoading}
          />
          {errors.website_url && (
            <p className="text-red-600 text-sm mt-1">
              {errors.website_url.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calendly
          </label>
          <input
            {...register("calendly_url")}
            type="text"
            placeholder="https://calendly.com/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn
          </label>
          <input
            {...register("linkedin_url")}
            type="text"
            placeholder="https://linkedin.com/in/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instagram
          </label>
          <input
            {...register("instagram_url")}
            type="text"
            placeholder="https://instagram.com/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            {...register("whatsapp_url")}
            type="text"
            placeholder="https://wa.me/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* CPF/CNPJ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CPF/CNPJ
        </label>
        <input
          {...register("cpf_cnpj")}
          type="text"
          placeholder="123.456.789-00"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={isLoading}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={18} />
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#030870] text-white rounded-lg hover:bg-[#020556] disabled:opacity-50"
        >
          <Save size={18} />
          {isLoading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
