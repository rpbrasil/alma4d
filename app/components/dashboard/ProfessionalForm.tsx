"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ProfissionalFormData } from "../../types/profissional";

/**
 * Normaliza inputs:
 * - "" / null / undefined => undefined
 * - strings: trim + "" => undefined
 */
const emptyToUndefined = (v: unknown) => {
  if (v === "" || v === null || typeof v === "undefined") return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
};

const requiredText = (min: number, max: number, msgMin: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(min, msgMin).max(max));

const optionalText = (max?: number) =>
  z.preprocess(
    emptyToUndefined,
    max
      ? z.string().trim().max(max).optional().catch(undefined)
      : z.string().trim().optional().catch(undefined),
  );

const optionalUrl = (msg = "URL inválida") =>
  z.preprocess(emptyToUndefined, z.string().trim().url(msg).optional());

/**
 * Schema (sem required_error para compatibilidade com seu Zod)
 */
const profissionalSchema = z.object({
  nome: requiredText(3, 200, "Nome deve ter pelo menos 3 caracteres"),
  especialidade: requiredText(2, 100, "Especialidade é obrigatória"),

  bio_resumida: optionalText(500),

  foto_url: optionalUrl(),
  calendly_url: optionalUrl(),
  website_url: optionalUrl(),
  linkedin_url: optionalUrl(),
  instagram_url: optionalUrl(),

  // WhatsApp pode ser telefone ou URL — mantemos texto opcional normalizado
  whatsapp_url: optionalText(),

  // Documento no FORM será cpf_cnpj (canonical)
  cpf_cnpj: optionalText(),
});

type ProfissionalFormOutput = z.output<typeof profissionalSchema>;

/**
 * Estende o tipo de initialData sem "any".
 * (Se ProfissionalFormData já tem alguns campos, ok; aqui só garantimos
 * que esses opcionais existam para leitura.)
 */
type ProfessionalInitialData =
  | (ProfissionalFormData & {
      id?: string;
      documento?: string | null;
      cpf_cnpj?: string | null;

      bio_resumida?: string | null;
      foto_url?: string | null;
      calendly_url?: string | null;
      website_url?: string | null;
      linkedin_url?: string | null;
      instagram_url?: string | null;
      whatsapp_url?: string | null;
    })
  | null
  | undefined;

interface ProfessionalFormProps {
  initialData?: ProfessionalInitialData;
  isLoading?: boolean;

  /**
   * Mantive sua assinatura original para não quebrar chamadas:
   * o componente converte o output do schema -> ProfissionalFormData
   */
  onSubmit: (data: ProfissionalFormData) => Promise<void>;
  onCancel?: () => void;
}

function buildDefaultValues(
  initialData?: ProfessionalInitialData,
): ProfissionalFormOutput {
  const cpfCnpj = initialData?.cpf_cnpj ?? initialData?.documento ?? "";

  return {
    nome: initialData?.nome ?? "",
    especialidade: initialData?.especialidade ?? "",

    bio_resumida: initialData?.bio_resumida ?? "",

    foto_url: initialData?.foto_url ?? "",
    calendly_url: initialData?.calendly_url ?? "",
    website_url: initialData?.website_url ?? "",
    linkedin_url: initialData?.linkedin_url ?? "",
    instagram_url: initialData?.instagram_url ?? "",

    whatsapp_url: initialData?.whatsapp_url ?? "",
    cpf_cnpj: cpfCnpj ?? "",
  };
}

/**
 * Adapter final para o tipo do backend (ProfissionalFormData).
 * Aqui você decide se cpf_cnpj vira documento no banco.
 */
function toProfissionalFormData(
  values: ProfissionalFormOutput,
  id?: string,
): ProfissionalFormData & { id?: string } {
  const payload: ProfissionalFormData & { id?: string } = {
    nome: values.nome,
    especialidade: values.especialidade,
    documento: values.cpf_cnpj ?? "",
    calendly_url: values.calendly_url ?? "",
    bio_resumida: values.bio_resumida ?? null,
    foto_url: values.foto_url ?? null,
    website_url: values.website_url ?? null,
    linkedin_url: values.linkedin_url ?? null,
    instagram_url: values.instagram_url ?? null,
    whatsapp_url: values.whatsapp_url ?? null,
  };

  // só inclua se existir no type
  if (id) payload.id = id;

  return payload;
}

export function ProfessionalForm({
  initialData,
  isLoading = false,
  onSubmit,
  onCancel,
}: ProfessionalFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const defaultValues = useMemo(
    () => buildDefaultValues(initialData),
    [initialData],
  );

  /**
   * useForm tipado com Input/Output (sem any)
   */
  const form = useForm<ProfissionalFormOutput>({
    // @ts-expect-error - Zod type mismatch with optional fields
    resolver: zodResolver(profissionalSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  /**
   * defaultValues é cacheado pela RHF.
   * Para async initialData, use reset quando mudar. [1](https://docs.expo.dev/build-reference/ios-builds/)[2](https://stackoverflow.com/questions/18933321/can-i-safely-delete-contents-of-xcode-derived-data-folder)
   */
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  /**
   * Auto-limpar sucesso SEM ref (evita eslint react-hooks/refs)
   */
  useEffect(() => {
    if (!submitSuccess) return;
    const t = window.setTimeout(() => setSubmitSuccess(false), 3000);
    return () => window.clearTimeout(t);
  }, [submitSuccess]);

  const disabled = isLoading || isSubmitting;

  const handleFormSubmit = async (values: ProfissionalFormOutput) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const payload = toProfissionalFormData(values, initialData?.id);

      await onSubmit(payload);
      setSubmitSuccess(true);

      // se for criação (sem id), limpa formulário
      if (!initialData?.id) reset(buildDefaultValues(null));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar profissional";
      setSubmitError(message);
    }
  };

  return (
    // @ts-expect-error - React Hook Form type mismatch
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Error Alert */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro ao salvar</p>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="text-green-700 shrink-0" size={20} />
          <p className="text-green-900 font-semibold">
            Profissional salvo com sucesso! ✓
          </p>
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome <span className="text-red-600">*</span>
        </label>
        <input
          {...register("nome")}
          type="text"
          placeholder="Ex: Dr. João Silva"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={disabled}
        />
        {errors.nome && (
          <p className="text-red-600 text-sm mt-1">{errors.nome.message}</p>
        )}
      </div>

      {/* Especialidade */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Especialidade <span className="text-red-600">*</span>
        </label>
        <input
          {...register("especialidade")}
          type="text"
          placeholder="Ex: Psicologia Clínica"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={disabled}
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
          disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
          />
          {errors.calendly_url && (
            <p className="text-red-600 text-sm mt-1">
              {errors.calendly_url.message}
            </p>
          )}
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
            disabled={disabled}
          />
          {errors.linkedin_url && (
            <p className="text-red-600 text-sm mt-1">
              {errors.linkedin_url.message}
            </p>
          )}
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
            disabled={disabled}
          />
          {errors.instagram_url && (
            <p className="text-red-600 text-sm mt-1">
              {errors.instagram_url.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            {...register("whatsapp_url")}
            type="text"
            placeholder="(opcional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={disabled}
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
          disabled={disabled}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={18} />
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#030870] text-white rounded-lg hover:bg-[#020556] disabled:opacity-50"
        >
          <Save size={18} />
          {disabled ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
