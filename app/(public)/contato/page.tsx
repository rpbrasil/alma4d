"use client";

import React, { SubmitEventHandler, useState } from "react";

export const dynamic = "force-dynamic";

export default function Contato() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      nome: String(formData.get("nome") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      mensagem: String(formData.get("mensagem") || "").trim(),
    };

    if (!payload.nome || !payload.email || !payload.mensagem) {
      setStatus("error");
      setMessage("Por favor, preencha todos os campos.");
      return;
    }

    try {
      setSending(true);

      const res = await fetch(
        "https://ljpiesdyfhukffwlujfy.supabase.co/functions/v1/contact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(json?.error ?? "Erro ao enviar mensagem.");
        return;
      }

      setStatus("ok");
      setMessage("Mensagem enviada com sucesso!");
      form.reset();
    } catch {
      setStatus("error");
      setMessage("Erro de rede ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="max-w-xl mx-auto text-center min-h-full flex flex-col justify-center">
      <h2 className="text-3xl font-bold text-blue-700 mb-2">Contato</h2>

      <p className="text-gray-700 mb-6">
        Envie uma mensagem para nossa equipe.
      </p>

      <form
        onSubmit={onSubmit}
        className="max-w-md mx-auto flex flex-col gap-4 text-left"
      >
        <input
          name="nome"
          type="text"
          placeholder="Nome"
          required
          className="border px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#019499]/40"
        />

        <input
          name="email"
          type="email"
          placeholder="E-mail"
          required
          className="border px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#019499]/40"
        />

        <textarea
          name="mensagem"
          placeholder="Mensagem"
          required
          className="border px-4 py-2 rounded h-32 resize-y focus:outline-none focus:ring-2 focus:ring-[#019499]/40"
        />

        <button
          type="submit"
          disabled={sending}
          className="text-white px-4 py-2 rounded font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#019499" }}
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>

        {status !== "idle" && (
          <p
            className={
              status === "ok"
                ? "text-sm text-emerald-700 text-center"
                : "text-sm text-red-700 text-center"
            }
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}