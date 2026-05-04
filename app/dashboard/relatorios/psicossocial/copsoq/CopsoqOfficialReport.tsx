"use client";

import React, { forwardRef, useMemo } from "react";

export type RowRisco = {
  cliente_id: string;
  departamento_id: string | null;
  setor_id: string | null;
  departamento_nome?: string | null;
  setor_nome?: string | null;
  escala: string;
  n_respostas: number;
  media: number | null;
  nivel_risco: "baixo" | "medio" | "alto" | null;
  prioridade: number | null;
};

type GrupoSetor = {
  setor_id: string | null;
  setor_nome: string;
  rows: RowRisco[];
};
type GrupoDepartamento = {
  departamento_id: string | null;
  departamento_nome: string;
  setores: GrupoSetor[];
};

function formatNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2).replace(".", ",");
}
function riskLabel(n: RowRisco["nivel_risco"]) {
  if (n === "alto") return "Alto";
  if (n === "medio") return "Médio";
  if (n === "baixo") return "Baixo";
  return "—";
}

function topN<T extends { prioridade?: number | null }>(arr: T[], n = 5) {
  return [...arr]
    .sort((a, b) => (b.prioridade ?? -1) - (a.prioridade ?? -1))
    .slice(0, n);
}

function buildGroups(rows: RowRisco[]): GrupoDepartamento[] {
  const depMap = new Map<string, GrupoDepartamento>();

  for (const r of rows) {
    const depKey = r.departamento_id ?? "__sem_departamento__";
    const depNome = (r.departamento_nome ?? "").trim() || "Sem departamento";

    if (!depMap.has(depKey)) {
      depMap.set(depKey, {
        departamento_id: r.departamento_id ?? null,
        departamento_nome: depNome,
        setores: [],
      });
    }
    const dep = depMap.get(depKey)!;

    const setKey = r.setor_id ?? "__sem_setor__";
    const setNome = (r.setor_nome ?? "").trim() || "Sem setor";

    let setor = dep.setores.find(
      (s) => (s.setor_id ?? "__sem_setor__") === setKey,
    );
    if (!setor) {
      setor = { setor_id: r.setor_id ?? null, setor_nome: setNome, rows: [] };
      dep.setores.push(setor);
    }
    setor.rows.push(r);
  }

  const deps = Array.from(depMap.values()).sort((a, b) =>
    a.departamento_nome.localeCompare(b.departamento_nome, "pt-BR"),
  );
  for (const d of deps) {
    d.setores.sort((a, b) => a.setor_nome.localeCompare(b.setor_nome, "pt-BR"));
    for (const s of d.setores)
      s.rows.sort((a, b) => (b.prioridade ?? -1) - (a.prioridade ?? -1));
  }
  return deps;
}

type Props = {
  clienteNome: string;
  rows: RowRisco[];
  generatedAt: string;
  reportId: string;
};

