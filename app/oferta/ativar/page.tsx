export const dynamic = "force-dynamic";

import type { CSSProperties, ElementType } from "react";
import ActivationForm from "../../components/forms/ActivationForm";
import Image from "next/image";

import QrCode2Icon from "@mui/icons-material/QrCode2";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

type StepStatus = "done" | "active" | "next";
type Step = { id: number; name: string; desc: string; status: StepStatus };

const BRAND = {
  navy: "#030870",
  teal: "#019499",
  page: "#F0F2F5",
  // RGB em formato "r g b" para usar com alpha em Tailwind arbitrary values
  navyRgb: "3 8 112",
  tealRgb: "1 148 153",
};

const stepIcons: Record<number, ElementType> = {
  1: QrCode2Icon,
  2: WhatsAppIcon,
  3: PersonOutlineIcon,
  4: CreditCardIcon,
  5: PhoneIphoneIcon,
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function StepIcon({
  id,
  className,
  size = 28,
}: {
  id: number;
  className?: string;
  size?: number;
}) {
  const Icon = stepIcons[id] ?? PersonOutlineIcon;
  return (
    <Icon
      style={{ fontSize: size }}
      className={cx("text-current!", className)}
      aria-hidden="true"
    />
  );
}

function StepBadge({ step }: { step: Step }) {
  const isDone = step.status === "done";
  const isActive = step.status === "active";
  const isNext = step.status === "next";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        aria-current={isActive ? "step" : undefined}
        className={cx(
          "relative grid place-items-center rounded-2xl w-14 h-14 sm:w-16 sm:h-16",
          "transition-all duration-300 select-none",
          "shadow-[0_10px_30px_rgba(3,8,112,0.10)]",
          isDone && "bg-var(--alma-navy) text-white",
          isActive &&
            "bg-var(--alma-teal) text-white scale-[1.08] ring-4 ring-color:rgb(var(--alma-teal-rgb)_/_0.18)",
          isNext && "bg-white text-slate-300 border border-slate-200",
        )}
      >
        <StepIcon id={step.id} />

        {/* Badge DONE mais premium */}
        {isDone && (
          <span className="absolute -bottom-2 -right-2 grid place-items-center">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-white shadow-md">
              <CheckCircleIcon
                style={{ fontSize: 18 }}
                className="text-var(--alma-teal)"
                aria-hidden="true"
              />
            </span>
          </span>
        )}
      </div>

      <div className="text-center leading-tight">
        <p
          className={cx(
            "text-sm font-semibold",
            isNext ? "text-slate-400" : "text-var(--alma-navy)",
          )}
        >
          {step.name}
        </p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-semibold">
          {step.desc}
        </p>
      </div>
    </div>
  );
}

export default function AtivarPage() {
  const fluxo: Step[] = [
    { id: 1, name: "Leitura", desc: "QR Code", status: "done" },
    { id: 2, name: "Validar", desc: "WhatsApp", status: "done" },
    { id: 3, name: "Perfil", desc: "Dados Trial", status: "active" },
    { id: 4, name: "Pagar", desc: "Checkout", status: "next" },
    { id: 5, name: "Usar", desc: "App alma4D", status: "next" },
  ];

  const activeIndex = Math.max(
    0,
    fluxo.findIndex((s) => s.status === "active"),
  );

  const progressPct =
    fluxo.length > 1 ? (activeIndex / (fluxo.length - 1)) * 100 : 0;

  // CSS variables locais (evita mexer em globals e evita classes Tailwind dinâmicas)
  const brandVars = {
    "--alma-navy": BRAND.navy,
    "--alma-teal": BRAND.teal,
    "--alma-navy-rgb": BRAND.navyRgb,
    "--alma-teal-rgb": BRAND.tealRgb,
  } as CSSProperties;

  return (
    <main
      className="min-h-screen bg-[#F0F2F5]"
      style={brandVars}
      aria-label="Ativação alma4D"
    >
      {/* Header */}
      <div className="bg-linear-to-b from-white/70 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image
                src="/images/alma4d-bicolor-nobground-400.png"
                alt="alma4D"
                width={150}
                height={48}
                className="brightness-95"
                priority
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-var(--alma-teal)" />
              Sincronização segura
            </div>
          </div>

          <div className="mt-8 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-var(--alma-navy) tracking-tight">
              Ative seu acesso com segurança
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Você já validou o QR Code e o WhatsApp. Agora complete seu perfil
              para liberar o trial e seguir para o checkout.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        {/* STEPPER */}
        <section className="mt-6">
          <div className="bg-white/70 backdrop-blur rounded-3xl border border-white shadow-[0_20px_60px_rgba(3,8,112,0.06)]">
            <div className="px-4 sm:px-8 py-6">
              <div className="relative overflow-x-auto">
                <div className="min-w-880px">
                  {/* Linha de progresso */}
                  <div className="relative mx-10 mt-2 mb-8">
                    <div className="h-6px rounded-full bg-slate-100" />
                    <div
                      className="absolute top-0 left-0 h-6px rounded-full bg-var(--alma-teal) transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Steps */}
                  <div className="grid grid-cols-5 items-start gap-2 px-2">
                    {fluxo.map((step) => (
                      <div key={step.id} className="flex justify-center">
                        <StepBadge step={step} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contexto */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-var(--alma-navy)">
                    Passo atual:
                  </span>{" "}
                  <span className="font-semibold text-var(--alma-teal)">
                    {fluxo[activeIndex]?.name}
                  </span>{" "}
                  <span className="text-slate-500">
                    — {fluxo[activeIndex]?.desc}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  Seus dados ficam criptografados e sincronizados com segurança.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FORM */}
        <section className="mt-10 w-full max-w-2xl mx-auto">
          <div className="relative">
            {/* Glow sutil (sem classe dinâmica) */}
            <div
              className="absolute -inset-1 rounded-[2.5rem] bg-linear-to-r from-color:rgb(var(--alma-teal-rgb)_/_0.20) via-white/30 to-color:rgb(var(--alma-navy-rgb)_/_0.20) blur-xl"
              aria-hidden="true"
            />

            <div className="relative bg-white rounded-[2.5rem] border border-white/60 shadow-[0_30px_90px_rgba(3,8,112,0.10)] p-2 sm:p-3">
              <div className="rounded-[2.2rem] bg-white p-6 sm:p-8">
                <ActivationForm />
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-10 text-center text-slate-400 text-xs font-semibold pb-6">
          alma4D • Sincronização segura v2.0 • 2026
        </footer>
      </div>
    </main>
  );
}
