export function generateContratoHTML({
  empresa,
  usuario,
  contrato,
  termosHtml,
  privacidadeHtml,
  hash,
}: {
  empresa: {
    razaoSocial: string;
    cnpj: string;
  };
  usuario: {
    nome: string;
    email: string;
    documento: string;
  };
  contrato: {
    dataAceite: string;
    ip: string;
    userAgent: string;
  };
  termosHtml: string;
  privacidadeHtml: string;
  hash: string;
}) {
  return `
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial; padding: 40px; color:#1f2937 }
      h1,h2 { color:#030870 }
      .box { border:1px solid #ddd; padding:16px; border-radius:10px; margin-bottom:20px }
    </style>
  </head>

  <body>
    <h1>Contrato de Prestação de Serviço — NR‑1</h1>

    <div class="box">
      <h2>Dados da Empresa</h2>
      <p><strong>Razão Social:</strong> ${empresa.razaoSocial}</p>
      <p><strong>CNPJ:</strong> ${empresa.cnpj}</p>
    </div>

    <div class="box">
      <h2>Responsável</h2>
      <p><strong>Nome:</strong> ${usuario.nome}</p>
      <p><strong>Email:</strong> ${usuario.email}</p>
      <p><strong>CPF:</strong> ${usuario.documento}</p>
    </div>

    <div class="box">
      <h2>Objeto</h2>
      <p>
        O presente contrato tem como objeto a geração de relatório técnico de mapeamento
        de riscos psicossociais conforme NR‑1.
      </p>
    </div>

    <div class="box">
      <h2>Execução e Encerramento</h2>
      <p>
        O contrato será considerado concluído automaticamente após o preenchimento integral
        dos questionários por todos os usuários.
      </p>
    </div>

    <div class="box">
      <h2>Irretratabilidade e Não Reembolso</h2>
      <p>
        Após o início do preenchimento dos questionários, o serviço será considerado iniciado
        de forma irreversível, não sendo cabível reembolso.
      </p>
    </div>

    <div class="box">
      <h2>Responsabilidade</h2>
      <p>
        A empresa é responsável pelas informações fornecidas e pelas ações decorrentes.
      </p>
    </div>

    <div class="box">
      <h2>Registro de Aceite</h2>
      <p>Data: ${contrato.dataAceite}</p>
      <p>IP: ${contrato.ip}</p>
      <p>User Agent: ${contrato.userAgent}</p>
    </div>

    <div class="box">
      <h2>Hash de Integridade</h2>
      <p>${hash}</p>
    </div>

    <hr />

    <h2>Termos de Uso</h2>
    ${termosHtml}

    <h2>Política de Privacidade</h2>
    ${privacidadeHtml}

  </body>
  </html>
  `;
}
