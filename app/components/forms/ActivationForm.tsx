"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ativarLivroAction } from "../../app/actions/ativar-livro";

export default function ActivationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clientAction(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await ativarLivroAction(formData);

    if (result.success) {
      router.push("/dashboard?status=sucesso");
    } else {
      setError(result.message);
      setLoading(false);
    }
  }

  return (
    <form
      action={clientAction}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Exibir erro se houver */}
      {error && (
        <div className="md:col-span-2 text-red-500 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Inputs (Os mesmos que você já tem...) */}
      <input
        type="text"
        name="nome_completo"
        required
        placeholder="Nome Completo"
        className="..."
      />
      <input
        type="text"
        name="documento"
        required
        placeholder="CPF"
        className="..."
      />
      {/* ... outros campos ... */}

      <button
        type="submit"
        disabled={loading}
        className="md:col-span-2 bg-[#030870] text-white p-4 rounded-xl font-bold"
      >
        {loading ? "Processando Segurança..." : "Ativar minha Experiência"}
      </button>
    </form>
  );
}
