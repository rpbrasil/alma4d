"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  Scale,
  CalendarDays,
  MessageSquareQuote,
  Siren,
  Info,
  Paperclip,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Building2,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";
import { useAuth, Role } from "@/context/auth";
import { buildAcessoBasicoHref } from "@/lib/navigation/copsoq";


type CategoriaDenuncia =
  | "assedio_moral"
  | "assedio_sexual"
  | "discriminacao"
  | "violencia"
  | "fraude"
  | "seguranca"
  | "lgpd_privacidade"
  | "saude_mental"
  | "nao_conformidade"
  | "outros";

type FormState = {
  anonimizada: boolean;
  categoria: CategoriaDenuncia;
  titulo: string;
  descricao: string;
  localOcorrencia: string;
  dataOcorrencia: string;
  riscoIminente: boolean;
  contatoRetorno: string;
  consentimentoTratamento: boolean;
};

const INITIAL_FORM: FormState = {
  anonimizada: true,
  categoria: "nao_conformidade",
  titulo: "",
  descricao: "",
  localOcorrencia: "",
  dataOcorrencia: "",
  riscoIminente: false,
  contatoRetorno: "",
  consentimentoTratamento: false,
};

const GUIDED_TEMPLATE = `1. O que aconteceu?
Descreva o fato principal com palavras simples.

2. Onde isso aconteceu?
Informe setor, equipe, unidade, local ou contexto.

3. Quando aconteceu?
Se souber, informe a data ou o período aproximado.

4. Quem foi afetado?
Explique quem foi impactado, sem se identificar se quiser permanecer anônimo(a).

5. Há risco imediato?
Explique se existe risco à saúde, segurança, integridade ou continuidade do trabalho.

6. Existe algo que ajude a entender o caso?
Ex.: documentos, mensagens, prints, testemunhas ou contexto adicional.
`;

const DRAFT_STORAGE_KEY = "alma4d_denuncia_draft_express_acesso_basico";
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function readInitialDraft(): FormState {
  if (typeof window === "undefined") return INITIAL_FORM;

  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return INITIAL_FORM;

    const parsed = JSON.parse(raw) as Partial<FormState>;

    return {
      anonimizada:
        typeof parsed.anonimizada === "boolean"
          ? parsed.anonimizada
          : INITIAL_FORM.anonimizada,
      categoria:
        typeof parsed.categoria === "string"
          ? (parsed.categoria as CategoriaDenuncia)
          : INITIAL_FORM.categoria,
      titulo: typeof parsed.titulo === "string" ? parsed.titulo : "",
      descricao: typeof parsed.descricao === "string" ? parsed.descricao : "",
      localOcorrencia:
        typeof parsed.localOcorrencia === "string"
          ? parsed.localOcorrencia
          : "",
      dataOcorrencia:
        typeof parsed.dataOcorrencia === "string" ? parsed.dataOcorrencia : "",
      riscoIminente:
        typeof parsed.riscoIminente === "boolean"
          ? parsed.riscoIminente
          : false,
      contatoRetorno:
        typeof parsed.contatoRetorno === "string" ? parsed.contatoRetorno : "",
      consentimentoTratamento:
        typeof parsed.consentimentoTratamento === "boolean"
          ? parsed.consentimentoTratamento
          : false,
    };
  } catch {
    return INITIAL_FORM;
  }
}

function parseStep(value: string | null): 1 | 2 | 3 {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
}

