"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function EditarClientePage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("nome,email,telefone")
        .eq("id", id)
        .single();

      if (error) {
        setError("Erro ao carregar cliente.");
      } else {
        setNome(data.nome || "");
        setEmail(data.email || "");
        setTelefone(data.telefone || "");
      }

      setLoading(false);
    })();
  }, [id, supabase]);

  async function handleSave() {
    setError("");

    const { error } = await supabase
      .from("clientes")
      .update({
        nome,
        email,
        telefone,
      })
      .eq("id", id);

    if (error) {
      setError("Erro ao salvar.");
      return;
    }

    router.push("/dashboard/admin/clientes");
  }

  if (loading) {
    return <p className="p-6">Carregando...</p>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-bold">Editar Cliente</h2>

      {error && <p className="text-red-600">{error}</p>}

      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome"
        className="w-full border p-2 rounded"
      />

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border p-2 rounded"
      />

      <input
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        placeholder="Telefone"
        className="w-full border p-2 rounded"
      />

      <button
        onClick={handleSave}
        className="bg-[#019499] text-white px-4 py-2 rounded"
      >
        Salvar
      </button>
    </div>
  );
}