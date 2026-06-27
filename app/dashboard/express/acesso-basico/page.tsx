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
  Paperclip,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardPen,
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

const DRAFT_STORAGE_KEY = "alma4d_denuncia_draft_express_acesso_basico";
const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

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
    { step: 1 as const, label: "Entender o que são riscos" },
    { step: 2 as const, label: "Comunicar riscos e ocorrências" },
    { step: 3 as const, label: "Responder questionário de riscos" },
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
                "rounded-xl px-4 py-4 text-left transition-all border shadow-sm",
                "hover:shadow-md",

                active
                  ? "border-brand bg-brand text-white shadow-md"
                  : done
                    ? "border-brand-secondary bg-brand-secondary/10 text-foreground"
                    : "border-border bg-surface hover:bg-surface-muted text-foreground",
              ].join(" ")}
            >
              {/* ETAPA */}
              <div
                className={[
                  "text-xs uppercase tracking-wide",
                  active ? "text-white/80" : "text-secondary",
                ].join(" ")}
              >
                Etapa {item.step}
              </div>

              {/* LABEL */}
              <div
                className={[
                  "mt-1 text-sm font-semibold leading-snug",
                  active ? "text-white" : "text-primary",
                ].join(" ")}
              >
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step1Riscos({
  onNext,
}: {
  onNext: () => void;
  setError: (msg: string | null) => void;
}) {
  const [openModal, setOpenModal] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  function toggle(section: string) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 bg-brand-secondary/5 px-3 py-1 text-xs sm:text-sm text-foreground/70">
          <ShieldCheck className="h-4 w-4 text-brand-secondary" />
          Conteúdo de orientação
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          Entender riscos ajuda a proteger pessoas, equipes e a empresa
        </h2>

        <p className="max-w-3xl text-sm sm:text-base text-foreground/70 leading-relaxed">
          Antes de registrar uma ocorrência ou responder ao questionário, vale
          entender de forma simples o que é risco, por que isso importa e como a
          sua percepção ajuda a prevenir danos e melhorar o ambiente de
          trabalho.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ✅ COLUNA 1 */}
        <div className="space-y-3">
          {/* ACCORDION 1 */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("risco")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h2 className="font-medium text-foreground">O que é risco?</h2>
              </div>
            </button>

            {openSection === "risco" && (
              <div className="px-4 pb-4 text-sm text-foreground/70">
                Risco é a chance de um fato causar dano, perda, falha, conflito,
                adoecimento ou impacto negativo se não for percebido e tratado a
                tempo.
              </div>
            )}
          </div>

          {/* ACCORDION 2 */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("tipos")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <Building2 className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h2 className="font-medium text-foreground">
                  Tipos de riscos empresariais
                </h2>
              </div>
            </button>

            {openSection === "tipos" && (
              <ul className="px-6 pb-4 list-disc text-sm text-foreground/70 space-y-1">
                <li>Riscos de saúde e segurança no trabalho</li>
                <li>Riscos operacionais e de processo</li>
                <li>Riscos éticos, de conduta e integridade</li>
                <li>Riscos de privacidade e proteção de dados</li>
                <li>Riscos psicossociais relacionados ao trabalho</li>
              </ul>
            )}
          </div>

          {/* ACCORDION 3 */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("legislacao")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <Scale className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h2 className="font-medium text-foreground">
                  Legislação brasileira relevante
                </h2>
              </div>
            </button>

            {openSection === "legislacao" && (
              <div className="px-4 pb-4 text-sm text-foreground/70 space-y-2">
                <p>
                  <strong>NR-1:</strong> trata das disposições gerais e
                  gerenciamento de riscos ocupacionais.
                </p>
                <p>
                  <strong>Guia MTE:</strong> inclui fatores psicossociais no
                  gerenciamento.
                </p>
                <p>
                  <strong>Lei 13.608/2018:</strong> garante anonimato em
                  denúncias.
                </p>
                <p>
                  <strong>LGPD:</strong> regula o tratamento de dados pessoais.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ COLUNA 2 */}
        <div className="space-y-3">
          {/* ACCORDION 4 */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("acoes")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <HeartPulse className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h2 className="font-medium text-foreground">
                  O que fazer ao perceber um risco
                </h2>
              </div>
            </button>
            {openSection === "acoes" && (
              <div className="px-4 pb-4 text-sm text-foreground/70 space-y-2">
                <p>Observe com calma o que está acontecendo.</p>
                <p>Evite se expor a perigo desnecessário.</p>
                <p>Registre informações: local, data, contexto e impacto.</p>
                <p>Use o canal seguro para relatar ocorrências.</p>
                <p>Participe do questionário psicossocial.</p>
              </div>
            )}
          </div>
          {/* ACCORDION 5 */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("guia")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <MessageSquareQuote className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />

              <div className="flex-1">
                <h2 className="font-medium text-foreground">
                  Como descrever um risco ou ocorrência
                </h2>
              </div>
            </button>

            {openSection === "guia" && (
              <div className="px-4 pb-4 space-y-3">
                {/* TEXTO */}
                <ul className="space-y-1 text-sm text-foreground/70 leading-relaxed list-disc pl-5">
                  <li>O que aconteceu?</li>
                  <li>Onde isso aconteceu?</li>
                  <li>Quando aconteceu?</li>
                  <li>Quem foi afetado?</li>
                  <li>Existe risco imediato?</li>
                  <li>Há algo que ajude a entender o caso?</li>
                </ul>
              </div>
            )}
          </div>
          {/* ACCORDION FINAL */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("importancia")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-secondary shrink-0" />

              <div className="flex-1">
                <h2 className="font-medium text-foreground">
                  Por que relatar um risco é importante
                </h2>
              </div>
            </button>

            {openSection === "importancia" && (
              <div className="px-4 pb-4 text-sm text-foreground/70 leading-relaxed space-y-2">
                <p>
                  Sua percepção ajuda a empresa a identificar problemas antes
                  que eles cresçam.
                </p>

                <p>
                  Relatar um risco não é “apontar falhas”, mas contribuir com a
                  prevenção, proteção das pessoas e melhoria contínua do
                  ambiente de trabalho.
                </p>

                <p>
                  Quanto mais cedo um risco é identificado, maior a chance de
                  evitar impactos, reduzir danos e melhorar as condições para
                  todos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ✅ BOTOES */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 h-10 text-[13px] sm:text-sm text-red-700 font-medium hover:bg-red-100"
        >
          🚨 <span className="truncate">Ver contatos de emergência</span>
        </button>

        <a
          href="https://heyzine.com/flip-book/4757966bd8"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-secondary/30 bg-brand-secondary/10 px-3 h-10 text-[13px] sm:text-sm text-foreground font-medium hover:bg-brand-secondary/20"
        >
          📘 <span className="truncate">Saiba mais sobre NR-1</span>
        </a>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 h-10 text-[13px] sm:text-sm text-white font-medium hover:opacity-95"
        >
          <span className="truncate">Entendi. Ir para canal seguro</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
      {/* ✅ MODAL permanece igual */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-4 sm:p-6 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                📋 Emergência e Resposta a Incidentes
              </h2>
              <button
                onClick={() => setOpenModal(false)}
                className="text-foreground/60 hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-surface-muted text-left">
                  <tr>
                    <th className="px-3 py-2">Cenário</th>
                    <th className="px-3 py-2">Autoridade</th>
                    <th className="px-3 py-2">Contato</th>
                    <th className="px-3 py-2">Quando Acionar</th>
                    <th className="px-3 py-2">Concessionárias</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  <tr>
                    <td className="px-3 py-2">Incêndio / Explosão</td>
                    <td className="px-3 py-2">Bombeiros</td>
                    <td className="px-3 py-2">193</td>
                    <td className="px-3 py-2">Fogo, fumaça ou cheiro de gás</td>
                    <td className="px-3 py-2">Energia: 🔌 / Água: 💧</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Mal súbito / Ferimentos</td>
                    <td className="px-3 py-2">SAMU</td>
                    <td className="px-3 py-2">192</td>
                    <td className="px-3 py-2">
                      Desmaio, choque, queda com lesão
                    </td>
                    <td className="px-3 py-2">Energia: 🔌 / Água: 💧</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Assalto / Invasão</td>
                    <td className="px-3 py-2">Polícia Militar</td>
                    <td className="px-3 py-2">190</td>
                    <td className="px-3 py-2">Crime em andamento</td>
                    <td className="px-3 py-2">—</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Risco de desabamento</td>
                    <td className="px-3 py-2">Defesa Civil</td>
                    <td className="px-3 py-2">199</td>
                    <td className="px-3 py-2">
                      Rachaduras ou estrutura cedendo
                    </td>
                    <td className="px-3 py-2">Energia: 🔌 / Água: 💧</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Vazamento químico / óleo</td>
                    <td className="px-3 py-2">Bombeiros / Ambiental</td>
                    <td className="px-3 py-2">193</td>
                    <td className="px-3 py-2">Risco de contaminação</td>
                    <td className="px-3 py-2">Água: 💧</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Dano estrutural externo</td>
                    <td className="px-3 py-2">Prefeitura</td>
                    <td className="px-3 py-2">156</td>
                    <td className="px-3 py-2">Árvore caída / poste risco</td>
                    <td className="px-3 py-2">Energia: 🔌</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Furto / dano patrimonial</td>
                    <td className="px-3 py-2">Polícia Civil</td>
                    <td className="px-3 py-2">Delegacia</td>
                    <td className="px-3 py-2">Após o incidente</td>
                    <td className="px-3 py-2">—</td>
                  </tr>

                  <tr>
                    <td className="px-3 py-2">Acidente com funcionário</td>
                    <td className="px-3 py-2">RH / SESMT</td>
                    <td className="px-3 py-2">Interno</td>
                    <td className="px-3 py-2">CAT em até 24h</td>
                    <td className="px-3 py-2">—</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 space-y-2 text-sm">
                <h3 className="font-medium">🛠️ Protocolo rápido</h3>

                <p>
                  <strong>1. SOCORRER:</strong> Verifique as vítimas e acione
                  192/193.
                </p>
                <p>
                  <strong>2. ISOLAR:</strong> Retire as pessoas e restrinja o
                  acesso.
                </p>
                <p>
                  <strong>3. REGISTRAR:</strong> Documente com fotos e horário.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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

  const validationMessage = useMemo(() => {
    if (!form.titulo.trim()) return "Informe o título";
    if (!form.descricao.trim() || form.descricao.trim().length < 20)
      return "Descreva o ocorrido com pelo menos 20 caracteres";
    if (!form.consentimentoTratamento)
      return "Confirme a ciência sobre o tratamento das informações";
    if (form.dataOcorrencia && form.dataOcorrencia > todayISO)
      return "A data do fato não pode ser futura";
    if (files.length > MAX_FILES)
      return `Máximo de ${MAX_FILES} arquivos permitido`;
    return null;
  }, [form, todayISO, files.length]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateFiles(nextFiles: File[]) {
    if (nextFiles.length > MAX_FILES) {
      return `Você pode anexar no máximo ${MAX_FILES} arquivos.`;
    }
    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    for (const file of nextFiles) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const mimeValido = ALLOWED_MIME_TYPES.includes(file.type);
      const extValida = allowedExtensions.includes(ext);
      if (!mimeValido && !extValida) {
        return `Arquivo não permitido: ${file.name}. Envie apenas PDF, PNG, JPG, JPEG ou WEBP.`;
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

    const merged = [...files, ...selected].slice(0, MAX_FILES);
    const validationError = validateFiles(merged);

    if (files.length + selected.length > MAX_FILES) {
      setError(`Você pode anexar no máximo ${MAX_FILES} arquivos.`);
    }

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
  if (protocol) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-6 space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 bg-brand-secondary/5 px-3 py-1 text-xs sm:text-sm text-foreground/70">
        <ClipboardPen className="h-4 w-4 text-brand-secondary" />
        Comunicar riscos e ocorrências
      </div>
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          Canal seguro para registro de riscos e ocorrências
        </h2>
        <p className="max-w-3xl text-sm sm:text-base text-foreground/70 leading-relaxed">
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
                  informações ou metadados que ajudam a identificar quem enviou.
                </div>
              ) : (
                <>
                  <div className="mt-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
                      <Upload className="h-4 w-4" />
                      Selecionar arquivos
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
            <option value="saude_seguranca_trabalho">
              Riscos de saúde e segurança no trabalho
            </option>
            <option value="operacionais_processo">
              Riscos operacionais e de processo
            </option>
            <option value="etica_conduta_integridade">
              Riscos éticos, de conduta e integridade
            </option>
            <option value="privacidade_protecao_dados">
              Riscos de privacidade e proteção de dados
            </option>
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
        {validationMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {validationMessage}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            title={validationMessage ?? undefined}
            className="flex-1 h-11 rounded-xl bg-brand px-4 text-white font-medium transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting
              ? "Enviando..."
              : protocol
                ? "Enviado ✅"
                : "Registrar este relato"}
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 h-10 text-[13px] sm:text-sm text-white font-medium hover:opacity-95"
          >
            Ir para o questionário
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
  linkId,
}: {
  onPrev: () => void;
  role: Role | null;
  linkId: string | null;
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

        if (!res.ok) {
          setStatusError(
            payload?.error ??
              payload?.message ??
              payload?.detail ??
              "Não foi possível verificar o questionário.",
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
  const [openSection, setOpenSection] = useState<string | null>(null);

  function toggle(section: string) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 bg-brand-secondary/5 px-3 py-1 text-xs sm:text-sm text-foreground/70">
          <ClipboardCheck className="h-4 w-4 text-brand-secondary" />
          Responder questionário
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          Sua participação ajuda a mapear riscos psicossociais no trabalho
        </h2>

        <p className="max-w-3xl text-sm sm:text-base text-foreground/70 leading-relaxed">
          Este questionário ajuda a empresa a entender melhor os fatores que
          podem impactar bem-estar, organização do trabalho, relacionamentos,
          sobrecarga e prevenção.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ✅ COLUNA 1 */}
        <div className="space-y-3">
          {/* IMPORTÂNCIA */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("importancia")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <ClipboardCheck className="h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  Por que sua resposta importa
                </h3>
              </div>
            </button>

            {openSection === "importancia" && (
              <ul className="px-6 pb-4 list-disc space-y-2 text-sm text-foreground/70">
                <li>Ajuda no mapeamento coletivo do ambiente.</li>
                <li>Contribui para ações preventivas.</li>
                <li>Fortalece a cultura de gestão de riscos.</li>
                <li>Complementa o canal de ocorrências.</li>
              </ul>
            )}
          </div>

          {/* ✅ NOVO ITEM */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("anonimato")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <ShieldCheck className="h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  Privacidade e segurança das respostas
                </h3>
              </div>
            </button>

            {openSection === "anonimato" && (
              <div className="px-4 pb-4 space-y-2 text-sm text-foreground/70">
                <p>
                  Suas respostas são tratadas com confidencialidade e utilizadas
                  de forma agregada.
                </p>
                <p>
                  O objetivo é identificar padrões coletivos, não avaliar
                  indivíduos.
                </p>
                <p>
                  Isso permite que a empresa atue de forma preventiva e
                  responsável.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ COLUNA 2 */}
        <div className="space-y-3">
          {/* O QUE NÃO É */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("nao_e")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <AlertTriangle className="h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  O que este questionário não é
                </h3>
              </div>
            </button>

            {openSection === "nao_e" && (
              <ul className="px-6 pb-4 list-disc space-y-2 text-sm text-foreground/70">
                <li>Não é punição.</li>
                <li>Não é prova contra você.</li>
                <li>Não substitui o canal de ocorrências.</li>
                <li>Não impede registros formais.</li>
              </ul>
            )}
          </div>

          {/* ✅ NOVO ITEM */}
          <div className="rounded-2xl border border-border">
            <button
              onClick={() => toggle("como_responder")}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <MessageSquareQuote className="h-5 w-5 text-brand-secondary shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  Como responder de forma útil
                </h3>
              </div>
            </button>

            {openSection === "como_responder" && (
              <div className="px-4 pb-4 space-y-2 text-sm text-foreground/70">
                <p>
                  Responda com base na sua percepção real do ambiente de
                  trabalho.
                </p>
                <p>
                  Não é necessário buscar respostas “certas”, mas sim honestas.
                </p>
                <p>
                  Pense no seu dia a dia e nos fatores que impactam sua rotina.
                </p>
                <p>
                  Sua contribuição ajuda a construir um ambiente mais saudável.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUS */}
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
        <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-foreground/75">
          {copsoqStatus.status === "answered" ? (
            <div className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
              <p>Você já respondeu o questionário neste ciclo ✅</p>
            </div>
          ) : (
            <p>{copsoqStatus.message}</p>
          )}
        </div>
      )}

      {/* AÇÕES */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!loadingStatus &&
          !statusError &&
          copsoqStatus?.status === "pending" &&
          copsoqStatus.href && (
            <a
              href={
                copsoqStatus.href ??
                (linkId ? `/dashboard/express/copsoq?linkId=${linkId}` : "#")
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-white font-medium hover:opacity-95"
            >
              <ClipboardCheck className="h-4 w-4" />
              Responder questionário
            </a>
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
  const linkId = searchParams.get("linkId");
  const { role, usuarioId } = useAuth();

  const step = parseStep(searchParams.get("step"));
  const origem = searchParams.get("origem");

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openProtocolModal, setOpenProtocolModal] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const todayISO = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    if (usuarioId === undefined) return;

    if (!usuarioId) {
      const currentUrl = window.location.pathname + window.location.search;

      window.location.replace(
        `/login/usuario?redirect=${encodeURIComponent(currentUrl)}`,
      );
    }
  }, [usuarioId]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch (e) {
      console.warn("Não foi possível salvar o rascunho local.", e);
    }
  }, [form]);

  useEffect(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
  }, []);

  function goToStep(nextStep: 1 | 2 | 3) {
    if (step === 2 && nextStep !== 2) {
      // saiu do Step 2 → limpa tudo
      setForm(INITIAL_FORM);
      setFiles([]);
      setProtocol(null);
      setError(null);

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
    }

    router.replace(
      buildAcessoBasicoHref(nextStep, {
        origem,
        linkId,
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
        setError(
          payload?.error ??
            payload?.message ??
            payload?.detail ??
            "Não foi possível registrar o relato.",
        );
        return;
      }

      setProtocol(payload?.protocol ?? null);

      if (payload?.protocol) {
        setOpenProtocolModal(true);
      }
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

        {step === 1 && (
          <Step1Riscos onNext={() => goToStep(2)} setError={setError} />
        )}

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

        {step === 3 && (
          <Step3Copsoq onPrev={() => goToStep(2)} role={role} linkId={linkId} />
        )}
      </div>
      {openProtocolModal && protocol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="w-full max-w-md bg-surface rounded-2xl p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="text-center">
              <h2 className="text-lg font-semibold text-primary">
                Protocolo gerado
              </h2>

              <p className="text-sm text-secondary mt-1">
                Anote o número abaixo para acompanhar sua ocorrência.
              </p>
            </div>

            {/* PROTOCOLO */}
            <div className="bg-surface-muted rounded-xl p-4 text-center">
              <span className="text-xs text-secondary block">
                Seu protocolo
              </span>

              <span className="text-xl font-bold text-brand tracking-widest block mt-1">
                {protocol}
              </span>
            </div>

            {/* ALERTA */}
            <p className="text-xs text-secondary text-center">
              Este código é a única forma de acompanhamento. Guarde com
              segurança.
            </p>

            {/* AÇÕES */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  // Try modern Clipboard API; fall back to execCommand for
                  // HTTP contexts or browsers that deny clipboard permission.
                  try {
                    void navigator.clipboard?.writeText(protocol);
                  } catch {
                    try {
                      const ta = document.createElement("textarea");
                      ta.value = protocol;
                      ta.style.cssText =
                        "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
                      document.body.appendChild(ta);
                      ta.focus();
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                    } catch {
                      /* ignore */
                    }
                  }
                  setCopiedProtocol(true);
                  setTimeout(() => setCopiedProtocol(false), 2500);
                }}
                className={`h-10 rounded-xl text-white text-sm font-medium transition-colors ${
                  copiedProtocol
                    ? "bg-brand-secondary hover:opacity-90"
                    : "bg-brand hover:opacity-90"
                }`}
              >
                {copiedProtocol ? "✓ Copiado!" : "Copiar protocolo"}
              </button>

              <button
                type="button"
                onClick={() => setOpenProtocolModal(false)}
                className="h-10 rounded-xl border border-border text-sm text-primary hover:bg-surface-muted"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
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
