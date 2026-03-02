export default function Download() {
  return (
    <section>
      <h2 className="text-3xl font-bold text-blue-700 mb-4">
        Baixar o aplicativo
      </h2>
      <p className="text-gray-700 mb-6">Escolha sua plataforma preferida:</p>

      <div className="flex gap-4">
        <a className="bg-black text-white px-4 py-3 rounded-lg" href="#">
          App Store
        </a>
        <a className="bg-green-600 text-white px-4 py-3 rounded-lg" href="#">
          Google Play
        </a>
      </div>
    </section>
  );
}
