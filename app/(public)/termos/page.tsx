export const metadata = {
  title: "Termos de Uso | alma4D",
  description: "Termos de Uso aplicáveis ao aplicativo alma4D.",
};

function Card({
  title,
  children,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      {title ? (
        <h2 className="text-lg font-extrabold text-brand mb-2">{title}</h2>
      ) : null}
      {children}
    </article>
  );
}

export default function TermosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
          Termos de Uso — alma4D
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          <em>Última atualização: Abril de 2026</em>
        </p>
      </header>

      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        {/* Introdução */}
        <Card>
          <p>
            Este documento consolida os <strong>Termos de Uso</strong>{" "}
            aplicáveis ao aplicativo <strong>alma4D</strong> (“Aplicativo”,
            “Plataforma” ou “Serviço”).
          </p>
          <p className="mt-3">
            Ao acessar, instalar, cadastrar-se ou utilizar o aplicativo alma4D,
            o usuário declara que leu, compreendeu e concorda integralmente com
            este documento.
          </p>
        </Card>

        {/* 2. Aceitação */}
        <Card title="2. Aceitação dos Termos">
          <p>Ao utilizar o aplicativo, o usuário concorda com:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Estes Termos de Uso</li>
            <li>A Política de Privacidade</li>
            <li>
              O tratamento de dados pessoais necessário à operação do Serviço
            </li>
          </ul>
          <p className="mt-3">
            Caso o usuário não concorde com qualquer disposição deste documento,
            deverá interromper imediatamente o uso do aplicativo.
          </p>
        </Card>

        {/* 3. Elegibilidade e Uso Permitido */}
        <Card title="3. Elegibilidade e Uso Permitido">
          <p>
            O usuário declara possuir capacidade legal para aceitar este
            documento.
          </p>
          <p className="mt-2">
            Caso o usuário seja menor de idade, o uso deverá ocorrer com
            autorização e supervisão dos pais ou responsáveis legais.
          </p>
          <p className="mt-2">
            O aplicativo não é direcionado a menores de 18 anos, ou idade mínima
            equivalente conforme legislação aplicável, salvo quando autorizado e
            supervisionado por responsável legal.
          </p>
          <p className="mt-3">
            O usuário compromete-se a utilizar o aplicativo exclusivamente para
            fins lícitos, legítimos e compatíveis com sua finalidade.
          </p>
          <p className="mt-3 font-bold text-slate-900">É proibido:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Utilizar o aplicativo para atividades ilegais</li>
            <li>Violar direitos de terceiros</li>
            <li>Inserir informações falsas, fraudulentas ou enganosas</li>
            <li>
              Tentar obter acesso não autorizado a sistemas, servidores ou
              bancos de dados
            </li>
            <li>Interferir no funcionamento do aplicativo</li>
            <li>
              Utilizar robôs, scripts ou automações para manipular o Serviço
            </li>
            <li>
              Reproduzir, copiar ou explorar economicamente o aplicativo sem
              autorização
            </li>
          </ul>
        </Card>

        {/* 14. Limitação médica */}
        <Card title="14. Limitação Médica, Clínica e Profissional">
          <p>
            O alma4D não constitui plataforma médica, hospitalar, clínica,
            psicológica ou terapêutica.
          </p>
          <p className="mt-3">O aplicativo:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>
              Não substitui atendimento médico, psicológico, psiquiátrico ou
              terapêutico
            </li>
            <li>Não realiza diagnóstico clínico</li>
            <li>Não mantém prontuário médico</li>
            <li>Não constitui serviço de telemedicina</li>
            <li>Não realiza prescrição de medicamentos</li>
            <li>Não estabelece vínculo médico-paciente</li>
            <li>
              Não cria relação profissional entre usuário e qualquer
              profissional eventualmente associado ao aplicativo
            </li>
            <li>Não fornece aconselhamento clínico individualizado</li>
          </ul>
          <p className="mt-3">
            As informações disponibilizadas possuem caráter exclusivamente
            informativo, reflexivo, educacional ou de apoio à experiência do
            usuário.
          </p>
          <p className="mt-2">
            Nenhuma funcionalidade do aplicativo deve ser interpretada como
            orientação médica, psicológica, psiquiátrica, jurídica, financeira
            ou profissional.
          </p>
          <p className="mt-2">
            Em caso de sintomas físicos, sofrimento emocional, emergências ou
            necessidades clínicas, o usuário deverá buscar atendimento junto a
            profissionais habilitados ou serviços especializados.
          </p>
          <p className="mt-2">
            O aplicativo não realiza monitoramento ativo, acompanhamento clínico
            contínuo, triagem médica, avaliação psicológica em tempo real ou
            qualquer forma de supervisão de saúde.
          </p>
        </Card>

        {/* 15. IA */}
        <Card title="15. Uso de Inteligência Artificial e Sistemas Automatizados">
          <p>
            O aplicativo poderá utilizar sistemas automatizados, incluindo
            inteligência artificial, para geração de conteúdo, respostas,
            sugestões, personalização da experiência ou apoio ao usuário.
          </p>
          <p className="mt-2">
            O uso de sistemas automatizados não produz efeitos legais relevantes
            nem decisões exclusivamente automatizadas que impactem direitos
            fundamentais do usuário, nos termos da legislação aplicável.
          </p>
          <p className="mt-3">
            As respostas produzidas por sistemas automatizados:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Possuem caráter exclusivamente informativo</li>
            <li>
              Não constituem aconselhamento médico, psicológico, jurídico,
              financeiro ou profissional
            </li>
            <li>Não substituem profissionais habilitados</li>
            <li>
              Podem conter limitações, imprecisões ou interpretações incorretas
            </li>
          </ul>
          <p className="mt-3">
            O usuário reconhece que qualquer decisão tomada com base nas
            informações disponibilizadas é de sua exclusiva responsabilidade.
          </p>
        </Card>

        {/* 16. Responsabilidade do usuário */}
        <Card title="16. Responsabilidade do Usuário">
          <p>O usuário é integralmente responsável:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Pela veracidade das informações fornecidas</li>
            <li>Pela segurança de seu dispositivo</li>
            <li>Pela guarda do número telefônico utilizado</li>
            <li>Pelo uso adequado do aplicativo</li>
            <li>Por decisões tomadas com base nas informações disponíveis</li>
          </ul>
          <p className="mt-3">
            O usuário compromete-se a avaliar criticamente os conteúdos
            apresentados e buscar orientação especializada quando necessário.
          </p>
        </Card>

        {/* 17. Conta e acesso */}
        <Card title="17. Conta e Acesso">
          <p>
            O acesso ao aplicativo ocorre por autenticação via telefone com
            código OTP.
          </p>
          <p className="mt-3">O usuário reconhece que:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>É responsável por proteger o acesso ao dispositivo</li>
            <li>Deve comunicar imediatamente suspeitas de uso indevido</li>
            <li>Não poderá compartilhar acesso com terceiros</li>
          </ul>
          <p className="mt-3">
            O alma4D poderá suspender ou encerrar contas em caso de:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Violação destes Termos</li>
            <li>Atividades suspeitas</li>
            <li>Uso fraudulento</li>
            <li>Descumprimento legal</li>
          </ul>
        </Card>

        {/* 18. Assinaturas */}
        <Card title="18. Assinaturas, Cobranças e Período de Teste">
          <p>
            O aplicativo poderá oferecer funcionalidades gratuitas, testes
            temporários ou assinaturas pagas.
          </p>
          <p className="mt-3">
            As cobranças, renovações e cancelamentos podem ser processados por:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Google Play Store</li>
            <li>Apple App Store</li>
          </ul>
          <p className="mt-3">
            As regras de cobrança, cancelamento, reembolso e renovação seguem
            também as políticas das respectivas plataformas.
          </p>
          <p className="mt-2">
            O usuário é responsável por acompanhar suas assinaturas ativas.
          </p>
        </Card>

        {/* 19. Propriedade intelectual */}
        <Card title="19. Propriedade Intelectual">
          <p>Todos os direitos relacionados ao aplicativo, incluindo:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Marca</li>
            <li>Layout</li>
            <li>Design</li>
            <li>Código-fonte</li>
            <li>Funcionalidades</li>
            <li>Interface</li>
            <li>Conteúdo institucional</li>
          </ul>
          <p className="mt-3">são protegidos pela legislação aplicável.</p>
          <p className="mt-2">
            Nenhum conteúdo poderá ser copiado, reproduzido, redistribuído ou
            explorado comercialmente sem autorização expressa.
          </p>
        </Card>

        {/* 20. Limitação de responsabilidade */}
        <Card title="20. Limitação de Responsabilidade">
          <p>
            Na extensão máxima permitida pela legislação aplicável, o alma4D não
            será responsável por:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Interrupções temporárias</li>
            <li>Falhas técnicas</li>
            <li>Instabilidades de internet</li>
            <li>Perda de dados causada por terceiros</li>
            <li>Conteúdo gerado automaticamente</li>
            <li>Decisões tomadas pelo usuário</li>
            <li>
              Danos indiretos, lucros cessantes ou prejuízos consequenciais
            </li>
          </ul>
          <p className="mt-3">
            O aplicativo é fornecido no estado em que se encontra (“as is”), sem
            garantias implícitas ou explícitas.
          </p>
        </Card>

        {/* 21. Isenção de garantias */}
        <Card title="21. Isenção de Garantias">
          <p>O alma4D não garante:</p>
          <ul className="mt-3 list-disc pl-6">
            <li>Disponibilidade contínua</li>
            <li>Ausência de falhas</li>
            <li>Compatibilidade total com todos os dispositivos</li>
            <li>Precisão absoluta de informações automatizadas</li>
            <li>Funcionamento ininterrupto</li>
          </ul>
        </Card>

        {/* 22. Alterações */}
        <Card title="22. Alterações deste Documento">
          <p>Este documento poderá ser atualizado periodicamente.</p>
          <p className="mt-2">
            As alterações entram em vigor após publicação no aplicativo ou em
            canal oficial.
          </p>
          <p className="mt-2">
            A continuidade de uso do aplicativo após alterações constitui
            aceitação integral da nova versão.
          </p>
        </Card>

        {/* 23. Lei aplicável e foro */}
        <Card title="23. Lei Aplicável e Foro">
          <p>
            Este documento será interpretado conforme a legislação brasileira.
          </p>
          <p className="mt-2">
            Fica eleito o foro da comarca do domicílio do controlador do
            aplicativo, salvo disposição legal em contrário.
          </p>
        </Card>

        {/* 24. Contato */}
        <Card title="24. Contato">
          <p>
            Para dúvidas, solicitações ou exercício de direitos relacionados aos
            Termos de Uso:
          </p>
          <p className="mt-2">
            <strong>E-mail: cliente@voss.digital</strong>
          </p>
        </Card>
      </section>
    </main>
  );
}
