import React from "react";
import { LoginForm } from "@/app/components/forms/LoginForm";
//import { Lock } from "lucide-react";

export default function ClientePage() {
  return (
    <section className="max-w-xl mx-auto text-center min-h-full flex flex-col justify-center px-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-foreground">Área de Cliente</h1>
      </div>

      {/* Formulário de Login */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm dark:bg-surface dark:border-border/50 max-w-md mx-auto w-full">
        <LoginForm />
      </div>

      {/* Rodapé */}
      <div className="mt-3 text-center text-sm text-foreground/60">
        <p>
          Não tem uma conta?{" "}
          <a
            href="/contato"
            className="text-brand-secondary font-medium hover:underline transition-colors"
          >
            Fale conosco
          </a>
        </p>
      </div>

      {/* Informações de segurança */}
      <div className="mt-3 p-3 bg-surface-muted rounded-lg border border-border dark:bg-surface-muted/50 dark:border-border/30 max-w-md mx-auto w-full">
        <p className="text-xs text-foreground/50 text-center">
          ✓ Conexão segura • ✓ Dados criptografados • ✓ Privacidade garantida
        </p>
      </div>
    </section>
  );
}
