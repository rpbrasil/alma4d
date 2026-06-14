"use client";

import { useEffect, useState } from "react";

type AlertaItem = {
  contrato_id?: string;
  cliente_id?: string;
  [key: string]: unknown;
};

type Props = {
  tipo: string;
  onClose: () => void;
};

export default function AlertasList({ tipo, onClose }: Props) {
  const [data, setData] = useState<AlertaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`/api/financeiro/alertas?tipo=${tipo}`);

        if (!r.ok) {
          console.error("Erro API:", r.status);
          setData([]);
          setLoading(false);
          return;
        }

        const text = await r.text();

        if (!text) {
          setData([]);
          setLoading(false);
          return;
        }

        const json = JSON.parse(text);

        setData(json.data ?? []);
      } catch (err) {
        console.error("Erro fetch alertas:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tipo]);


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-150 max-h-[80vh] overflow-auto">
        <h2 className="text-lg font-bold mb-4">Detalhes: {tipo}</h2>

        {loading && <p>Carregando...</p>}

        {!loading && data.length === 0 && <p>Nenhum registro</p>}

        {!loading &&
          data.map((item, i) => (
            <div key={i} className="border-b py-2 text-sm">
              <p>
                <b>Contrato:</b> {item.contrato_id}
              </p>
              <p>
                <b>Cliente:</b> {item.cliente_id}
              </p>
            </div>
          ))}

        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-brand text-white rounded"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
