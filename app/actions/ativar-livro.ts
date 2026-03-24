"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ativarLivroAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  // 1. O Phone OTP já logou o usuário no Step 2, então pegamos o ID dele aqui:
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sessão expirada. Refaça o login por SMS.",
    };
  }

  // 2. Extraímos os dados que o usuário preencheu no formulário (Step 3)
  const nome_completo = formData.get("nome_completo") as string;
  const email = formData.get("email") as string;
  const telefone = formData.get("telefone") as string; // Vem do estado 'phone' que enviamos
  const documento = formData.get("documento") as string;
  const peso_kg = parseFloat(formData.get("peso_kg") as string);
  const altura_cm = parseInt(formData.get("altura_cm") as string);

  try {
    // 3. Atualizamos a tabela 'usuarios' no banco de dados
    const { error: updateError } = await supabase
      .from("usuarios")
      .update({
        nome_completo,
        email,
        telefone,
        documento,
        peso_kg: isNaN(peso_kg) ? null : peso_kg,
        altura_cm: isNaN(altura_cm) ? null : altura_cm,
        aceitou_termos: true,
        data_aceite_termos: new Date().toISOString(),

        // --- LOGICA DO TRIAL ---
        tipo_plano: "trial",
        data_inicio_plano: new Date().toISOString(),
        premium_origem: "pagarme", // Para o Webhook saber a origem depois

        role: "usuario",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id); // O ID vem da autenticação via SMS

    if (updateError) {
      // Erro 23505 no Postgres significa "Duplicata" (CPF ou Telefone já existem)
      if (updateError.code === "23505") {
        return {
          success: false,
          message: "Este CPF ou E-mail já está em uso.",
        };
      }
      throw updateError;
    }

    // 4. Se chegou aqui, deu certo!
    // Agora retornamos a URL do Pagar.me para o usuário pagar e virar Premium
    const linkPagamento = "https://checkout.pagar.me/v1/..."; // Seu link aqui

    revalidatePath("/"); // Limpa o cache para atualizar a tela
    return {
      success: true,
      redirectUrl: linkPagamento,
    };
  } catch (error) {
    console.error("Erro no Banco:", error);
    return { success: false, message: "Erro ao salvar seus dados no banco." };
  }
}
