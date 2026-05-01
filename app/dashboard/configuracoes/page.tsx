"use client";

import {
  Settings as SettingsIcon,
  Save,
  Bell,
  Lock,
  Palette,
} from "lucide-react";
import { useState } from "react";

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState({
    nomeEmpresa: "Sua Empresa",
    email: "contato@empresa.com",
    notificacoes: true,
    tema: "light",
  });

  const handleSave = () => {
    // TODO: Save settings
    alert("Configurações salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Settings Sections */}
      <div className="grid gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="text-[#030870]" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Geral</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={settings.nomeEmpresa}
                onChange={(e) =>
                  setSettings({ ...settings, nomeEmpresa: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de Contato
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) =>
                  setSettings({ ...settings, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-[#019499]" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Notificações</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Ativar Notificações</p>
              <p className="text-sm text-gray-600">
                Receba atualizações importantes
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notificacoes}
              onChange={(e) =>
                setSettings({ ...settings, notificacoes: e.target.checked })
              }
              className="w-5 h-5 rounded"
            />
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Aparência</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema
            </label>
            <select
              value={settings.tema}
              onChange={(e) =>
                setSettings({ ...settings, tema: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-red-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Segurança</h2>
          </div>

          <button className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            <Lock size={16} />
            Alterar Senha
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 bg-[#030870] text-white px-6 py-2 rounded-lg hover:bg-[#020556] transition-colors"
        >
          <Save size={20} />
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
