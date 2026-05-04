"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ProfissionalFormData } from "@/types/profissional";

// normaliza vazio -> undefined
const emptyToUndefined = (v: unknown) => {
  if (v === "" || v === null || typeof v === "undefined") return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
};

// ✅ preprocess tipado (não vira unknown)
const pre = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema) as unknown as T;

const requiredText = (min: number, max: number, msgMin: string) =>
  pre(z.string().trim().min(min, msgMin).max(max));

const optionalText = (max?: number) =>
  pre(
    max ? z.string().trim().max(max).optional() : z.string().trim().optional(),
  );

const optionalUrl = (msg = "URL inválida") =>
  pre(z.string().trim().url(msg).optional());

const requiredUrl = (msg = "URL inválida") => pre(z.string().trim().url(msg));

const emailOptional = () =>
  pre(z.string().trim().email("Email inválido").optional());

const profissionalSchema = z.object({
  nome: requiredText(3, 200, "Nome deve ter pelo menos 3 caracteres"),
  especialidade: requiredText(2, 100, "Especialidade é obrigatória"),

  email: emailOptional(),

  bio_resumida: optionalText(500),

  foto_url: optionalUrl(),
  calendly_url: requiredUrl("Informe uma URL do Calendly válida"),
  website_url: optionalUrl(),
  linkedin_url: optionalUrl(),
  instagram_url: optionalUrl(),
  whatsapp_url: optionalText(200),

  cpf_cnpj: optionalText(30),
  numero_conselho: optionalText(60),
});

type FormValues = z.infer<typeof profissionalSchema>;

type InitialData =
  | (ProfissionalFormData & {
      id?: string;
      cpf_cnpj?: string | null;
      numero_conselho?: string | null;
    })
  | null
  | undefined;

interface Props {
  initialData?: InitialData;
  isLoading?: boolean;
  onSubmit: (data: ProfissionalFormData) => Promise<void>;
  onCancel?: () => void;
}

function buildDefaults(initialData?: InitialData): FormValues {
  const cpfCnpj = initialData?.cpf_cnpj ?? initialData?.documento ?? "";

  return {
    nome: initialData?.nome ?? "",
    especialidade: initialData?.especialidade ?? "",
    email: initialData?.email ?? "",

    bio_resumida: initialData?.bio_resumida ?? "",
    foto_url: initialData?.foto_url ?? "",
    calendly_url: initialData?.calendly_url ?? "",
    website_url: initialData?.website_url ?? "",
    linkedin_url: initialData?.linkedin_url ?? "",
    instagram_url: initialData?.instagram_url ?? "",
    whatsapp_url: initialData?.whatsapp_url ?? "",

    cpf_cnpj: cpfCnpj ?? "",
    numero_conselho: initialData?.numero_conselho ?? "",
  };
}

function toPayload(values: FormValues): ProfissionalFormData {
  return {
    nome: values.nome,
    especialidade: values.especialidade,
    documento: values.cpf_cnpj ?? "",

    email: values.email ? values.email : null,
    numero_conselho: values.numero_conselho ? values.numero_conselho : null,

    calendly_url: values.calendly_url,
    bio_resumida: values.bio_resumida ? values.bio_resumida : null,
    foto_url: values.foto_url ? values.foto_url : null,
    website_url: values.website_url ? values.website_url : null,
    linkedin_url: values.linkedin_url ? values.linkedin_url : null,
    instagram_url: values.instagram_url ? values.instagram_url : null,
    whatsapp_url: values.whatsapp_url ? values.whatsapp_url : null,
  };
}

export function ProfessionalForm({
  initialData,
  isLoading = false,
  onSubmit,
  onCancel,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const defaultValues = useMemo(
    () => buildDefaults(initialData),
    [initialData],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(profissionalSchema),
    defaultValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!submitSuccess) return;
    const t = window.setTimeout(() => setSubmitSuccess(false), 3000);
    return () => window.clearTimeout(t);
  }, [submitSuccess]);

  const disabled = isLoading || isSubmitting;

  const onValid: SubmitHandler<FormValues> = async (values) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await onSubmit(toPayload(values));
      setSubmitSuccess(true);
      if (!initialData?.id) reset(buildDefaults(null));
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Erro ao salvar profissional",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro ao salvar</p>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="text-green-700 shrink-0" size={20} />
          <p className="text-green-900 font-semibold">
            Profissional salvo com sucesso! ✓
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome <span className="text-red-600">*</span>
        </label>
        <input
          {...register("nome")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={disabled}
        />
        {errors.nome?.message && (
          <p className="text-red-600 text-sm mt-1">{errors.nome.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          {...register("email")}
          type="email"
          placeholder="profissional@email.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={disabled}
        />
        {errors.email?.message && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Especialidade <span className="text-red-600">*</span>
        </label>
        <input
          {...register("especialidade")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={disabled}
        />
        {errors.especialidade?.message && (
          <p className="text-red-600 text-sm mt-1">
            {errors.especialidade.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Calendly <span className="text-red-600">*</span>
        </label>
        <input
          {...register("calendly_url")}
          placeholder="https://calendly.com/..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
          disabled={disabled}
        />
        {errors.calendly_url?.message && (
          <p className="text-red-600 text-sm mt-1">
            {errors.calendly_url.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bio (até 500 caracteres)
        </label>
        <textarea
          {...register("bio_resumida")}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
          disabled={disabled}
        />
        {errors.bio_resumida?.message && (
          <p className="text-red-600 text-sm mt-1">
            {errors.bio_resumida.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto (URL)
          </label>
          <input
            {...register("foto_url")}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={disabled}
          />
          {errors.foto_url?.message && (
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
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn
          </label>
          <input
            {...register("linkedin_url")}
            placeholder="https://linkedin.com/in/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instagram
          </label>
          <input
            {...register("instagram_url")}
            placeholder="https://instagram.com/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            {...register("whatsapp_url")}
            placeholder="(opcional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF/CNPJ
          </label>
          <input
            {...register("cpf_cnpj")}
            placeholder="123.456.789-00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número do Conselho
          </label>
          <input
            {...register("numero_conselho")}
            placeholder="Ex: CRP 00/00000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
            disabled={disabled}
          />
        </div>
      </div>

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
