import { Mail, Phone, Linkedin, Instagram, Globe } from "lucide-react";

export interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
  bio_resumida?: string;
  foto_url?: string;
  calendly_url?: string;
  website_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  whatsapp_url?: string;
  ativo: boolean;
  created_at: string;
}

interface ProfessionalCardProps {
  profissional: Profissional;
  onClick?: () => void;
}

export function ProfessionalCard({
  profissional,
  onClick,
}: ProfessionalCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Header */}
      <div className="h-24 bg-gradient-to-r from-[#030870] to-[#019499]" />

      {/* Content */}
      <div className="px-6 py-4 -mt-12 relative">
        {/* Avatar */}
        {profissional.foto_url ? (
          <img
            src={profissional.foto_url}
            alt={profissional.nome}
            className="w-20 h-20 rounded-full border-4 border-white shadow mb-3 object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full border-4 border-white shadow mb-3 bg-gray-300 flex items-center justify-center text-gray-600 text-2xl font-bold">
            {profissional.nome.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Info */}
        <h3 className="text-lg font-bold text-gray-900">{profissional.nome}</h3>
        <p className="text-sm text-[#019499] font-medium">
          {profissional.especialidade}
        </p>

        {profissional.bio_resumida && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {profissional.bio_resumida}
          </p>
        )}

        {/* Social Links */}
        <div className="flex gap-2 mt-4">
          {profissional.whatsapp_url && (
            <a
              href={profissional.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700"
            >
              <Phone size={18} />
            </a>
          )}
          {profissional.email && (
            <a
              href={`mailto:${profissional.email}`}
              className="text-red-600 hover:text-red-700"
            >
              <Mail size={18} />
            </a>
          )}
          {profissional.linkedin_url && (
            <a
              href={profissional.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              <Linkedin size={18} />
            </a>
          )}
          {profissional.instagram_url && (
            <a
              href={profissional.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:text-pink-700"
            >
              <Instagram size={18} />
            </a>
          )}
          {profissional.website_url && (
            <a
              href={profissional.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-700"
            >
              <Globe size={18} />
            </a>
          )}
        </div>

        {/* Status */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              profissional.ativo
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {profissional.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>
    </div>
  );
}
