"use server";

import { createServerSupabase } from "@/lib/supabase/server";

function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}

function parseMoneyToNumber(input: string) {
  const v = (input || "").trim();
  if (!v) return null;
  const normalized = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(v: string) {
  const t = (v || "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}

function normalizeStatus(status: string) {
  const s = (status || "").trim().toLowerCase();
  const allowed = ["rascunho", "ativo", "suspenso", "encerrado"];
  return (allowed.includes(s) ? s : "rascunho") as
    | "rascunho"
    | "ativo"
    | "suspenso"
    | "encerrado";
}

function normalizeTipo(tipo: string) {
  const t = (tipo || "").trim().toLowerCase();
  return (t === "pf" || t === "pj" ? t : "pj") as "pf" | "pj";
}
function isValidCPF(cpf: string) {
  const v = cpf.replace(/\D/g, "");
  if (/^(\d)\1{10}$/.test(v)) return false;
  if (v.length !== 11) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(v[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(v[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(v[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(v[10]);
}

function isValidCNPJ(cnpj: string) {
  const v = cnpj.replace(/\D/g, "");
  if (v.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(v)) return false;

  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += Number(v[i]) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(12);
  if (d1 !== Number(v[12])) return false;
  const d2 = calc(13);
  return d2 === Number(v[13]);
}
function ensureMoney(input: string) {
  const n = parseMoneyToNumber(input);
  if (n === null) return null;

  if (n < 0) throw new Error("Valores não podem ser negativos.");

  // força no máximo 2 casas (evita 10.999999 ou 1,2345)
  const fixed = Math.round(n * 100) / 100;
  const hasMoreThan2Decimals = Math.abs(n - fixed) > 1e-9;
  if (hasMoreThan2Decimals) {
    throw new Error("Valores devem ter no máximo 2 casas decimais (centavos).");
  }
  return fixed;
}
function cleanText(v: string, max = 5000) {
  const s = (v || "").trim();
  if (!s) return null;
  // remove \0 e normaliza espaços
  const cleaned = s.replace(/\u0000/g, "").replace(/\s+/g, " ");
  return cleaned.slice(0, max);
}
type DbLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function friendlyDbError(err: unknown) {
  const e = (err ?? {}) as DbLikeError;
  const msg = (e.message || "").toLowerCase();

  // Uniques conhecidos do schema de clientes
  if (msg.includes("clientes_cpf_key") || msg.includes("documento")) {
    return "Já existe um cliente com este documento (CPF/CNPJ).";
  }
  if (msg.includes("clientes_email_unique")) {
    return "Já existe um cliente com este e-mail.";
  }
  if (msg.includes("clientes_telefone_unique")) {
    return "Já existe um cliente com este telefone.";
  }

  // Unique conhecido do schema de contratos
  if (
    msg.includes("contratos_numero_unique") ||
    msg.includes("numero_contrato")
  ) {
    return "Já existe um contrato com este número.";
  }

  // Check constraint do tipo do cliente
  if (msg.includes("clientes_tipo_check")) {
    return "Tipo inválido. Use PF ou PJ.";
  }

  return e.message || "Erro ao salvar no banco de dados.";
}

export async function criarClienteEContrato(formData: FormData) {
  const supabase = await createServerSupabase();

  // precisa de usuário logado para contratos.criado_por
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

  // ----- Cliente -----
  const tipo = normalizeTipo(String(formData.get("tipo") || ""));
  const nome = String(formData.get("nome") || "").trim();
  const documento = onlyDigits(String(formData.get("documento") || ""));
  const emailRaw = String(formData.get("email") || "").trim();
  const telefoneRaw = String(formData.get("telefone") || "").trim();
  const ativo = String(formData.get("ativo") || "true") === "true";

  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const telefone = telefoneRaw ? onlyDigits(telefoneRaw) : null;

  if (!nome) throw new Error("Informe o nome / razão social.");

  if (tipo === "pf") {
    if (documento.length !== 11) throw new Error("CPF deve ter 11 dígitos.");
    if (!isValidCPF(documento)) throw new Error("CPF inválido.");
  }
  if (tipo === "pj") {
    if (documento.length !== 14) throw new Error("CNPJ deve ter 14 dígitos.");
    if (!isValidCNPJ(documento)) throw new Error("CNPJ inválido.");
  }

  // ----- Contrato -----
  const numero_contrato = String(formData.get("numero_contrato") || "").trim();
  const tipo_contrato = String(formData.get("tipo_contrato") || "").trim();
  const status = normalizeStatus(String(formData.get("status") || "rascunho"));
  const data_inicio = String(formData.get("data_inicio") || "").trim();
  const data_fim = String(formData.get("data_fim") || "").trim() || null;
  const renovacao_automatica =
    String(formData.get("renovacao_automatica") || "false") === "true";
  const moeda = String(formData.get("moeda") || "BRL").trim() || "BRL";

  const valor_mensal = ensureMoney(String(formData.get("valor_mensal") || ""));
  const valor_total = ensureMoney(String(formData.get("valor_total") || ""));

  const forma_pagamento =
    String(formData.get("forma_pagamento") || "").trim() || null;
  const dia_vencimento = parseIntOrNull(
    String(formData.get("dia_vencimento") || ""),
  );

  const limite_usuarios = parseIntOrNull(
    String(formData.get("limite_usuarios") || ""),
  );
  const limite_gestores = parseIntOrNull(
    String(formData.get("limite_gestores") || ""),
  );
  const limite_departamentos = parseIntOrNull(
    String(formData.get("limite_departamentos") || ""),
  );

  const observacoes = cleanText(
    String(formData.get("observacoes") || ""),
    5000,
  );
  const clausulas_especiais = cleanText(
    String(formData.get("clausulas_especiais") || ""),
    10000,
  );

  if (!numero_contrato) throw new Error("Informe o número do contrato.");
  if (!tipo_contrato) throw new Error("Informe o tipo de contrato.");
  if (!data_inicio) throw new Error("Informe a data de início.");
  if (data_fim && data_fim < data_inicio)
    throw new Error("Data fim não pode ser anterior à data início.");

  // 1) cria cliente
  const { data: cliente, error: errCliente } = await supabase
    .from("clientes")
    .insert({
      tipo, // pf | pj (conforme check constraint)
      nome,
      documento,
      email,
      telefone,
      ativo,
    })
    .select("id")
    .single();

  if (errCliente) throw new Error(friendlyDbError(errCliente));

  // 2) cria contrato vinculado ao cliente
  const { data: contrato, error: errContrato } = await supabase
    .from("contratos")
    .insert({
      cliente_id: cliente.id,
      numero_contrato,
      tipo_contrato,
      status,
      data_inicio,
      data_fim,
      renovacao_automatica,
      moeda,
      valor_mensal,
      valor_total,
      forma_pagamento,
      dia_vencimento,
      limite_usuarios,
      limite_gestores,
      limite_departamentos,
      observacoes,
      clausulas_especiais,
      criado_por: userId,
    })
    .select("id")
    .single();

  if (errContrato) {
    // rollback compensatório (para não deixar cliente sem contrato)
    await supabase.from("clientes").delete().eq("id", cliente.id);
    throw new Error(friendlyDbError(errContrato));
  }

  return { clienteId: cliente.id, contratoId: contrato.id };
}
