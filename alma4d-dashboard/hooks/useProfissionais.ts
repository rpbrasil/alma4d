"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getProfissionaisCrud,
  createProfissional,
  updateProfissional,
  deleteProfissional,
  toggleProfissionalStatus,
  searchProfissionais,
} from "@/services/profissionais";
import type { Profissional, ProfissionalFormData } from "@/types/profissional";

interface UseProfissionaisOptions {
  autoLoad?: boolean;
  filtroAtivo?: boolean;
}

export function useProfissionais(options: UseProfissionaisOptions = {}) {
  const { autoLoad = true, filtroAtivo } = options;

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar profissionais
  const loadProfissionais = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProfissionaisCrud(filtroAtivo);
      setProfissionais(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar profissionais";
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [filtroAtivo]);

  // Buscar profissionais
  const search = useCallback(
    async (term: string) => {
      if (!term) {
        loadProfissionais();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchProfissionais(term);
        setProfissionais(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao buscar profissionais";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [loadProfissionais],
  );

  // Criar profissional
  const create = useCallback(async (formData: ProfissionalFormData) => {
    setLoading(true);
    setError(null);

    try {
      const newProf = await createProfissional(formData);
      setProfissionais((prev) => [...prev, newProf]);
      return newProf;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar profissional";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar profissional
  const update = useCallback(
    async (id: string, formData: Partial<ProfissionalFormData>) => {
      setLoading(true);
      setError(null);

      try {
        const updated = await updateProfissional(id, formData);
        setProfissionais((prev) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar profissional";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Deletar profissional
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteProfissional(id);
      setProfissionais((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao deletar profissional";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Alternar status
  const toggleStatus = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const prof = profissionais.find((p) => p.id === id);
        if (!prof) throw new Error("Profissional não encontrado");

        const updated = await toggleProfissionalStatus(id, !prof.ativo);
        setProfissionais((prev) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao alternar status";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [profissionais],
  );

  // Auto-load ao montar
  useEffect(() => {
    if (autoLoad) {
      loadProfissionais();
    }
  }, [autoLoad, loadProfissionais]);

  return {
    profissionais,
    loading,
    error,
    loadProfissionais,
    search,
    create,
    update,
    remove,
    toggleStatus,
  };
}
