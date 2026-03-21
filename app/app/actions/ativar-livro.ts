"use server";

import { createClient } from "../../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ativarLivroAction(formData: FormData) {
  const supabase = await createClient();

  // 1. Verificar se o usuário está logado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      success: false,
      message: "Sessão inválida. Faça login novamente.",
    };
  }

  // 2. Extrair e validar os dados do formulário
  const nome_completo = formData.get("nome_completo") as string;
  const documento = formData.get("documento") as string;
  const data_nascimento = formData.get("data_nascimento") as string;
  const sexo = formData.get("sexo") as string;
  const peso_kg = parseFloat(formData.get("peso_kg") as string);
  const altura_cm = parseInt(formData.get("altura_cm") as string);

  try {
    const { error: updateError } = await supabase
      .from("usuarios")
      .update({
        nome_completo,
        documento,
        data_nascimento,
        sexo,
        peso_kg: isNaN(peso_kg) ? null : peso_kg,
        altura_cm: isNaN(altura_cm) ? null : altura_cm,
        aceitou_termos: true,
        data_aceite_termos: new Date().toISOString(),
        tipo_plano: "premium_livro",
        premium_origem: "livro_fisico",
        role: "usuario",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return {
          success: false,
          message: "CPF ou E-mail já cadastrado no sistema.",
        };
      }
      throw updateError;
    }

    // 3. Limpar o cache da página para refletir as mudanças
    revalidatePath("/dashboard");
    return { success: true, message: "Plano ativado com sucesso!" };
  } catch (error) {
    console.error("Erro na Action:", error);
    return { success: false, message: "Erro interno ao processar ativação." };
  }
}
