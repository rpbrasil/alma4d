"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function LancamentoPage() {
  const [days, setDays] = useState(35);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Data de lançamento: 02/06/2026
    const launchDate = new Date("2026-06-02T00:00:00").getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = launchDate - now;

      if (diff <= 0) {
        setDays(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        return;
      }

      setDays(Math.floor(diff / (1000 * 60 * 60 * 24)));
      setHours(Math.floor((diff / (1000 * 60 * 60)) % 24));
      setMinutes(Math.floor((diff / 1000 / 60) % 60));
      setSeconds(Math.floor((diff / 1000) % 60));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-full bg-linear-to-b from-surface via-surface to-surface-muted dark:bg-linear-to-b dark:from-surface dark:via-surface dark:to-surface-muted flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        {/* Título */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl sm:text-6xl font-black text-brand">
            Em Breve
          </h1>
          <p className="text-xl sm:text-2xl text-brand-secondary font-bold">
            Uma grande novidade
          </p>
        </div>

        {/* Countdown */}
        <div className="bg-surface border-2 border-brand-secondary/30 rounded-2xl p-4 sm:p-8 shadow-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center justify-items-center">
            {/* Dias */}
            <div className="bg-brand-secondary/10 rounded-xl p-6 space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-brand-secondary">
                {String(days).padStart(2, "0")}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                Dias
              </p>
            </div>
            {/* Horas */}
            <div className="bg-brand/10 rounded-xl p-6 space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-brand">
                {String(hours).padStart(2, "0")}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                Horas
              </p>
            </div>
            {/* Minutos */}
            <div className="bg-brand-accent/10 rounded-xl p-6 space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-brand-accent">
                {String(minutes).padStart(2, "0")}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                Minutos
              </p>
            </div>
            {/* Segundos */}
            <div className="bg-brand-highlight/10 rounded-xl p-6 space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-brand-highlight">
                {String(seconds).padStart(2, "0")}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                Segundos
              </p>
            </div>
          </div>
        </div>

        {/* Texto Empolgante */}
        <div className="bg-linear-to-r from-brand/5 via-brand-secondary/5 to-brand-accent/5 border border-brand-secondary/20 rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand">
            🚀 Lançamento
          </h2>

          <p className="text-lg text-foreground/80 leading-relaxed">
            O <strong>livro Arquitetura Viva</strong> e o{" "}
            <strong>aplicativo alma4D</strong> chegam juntos para mudar a forma como você cuida de si mesmo.
          </p>

          <p className="text-lg text-foreground/80 leading-relaxed">
            Prepare-se para uma experiência integrada de autocuidado, com
            registro de avaliações, análises por I.A., gamificação e muito mais
            aguardam você.
          </p>

          <div className="pt-2 space-y-2">
            <p className="text-sm font-semibold text-brand-secondary">
              ✓ Lançamento oficial: 2 de junho de 2026
            </p>
            <p className="text-sm font-semibold text-brand-secondary">
              ✓ Disponível em App Store, Google Play e Amazon
            </p>
            <p className="text-sm font-semibold text-brand-secondary">
              ✓ Inscreva-se para receber atualizações
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-brand-secondary text-white px-8 py-4 rounded-xl font-bold hover:bg-brand-secondary/90 transition-all shadow-lg shadow-brand-secondary/30"
          >
            Voltar ao Método
          </Link>

          <Link
            href="/contato"
            className="inline-flex items-center justify-center border-2 border-brand-secondary text-brand-secondary px-8 py-4 rounded-xl font-bold hover:bg-brand-secondary/10 transition-all"
          >
            Falar com a Autora
          </Link>
        </div>
      </div>
    </main>
  );
}