// ForwardRef para o html2pdf capturar o DOM inteiro
export const CopsoqOfficialReport = forwardRef<HTMLDivElement, Props>(
  function CopsoqOfficialReport(
    { clienteNome, rows, generatedAt, reportId },
    ref,
  ) {
    const gruposOrg = useMemo(() => buildGroups(rows), [rows]);

    const resumo = useMemo(() => {
      const totalRespostas = rows.reduce(
        (acc, r) => acc + (r.n_respostas ?? 0),
        0,
      );
      const altos = rows.filter((r) => r.nivel_risco === "alto").length;
      const medios = rows.filter((r) => r.nivel_risco === "medio").length;
      const baixos = rows.filter((r) => r.nivel_risco === "baixo").length;
      return {
        totalRespostas,
        altos,
        medios,
        baixos,
        totalEscalas: rows.length,
      };
    }, [rows]);

    const planoAcao = useMemo(() => {
      // Top 5 riscos altos por setor (modelo igual RN)
      const linhas: Array<{
        area: string;
        escala: string;
        prioridade: number | null;
      }> = [];
      for (const dep of gruposOrg) {
        for (const set of dep.setores) {
          const top = topN(
            set.rows.filter((r) => r.nivel_risco === "alto"),
            5,
          );
          for (const r of top) {
            linhas.push({
              area: `${dep.departamento_nome} / ${set.setor_nome}`,
              escala: r.escala,
              prioridade: r.prioridade ?? null,
            });
          }
        }
      }
      return linhas;
    }, [gruposOrg]);

    return (
      <div ref={ref} className="bg-white text-slate-900">
        {/* Estilos inline para PDF (evita depender do Tailwind na renderização do canvas) */}
        <style>{`
        @page { margin: 24px 24px 56px 24px; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; }
        .page-header { border-bottom: 1px solid #e6e6e6; padding: 16px 18px; margin-bottom: 14px; }
        .title { font-size: 16px; font-weight: 800; color: #030870; margin-bottom: 6px; }
        .meta { font-size: 11px; color: #444; line-height: 1.4; }
        .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 10px 18px; }
        .muted { color: #666; font-size: 11px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .tag { display:inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }
        .tag.high { background: rgba(223,99,63,0.14); color: #DF633F; }
        .tag.medium { background: rgba(97,38,226,0.12); color: #6126E2; }
        .tag.low { background: rgba(1,148,153,0.12); color: #019499; }
        h2 { font-size: 14px; color: #030870; margin: 14px 18px 8px; }
        h3 { font-size: 12px; color: #222; margin: 10px 0 6px; }
        table { width: calc(100% - 36px); margin: 0 18px 10px; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #e6e6e6; padding: 6px; vertical-align: top; }
        th { background: #f5f6ff; text-align: left; }
        .num { text-align: right; }
        .center { text-align: center; }
        .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; }
        .pill-high { background: rgba(223,99,63,0.14); color: #DF633F; }
        .pill-medium { background: rgba(97,38,226,0.12); color: #6126E2; }
        .pill-low { background: rgba(1,148,153,0.12); color: #019499; }
        .dep-block { margin: 12px 18px; padding-top: 6px; border-top: 1px solid #eee; }
        .setor-block { margin-left: 10px; padding-left: 10px; border-left: 3px solid #e6e6ff; margin-bottom: 10px; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        .footer { margin: 18px; font-size: 10px; color: #666; }
      `}</style>

        {/* Cabeçalho oficial */}
        <div className="page-header">
          <div className="title">
            Relatório de Mapeamento de Riscos Psicossociais (COPSOQ) — Subsídio
            ao GRO/PGR (NR‑01)
          </div>
          <div className="meta">
            <div>
              <b>Cliente:</b> {clienteNome || "—"}
            </div>
            <div>
              <b>Data de geração:</b> {generatedAt}
            </div>
            <div>
              <b>Instrumento:</b> COPSOQ II BR — versão curta
            </div>
            <div>
              <b>ID do relatório:</b> {reportId}
            </div>
            <div>
              <b>Natureza:</b> Consolidado agregado (sem identificação
              individual — LGPD)
            </div>
          </div>
        </div>

        {/* Resumo Executivo */}
        <div className="box">
          <div>
            <b>Resumo executivo</b>
          </div>
          <div className="grid" style={{ marginTop: 8 }}>
            <div className="muted">
              <div>
                <b>Total de respostas (agregado):</b> {resumo.totalRespostas}
              </div>
              <div>
                <b>Total de escalas com resultado:</b> {resumo.totalEscalas}
              </div>
            </div>
            <div>
              <span className="tag high">Alto: {resumo.altos}</span>
              <span className="tag medium" style={{ marginLeft: 8 }}>
                Médio: {resumo.medios}
              </span>
              <span className="tag low" style={{ marginLeft: 8 }}>
                Baixo: {resumo.baixos}
              </span>
            </div>
          </div>
          <div style={{ height: 1, background: "#eee", margin: "12px 0" }} />
          <div className="muted">
            <b>Escopo e finalidade:</b> este documento consolida resultados{" "}
            <b>agregados</b> de fatores psicossociais obtidos por meio do
            COPSOQ, com finalidade preventiva e organizacional, apoiando o{" "}
            <b>Inventário de Riscos</b> e o<b> Plano de Ação</b> do PGR (NR‑01).
            Vedada tentativa de identificação individual (LGPD).
          </div>
        </div>

        {/* Inventário TOP5 por setor (oficial) */}
        <h2>Inventário de Riscos Psicossociais — TOP 5 por Setor</h2>
        <div className="muted" style={{ margin: "0 18px 10px" }}>
          Seções estruturadas por unidade organizacional para registro no
          Inventário e priorização no Plano de Ação.
        </div>

        {gruposOrg.map((dep) => (
          <div
            className="dep-block avoid-break"
            key={dep.departamento_id ?? dep.departamento_nome}
          >
            <h2 style={{ margin: "0 0 8px", color: "#030870" }}>
              {dep.departamento_nome}
            </h2>

            {dep.setores.map((set) => {
              const ordenadas = [...set.rows].sort(
                (a, b) => (b.prioridade ?? -1) - (a.prioridade ?? -1),
              );

              <table>
                <thead>
                  <tr>
                    <th>Escala / fator (COPSOQ)</th>
                    <th className="num">Média</th>
                    <th className="num">N</th>
                    <th className="center">Nível</th>
                    <th className="num">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map((r, idx) => {
                    const isTop5 = idx < 5;
                    const pill =
                      r.nivel_risco === "alto"
                        ? "pill-high"
                        : r.nivel_risco === "medio"
                          ? "pill-medium"
                          : r.nivel_risco === "baixo"
                            ? "pill-low"
                            : "";

                    return (
                      <tr
                        key={`${r.escala}-${idx}`}
                        style={
                          isTop5
                            ? {
                                background: "rgba(3, 8, 112, .10)",
                                fontWeight: 800,
                              }
                            : { color: "#666", fontSize: 10 }
                        }
                      >
                        <td>
                          {isTop5 ? (
                            <span
                              style={{
                                display: "inline-block",
                                background: "#030870",
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 6,
                                marginRight: 6,
                              }}
                            >
                              TOP {idx + 1}
                            </span>
                          ) : null}
                          {r.escala}
                        </td>
                        <td className="num">{formatNum(r.media)}</td>
                        <td className="num">{r.n_respostas ?? 0}</td>
                        <td className="center">
                          <span className={`pill ${pill}`}>
                            {riskLabel(r.nivel_risco)}
                          </span>
                        </td>
                        <td className="num">{formatNum(r.prioridade)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>;
              const top = ordenadas.slice(0, 5);

              return (
                <div
                  className="setor-block avoid-break"
                  key={set.setor_id ?? set.setor_nome}
                >
                  <h3>{set.setor_nome}</h3>

                  {top.length === 0 ? (
                    <div className="muted">Sem registros neste setor.</div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Escala / fator (COPSOQ)</th>
                          <th className="num">Média</th>
                          <th className="num">N</th>
                          <th className="center">Nível</th>
                          <th className="num">Prioridade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top.map((r, idx) => (
                          <tr key={`${r.escala}-${idx}`}>
                            <td>
                              <b>TOP {idx + 1}</b> — {r.escala}
                            </td>
                            <td className="num">{formatNum(r.media)}</td>
                            <td className="num">{r.n_respostas ?? 0}</td>
                            <td className="center">
                              <span
                                className={`pill ${r.nivel_risco === "alto" ? "pill-high" : r.nivel_risco === "medio" ? "pill-medium" : "pill-low"}`}
                              >
                                {riskLabel(r.nivel_risco)}
                              </span>
                            </td>
                            <td className="num">{formatNum(r.prioridade)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Plano de ação (modelo “oficial”) */}
        <h2>
          Plano de Ação do PGR — Foco nos Riscos Psicossociais Prioritários
        </h2>
        <div className="muted" style={{ margin: "0 18px 10px" }}>
          Modelo para priorização de medidas preventivas associadas aos riscos
          psicossociais (preencher internamente).
        </div>

        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Área (Depto/Setor)</th>
              <th>Escala / fator</th>
              <th className="center">Nível</th>
              <th className="num">Prioridade</th>
              <th>Medida / ação</th>
              <th>Responsável</th>
              <th>Prazo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {planoAcao.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  Sem riscos altos no recorte atual.
                </td>
              </tr>
            ) : (
              planoAcao.map((l, i) => (
                <tr key={`${l.area}-${l.escala}-${i}`}>
                  <td className="num">{i + 1}</td>
                  <td>{l.area}</td>
                  <td>{l.escala}</td>
                  <td className="center">
                    <span className="pill pill-high">Alto</span>
                  </td>
                  <td className="num">{formatNum(l.prioridade)}</td>
                  <td className="muted">
                    Definir medida (ex.: ajustes organizacionais, liderança,
                    carga de trabalho)
                  </td>
                  <td className="muted">Responsável</td>
                  <td className="muted">Prazo</td>
                  <td className="muted">Aberto</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Anexo + assinaturas (resumo curto; você pode expandir igual RN) */}
        <h2>Anexo — Metodologia, limitações e governança</h2>
        <div className="box">
          <div className="muted">
            <b>Base técnica:</b> COPSOQ II BR (versão curta). Resultados
            agregados por escala/setor/departamento, sem identificação
            individual (LGPD).
            <br />
            <br />
            <b>Limitações:</b> não constitui diagnóstico clínico ou laudo
            pericial; reflete percepção no período.
            <br />
            <br />
            <b>Finalidade:</b> subsídio ao GRO/PGR (NR‑01) para Inventário e
            Plano de Ação.
          </div>
        </div>

        <h2>Termo de validação e assinaturas</h2>
        <div className="box">
          <div className="muted">
            Para fins de governança do GRO/PGR, registrar ciência e validação do
            relatório (ID: <b>{reportId}</b>).
          </div>
          <table style={{ width: "100%", margin: "10px 0 0" }}>
            <tbody>
              <tr>
                <td>
                  <b>Responsável técnico</b>
                </td>
                <td>__________________________________</td>
              </tr>
              <tr>
                <td>
                  <b>Representante da organização</b>
                </td>
                <td>__________________________________</td>
              </tr>
              <tr>
                <td>
                  <b>Data</b>
                </td>
                <td>__________________________________</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="footer">
          <div>
            <b>Controle documental:</b> ID {reportId} • Gerado em {generatedAt}.
          </div>
          <div>
            Distribuição e armazenamento devem seguir política interna e
            diretrizes de confidencialidade e proteção de dados.
          </div>
        </div>
      </div>
    );
  },
);
