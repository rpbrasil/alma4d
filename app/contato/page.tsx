export default function Contato() {
  return (
    <section>
      <h2 className="text-3xl font-bold text-blue-700 mb-4">Contato</h2>
      <p className="text-gray-700 mb-6">
        Envie uma mensagem para nossa equipe.
      </p>

      <form className="max-w-md flex flex-col gap-4">
        <input
          type="text"
          placeholder="Seu nome"
          className="border px-4 py-2 rounded"
        />
        <input
          type="email"
          placeholder="Seu e-mail"
          className="border px-4 py-2 rounded"
        />
        <textarea
          placeholder="Sua mensagem"
          className="border px-4 py-2 rounded h-32"
        />
        <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
          Enviar
        </button>
      </form>
    </section>
  );
}
