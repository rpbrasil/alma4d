import { Button } from "../components/Button";
export default function Sobre() {
  return (
    <section>
      <h2 className="text-3xl font-bold text-blue-700 mb-4">Sobre o alma4D</h2>
      <p className="text-gray-700 leading-relaxed">
        O alma4D é um aplicativo criado para aproximar pessoas, fortalecer
        vínculos e promover bem-estar emocional através de tecnologia simples e
        humana.
      </p>

      <Button variant="primary">Primário</Button>
      <Button variant="secondary">Secundário</Button>
      <Button variant="accent">CTA</Button>
      <Button variant="outline">Outline</Button>
    </section>
  );
}
