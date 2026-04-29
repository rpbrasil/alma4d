// app/hooks/useProfissionais.ts
"use client";
import type { Profissional } from "@/types/profissional";
import { useState } from "react";

export function useProfissionais() {
  const [data] = useState<Profissional[]>([]);

  return {
    data,
    loading : false,
    error: null
  };
}
