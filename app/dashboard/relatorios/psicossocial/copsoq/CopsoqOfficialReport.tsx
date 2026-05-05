"use client";

import React, { forwardRef, useMemo } from "react";

/* =======================
   TIPOS
======================= */

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

type Props = {
  clienteNome: string;
  rows: RowRisco[];
  generatedAt: string;
  reportId: string;
};

/* =======================
   HELPERS
======================= */

function formatNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2).replace(".", ",");
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
    for (const s of d.setores) {
      s.rows.sort((a, b) => (b.prioridade ?? -1) - (a.prioridade ?? -1));
    }
  }

  return deps;
}

function percent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

/* =======================
   COMPONENTE
======================= */

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
      return {
        totalRespostas,
        totalEscalas: rows.length,
        altos: rows.filter((r) => r.nivel_risco === "alto").length,
        medios: rows.filter((r) => r.nivel_risco === "medio").length,
        baixos: rows.filter((r) => r.nivel_risco === "baixo").length,
      };
    }, [rows]);

    const visaoGrafica = useMemo(() => {
      const total = rows.length;

      const altos = rows.filter((r) => r.nivel_risco === "alto");
      const medios = rows.filter((r) => r.nivel_risco === "medio");
      const baixos = rows.filter((r) => r.nivel_risco === "baixo");

      const media = (arr: RowRisco[]) =>
        arr.length === 0
          ? 0
          : arr.reduce((a, r) => a + (r.media ?? 0), 0) / arr.length;

      const porDepartamento = new Map<string, number>();
      rows.forEach((r) => {
        const nome = r.departamento_nome ?? "Sem departamento";
        porDepartamento.set(
          nome,
          (porDepartamento.get(nome) ?? 0) + r.n_respostas,
        );
      });

      const ranking = Array.from(porDepartamento.entries())
        .map(([dep, total]) => ({ dep, total }))
        .sort((a, b) => b.total - a.total);

      const top10 = ranking.slice(0, 10);
      const outros = ranking.slice(10).reduce((a, r) => a + r.total, 0);

      return {
        total,
        altos,
        medios,
        baixos,
        mediaGeral: media(rows),
        mediaAlto: media(altos),
        mediaMedio: media(medios),
        mediaBaixo: media(baixos),
        top10,
        outros,
      };
    }, [rows]);

    const planoAcao = useMemo(() => {
      const linhas: Array<{
        area: string;
        escala: string;
        nivel: "Alto";
        prioridade: number | null;
      }> = [];

      gruposOrg.forEach((dep) => {
        dep.setores.forEach((set) => {
          const riscosAltos = set.rows
            .filter((r) => r.nivel_risco === "alto")
            .slice(0, 5); // TOP 5 por setor (igual RN)

          riscosAltos.forEach((r) => {
            linhas.push({
              area: `${dep.departamento_nome} / ${set.setor_nome}`,
              escala: r.escala,
              nivel: "Alto",
              prioridade: r.prioridade ?? null,
            });
          });
        });
      });

      return linhas;
    }, [gruposOrg]);

    return (
      <div ref={ref} className="report-root">
        <div className="page">
          {/* =======================
            CSS PARA PDF (PLAYWRIGHT)
        ======================= */}
          <style>{`
          @page { margin: 20mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; }

          h1 { font-size: 18px; margin: 0 0 8px; }
          h2 { font-size: 14px; margin: 16px 0 8px; color: #030870; }
          h3 { font-size: 12px; margin: 12px 0 6px; }

          .meta { font-size: 11px; color: #444; line-height: 1.4; }
          .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 10px 0; }
          .muted { font-size: 11px; color: #666; }

.action-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.action-table th,
.action-table td {
  border: 1px solid #e6e6e6;
  padding: 6px;
  vertical-align: top;
}

.action-table th {
  background: #f5f6ff;
  font-weight: 700;
}

.action-muted {
  color: #666;
  font-size: 10px;
}

.action-break {
  page-break-inside: avoid;
}

          .chart-box {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 12px;
  margin: 10px 0;
}

.bar {
  height: 10px;
  border-radius: 6px;
}

.bar.high { background: #DF633F; }
.bar.medium { background: #6126E2; }
.bar.low { background: #019499; }

.governance {
  page-break-before: always;
  margin-top: 20px;
}

.signature-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 11px;
}

.signature-table td {
  border: 1px solid #e6e6e6;
  padding: 10px;
  height: 48px;
}

.signature-label {
  font-size: 10px;
  color: #555;
}

.control-box {
  border-top: 1px solid #ddd;
  margin-top: 14px;
  padding-top: 10px;
  font-size: 10px;
  color: #555;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
}

.row-label {
  width: 160px;
  font-size: 11px;
}

.page-break {
  page-break-after: always;
}


.cover {
  display:  flex-direction: column;  display: flex;
  justify-content: space-between;
  min-height: 100vh;
  page-break-after: always;
}

.cover-header {
  margin-top: 40mm;
}

.cover-title {
  font-size: 20px;
  font-weight: 800;
  color: #030870;
  margin-bottom: 12px;
}

.cover-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.cover-meta {
  font-size: 12px;
  line-height: 1.6;
  color: #222;
}

.cover-box {
  border-top: 1px solid #ddd;
  margin-top: 24px;
  padding-top: 12px;
  font-size: 11px;
  color: #444;
}

.cover-footer {
  font-size: 10px;
  color: #666;
  margin-bottom: 10mm;
}


          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #e6e6e6; padding: 6px; }
          th { background: #f5f6ff; text-align: left; }

          .num { text-align: right; }
          .center { text-align: center; }

          .pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; }
          .pill-high { background: rgba(223,99,63,.15); color: #DF633F; }
          .pill-medium { background: rgba(97,38,226,.15); color: #6126E2; }
          .pill-low { background: rgba(1,148,153,.15); color: #019499; }

          .dep-block { margin-top: 20px; page-break-before: always; }
          .setor-block { margin-top: 10px; page-break-inside: avoid; }
          table { margin-bottom: 12px;  margin-top: 6px;}
          th { font-weight: 700;}
          tr { page-break-inside: avoid; }
          .report-root { background: white;}
          .page { padding: 0;}
        `}</style>

          {/* =======================
            CAPA / CABEÇALHO
        ======================= */}
          {/* =======================
              CAPA TÉCNICA (IGUAL RN)
          ======================= */}
          <div className="cover">
            <div className="cover-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://alma4d.com.br/images/logo-alma4d.png"
                alt="Alma4D"
                style={{ height: 36, marginBottom: 32 }}
              />

              <div className="cover-title">
                Relatório Psicossocial — Evidência técnica de apoio ao GRO/PGR
                (NR‑01)
              </div>

              <div className="cover-subtitle">
                Instrumento COPSOQ II BR — versão curta
              </div>

              <div className="cover-meta">
                <div>
                  <b>Cliente:</b> {clienteNome}
                </div>
                <div>
                  <b>Data de geração:</b> {generatedAt}
                </div>
                <div>
                  <b>ID do relatório:</b> {reportId}
                </div>
                <div>
                  <b>Versão:</b> 1.0 (assinável)
                </div>
              </div>

              <div className="cover-box">
                <b>Escopo e finalidade</b>
                <br />
                Este documento consolida resultados <b>agregados</b> de fatores
                psicossociais obtidos por meio do instrumento COPSOQ II BR
                (versão curta), com a finalidade de apoiar o Gerenciamento de
                Riscos Ocupacionais (GRO) e o Programa de Gerenciamento de
                Riscos (PGR), conforme a NR‑01. Não constitui diagnóstico
                clínico, laudo pericial ou avaliação individual, sendo vedada
                qualquer tentativa de identificação pessoal (LGPD).
              </div>
            </div>

            <div className="cover-footer">
              Documento técnico gerado automaticamente pela plataforma Alma4D.
            </div>
          </div>
          <div style={{ pageBreakAfter: "always" }} />

          {/* =======================
            RESUMO EXECUTIVO
        ======================= */}
          <div className="box">
            <b>Resumo executivo</b>
            <div className="muted" style={{ marginTop: 6 }}>
              Total de respostas: <b>{resumo.totalRespostas}</b>
              <br />
              Total de escalas: <b>{resumo.totalEscalas}</b>
              <br />
              Alto: {resumo.altos} • Médio: {resumo.medios} • Baixo:{" "}
              {resumo.baixos}
            </div>
          </div>

          {/* =======================
              VISÃO GRÁFICA — CENÁRIO PSICOSSOCIAL
          ======================= */}
          <div className="page-break" />

          <h2>Visão Gráfica do Cenário Psicossocial</h2>
          <div className="muted">
            Panorama consolidado para leitura gerencial antes da análise
            detalhada por setor.
          </div>

          <div className="chart-box">
            <b>Distribuição dos níveis de risco (por escala)</b>

            <div className="row">
              <div className="row-label">
                Alto {percent(visaoGrafica.altos.length, visaoGrafica.total)} (
                {visaoGrafica.altos.length})
              </div>
              <div
                className="bar high"
                style={{
                  width: percent(visaoGrafica.altos.length, visaoGrafica.total),
                }}
              />
            </div>

            <div className="row">
              <div className="row-label">
                Médio {percent(visaoGrafica.medios.length, visaoGrafica.total)}{" "}
                ({visaoGrafica.medios.length})
              </div>
              <div
                className="bar medium"
                style={{
                  width: percent(
                    visaoGrafica.medios.length,
                    visaoGrafica.total,
                  ),
                }}
              />
            </div>

            <div className="row">
              <div className="row-label">
                Baixo {percent(visaoGrafica.baixos.length, visaoGrafica.total)}{" "}
                ({visaoGrafica.baixos.length})
              </div>
              <div
                className="bar low"
                style={{
                  width: percent(
                    visaoGrafica.baixos.length,
                    visaoGrafica.total,
                  ),
                }}
              />
            </div>
          </div>

          <div className="chart-box">
            <b>Médias das escalas</b>
            <div className="muted">
              Média geral: {formatNum(visaoGrafica.mediaGeral)}
            </div>
            <div className="muted">
              Alto: {formatNum(visaoGrafica.mediaAlto)}
            </div>
            <div className="muted">
              Médio: {formatNum(visaoGrafica.mediaMedio)}
            </div>
            <div className="muted">
              Baixo: {formatNum(visaoGrafica.mediaBaixo)}
            </div>
          </div>

          <div className="page-break" />

          <h2>Volume de respostas por departamento</h2>

          <div className="chart-box">
            {visaoGrafica.top10.map((d) => (
              <div key={d.dep} className="row">
                <div className="row-label">{d.dep}</div>
                <div
                  className="bar medium"
                  style={{
                    width: `${(d.total / visaoGrafica.top10[0].total) * 100}%`,
                  }}
                />
                <div className="muted">{d.total}</div>
              </div>
            ))}

            {visaoGrafica.outros > 0 && (
              <div className="row">
                <div className="row-label">Outros</div>
                <div className="bar low" style={{ width: "30%" }} />
                <div className="muted">{visaoGrafica.outros}</div>
              </div>
            )}
          </div>

          {/* =======================
            INVENTÁRIO — ALINHADO AO RN
        ======================= */}
          <h2>Inventário de Riscos Psicossociais</h2>

          {/* =======================
              PLANO DE AÇÃO — PGR (IGUAL RN)
              ======================= */}
          <div className="page-break" />

          <h2>Plano de Ação do PGR — Riscos Psicossociais Prioritários</h2>
          <div className="muted">
            Plano orientativo para definição, acompanhamento e registro de
            medidas preventivas associadas aos riscos psicossociais
            classificados como <b>Alto</b>, conforme NR‑01 (GRO/PGR).
          </div>

          <table className="action-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Área (Departamento / Setor)</th>
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
                    Não foram identificados riscos psicossociais classificados
                    como
                    <b> Alto</b> no recorte atual.
                  </td>
                </tr>
              ) : (
                planoAcao.map((l, i) => (
                  <tr
                    key={`${l.area}-${l.escala}-${i}`}
                    className="action-break"
                  >
                    <td className="num">{i + 1}</td>
                    <td>{l.area}</td>
                    <td>{l.escala}</td>
                    <td className="center">
                      <span className="pill pill-high">Alto</span>
                    </td>
                    <td className="num">{formatNum(l.prioridade)}</td>
                    <td className="action-muted">
                      Definir medida (ex.: ajustes organizacionais, gestão da
                      carga de trabalho, capacitação de liderança).
                    </td>
                    <td className="action-muted">Responsável</td>
                    <td className="action-muted">Prazo</td>
                    <td className="action-muted">Aberto</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* =======================
              GOVERNANÇA, VALIDAÇÃO E CONTROLE
          ======================= */}
          <div className="governance">
            <h2>Governança, validação e conformidade normativa</h2>

            <div className="box muted">
              <b>Base normativa:</b> este relatório integra o Gerenciamento de
              Riscos Ocupacionais (GRO) e o Programa de Gerenciamento de Riscos
              (PGR), conforme disposto na NR‑01, com foco específico nos fatores
              de risco psicossociais identificados por meio do instrumento
              COPSOQ II BR (versão curta).
              <br />
              <br />
              <b>Natureza dos dados:</b> os resultados apresentados são{" "}
              <b>agregados</b>, sem identificação individual, em conformidade
              com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
              <br />
              <br />
              <b>Limitações:</b> este documento não constitui diagnóstico
              clínico, laudo pericial ou avaliação individual. Reflete
              percepções coletadas no período de aplicação e deve ser
              interpretado no contexto organizacional.
            </div>

            <h2>Termo de validação</h2>

            <div className="box muted">
              Para fins de governança do GRO/PGR, declara‑se ciência, análise e
              validação do presente relatório, identificado pelo código
              <b> {reportId}</b>, para uso exclusivo em ações preventivas e de
              gestão organizacional.
            </div>

            <table className="signature-table">
              <tbody>
                <tr>
                  <td>
                    <div className="signature-label">
                      Responsável técnico (Saúde e Segurança)
                    </div>
                  </td>
                  <td>
                    <div className="signature-label">Assinatura</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="signature-label">
                      Representante legal da organização
                    </div>
                  </td>
                  <td>
                    <div className="signature-label">Assinatura</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="signature-label">Data</div>
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>

            <div className="control-box">
              <div>
                <b>Controle documental:</b> Relatório Psicossocial COPSOQ — ID{" "}
                {reportId}
              </div>
              <div>
                <b>Cliente:</b> {clienteNome}
              </div>
              <div>
                <b>Data de geração:</b> {generatedAt}
              </div>
              <div>
                <b>Versão:</b> 1.0 (assinável)
              </div>
              <div>
                Distribuição, armazenamento e acesso devem seguir as políticas
                internas de confidencialidade e segurança da informação.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
