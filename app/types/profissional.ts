export interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
  documento: string; // CPF (11 dígitos) ou CNPJ (14 dígitos)
  calendly_url: string; // Obrigatório
  bio_resumida?: string | null;
  foto_url?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  whatsapp_url?: string | null;
  numero_conselho?: string | null;
  ativo: boolean | null;
  created_at: string;
  email: string | null;
}

export type ProfissionalCrud = Profissional;

export interface ProfissionalFormData {
  nome: string;
  especialidade: string;
  documento: string; // CPF ou CNPJ
  calendly_url: string; // Obrigatório
  bio_resumida?: string | null;
  foto_url?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  whatsapp_url?: string | null;
  numero_conselho?: string | null;
}

// Helpers para validação de documento
export function isCPFValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1+$/.test(cpf)) return false; // Todos os dígitos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

export function isCNPJValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // Todos os dígitos iguais

  let soma = 0;
  let mult = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj[i]) * mult;
    mult = mult === 2 ? 9 : mult - 1;
  }
  let d1 = soma % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== parseInt(cnpj[12])) return false;

  soma = 0;
  mult = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj[i]) * mult;
    mult = mult === 2 ? 9 : mult - 1;
  }
  let d2 = soma % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === parseInt(cnpj[13]);
}

export function isDocumentoValido(documento: string): boolean {
  const clean = documento.replace(/\D/g, "");
  if (clean.length === 11) return isCPFValido(clean);
  if (clean.length === 14) return isCNPJValido(clean);
  return false;
}
