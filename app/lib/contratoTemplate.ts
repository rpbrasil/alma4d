// lib/contratoTemplate.ts

type ContratoHTMLParams = {
  empresa: {
    razaoSocial: string;
    cnpj: string;
  };
  usuario: {
    nome: string;
    email: string;
    documento: string; // CPF
  };
  contrato: {
    dataAceite: string; // pt-BR
    ip: string; // pode vir "0.0.0.0" no preview
    userAgent: string;

    // opcionais na fase de preview
    numero?: string;
    versao?: number | string;
    registro?: string; // se você quiser um "nº de registro" futuro
  };
  termosHtml: string; // HTML integral (Terms)
  privacidadeHtml: string; // HTML integral (Privacy)
  hash: string; // preview-hash ou hash real
  qrCode?: string;
};

function escapeHtml(input: string) {
  return (input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function maskCnpj(cnpj: string) {
  const d = onlyDigits(cnpj).slice(0, 14);
  if (d.length !== 14) return escapeHtml(cnpj);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

function maskCpf(cpf: string) {
  const d = onlyDigits(cpf).slice(0, 11);
  if (d.length !== 11) return escapeHtml(cpf);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

// Placeholder visual “forte”
function fieldValueOrPlaceholder(value: string, placeholder: string) {
  const v = (value ?? "").trim();
  if (v) {
    return `<span class="value">${escapeHtml(v)}</span>`;
  }
  return `
    <span class="placeholder">
      <span class="pill pending">PENDENTE</span>
      ${escapeHtml(placeholder)}
    </span>
  `;
}

// Detecta preview-hash ou vazio e transforma em placeholder
function hashOrPlaceholder(hash: string) {
  const h = (hash ?? "").trim();
  if (!h || h === "preview-hash") {
    return `
      <span class="placeholder">
        <span class="pill pending">GERADO NO ACEITE</span>
        Hash criptográfico será calculado no momento da assinatura eletrônica
      </span>
    `;
  }
  return `<code class="code">${escapeHtml(h)}</code>`;
}

export function generateContratoHTML(params: ContratoHTMLParams) {
  // ====== Dados (podem vir vazios no preview) ======
  const empresaNome = (params.empresa?.razaoSocial || "").trim();
  const empresaCnpj = (params.empresa?.cnpj || "").trim();

  const usuarioNome = (params.usuario?.nome || "").trim();
  const usuarioEmail = (params.usuario?.email || "").trim();
  const usuarioCpf = (params.usuario?.documento || "").trim();

  const dataAceite = (params.contrato?.dataAceite || "").trim();
  const ip = (params.contrato?.ip || "").trim();
  const userAgent = (params.contrato?.userAgent || "").trim();

  const numero = String(params.contrato?.numero ?? "").trim();
  const versao = String(params.contrato?.versao ?? "").trim();
  const registro = String(params.contrato?.registro ?? "").trim();

  // ====== UX: “peso jurídico” no preview ======
  const statusBanner = `
    <div class="statusbar">
      <div class="status-left">
        <span class="pill preview">PRÉ‑VISUALIZAÇÃO</span>
        <span class="status-title">Minuta para leitura</span>
        <span class="status-sub">
          Os dados finais (IP, hash, nº/versão e identificação) são registrados no momento do aceite.
        </span>
      </div>
      <div class="status-right">
        <div class="brand">alma4D</div>
        <div class="small">NR‑1 • Avaliação Psicossocial</div>
      </div>
    </div>
  `;

  // ====== Conteúdo do Termo (base que você enviou, com UX melhor) ======
  // OBS: aqui fica o texto “principal” do termo/contrato (não os anexos).
  // Você pode manter como está ou evoluir o texto jurídico conforme sua assessoria.
  const corpoContratoHtml = `
    <section id="sec-objeto" class="section">
      <h2>1. Objeto do Serviço</h2>
      <p>
        O serviço consiste na coleta, processamento e análise de dados fornecidos pelos usuários da empresa contratante,
        com a finalidade de gerar relatório técnico de riscos psicossociais.
      </p>
      <p>
        O relatório é disponibilizado em formato digital (PDF), pronto para utilização em processos internos e eventuais fiscalizações.
      </p>
    </section>

    <section id="sec-natureza" class="section">
      <h2>2. Natureza do Serviço</h2>
      <p>
        O serviço possui natureza técnica e informativa, sendo baseado exclusivamente nas respostas fornecidas pelos usuários participantes.
      </p>
      <div class="callout info">
        A plataforma <strong>não realiza diagnóstico clínico, médico ou psicológico</strong>, nem substitui avaliação profissional especializada.
      </div>
    </section>

    <section id="sec-responsabilidade" class="section">
      <h2>3. Responsabilidade do Contratante</h2>
      <p>A empresa contratante é integralmente responsável:</p>
      <ul>
        <li>Pela veracidade das informações fornecidas</li>
        <li>Pela gestão e uso do relatório gerado</li>
        <li>Pelas decisões e ações decorrentes do diagnóstico obtido</li>
      </ul>
      <p>
        A plataforma alma4D não possui ingerência sobre as decisões tomadas com base nos dados processados.
      </p>
    </section>

   
<section id="sec-execucao" class="section">
    <h2>4. Execução do Serviço</h2>
    <p>
      O serviço é considerado em execução a partir do momento em que os usuários iniciam o preenchimento dos questionários disponibilizados pela plataforma.
    </p>
    <p>
      O contrato será considerado concluído após o preenchimento integral dos questionários pelos usuários vinculados.
    </p>
  </section>

  <section id="sec-ocorrencias" class="section">
    <h2>5. Registro de Riscos e Ocorrências</h2>

    <p>
      A plataforma disponibiliza funcionalidade complementar para registro de riscos, ocorrências e situações relacionadas ao ambiente de trabalho, incluindo aspectos operacionais, comportamentais e psicossociais.
    </p>

    <p>
      Esses registros possuem natureza informativa e preventiva, podendo ser utilizados pela contratante como insumo adicional para ações de gestão, investigação interna e melhoria contínua.
    </p>
    <p>
      Os registros poderão ser anonimizados conforme configurado pelo usuario, sendo vedada a utilização da plataforma para finalidades ilícitas ou que violem direitos de terceiros.
    </p>
    <div class="callout info">
      O canal de registro de ocorrências não substitui canais formais de denúncia, comunicação institucional ou procedimentos legais aplicáveis.
    </div>

    <p>
      A contratante é integralmente responsável pela análise, tratamento e eventual encaminhamento dos registros realizados por seus usuários, incluindo medidas disciplinares, administrativas ou legais quando aplicável.
    </p>

    <p>
      A plataforma não realiza validação, investigação ou conclusão sobre os fatos relatados,
      limitando-se ao armazenamento seguro e disponibilização estruturada das informações registradas.
    </p>
  </section>

  <section id="sec-naoreembolso" class="section">
    <h2>6. Irretratabilidade e Não Reembolso</h2>
      <p>
        Devido à natureza personalizada e técnica do serviço, o início do preenchimento dos questionários caracteriza o início efetivo da prestação.
      </p>
      <div class="callout warn">
        <strong>Após o início da coleta de dados, não será possível cancelamento do serviço, nem haverá reembolso de valores pagos.</strong>
      </div>
    </section>

    <section id="sec-limitacao" class="section">
      <h2>7. Limitação de Responsabilidade</h2>
      <p>A contratada não se responsabiliza por:</p>
      <ul>
        <li>Decisões tomadas com base no relatório gerado</li>
        <li>Uso inadequado das informações fornecidas</li>
        <li>Interpretações incorretas dos dados</li>
        <li>Consequências decorrentes de ações ou omissões do contratante</li>
      </ul>
    </section>

    <section id="sec-lgpd" class="section">
      <h2>8. Conformidade com LGPD</h2>
      <p>O tratamento de dados pessoais será realizado conforme a Lei nº 13.709/2018 (LGPD).</p>
      <p>
        A empresa contratante atua como <strong>Controladora</strong> dos dados coletados, sendo responsável pela base legal de tratamento e pelas finalidades de uso.
      </p>
      <p>
        A alma4D atua como <strong>Operadora</strong>, limitada ao processamento necessário para execução do serviço.
      </p>
    </section>

    <section id="sec-registros" class="section">
      <h2>9. Segurança e Registros</h2>
      <p>Para fins de segurança, auditoria e comprovação jurídica, poderão ser registrados:</p>
      <ul>
        <li>Endereço IP do usuário</li>
        <li>Data e hora do aceite</li>
        <li>Identificação do dispositivo</li>
        <li>Versão dos termos aceitos</li>
      </ul>
    </section>

    <section id="sec-aceite" class="section">
      <h2>10. Aceite Eletrônico</h2>
      <p>
        O aceite destes Termos ocorre de forma eletrônica e possui validade jurídica, nos termos da legislação brasileira,
        incluindo a Medida Provisória nº 2.200-2/2001.
      </p>
      <p>O aceite vincula o contratante às condições aqui estabelecidas.</p>
    </section>

    <section id="sec-atualizacoes" class="section">
      <h2>11. Atualizações</h2>
      <p>Estes Termos poderão ser atualizados periodicamente.</p>
      <p>Cada nova contratação estará vinculada à versão vigente no momento do aceite.</p>
    </section>

    <section id="sec-foro" class="section">
      <h2>12. Lei Aplicável e Foro</h2>
      <p>Este instrumento será regido pelas leis da República Federativa do Brasil.</p>
      <p>Fica eleito o foro da Comarca de São Paulo/SP, salvo disposição legal em contrário.</p>
    </section>
  `;

  // ====== Resumo executivo + destaques (reduz abandono) ======
  const resumo = `
    <div class="resumo">
      <h2>Resumo do serviço</h2>
      <ul class="checks">
        <li><span class="dot ok"></span> Avaliação de riscos psicossociais conforme NR‑1</li>
        <li><span class="dot ok"></span> Relatório técnico estruturado (PDF)</li>
        <li><span class="dot ok"></span> Processamento baseado nas respostas coletadas</li>
        <li><span class="dot warn"></span> Sem reembolso após início do preenchimento</li>
      </ul>
      <p class="hint">
        Esta é uma pré‑visualização. O documento definitivo registra identificação, IP, data/hora e hash criptográfico.
      </p>
    </div>
  `;

  // ====== Sumário ======
  const toc = `
    <nav class="toc">
      <a href="#sec-objeto">1. Objeto</a>
      <a href="#sec-natureza">2. Natureza</a>
      <a href="#sec-responsabilidade">3. Responsabilidades</a>
      <a href="#sec-execucao">4. Execução</a>
      <a href="#sec-naoreembolso">5. Reembolso</a>
      <a href="#sec-limitacao">6. Limitação</a>
      <a href="#sec-lgpd">7. LGPD</a>
      <a href="#sec-registros">8. Registros</a>
      <a href="#sec-aceite">9. Aceite</a>
      <a href="#sec-atualizacoes">10. Atualizações</a>
      <a href="#sec-foro">11. Foro</a>
      <a href="#sec-termos">Termos</a>
      <a href="#sec-privacidade">Privacidade</a>
      <a href="#sec-evidencias">Evidências</a>
    </nav>
  `;

  // ====== Anexos (Termos/Privacidade) em detalhes ======
  const termosBlock = `
    <section id="sec-termos" class="section">
      <h2>Termos de Uso (integral)</h2>
      <details class="details" open>
        <summary>Ver Termos de Uso</summary>
        <div class="details-body">
          ${params.termosHtml || "<p>Termos indisponíveis.</p>"}
        </div>
      </details>
    </section>
  `;

  const privacidadeBlock = `
    <section id="sec-privacidade" class="section">
      <h2>Política de Privacidade (integral)</h2>
      <details class="details">
        <summary>Ver Política de Privacidade</summary>
        <div class="details-body">
          ${params.privacidadeHtml || "<p>Política de privacidade indisponível.</p>"}
        </div>
      </details>
    </section>
  `;

  // ====== Evidências / trilha (peso jurídico no preview) ======
  // Aqui entra a mágica: mesmo sem dados, a estrutura deixa claro o “registro no aceite”.
  const evidencias = `
    <section id="sec-evidencias" class="section">
      <h2>Evidências e trilha de auditoria</h2>

      <div class="callout strong">
        <strong>Como este documento ganha validade:</strong>
        no momento do aceite, o sistema registra <em>data/hora</em>, <em>IP</em>, <em>identificação do dispositivo</em>,
        <em>versão</em> e <em>hash criptográfico</em> para garantir integridade e não‑repúdio.
      </div>

      <div class="evidence-grid">
        <div class="kv">
          <span>Empresa</span>
          ${empresaNome ? `<span class="value">${escapeHtml(empresaNome)}</span>` : fieldValueOrPlaceholder("", "Será vinculada no aceite")}
        </div>

        <div class="kv">
          <span>CNPJ</span>
          ${empresaCnpj ? `<span class="value">${maskCnpj(empresaCnpj)}</span>` : fieldValueOrPlaceholder("", "Será vinculado no aceite")}
        </div>

        <div class="kv">
          <span>Responsável</span>
          ${usuarioNome ? `<span class="value">${escapeHtml(usuarioNome)}</span>` : fieldValueOrPlaceholder("", "Será validado na contratação")}
        </div>

        <div class="kv">
          <span>E‑mail</span>
          ${usuarioEmail ? `<span class="value">${escapeHtml(usuarioEmail)}</span>` : fieldValueOrPlaceholder("", "Será registrado na assinatura")}
        </div>

        <div class="kv">
          <span>CPF</span>
          ${usuarioCpf ? `<span class="value">${maskCpf(usuarioCpf)}</span>` : fieldValueOrPlaceholder("", "Será registrado na assinatura")}
        </div>

        <div class="kv">
          <span>Versão do documento</span>
          ${versao ? `<span class="value">${escapeHtml(versao)}</span>` : fieldValueOrPlaceholder("", "Definida no momento do aceite")}
        </div>

        <div class="kv">
          <span>Nº do contrato / registro</span>
          ${
            numero || registro
              ? `<span class="value">${escapeHtml(numero || registro)}</span>`
              : fieldValueOrPlaceholder("", "Gerado após confirmação do fluxo")
          }
        </div>

        <div class="kv">
          <span>Data/Hora</span>
          ${dataAceite ? `<span class="value">${escapeHtml(dataAceite)}</span>` : fieldValueOrPlaceholder("", "Registrada no aceite")}
        </div>

        <div class="kv">
          <span>IP</span>
          ${
            ip && ip !== "0.0.0.0"
              ? `<span class="value">${escapeHtml(ip)}</span>`
              : fieldValueOrPlaceholder("", "Capturado no momento do aceite")
          }
        </div>
      </div>

      <div class="hashbox">
        <span>Hash criptográfico (integridade)</span>
        ${hashOrPlaceholder(params.hash)}
      </div>

      <div class="uablock">
        <span>User‑Agent (dispositivo/navegador)</span>
        ${
          userAgent
            ? `<code class="code">${escapeHtml(userAgent)}</code>`
            : `<span class="placeholder"><span class="pill pending">REGISTRADO NO ACEITE</span> Identificação do dispositivo será registrada</span>`
        }
      </div>
      <div class="qrblock">
        <span>Validação do documento</span>  ${params.qrCode ? `<img src="${params.qrCode}" alt="QR Code de validação" class="qrimg"/>` : `<span class="placeholder">QR Code será gerado no momento do aceite</span>`} 
        <div class="qrhint">Escaneie para validar este contrato na plataforma alma4D</div>
        </div>
    </section>
  `;

  // ====== Progresso + sinalização ao wizard quando chegar ao final ======
  const script = `
    <script>
      (function () {
        const bar = document.getElementById('readProgress');
        const end = document.getElementById('fim-contrato');

        function updateProgress() {
          const doc = document.documentElement;
          const scrollTop = doc.scrollTop || document.body.scrollTop;
          const scrollHeight = doc.scrollHeight - doc.clientHeight;
          const pct = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0;
          if (bar) bar.style.width = pct + '%';
        }

        updateProgress();
        window.addEventListener('scroll', updateProgress, { passive: true });

        if (end && 'IntersectionObserver' in window) {
          const obs = new IntersectionObserver((entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                try {
                  window.parent && window.parent.postMessage({ type: 'CONTRATO_END', at: Date.now() }, '*');
                } catch (_) {}
                obs.disconnect();
              }
            }
          }, { threshold: 0.2 });
          obs.observe(end);
        }
      })();
    </script>
  `;

  // ====== CSS (paleta oficial + UX premium) ======
  const css = `
    <style>
      :root{
        --brand:#030870;
        --brand2:#019499;
        --accent:#df633f;
        --highlight:#6126e2;
        --surface:#ffffff;
        --muted:#f7f7fb;
        --border:#e7e7f2;
        --text:#171717;
      }
      *{box-sizing:border-box}
      body{
        margin:0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica, sans-serif;
        color:var(--text);
        background:linear-gradient(180deg, rgba(255,255,255,.75), rgba(247,247,251,1));
      }
      a{color:var(--brand); text-decoration:none}
      a:hover{text-decoration:underline}

      .wrap{max-width: 1040px; margin: 0 auto; padding: 16px 16px 44px;}

      /* Top status bar */
      .statusbar{
        position: sticky;
        top: 0;
        z-index: 30;
        background: rgba(255,255,255,.88);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--border);
        padding: 12px 16px;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap: 12px;
      }
      .status-left{display:flex; flex-direction:column; gap:4px;}
      .status-title{font-weight: 900; color: var(--brand); letter-spacing:-0.01em;}
      .status-sub{font-size:12px; color:#64748b; max-width: 720px;}
      .status-right{text-align:right;}
      .brand{font-weight:900; color: var(--brand);}
      .small{font-size:12px; color:#64748b;}

      /* Progress */
      .progressTrack{
        margin: 10px 16px 0;
        height: 6px;
        background: #e2e8f0;
        border-radius: 999px;
        overflow:hidden;
      }
      #readProgress{
        height:100%;
        width:0%;
        background: linear-gradient(90deg, var(--brand), var(--brand2));
        transition: width .12s linear;
      }

      /* Layout */
      .grid{
        margin-top: 14px;
        display:grid;
        grid-template-columns: 1.25fr .75fr;
        gap: 14px;
      }
      @media (max-width: 980px){
        .grid{grid-template-columns: 1fr;}
      }

      .card{
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(3,8,112,0.08);
        overflow:hidden;
      }
      .cardpad{padding:16px}

      h1{margin:0; font-size:18px; color: var(--brand);}
      h2{margin:0 0 10px; font-size:15px; color: var(--brand); letter-spacing:-0.01em;}
      p, li{font-size:13px; line-height:1.55; color:#334155;}
      ul, ol{padding-left:18px}

      .resumo{
        background: var(--muted);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px;
      }
      .checks{margin: 10px 0 0; padding: 0;}
      .checks li{
        list-style:none;
        display:flex;
        align-items:flex-start;
        gap:10px;
        margin: 8px 0;
      }
      .dot{
        width:10px;height:10px;border-radius:999px;margin-top:4px;flex:0 0 10px;
      }
      .dot.ok{background: var(--brand2)}
      .dot.warn{background: var(--accent)}
      .hint{font-size:12px;color:#64748b;margin:10px 0 0;}

      .toc{display:flex; flex-wrap:wrap; gap:8px; margin-top: 10px;}
      .toc a{
        font-size:12px;
        font-weight:800;
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: #fff;
        color:#0f172a;
      }
      .toc a:hover{border-color: rgba(3,8,112,.35); background: rgba(3,8,112,.04);}

      .section{padding: 16px; border-top: 1px solid var(--border);}
      .section:first-child{border-top:none}

      .callout{
        border-radius: 12px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        margin: 10px 0;
        font-size: 13px;
      }
      .callout.info{
        background: rgba(1,148,153,.08);
        border-color: rgba(1,148,153,.25);
        color:#0f172a;
      }
      .callout.warn{
        background: rgba(223,99,63,.10);
        border-color: rgba(223,99,63,.28);
        color:#9a3412;
      }
      .callout.strong{
        background: rgba(3,8,112,.04);
        border-color: rgba(3,8,112,.20);
        color:#0f172a;
      }

      .details{
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow:hidden;
        background:#fff;
      }
      summary{
        cursor:pointer;
        user-select:none;
        padding: 10px 12px;
        font-weight: 900;
        color:#0f172a;
        background: rgba(3,8,112,.03);
      }
      .details-body{padding: 12px;}

      /* Evidências */
      .evidence-grid{
        display:grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-top: 10px;
      }
      @media (max-width: 600px){
        .evidence-grid{grid-template-columns: 1fr;}
      }
      .kv{
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background:#fff;
      }
      .kv span{
        display:block;
        font-size:11px;
        color:#64748b;
        margin-bottom:4px;
      }
      .value{font-weight: 900; color:#0f172a;}
      .placeholder{
        display:block;
        font-size:12px;
        color:#64748b;
      }

      .pill{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 900;
        margin-right: 8px;
        border: 1px solid var(--border);
        background: #fff;
      }
      .pill.preview{
        border-color: rgba(97,38,226,.25);
        background: rgba(97,38,226,.08);
        color: var(--highlight);
      }
      .pill.pending{
        border-color: rgba(223,99,63,.25);
        background: rgba(223,99,63,.08);
        color: var(--accent);
      }

      .hashbox{
        margin-top: 12px;
        border: 1px dashed rgba(3,8,112,.25);
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(3,8,112,.03);
      }
      .hashbox span{
        display:block;
        font-size: 11px;
        color:#64748b;
        margin-bottom: 6px;
      }
      .uablock{
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: #fff;
      }
      .uablock span{
        display:block;
        font-size: 11px;
        color:#64748b;
        margin-bottom: 6px;
      }
      .code{
        display:block;
        white-space: pre-wrap;
        word-break: break-all;
        font-size: 11px;
        color:#0f172a;
      }

      .rightSideTitle{
        font-weight: 900;
        color: var(--brand);
        margin-bottom: 10px;
      }

      .footer{
        margin-top: 18px;
        font-size: 11px;
        color:#94a3b8;
        text-align:center;
      }
      .end{height:1px;}
      
      .qrblock{
        margin-top:16px;
          padding:12px;
            border:1px solid var(--border);
              border-radius:12px;
                text-align:center;
                  background:#fff;
                  }
                  .qrblock span{
                    display:block;
                      font-size:11px;
                        color:#64748b;
                          margin-bottom:8px;
                          }
                          .qrimg{
                            width:120px;
                              height:120px;
                                margin:8px auto;
                                }
                                .qrhint{
                                  font-size:11px;
                                    color:#64748b;
                                      margin-top:6px;
                                      }
                                      </style>
  `;

  // ====== Conteúdo do painel lateral (contexto) ======
  // const sidebar = `
  //   <div class="card">
  //     <div class="cardpad">
  //       <div class="rightSideTitle">Identificação (preview)</div>

  //       <div class="kv">
  //         <span>Empresa</span>
  //         ${empresaNome ? `<span class="value">${escapeHtml(empresaNome)}</span>` : fieldValueOrPlaceholder("", "Será vinculada no aceite")}
  //       </div>

  //       <div style="height:10px"></div>

  //       <div class="kv">
  //         <span>CNPJ</span>
  //         ${empresaCnpj ? `<span class="value">${maskCnpj(empresaCnpj)}</span>` : fieldValueOrPlaceholder("", "Será vinculado no aceite")}
  //       </div>

  //       <div style="height:10px"></div>

  //       <div class="kv">
  //         <span>Responsável</span>
  //         ${usuarioNome ? `<span class="value">${escapeHtml(usuarioNome)}</span>` : fieldValueOrPlaceholder("", "Será validado na contratação")}
  //       </div>

  //       <div style="height:10px"></div>

  //       <div class="kv">
  //         <span>E‑mail</span>
  //         ${usuarioEmail ? `<span class="value">${escapeHtml(usuarioEmail)}</span>` : fieldValueOrPlaceholder("", "Será registrado na assinatura")}
  //       </div>

  //       <div style="height:10px"></div>

  //       <div class="kv">
  //         <span>CPF</span>
  //         ${usuarioCpf ? `<span class="value">${maskCpf(usuarioCpf)}</span>` : fieldValueOrPlaceholder("", "Será registrado na assinatura")}
  //       </div>

  //       <div style="height:12px"></div>

  //       <div class="callout strong">
  //         <strong>Importante:</strong> esta visualização existe para leitura prévia.
  //         Ao confirmar o aceite, o documento final recebe identificação e integridade criptográfica.
  //       </div>
  //     </div>
  //   </div>
  // `;

  // ====== HTML final ======
  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Minuta — Termos NR‑1 alma4D</title>
        ${css}
      </head>

      <body>
        ${statusBanner}
        <div class="progressTrack" aria-label="Progresso de leitura">
          <div id="readProgress"></div>
        </div>

        <main class="wrap">
          <div class="grid">
            <!-- COLUNA PRINCIPAL -->
            <div class="card">
              <div class="cardpad">
                <h1>Termos de Uso — Serviço NR‑1 alma4D</h1>
                <p class="hint"><strong>Última atualização:</strong> Maio de 2026</p>

                ${resumo}

                <div style="margin-top:12px;">
                  <h2>Sumário</h2>
                  ${toc}
                </div>
              </div>

              ${corpoContratoHtml}
              ${termosBlock}
              ${privacidadeBlock}
              ${evidencias}

              <div id="fim-contrato" class="end"></div>

              <div class="section">
                <p class="hint">
                  Ao chegar ao final, o fluxo pode habilitar o aceite no assistente de ativação.
                </p>
              </div>
            </div>
          </div>

          <div class="footer">
            Documento de pré‑visualização • Conteúdo integral prevalece • Registro no aceite garante integridade
          </div>
        </main>

        ${script}
      </body>
    </html>
  `;

  return html;
}
