export default function Home() {
  return (
    <section className="text-center">
      <h2 className="text-4xl font-bold text-blue-700 mb-4">
        Bem-vindo ao alma4D
      </h2>
      <p className="text-lg text-gray-700 max-w-2xl mx-auto">
        Seu aplicativo para conexão humana, cuidado e presença digital.
      </p>

      <div className="mt-8">
        <a
          href="/download"
          className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
        >
          Baixar o App
        </a>
      </div>
    </section>
  );
}
