"use client";

import { useAuth } from "@/context/auth";
import { useProfissionais } from "@/hooks/useProfissionais";
import Link from "next/link";
import type { Profissional } from "@/types/profissional";

export default function ProfissionaisPage() {
  const { role, loading: authLoading } = useAuth();
  const { data: profissionais, loading } = useProfissionais();

  const canManage = role === "admin" || role === "gestor";

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-slate-500">Carregando profissionais…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action */}
      {canManage && (
        <div>
          <Link
            href="/dashboard/profissionais/novo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md
                       bg-[#019499] text-white text-sm font-medium
                       hover:bg-[#017a7d] transition-colors"
          >
            + Novo profissional
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Status
              </th>
              {canManage && (
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {profissionais.map((prof: Profissional) => (
              <tr key={prof.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm text-slate-900">
                  {prof.nome}
                </td>

                <td className="px-6 py-4 text-sm text-slate-600">
                  {prof.email}
                </td>

                <td className="px-6 py-4 text-sm">
                  <span
                    className={
                      prof.ativo
                        ? "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"
                        : "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500"
                    }
                  >
                    {prof.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>

                {canManage && (
                  <td className="px-6 py-4 text-sm text-right">
                    <Link
                      href={`/dashboard/profissionais/${prof.id}`}
                      className="text-[#019499] hover:underline font-medium"
                    >
                      Editar
                    </Link>
                  </td>
                )}
              </tr>
            ))}

            {profissionais.length === 0 && (
              <tr>
                <td
                  colSpan={canManage ? 4 : 3}
                  className="px-6 py-8 text-center text-sm text-slate-500"
                >
                  Nenhum profissional encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
