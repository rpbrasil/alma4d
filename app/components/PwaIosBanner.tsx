"use client";

import { useLayoutEffect, useState } from "react";

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

const STORAGE_KEY = "pwa_ios_banner_dismissed";

export default function PwaIosBanner() {
  const [show, setShow] = useState(false);

  useLayoutEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);

    const nav = navigator as NavigatorStandalone;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;

    const dismissed = localStorage.getItem(STORAGE_KEY);

    if (isIos && !isStandalone && !dismissed) {
      // ✅ evita setState síncrono (resolve ESLint)
      setTimeout(() => {
        setShow(true);
      }, 0);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

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
          onClick={handleDismiss}
          className="mt-2 text-xs text-brand font-semibold"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
