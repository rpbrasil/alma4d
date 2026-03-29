import React from "react";

interface PhoneMockupProps {
  videoSrc: string;
}

const PhoneMockup: React.FC<PhoneMockupProps> = ({ videoSrc }) => {
  return (
    <div className="relative flex items-center justify-center py-10">
      {/* 1. Glow de Fundo (Aura da Marca alma4D) */}
      <div className="absolute w-400px] h-400px] bg-#019499]/10 blur-100px] rounded-full -z-10 animate-pulse" />

      {/* 2. O Badge "LIVE DEMO" */}
      <div className="absolute -top-0 -right-0 md:-right-8 z-30 bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#030870]">
          Live Demo
        </span>
      </div>

      {/* 3. Estrutura do Celular (Premium Dark) */}
      <div className="relative group transition-transform duration-700 hover:scale-[1.02]">
        {/* Corpo do Aparelho */}
        <div className="relative mx-auto border-[#1A1A1B] bg-[#1A1A1B] border-[12px] rounded-[3rem] h-[580px] w-[285px] shadow-[0_20px_50px_rgba(3,8,112,0.15)] ring-1 ring-white/10">
          {/* Botões Laterais Realistas */}
          <div className="h-[40px] w-[3px] bg-[#1A1A1B] absolute -left-[15px] top-[100px] rounded-l-lg border-l border-white/5" />
          <div className="h-[40px] w-[3px] bg-[#1A1A1B] absolute -left-[15px] top-[150px] rounded-l-lg border-l border-white/5" />
          <div className="h-[60px] w-[3px] bg-[#1A1A1B] absolute -right-[15px] top-[130px] rounded-r-lg border-r border-white/5" />

          {/* Ilha Dinâmica (Notch) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-full z-20 flex items-center justify-center border border-white/5">
            <div className="w-1 h-1 bg-[#1A1A1B] rounded-full ml-auto mr-2 shadow-inner" />
          </div>

          {/* Tela (O Vídeo) */}
          <div className="rounded-[2.2rem] overflow-hidden w-full h-full bg-black relative z-10 shadow-inner">
            <video
              className="w-full h-full object-cover"
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            >
              Seu navegador não suporta vídeos.
            </video>
          </div>
        </div>

        {/* 4. Sombra de Chão (Efeito 3D) */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-6 bg-[#030870]/10 blur-2xl rounded-[100%] -z-10" />
      </div>
    </div>
  );
};

export default PhoneMockup;
