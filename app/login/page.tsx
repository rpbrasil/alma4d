import React from "react";
import { LoginForm } from "@/components/forms/LoginForm";
import Image from "next/image";
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <section className="max-w-md mx-auto px-4 pt-16 pb-12">
      {/* Header */}
      <header className="text-center space-y-4 mb-8">
        <div className="flex justify-center">
          <Image
            src="/images/alma4d-bicolor-nobground-128.png"
            alt="alma4D"
            width={72}
            height={72}
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-2xl font-semibold text-foreground">
          Acesso ao painel
        </h1>

        <p className="text-sm text-foreground/60">
          Entre com suas credenciais para acessar o dashboard alma4D
        </p>
      </header>

      {/* Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <LoginForm />
      </div>

      {/* Ajuda */}
      <div className="mt-4 text-center text-sm text-foreground/60">
        <p>
          Não possui acesso?{" "}
          <a
            href="/contato"
            className="text-brand-secondary font-medium hover:underline"
          >
            Fale conosco
          </a>
        </p>
      </div>

      {/* Segurança */}
      <div className="mt-4 text-center text-xs text-foreground/50 border border-border rounded-lg p-3 bg-surface-muted">
        Conexão segura • Dados criptografados • Privacidade garantida
      </div>
    </section>
  );
}
