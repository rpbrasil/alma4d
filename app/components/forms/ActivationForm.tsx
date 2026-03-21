"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client"; // Ajuste o caminho conforme sua pasta lib
import { useRouter } from "next/navigation";

export default function ActivationForm() {
  // Substituímos o antigo createClientComponentClient por este:
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      // O restante da lógica permanece igual, pois a API do objeto 'supabase' é a mesma
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      const { error: updateError } = await supabase
        .from("usuarios")
        .update({
          nome_completo: data.nome_completo as string,
          documento: data.documento as string,
          data_nascimento: data.data_nascimento as string,
          sexo: data.sexo as string,
          peso_kg: parseFloat(data.peso_kg as string) || null,
          altura_cm: parseInt(data.altura_cm as string) || null,
          aceitou_termos: true,
          data_aceite_termos: new Date().toISOString(),
          tipo_plano: "premium_livro",
          premium_origem: "livro_fisico",
          role: "usuario",
        })
        .eq("id", user.id);

      if (updateError) {
        if (updateError.code === "23505")
          throw new Error("CPF ou E-mail já cadastrado.");
        throw updateError;
      }

      router.push("/dashboard?status=activated");
    } catch (err) {
      const errorInstance = err as Error;
      setError(errorInstance.message || "Erro ao processar ativação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-4xl border border-border shadow-xl">
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-bold text-[#030870]">Ativação alma4D</h3>
        <p className="text-foreground/60 text-sm">
          Sincronize seu livro com o aplicativo oficial
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-sm font-bold text-foreground/70">
            Nome Completo
          </label>
          <input
            type="text"
            name="nome_completo"
            className="p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-[#019499]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-foreground/70">CPF</label>
          <input
            type="text"
            name="documento"
            className="p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-[#019499]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-foreground/70">
            Data de Nascimento
          </label>
          <input
            type="date"
            name="data_nascimento"
            className="p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-[#019499]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-foreground/70">Sexo</label>
          <select
            name="sexo"
            className="p-3 rounded-xl border border-border outline-none bg-white"
            required
          >
            <option value="">Selecione...</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-foreground/70">
            Peso (kg)
          </label>
          <input
            type="number"
            step="0.01"
            name="peso_kg"
            className="p-3 rounded-xl border border-border outline-none"
            placeholder="00.00"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-foreground/70">
            Altura (cm)
          </label>
          <input
            type="number"
            name="altura_cm"
            className="p-3 rounded-xl border border-border outline-none"
            placeholder="170"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id="termos"
            className="w-5 h-5 accent-[#019499]"
            required
          />
          <label
            htmlFor="termos"
            className="text-xs text-foreground/60 leading-tight"
          >
            Confirmo que sou o titular deste cadastro e aceito os Termos de Uso.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 bg-[#030870] text-white p-4 rounded-xl font-bold text-lg hover:opacity-95 transition-all disabled:opacity-50 mt-4 shadow-lg active:scale-95"
        >
          {loading ? "Sincronizando..." : "Confirmar e Iniciar Experiência"}
        </button>
      </form>
    </div>
  );
}
