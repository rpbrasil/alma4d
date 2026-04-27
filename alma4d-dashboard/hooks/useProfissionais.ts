"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getProfissionaisCrud,
  getProfissionaisAtivos,
  createProfissional,
  updateProfissional,
  deleteProfissional,
  toggleProfissionalStatus,
  searchProfissionais,
} from "@/services/profissionais";
import type {
  Profissional,
  ProfissionalCrud,
  ProfissionalFormData,
} from "@/types/profissional";

interface UseProfissionaisOptions {
  clienteId?: string;
  autoLoad?: boolean;
  onlyAtivos?: boolean;
}

export function useProfissionais(options: UseProfissionaisOptions = {}) {
  const { clienteId, autoLoad = true, onlyAtivos = false } = options;

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar profissionais
  const loadProfissionais = useCallback(async () => {
    if (!clienteId) return;

    setLoading(true);
    setError(null);

    try {
      const data = onlyAtivos
        ? await getProfissionaisAtivos(clienteId)
        : await getProfissionaisCrud(clienteId);
      setProfissionais(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar profissionais";
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [clienteId, onlyAtivos]);

  // Buscar profissionais
  const search = useCallback(
    async (term: string) => {
      if (!clienteId || !term) {
        loadProfissionais();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchProfissionais(clienteId, term);
        setProfissionais(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao buscar profissionais";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [clienteId, loadProfissionais],
  );

  // Criar profissional
  const create = useCallback(
    async (formData: ProfissionalFormData) => {
      if (!clienteId) throw new Error("clienteId é obrigatório");

      setLoading(true);
      setError(null);

      try {
        const newProf = await createProfissional({
          ...formData,
          cliente_id: clienteId,
        });
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
    },
    [clienteId],
  );

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
    if (autoLoad && clienteId) {
      loadProfissionais();
    }
  }, [autoLoad, clienteId, loadProfissionais]);

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
