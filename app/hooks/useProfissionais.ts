// app/hooks/useProfissionais.ts
"use client";

type Profissional = {
  id: string;
  nome: string;
  especialidade?: string;
};

export function useProfissionais() {
    const profissionais: Profissional[] = [];
  return {
    data: profissionais,
    loading: false,
    error: null,
  };
}
