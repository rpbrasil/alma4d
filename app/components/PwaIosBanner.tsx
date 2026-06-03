"use client";

import { useLayoutEffect, useState } from "react";

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export default function PwaIosBanner() {
  const [show, setShow] = useState(false);

  useLayoutEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    const isIos = /iphone|ipad|ipod/.test(ua);

    const nav = navigator as NavigatorStandalone;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;

    // ✅ só depois da hidratação
      if (isIos && !isStandalone) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShow(true);
      }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50">
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-sm">
        <p className="text-slate-700">📱 Adicione este app à tela inicial</p>

        <p className="mt-1 text-xs text-slate-500">
          Toque em <strong>Compartilhar</strong> (⬆️) e depois em{" "}
          <strong>Adicionar à Tela de Início</strong>
        </p>

        <button
          onClick={() => setShow(false)}
          className="mt-2 text-xs text-brand font-semibold"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
