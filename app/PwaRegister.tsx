"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("✅ SW registrado");
        })
        .catch((err) => {
          console.error("❌ SW erro:", err);
        });
    }
  }, []);

  return null;
}
