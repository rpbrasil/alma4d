"use client";

import { Suspense } from "react";
import AtivacaoWizard from "./AtivacaoWizard";

export default function AtivacaoWizardWrapper() {
  return (
    <Suspense fallback={<div />}>
      <AtivacaoWizard />
    </Suspense>
  );
}
