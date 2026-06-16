import BackFloatingButton from "@/components/public/BackFloatingButton";

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
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand">
          Termos de Uso — alma4D
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          <em>Última atualização: Abril de 2026</em>
        </p>
      </header>

      <section className="space-y-6 text-slate-700 text-sm leading-relaxed">
        <Card>
          <p>
            Estes Termos de Uso (“Termos”) regulam o acesso e a utilização do
            aplicativo <strong>alma4D</strong> (“Aplicativo”, “Plataforma” ou
            “Serviço”). Ao acessar, instalar, cadastrar-se ou utilizar o
            aplicativo, o usuário declara que leu, compreendeu e concorda com
            estes Termos e com a Política de Privacidade.
          </p>
        </Card>

        <Card title="1. Identificação do Serviço e Contato">
          <p>
            O Serviço é disponibilizado pelo responsável pelo aplicativo
            (“Controlador”). Para contato, suporte e comunicações oficiais:
          </p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
        </Card>

        <Card title="2. Aceitação e Condições Gerais">
          <p>
            Ao utilizar o aplicativo, o usuário concorda integralmente com estes
            Termos. Caso não concorde com qualquer disposição, deverá
            interromper imediatamente o uso do Serviço.
          </p>
          <p className="mt-3">
            O usuário também reconhece que o Serviço pode evoluir, sofrer
            atualizações, ajustes e mudanças de funcionalidades ao longo do
            tempo.
          </p>
        </Card>

        <Card title="3. Elegibilidade">
          <p>
            O usuário declara possuir capacidade legal para aceitar estes
            Termos. Se o usuário for menor de idade, o uso deverá ocorrer com
            autorização e supervisão de pais ou responsáveis legais, conforme a
            legislação aplicável.
          </p>
        </Card>

        <Card title="4. Uso Permitido e Condutas Proibidas">
          <p>
            O usuário compromete-se a utilizar o aplicativo de forma lícita,
            legítima e compatível com a finalidade do Serviço.
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
            <li>
              Interferir no funcionamento, segurança ou disponibilidade do
              Serviço
            </li>
            <li>
              Utilizar robôs, scripts ou automações para manipular o Serviço
            </li>
            <li>
              Reproduzir, copiar ou explorar economicamente o aplicativo sem
              autorização
            </li>
          </ul>
        </Card>

        <Card title="5. Conta, Acesso e Segurança">
          <p>
            O acesso ao aplicativo pode ocorrer por autenticação via telefone
            com código OTP (One‑Time Password). O usuário é responsável por:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Proteger o acesso ao dispositivo</li>
            <li>
              Manter a confidencialidade de informações e credenciais de acesso
            </li>
            <li>Comunicar imediatamente suspeitas de uso indevido</li>
            <li>Não compartilhar sua conta com terceiros</li>
          </ul>
        </Card>

        <Card title="6. Assinaturas, Cobranças e Funcionalidades Pagas">
          <p>
            O aplicativo pode oferecer funcionalidades gratuitas, períodos de
            teste e/ou assinaturas pagas.
          </p>
          <p className="mt-3">
            Cobranças, renovações e cancelamentos podem ser processados pelas
            plataformas <strong>Google Play Store</strong>,
            <strong>Apple App Store</strong> ou na plataforma alma4D, conforme a versao do aplicativo ou políticas das respectivas lojas. O usuário é responsável por
            acompanhar suas assinaturas ativas.
          </p>
        </Card>

        <Card title="7. Cancelamento e Reembolsos">
          <p>
            Cancelamentos, reembolsos e estornos seguem as políticas da loja
            onde a assinatura foi contratada (Google Play Store ou Apple App
            Store), além de normas legais aplicáveis.
          </p>
        </Card>

        <Card title="8. Uso de Inteligência Artificial e Sistemas Automatizados">
          <p>
            O aplicativo pode utilizar sistemas automatizados, incluindo
            inteligência artificial, para geração de conteúdo, respostas,
            sugestões e personalização da experiência.
          </p>
          <p className="mt-3">
            As respostas geradas por sistemas automatizados:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Possuem caráter exclusivamente informativo</li>
            <li>
              Podem conter limitações, imprecisões ou interpretações incorretas
            </li>
            <li>Não substituem profissionais habilitados</li>
            <li>
              Não constituem aconselhamento médico, psicológico, jurídico,
              financeiro ou profissional
            </li>
          </ul>
          <p className="mt-3">
            O usuário reconhece que decisões tomadas com base no conteúdo do
            aplicativo são de sua exclusiva responsabilidade.
          </p>
        </Card>

        <Card title="9. Limitação Médica, Clínica e Profissional">
          <p>
            O alma4D não constitui plataforma médica, hospitalar, clínica,
            psicológica, terapêutica ou serviço de telemedicina.
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Não realiza diagnóstico clínico</li>
            <li>Não prescreve medicamentos</li>
            <li>Não mantém prontuário médico</li>
            <li>Não substitui acompanhamento profissional</li>
          </ul>
          <p className="mt-3">
            Em caso de sintomas físicos, sofrimento emocional, emergências ou
            necessidades clínicas, o usuário deverá buscar atendimento junto a
            profissionais habilitados ou serviços especializados.
          </p>
        </Card>

        <Card title="10. Conteúdo, Precisão e Responsabilidade do Usuário">
          <p>
            O conteúdo disponibilizado no aplicativo é fornecido para fins
            informativos e de apoio à experiência do usuário. O usuário é
            responsável:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Pela veracidade das informações fornecidas</li>
            <li>Pela segurança do seu dispositivo</li>
            <li>Pelo uso adequado do aplicativo</li>
            <li>Pelas decisões tomadas com base nas informações disponíveis</li>
          </ul>
        </Card>

        <Card title="11. Propriedade Intelectual">
          <p>
            Todos os direitos relacionados ao aplicativo, incluindo marca,
            layout, design, código-fonte, funcionalidades, interface e conteúdo
            institucional, são protegidos pela legislação aplicável.
          </p>
          <p className="mt-2">
            É proibida a cópia, reprodução, redistribuição ou exploração
            comercial sem autorização expressa.
          </p>
        </Card>

        <Card title="12. Suspensão e Encerramento">
          <p>
            O alma4D poderá suspender ou encerrar contas e/ou restringir o
            acesso ao Serviço em caso de:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Violação destes Termos</li>
            <li>Atividades suspeitas ou uso fraudulento</li>
            <li>Descumprimento legal</li>
            <li>Necessidade de proteção do Serviço e de seus usuários</li>
          </ul>
        </Card>

        <Card title="13. Isenção de Garantias">
          <p>
            O Serviço é fornecido no estado em que se encontra (“as is”), sem
            garantias implícitas ou explícitas, incluindo disponibilidade
            contínua, ausência de falhas, compatibilidade total com todos os
            dispositivos ou precisão absoluta de conteúdos.
          </p>
        </Card>

        <Card title="14. Limitação de Responsabilidade">
          <p>
            Na extensão máxima permitida pela legislação aplicável, o alma4D não
            será responsável por interrupções, falhas técnicas, instabilidades
            de internet, perda de dados causada por terceiros, conteúdo gerado
            automaticamente ou decisões tomadas pelo usuário.
          </p>
          <p className="mt-2">
            Também não será responsável por danos indiretos, lucros cessantes ou
            prejuízos consequenciais.
          </p>
        </Card>

        <Card title="15. Alterações destes Termos">
          <p>
            Estes Termos poderão ser atualizados periodicamente. A continuidade
            do uso do aplicativo após alterações constitui aceitação integral da
            nova versão.
          </p>
          <p className="mt-2 italic">Última atualização: Abril de 2026</p>
        </Card>

        <Card title="16. Lei Aplicável e Foro">
          <p>
            Este documento será interpretado conforme a legislação brasileira.
          </p>
          <p className="mt-2">
            Eventuais controvérsias relacionadas a estes Termos serão tratadas,
            sempre que possível, no foro do domicílio do controlador do
            aplicativo, <strong>salvo disposição legal em contrário</strong>.
          </p>
        </Card>

        <Card title="17. Contato">
          <p>
            Para dúvidas, solicitações ou comunicações relacionadas a estes
            Termos:
          </p>
          <p className="mt-2">
            <strong>cliente@voss.digital</strong>
          </p>
        </Card>
      </section>
      <BackFloatingButton />
    </main>
  );
}
