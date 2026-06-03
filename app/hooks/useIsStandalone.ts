import { useState } from "react";

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

function detectStandalone() {
  if (typeof window === "undefined") return false;

  const nav = navigator as NavigatorStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function useIsStandalone() {
  const [isStandalone] = useState(() => detectStandalone());

  return isStandalone;
}
