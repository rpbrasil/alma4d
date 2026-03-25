"use client";

import React from "react";

export default function Contato() {
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

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

      const endpoint = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT!;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        setStatus("error");
        setMessage(data?.error || "Falha ao enviar. Tente novamente.");
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
  }

  return (
    <section className="max-w-xl mx-auto text-center">
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
          className="
          text-white px-4 py-2 rounded font-semibold transition
          disabled:opacity-60 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-[#019499]/40
        "
          style={{ backgroundColor: "#019499" }}
          onMouseOver={(e) => {
            if (!sending) e.currentTarget.style.backgroundColor = "#017f83";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#019499";
          }}
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
            role="status"
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