function Stepper({
  currentStep,
  onGoStep,
}: {
  currentStep: 1 | 2 | 3;
  onGoStep: (step: 1 | 2 | 3) => void;
}) {
  const items = [
    { step: 1 as const, label: "Entender riscos" },
    { step: 2 as const, label: "Canal seguro" },
    { step: 3 as const, label: "Questionário COPSOQ" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm p-3 sm:p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const active = currentStep === item.step;
          const done = currentStep > item.step;

          return (
            <button
              key={item.step}
              type="button"
              onClick={() => onGoStep(item.step)}
              className={[
                "rounded-xl border px-3 py-3 text-left transition",
                active
                  ? "border-brand bg-brand/10"
                  : done
                    ? "border-brand-secondary/30 bg-brand-secondary/5"
                    : "border-border hover:bg-surface-muted",
              ].join(" ")}
            >
              <div className="text-xs text-foreground/55">
                Etapa {item.step}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step1Riscos({ onNext }: { onNext: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 bg-brand-secondary/5 px-3 py-1 text-xs sm:text-sm text-foreground/70">
          <ShieldCheck className="h-4 w-4 text-brand-secondary" />
          Conteúdo de acolhimento e orientação
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground leading-tight">
          Entender riscos ajuda a proteger pessoas, equipes e a organização
        </h1>

        <p className="max-w-3xl text-sm sm:text-base text-foreground/70 leading-relaxed">
          Antes de registrar uma ocorrência ou responder ao questionário, vale
          entender de forma simples o que é risco, por que isso importa e como a
          sua percepção ajuda a prevenir danos e melhorar o ambiente de
          trabalho.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
            <div>
              <h2 className="font-medium text-foreground">O que é risco?</h2>
              <p className="mt-1 text-sm text-foreground/70 leading-relaxed">
                Risco é a chance de um fato causar dano, perda, falha, conflito,
                adoecimento ou impacto negativo se não for percebido e tratado a
                tempo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
            <div>
              <h2 className="font-medium text-foreground">
                Tipos de riscos empresariais
              </h2>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-foreground/70 leading-relaxed">
                <li>Riscos de saúde e segurança no trabalho</li>
                <li>Riscos operacionais e de processo</li>
                <li>Riscos éticos, de conduta e integridade</li>
                <li>Riscos de privacidade e proteção de dados</li>
                <li>Riscos psicossociais relacionados ao trabalho</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
            <div>
              <h2 className="font-medium text-foreground">
                Normas brasileiras citadas de forma simples
              </h2>
              <div className="mt-1 space-y-2 text-sm text-foreground/70 leading-relaxed">
                <p>
                  <strong>NR-1:</strong> trata das disposições gerais e do
                  gerenciamento de riscos ocupacionais, além das medidas de
                  prevenção em segurança e saúde no trabalho.
                </p>
                <p>
                  <strong>Guia do MTE sobre fatores psicossociais:</strong>
                  explica a inclusão expressa dos fatores de riscos
                  psicossociais relacionados ao trabalho no gerenciamento de
                  riscos ocupacionais.
                </p>
                <p>
                  <strong>Lei nº 13.608/2018:</strong> sustenta canais de
                  denúncia com garantia de anonimato e protege a identidade do
                  informante.
                </p>
                <p>
                  <strong>LGPD:</strong> exige finalidade, necessidade,
                  transparência, segurança, prevenção e responsabilização no
                  tratamento de dados.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-start gap-3">
            <HeartPulse className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
            <div>
              <h2 className="font-medium text-foreground">
                O que fazer quando perceber um risco
              </h2>
              <div className="mt-1 space-y-2 text-sm text-foreground/70 leading-relaxed">
                <p>Observe com calma o que está acontecendo.</p>
                <p>Evite se expor a perigo desnecessário.</p>
                <p>
                  Registre, quando possível, informações úteis: local, data,
                  contexto e impacto percebido.
                </p>
                <p>
                  Use o canal seguro para relatar ocorrências, abusos, desvios,
                  não conformidades ou situações de risco.
                </p>
                <p>
                  Participe do questionário de riscos psicossociais para ajudar
                  no mapeamento coletivo do ambiente de trabalho.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-brand-secondary/20 bg-brand-secondary/5 p-4 text-sm text-foreground/75 leading-relaxed">
            <p>
              Sua percepção ajuda a organização a identificar problemas antes
              que eles cresçam. Relatar um risco não é “atrapalhar”: é colaborar
              com prevenção, cuidado e melhoria do ambiente.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 h-11 text-white font-medium hover:opacity-95"
        >
          Entendi. Quero conhecer o canal seguro
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function Step2CanalSeguro({
  form,
  setForm,
  files,
  setFiles,
  submitting,
  protocol,
  error,
  setError,
  onSubmit,
  onPrev,
  onNext,
  role,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  submitting: boolean;
  protocol: string | null;
  error: string | null;
  setError: (value: string | null) => void;
  onSubmit: () => Promise<void>;
  onPrev: () => void;
  onNext: () => void;
  role: Role | null;
}) {
  const todayISO = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const guidedTemplateInserted = useMemo(() => {
    return form.descricao.includes("1. O que aconteceu?");
  }, [form.descricao]);

  const isSubmitDisabled = useMemo(() => {
    if (submitting) return true;
    if (!form.titulo.trim()) return true;
    if (!form.descricao.trim() || form.descricao.trim().length < 20)
      return true;
    if (!form.consentimentoTratamento) return true;
    if (form.dataOcorrencia && form.dataOcorrencia > todayISO) return true;
    if (files.length > MAX_FILES) return true;
    return false;
  }, [form, submitting, todayISO, files.length]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function insertGuidedTemplate() {
    if (guidedTemplateInserted) return;

    setForm((prev) => ({
      ...prev,
      descricao: prev.descricao.trim()
        ? `${prev.descricao.trim()}\n\n${GUIDED_TEMPLATE}`
        : GUIDED_TEMPLATE,
    }));
  }

  function validateFiles(nextFiles: File[]) {
    if (nextFiles.length > MAX_FILES) {
      return `Você pode anexar no máximo ${MAX_FILES} arquivos.`;
    }

    for (const file of nextFiles) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return `Arquivo não permitido: ${file.name}. Envie apenas PDF, PNG, JPG ou WEBP.`;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return `O arquivo ${file.name} excede o limite de ${MAX_FILE_SIZE_MB} MB.`;
      }
    }

    return null;
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);

    if (!selected.length) return;

    const merged = [...files, ...selected];
    const validationError = validateFiles(merged);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError(null);
    setFiles(merged);
    event.target.value = "";
  }

  function removeFileAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    if (form.anonimizada && files.length > 0) {
      setFiles([]);
    }
  }, [form.anonimizada, files.length, setFiles]);

  const secondaryLabel =
    role === "usuario" ? "Voltar para a etapa anterior" : "Voltar";

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          Canal seguro de ocorrências e denúncias
        </h2>
        <p className="text-sm text-foreground/65">
          Você pode escrever do seu jeito. Se preferir, use as perguntas guiadas
          para organizar o texto.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {protocol && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Relato registrado com sucesso
          </div>
          <p className="mt-1">
            Protocolo: <span className="font-semibold">{protocol}</span>
          </p>
        </div>
      )}

      <div className="grid gap-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            Como você deseja enviar?
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 cursor-pointer">
              <input
                type="radio"
                checked={form.anonimizada}
                onChange={() => updateField("anonimizada", true)}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Envio anônimo
                </p>
                <p className="text-xs text-foreground/60">
                  O sistema não vincula seu usuário ao cadastro do relato.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 cursor-pointer">
              <input
                type="radio"
                checked={!form.anonimizada}
                onChange={() => updateField("anonimizada", false)}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Envio identificado
                </p>
                <p className="text-xs text-foreground/60">
                  Pode facilitar retorno e continuidade da análise.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <MessageSquareQuote className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Perguntas guiadas para te ajudar a escrever
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/70 leading-relaxed list-disc pl-5">
                <li>O que aconteceu?</li>
                <li>Onde isso aconteceu?</li>
                <li>Quando aconteceu?</li>
                <li>Quem foi afetado?</li>
                <li>Existe risco imediato?</li>
                <li>Há algo que ajude a entender o caso?</li>
              </ul>

              <button
                type="button"
                onClick={insertGuidedTemplate}
                disabled={guidedTemplateInserted}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Info className="h-4 w-4" />
                {guidedTemplateInserted
                  ? "Modelo já inserido"
                  : "Inserir modelo guiado na descrição"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <Paperclip className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
            <div className="min-w-0 w-full">
              <p className="text-sm font-medium text-foreground">
                Evidências (opcional)
              </p>
              <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
                Você pode anexar imagens (PNG, JPG, WEBP) ou PDF, com até{" "}
                {MAX_FILES} arquivos e {MAX_FILE_SIZE_MB} MB por arquivo.
              </p>

              {form.anonimizada ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  Para proteger seu anonimato, o upload de evidências fica
                  desabilitado no envio anônimo. Imagens e PDFs podem conter
                  informações ou metadados que ajudem a identificar quem enviou.
                </div>
              ) : (
                <>
                  <div className="mt-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
                      <Upload className="h-4 w-4" />
                      Selecionar arquivos
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="truncate font-medium text-foreground">
                              {file.name}
                            </p>
                            <p className="text-xs text-foreground/60">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFileAt(index)}
                            className="rounded-md p-1 text-foreground/60 hover:bg-surface-muted hover:text-foreground"
                            aria-label={`Remover ${file.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Categoria
          </label>
          <select
            value={form.categoria}
            onChange={(e) =>
              updateField("categoria", e.target.value as CategoriaDenuncia)
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
          >
            <option value="assedio_moral">Assédio moral</option>
            <option value="assedio_sexual">Assédio sexual</option>
            <option value="discriminacao">Discriminação</option>
            <option value="violencia">Violência / ameaça</option>
            <option value="fraude">Fraude / desvio ético</option>
            <option value="seguranca">Segurança do trabalho</option>
            <option value="lgpd_privacidade">LGPD / privacidade</option>
            <option value="saude_mental">Saúde mental / psicossocial</option>
            <option value="nao_conformidade">Não conformidade</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => updateField("titulo", e.target.value)}
            placeholder="Resumo do ocorrido"
            required
            aria-required="true"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Descrição <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) => updateField("descricao", e.target.value)}
            rows={8}
            required
            minLength={20}
            aria-required="true"
            placeholder="Conte o que aconteceu do seu jeito. Se preferir, use o modelo guiado acima."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none resize-y"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Local / área
            </label>
            <input
              type="text"
              value={form.localOcorrencia}
              onChange={(e) => updateField("localOcorrencia", e.target.value)}
              placeholder="Ex.: setor, unidade, equipe"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="h-4 w-4" />
              Data do fato (opcional)
            </label>
            <input
              type="date"
              value={form.dataOcorrencia}
              onChange={(e) => updateField("dataOcorrencia", e.target.value)}
              max={todayISO}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3">
          <input
            type="checkbox"
            checked={form.riscoIminente}
            onChange={(e) => updateField("riscoIminente", e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Há risco imediato à integridade, à saúde ou à segurança?
            </p>
            <p className="text-xs text-foreground/60">
              Marque se a situação exige prioridade na avaliação.
            </p>
          </div>
        </label>

        {form.riscoIminente && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <Siren className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Situação com prioridade</p>
                <p className="mt-1 leading-relaxed">
                  Como você sinalizou risco imediato, este relato deve ser
                  tratado com prioridade. Se houver ameaça atual à sua
                  integridade, à saúde ou à segurança, procure também o canal
                  urgente da organização ou o serviço público competente,
                  conforme a gravidade do caso.
                </p>
              </div>
            </div>
          </div>
        )}

        {!form.anonimizada && (
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Contato para retorno (opcional)
            </label>
            <input
              type="text"
              value={form.contatoRetorno}
              onChange={(e) => updateField("contatoRetorno", e.target.value)}
              placeholder="E-mail, telefone ou outro canal"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
            />
          </div>
        )}

        <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3">
          <input
            type="checkbox"
            checked={form.consentimentoTratamento}
            onChange={(e) =>
              updateField("consentimentoTratamento", e.target.checked)
            }
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Declaro que as informações foram prestadas de boa-fé{" "}
              <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-foreground/60 leading-relaxed">
              Estou ciente de que este relato será tratado com finalidade
              compatível com acolhimento, análise, encaminhamento e eventual
              apuração, observando sigilo, necessidade, segurança, prevenção e
              responsabilização no tratamento das informações.
            </p>
          </div>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 h-11 rounded-xl bg-brand px-4 text-white font-medium transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Enviando..." : "Registrar relato / denúncia"}
          </button>

          <button
            type="button"
            onClick={onPrev}
            className="h-11 rounded-xl border border-border px-4 font-medium text-foreground hover:bg-surface-muted inline-flex items-center justify-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {secondaryLabel}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="h-11 rounded-xl border border-border px-4 font-medium text-foreground hover:bg-surface-muted inline-flex items-center justify-center gap-2"
          >
            Etapa sobre o questionário
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Step3Copsoq({
  onPrev,
  role,
}: {
  onPrev: () => void;
  role: Role | null;
}) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copsoqStatus, setCopsoqStatus] = useState<{
    status: "no_active_link" | "not_linked" | "answered" | "pending";
    canRespond: boolean;
    href: string | null;
    linkId: string | null;
    message: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingStatus(true);
        setStatusError(null);

        const res = await fetch("/api/copsoq/status", {
          method: "GET",
          cache: "no-store",
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.ok) {
          if (!mounted) return;
          setStatusError(
            payload?.error ?? "Não foi possível verificar o questionário.",
          );
          return;
        }

        if (!mounted) return;

        setCopsoqStatus({
          status: payload.status,
          canRespond: payload.canRespond,
          href: payload.href,
          linkId: payload.linkId,
          message: payload.message,
        });
      } catch (e) {
        console.error(e);
        if (mounted) {
          setStatusError("Erro inesperado ao verificar o questionário.");
        }
      } finally {
        if (mounted) setLoadingStatus(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const secondaryLabel =
    role === "usuario" ? "Voltar para o canal seguro" : "Voltar";

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 bg-brand-secondary/5 px-3 py-1 text-xs sm:text-sm text-foreground/70">
          <ClipboardCheck className="h-4 w-4 text-brand-secondary" />
          Questionário psicossocial / COPSOQ
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          Sua participação ajuda a mapear riscos psicossociais no trabalho
        </h2>

        <p className="max-w-3xl text-sm sm:text-base text-foreground/70 leading-relaxed">
          O questionário ajuda a organização a entender melhor fatores do
          trabalho que podem impactar bem-estar, organização do trabalho,
          relacionamento, sobrecarga e outros aspectos relevantes à prevenção.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <h3 className="font-medium text-foreground">
            Por que sua resposta importa
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/70 leading-relaxed">
            <li>Ajuda no mapeamento coletivo do ambiente de trabalho.</li>
            <li>
              Contribui para ações preventivas e melhorias organizacionais.
            </li>
            <li>
              Reforça a participação do colaborador em um processo de gestão de
              riscos mais responsável.
            </li>
            <li>
              Complementa o canal de ocorrências e denúncias: o questionário e o
              relato têm papéis diferentes e podem coexistir.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-3">
          <h3 className="font-medium text-foreground">
            O que este questionário não é
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/70 leading-relaxed">
            <li>Não é punição.</li>
            <li>Não é prova individual contra você.</li>
            <li>Não substitui o canal seguro para fatos concretos.</li>
            <li>
              Não impede que você registre uma ocorrência ou denúncia quando
              houver necessidade.
            </li>
          </ul>
        </div>
      </div>

      {loadingStatus && (
        <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-foreground/70">
          Verificando o status do seu questionário...
        </div>
      )}

      {statusError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {statusError}
        </div>
      )}

      {!loadingStatus && !statusError && copsoqStatus && (
        <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-foreground/75 leading-relaxed">
          <p>{copsoqStatus.message}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {!loadingStatus &&
          !statusError &&
          copsoqStatus?.status === "pending" &&
          copsoqStatus.href && (
            <a
              href={copsoqStatus.href}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-white font-medium hover:opacity-95"
            >
              <ClipboardCheck className="h-4 w-4" />
              Responder questionário
            </a>
          )}

        {!loadingStatus &&
          !statusError &&
          copsoqStatus?.status === "answered" &&
          copsoqStatus.href && (
            <a
              href={copsoqStatus.href}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-white font-medium hover:opacity-95"
            >
              <ClipboardCheck className="h-4 w-4" />
              Abrir questionário novamente
            </a>
          )}

        {!loadingStatus &&
          !statusError &&
          (copsoqStatus?.status === "not_linked" ||
            copsoqStatus?.status === "no_active_link") && (
            <button
              type="button"
              disabled
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-foreground/50 font-medium cursor-not-allowed"
            >
              <ClipboardCheck className="h-4 w-4" />
              Questionário indisponível no momento
            </button>
          )}

        <button
          type="button"
          onClick={onPrev}
          className="h-11 rounded-xl border border-border px-4 font-medium text-foreground hover:bg-surface-muted inline-flex items-center justify-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {secondaryLabel}
        </button>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        color: "#64748b",
      }}
    >
      Carregando...
    </div>
  );
}

function ExpressAcessoBasicoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAuth();

  const step = parseStep(searchParams.get("step"));
  const origem = searchParams.get("origem");

  const [form, setForm] = useState<FormState>(readInitialDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayISO = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch (e) {
      console.warn("Não foi possível salvar o rascunho local.", e);
    }
  }, [form]);

  function goToStep(nextStep: 1 | 2 | 3) {
    router.replace(
      buildAcessoBasicoHref(nextStep, {
        origem,
      }),
    );
  }

  function validateForm() {
    if (!form.titulo.trim()) {
      return "Informe um título resumido para o relato.";
    }

    if (!form.descricao.trim() || form.descricao.trim().length < 20) {
      return "Descreva o ocorrido com pelo menos 20 caracteres.";
    }

    if (form.dataOcorrencia && form.dataOcorrencia > todayISO) {
      return "A data do fato não pode ser futura.";
    }

    if (!form.consentimentoTratamento) {
      return "É necessário confirmar a ciência sobre o tratamento responsável do relato.";
    }

    if (form.anonimizada && files.length > 0) {
      return "Para proteger seu anonimato, anexos estão desabilitados no envio anônimo.";
    }

    return null;
  }

  async function handleSubmit() {
    setError(null);
    setProtocol(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const body = new FormData();
      body.set("anonimizada", String(form.anonimizada));
      body.set("categoria", form.categoria);
      body.set("titulo", form.titulo.trim());
      body.set("descricao", form.descricao.trim());
      body.set("localOcorrencia", form.localOcorrencia.trim());
      body.set("dataOcorrencia", form.dataOcorrencia || "");
      body.set("riscoIminente", String(form.riscoIminente));
      body.set("contatoRetorno", form.contatoRetorno.trim());
      body.set("consentimentoTratamento", String(form.consentimentoTratamento));
      body.set(
        "origem",
        origem === "questionario"
          ? "questionario_psicossocial"
          : "acesso_basico_express",
      );

      for (const file of files) {
        body.append("files", file);
      }

      const res = await fetch("/api/denuncias", {
        method: "POST",
        body,
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setError(payload?.error ?? "Não foi possível registrar o relato.");
        return;
      }

      setProtocol(payload?.protocol ?? null);
      setForm(INITIAL_FORM);
      setFiles([]);

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // silent
      }
    } catch (e) {
      console.error(e);
      setError("Erro inesperado ao enviar o relato.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background px-4 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        <Stepper currentStep={step} onGoStep={goToStep} />

        {step === 1 && <Step1Riscos onNext={() => goToStep(2)} />}

        {step === 2 && (
          <Step2CanalSeguro
            form={form}
            setForm={setForm}
            files={files}
            setFiles={setFiles}
            submitting={submitting}
            protocol={protocol}
            error={error}
            setError={setError}
            onSubmit={handleSubmit}
            onPrev={() => goToStep(1)}
            onNext={() => goToStep(3)}
            role={role}
          />
        )}

        {step === 3 && <Step3Copsoq onPrev={() => goToStep(2)} role={role} />}
      </div>
    </div>
  );
}


export default function ExpressAcessoBasicoPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ExpressAcessoBasicoContent />
    </Suspense>
  );
}
