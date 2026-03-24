import dynamic from "next/dynamic";

const AtivacaoWizardWrapper = dynamic(
  () => import("@/app/components/ativacao/AtivacaoWizardWrapper"),
  { ssr: false },
);

export default function Page() {
  return <AtivacaoWizardWrapper />;
}
