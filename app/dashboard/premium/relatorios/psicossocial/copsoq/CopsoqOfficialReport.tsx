"use client";

import React, { forwardRef, useMemo } from "react";

// =======================
// TIPOS
// =======================
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

// =======================
// HELPERS
// =======================
function formatNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2).replace(".", ",");
}

function percent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
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

// =======================
// COMPONENTE
// =======================
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

    // Visão gráfica
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

    // Plano de ação
    const planoAcao = useMemo(() => {
      const linhas: Array<{
        area: string;
        escala: string;
        nivel: "Alto" | "Médio";
        prioridade: number | null;
      }> = [];
      gruposOrg.forEach((dep) => {
        dep.setores.forEach((set) => {
          set.rows.forEach((r) => {
            if (r.nivel_risco === "alto" || r.nivel_risco === "medio") {
              linhas.push({
                area: `${dep.departamento_nome} / ${set.setor_nome}`,
                escala: r.escala,
                nivel: r.nivel_risco === "alto" ? "Alto" : "Médio",
                prioridade: r.prioridade ?? null,
              });
            }
          });
        });
      });
      return linhas;
    }, [gruposOrg]);
    const mediasEscalas = [
      { label: "Alto", value: visaoGrafica.mediaAlto, className: "high" },
      { label: "Médio", value: visaoGrafica.mediaMedio, className: "medium" },
      { label: "Baixo", value: visaoGrafica.mediaBaixo, className: "low" },
      { label: "Geral", value: visaoGrafica.mediaGeral, className: "medium" },
    ];

    const maxMedia = Math.max(...mediasEscalas.map((m) => m.value || 0));

    // Recortes por nível de risco
    // const recortes = useMemo(() => {
    //   const altos: RowRisco[] = [];
    //   const medios: RowRisco[] = [];
    //   const baixos: RowRisco[] = [];
    //   gruposOrg.forEach((dep) => {
    //     dep.setores.forEach((set) => {
    //       set.rows.forEach((r) => {
    //         if (r.nivel_risco === "alto") altos.push(r);
    //         else if (r.nivel_risco === "medio") medios.push(r);
    //         else if (r.nivel_risco === "baixo") baixos.push(r);
    //       });
    //     });
    //   });
    //   return { altos, medios, baixos };
    // }, [gruposOrg]);

    return (
      <div ref={ref} className="report-root">
        <style>{`
      @page { margin: 20mm 15mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; }

      h1 { font-size: 18px; margin: 0 0 8px; }
      h2 { font-size: 14px; margin: 18px 0 8px; color: #030870; break-after: avoid; }
      h3 { font-size: 12px; margin: 12px 0 6px; }

      .anexo { page-break-before: always;  margin-top: 10mm;}

.anexo-panel {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  font-size: 11px;
  line-height: 1.5;
}

.anexo-panel h3 {
  font-size: 12px;
  margin: 0 0 6px;
  color: #030870;
}

      .cover {display: flex;flex-direction: column;justify-content: space-between;
  min-height: 100%;page-break-after: always;}
      .cover-header { margin-top: 40mm; }
      .cover-title { font-size: 20px; font-weight: 800; color: #030870; margin-bottom: 12px; }
      .cover-meta { font-size: 12px; line-height: 1.6; color: #222; }
      .cover-box { border-top: 1px solid #ddd; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #444; }
      .cover-footer { font-size: 10px; color: #666; margin-bottom: 10mm; }

      .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 10px 0; }
      .muted { font-size: 11px; color: #666; }

      .chart-box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 10px 0; }
      .row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
      .row-label { width: 160px; font-size: 11px; }
      .bar { height: 10px; border-radius: 6px; }
      .bar.high { background: #DF633F; }
      .bar.medium { background: #6126E2; }
      .bar.low { background: #019499; }
      .bar-wrap {
  flex: 1;
  background: #f0f0f0;
  border-radius: 6px;
  height: 10px;
  position: relative;
}

.bar {
  height: 10px;
  border-radius: 6px;
}
  .bar.general {
  background: #030489; /* slate-600 */
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35);
}

.row-label .general {
  font-weight: 700;
}
      .dep-block {
        margin-top: 20px;
        }

      table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 6px 0 12px; break-inside: avoid; }
      th, td { border: 1px solid #e6e6e6; padding: 6px; vertical-align: top; }
      th { background: #f5f6ff; font-weight: 700; text-align: left; }
      tr { page-break-inside: avoid; }

      .num { text-align: right; }
      .center { text-align: center; }

      .pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; }
      .pill-high { background: rgba(223,99,63,.15); color: #DF633F; }
      .pill-medium { background: rgba(97,38,226,.15); color: #6126E2; }
      .pill-low { background: rgba(1,148,153,.15); color: #019499; }
      .setor-block { margin-top: 10px; page-break-inside: avoid; }
      .visao-grafica {
        page-break-before: always;
        }
      .action-table th, .action-table td { padding: 8px; }
      .action-break { page-break-inside: avoid; }
      .inventario { page-break-before: always; } 
      .plano-acao { page-break-before: always; }
      .governance { page-break-before: always; margin-top: 20px; }
      .signature-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
      .signature-table td { border: 1px solid #e6e6e6; padding: 10px; height: 48px; }
      .signature-label { font-size: 10px; color: #555; }
      .control-box { border-top: 1px solid #ddd; margin-top: 14px; padding-top: 10px; font-size: 10px; color: #555; }
    `}</style>

        {/* ================= CAPA TÉCNICA ================= */}
        <div className="cover">
          <div className="cover-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://alma4d.com.br/images/alma4d-bicolor-nobground-256.png"
              alt="Logo alma4D"
              style={{ width: 120, float: "right", marginBottom: 16 }}
            />

            <div className="cover-title">
              Relatório Psicossocial — Evidência técnica de apoio ao GRO/PGR
              (NR‑1)
            </div>

            <div className="cover-meta">
              <b>Cliente:</b> {clienteNome}
              <br />
              <b>Data de geração:</b> {generatedAt}
              <br />
              <b>Instrumento:</b> COPSOQ II BR — versão curta
              <br />
              <b>ID do relatório:</b> {reportId}
              <br />
              <b>Versão:</b> 1.0 (assinável)
            </div>

            <div className="cover-box">
              <b>Resumo executivo</b>
              <br />
              <b>Total de respostas (agregado):</b> {resumo.totalRespostas}
              <br />
              <b>Total de escalas com resultado:</b> {resumo.totalEscalas}
              <br />
              <b>Alto:</b> {resumo.altos} <b>Médio:</b> {resumo.medios}{" "}
              <b>Baixo:</b> {resumo.baixos}
              <br />
              <b>Escopo e finalidade:</b> este documento consolida resultados{" "}
              <b>agregados</b> de fatores psicossociais obtidos por meio do
              COPSOQ II BR (versão curta), com a finalidade de apoiar o{" "}
              <b>GRO</b> e o <b>PGR</b>. Não constitui diagnóstico clínico ou
              avaliação individual.
            </div>
          </div>

          <div className="cover-footer">
            Documento técnico gerado automaticamente pela plataforma alma4D.
          </div>
        </div>

        {/* ================= VISÃO GRÁFICA ================= */}
        <div className="visao-grafica">
          <h2>Visão Gráfica do Cenário Psicossocial</h2>
          <div className="muted">
            Panorama consolidado para leitura gerencial antes da análise
            detalhada.
          </div>

          <div className="chart-box">
            <b>Distribuição dos níveis de risco (por escala)</b>

            {[
              {
                label: "Alto",
                value: visaoGrafica.altos.length,
                className: "high",
              },
              {
                label: "Médio",
                value: visaoGrafica.medios.length,
                className: "medium",
              },
              {
                label: "Baixo",
                value: visaoGrafica.baixos.length,
                className: "low",
              },
            ].map((r) => (
              <div key={r.label} className="row">
                <div className="row-label">
                  {r.label} {percent(r.value, visaoGrafica.total)} ({r.value})
                </div>

                <div className="bar-wrap">
                  <div
                    className={`bar ${r.className}`}
                    style={{ width: percent(r.value, visaoGrafica.total) }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="chart-box">
            <b>Médias das escalas</b>

            {[
              {
                label: "Alto",
                value: visaoGrafica.mediaAlto,
                className: "high",
              },
              {
                label: "Médio",
                value: visaoGrafica.mediaMedio,
                className: "medium",
              },
              {
                label: "Baixo",
                value: visaoGrafica.mediaBaixo,
                className: "low",
              },
              {
                label: "Geral",
                value: visaoGrafica.mediaGeral,
                className: "general",
              },
            ].map((m) => (
              <div key={m.label} className="row">
                <div className="row-label">
                  <span className={m.label === "Geral" ? "general" : undefined}>
                    {m.label}: {formatNum(m.value)}
                  </span>
                </div>

                <div className="bar-wrap">
                  <div
                    className={`bar ${m.className}`}
                    style={{
                      width: `${maxMedia > 0 ? (m.value / maxMedia) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="chart-box">
            <b>Volume de respostas por departamento</b>

            {visaoGrafica.top10.map((d) => (
              <div key={d.dep} className="row">
                <div className="row-label">{d.dep}</div>

                <div className="bar-wrap">
                  <div
                    className="bar medium"
                    style={{
                      width: `${(d.total / visaoGrafica.top10[0].total) * 100}%`,
                    }}
                  />
                </div>

                <div className="muted">{d.total}</div>
              </div>
            ))}

            {visaoGrafica.outros > 0 && (
              <div className="row">
                <div className="row-label">Outros</div>

                <div className="bar-wrap">
                  <div className="bar low" style={{ width: "30%" }} />
                </div>

                <div className="muted">{visaoGrafica.outros}</div>
              </div>
            )}
          </div>
        </div>

        {/* ================= INVENTÁRIO ================= */}
        <div className="inventario">
          <h2>Inventário de Riscos Psicossociais — TOP 5 por Setor</h2>
          <div className="muted">
            Estruturado por unidade organizacional para registro no Inventário e
            priorização no Plano de Ação.
          </div>
        </div>

        {gruposOrg.map((dep, idx) => (
          <div
            key={dep.departamento_id ?? dep.departamento_nome}
            className="dep-block"
            style={idx > 0 ? { pageBreakBefore: "always" } : undefined}
          >
            <h2>{dep.departamento_nome}</h2>
            {dep.setores.map((set) => {
              const ordenadas = [...set.rows].sort(
                (a, b) => (b.prioridade ?? -1) - (a.prioridade ?? -1),
              );
              return (
                <div
                  key={set.setor_id ?? set.setor_nome}
                  className="setor-block"
                >
                  <h3>{set.setor_nome}</h3>
                  {ordenadas.length === 0 ? (
                    <div className="muted">Sem registros neste setor.</div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Escala / fator</th>
                          <th className="num">Média</th>
                          <th className="center">Nível</th>
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
                                : "pill-low";
                          return (
                            <tr
                              key={`${r.escala}-${idx}`}
                              style={
                                isTop5
                                  ? {
                                      background: "rgba(3,8,112,.10)",
                                      fontWeight: 800,
                                    }
                                  : undefined
                              }
                            >
                              <td>
                                {isTop5 && <b>TOP {idx + 1} — </b>}
                                {r.escala}
                              </td>
                              <td className="num">{formatNum(r.media)}</td>
                              <td className="center">
                                <span className={`pill ${pill}`}>
                                  {r.nivel_risco === "alto"
                                    ? "Alto"
                                    : r.nivel_risco === "medio"
                                      ? "Médio"
                                      : "Baixo"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* ================= PLANO DE AÇÃO ================= */}
        <div className="plano-acao">
          <h2>
            Plano de Ação do PGR — Foco nos Riscos Psicossociais Prioritários
          </h2>
          <div className="muted">
            Modelo orientativo para definição e acompanhamento das medidas
            preventivas.
          </div>

          <table className="action-table">
            <thead>
              <tr>
                <th className="num" style={{ width: 28 }}>
                  #
                </th>
                <th style={{ width: 180 }}>Área (Depto/Setor)</th>
                <th style={{ width: 200 }}>Escala / fator</th>
                <th className="center" style={{ width: 70 }}>
                  Nível
                </th>
                <th>Código da ação</th>
                <th style={{ width: 90 }}>Responsável</th>
                <th style={{ width: 70 }}>Prazo</th>
                <th style={{ width: 60 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {planoAcao.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    Não foram identificados riscos psicossociais classificados
                    como
                    <b> Alto</b> ou <b>Médio</b> no recorte atual.
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
                      <span
                        className={`pill pill-${l.nivel === "Alto" ? "high" : "medium"}`}
                      >
                        {l.nivel}
                      </span>
                    </td>
                    <td />
                    <td />
                    <td />
                    <td />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* ================= ANEXO METODOLÓGICO ================= */}
        <div className="anexo">
          <h2>Anexo Metodológico — Base Técnica e Limitações</h2>

          <div className="anexo-panel">
            <h3>1. Instrumento utilizado</h3>
            Este relatório foi elaborado a partir da aplicação do instrumento
            <b> COPSOQ II BR — versão curta</b> (Copenhagen Psychosocial
            Questionnaire), validado para o contexto brasileiro e amplamente
            utilizado para avaliação de fatores de risco psicossociais
            relacionados ao trabalho.
            <br />
            <br />O COPSOQ avalia dimensões como exigências do trabalho,
            organização e liderança, relações sociais, previsibilidade, justiça
            organizacional e interface trabalho‑indivíduo, a partir da percepção
            dos trabalhadores.
          </div>

          <div className="anexo-panel">
            <h3>2. Natureza dos dados</h3>
            Os dados apresentados neste relatório são{" "}
            <b>agregados por escala, setor e departamento</b>, não sendo
            possível identificar indivíduos ou respostas individuais.
            <br />
            <br />O tratamento dos dados respeita os princípios da
            <b> Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</b>,
            garantindo anonimização, confidencialidade e uso exclusivo para fins
            de gestão de riscos ocupacionais.
          </div>

          <div className="anexo-panel">
            <h3>3. Cálculo dos indicadores</h3>
            As médias apresentadas correspondem à <b>média aritmética</b> das
            respostas válidas para cada escala psicossocial, conforme
            metodologia do instrumento.
            <br />
            <br />O <b>nível de risco</b> (baixo, médio ou alto) resulta da
            comparação das médias observadas com parâmetros de referência do
            COPSOQ, permitindo a classificação do potencial impacto psicossocial
            no contexto organizacional.
            <br />
            <br />A <b>prioridade</b> é um indicador sintético utilizado para
            ordenação das escalas, combinando nível de risco, magnitude da média
            e volume de respostas, com o objetivo de apoiar a tomada de decisão
            no Plano de Ação.
          </div>

          <div className="anexo-panel">
            <h3>4. Finalidade no âmbito do GRO / PGR (NR‑1)</h3>
            Este documento tem como finalidade servir como{" "}
            <b>subsídio técnico</b> ao
            <b> Gerenciamento de Riscos Ocupacionais (GRO)</b> e ao
            <b> Programa de Gerenciamento de Riscos (PGR)</b>, conforme disposto
            na Norma Regulamentadora nº 1 (NR‑1).
            <br />
            <br />O relatório contribui especificamente para:
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              <li>Identificação e priorização de riscos psicossociais;</li>
              <li>Registro do Inventário de Riscos Ocupacionais;</li>
              <li>Definição e acompanhamento do Plano de Ação;</li>
              <li>
                Monitoramento contínuo das condições psicossociais de trabalho.
              </li>
            </ul>
          </div>

          <div className="anexo-panel">
            <h3>5. Limitações e advertências</h3>
            Este relatório:
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              <li>Não possui caráter diagnóstico, clínico ou pericial;</li>
              <li>
                Não substitui avaliações médicas, psicológicas ou ergonômicas
                individuais;
              </li>
              <li>
                Reflete a percepção dos trabalhadores no período de coleta;
              </li>
              <li>
                Deve ser interpretado à luz do contexto organizacional
                específico.
              </li>
            </ul>
            <br />
          </div>
          <div className="muted" style={{ marginTop: 12 }}>
            Documento técnico gerado automaticamente para fins de gestão de
            riscos ocupacionais. Uso restrito à organização contratante e partes
            autorizadas.
          </div>
        </div>

        {/* ================= GOVERNANÇA ================= */}
        <div className="governance">
          <h2>Termo de validação e assinaturas</h2>

          <div className="box muted">
            Para fins de governança do GRO/PGR, declara‑se ciência e validação
            do conteúdo consolidado neste relatório (ID <b>{reportId}</b>),
            gerado em <b>{generatedAt}</b>.
          </div>

          <table className="signature-table">
            <tbody>
              <tr>
                <td>
                  <div className="signature-label">Responsável técnico</div>
                </td>
                <td />
              </tr>
              <tr>
                <td>
                  <div className="signature-label">
                    Representante da organização
                  </div>
                </td>
                <td />
              </tr>
              <tr>
                <td>
                  <div className="signature-label">Observações</div>
                </td>
                <td />
              </tr>
            </tbody>
          </table>

          <div className="control-box">
            <b>Controle documental:</b> ID {reportId} • Gerado em {generatedAt}.
            <br />
            Distribuição e armazenamento conforme política interna.
          </div>
        </div>
      </div>
    );
  },
);
