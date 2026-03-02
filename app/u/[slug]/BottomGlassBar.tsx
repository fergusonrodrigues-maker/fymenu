"use client";

export default function BottomGlassBar({ isMaximized = false }: { isMaximized?: boolean }) {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-2 pointer-events-none">

      {/* Container Principal Mobile (max 360px) */}
      <div
        className={`relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto flex justify-center
        ${isMaximized
          ? "w-[90vw] max-w-[340px] h-[320px] rounded-[32px]"
          : "w-[96vw] max-w-[360px] h-[72px] rounded-[22px]"
        }`}
      >

        {/* Logo Central (desliza suave entre os estados) */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex justify-center items-center bg-white shadow-xl z-20
          ${isMaximized
            ? "-top-[50px] w-[110px] h-[110px] rounded-[30px]"
            : "-top-3 w-[88px] h-[88px] rounded-[26px]"
          }`}
        >
          <div className={`flex justify-center items-center bg-[#1a9cff] overflow-hidden transition-all duration-700
            ${isMaximized ? "w-[98px] h-[98px] rounded-[24px]" : "w-[78px] h-[78px] rounded-[20px]"}`}>
            {/* Substitua pelo <img> do seu bucket quando disponível */}
            <span className="text-white text-3xl font-black">Â</span>
          </div>
        </div>

        {/* ESTADO 1: HORIZONTAL — desaparece ao maximizar */}
        <div className={`absolute inset-0 flex items-center justify-between px-2 gap-1.5 transition-opacity duration-300
          ${isMaximized ? "opacity-0 pointer-events-none" : "opacity-100 delay-300 pointer-events-auto"}`}>

          {/* Grupo esquerda */}
          <div className="flex gap-1.5">
            <button className="flex justify-center items-center w-[52px] h-[52px] bg-[#e63232] rounded-[16px] active:scale-95 transition-transform">
              📍
            </button>
            <div className="flex flex-col justify-center items-start w-[96px] h-[52px] bg-white text-black px-2.5 rounded-[16px]">
              <strong className="text-[11px] font-black leading-tight tracking-tight">Goiânia - GO</strong>
              <span className="text-[9px] font-medium tracking-tight leading-none mt-0.5">são francisco</span>
            </div>
          </div>

          {/* Espaço central para a logo não cobrir os botões */}
          <div className="w-[70px] shrink-0" />

          {/* Grupo direita */}
          <div className="flex gap-1.5">
            <button className="flex justify-center items-center w-[52px] h-[52px] bg-[#1db954] rounded-[16px] active:scale-95 transition-transform">
              💬
            </button>
            <button className="flex justify-center items-center w-[52px] h-[52px] bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] rounded-[16px] active:scale-95 transition-transform">
              📷
            </button>
          </div>
        </div>

        {/* ESTADO 2: VERTICAL MAXIMIZADO — aparece ao maximizar */}
        <div className={`absolute inset-0 pt-[70px] pb-4 px-4 flex flex-col justify-center gap-2.5 transition-opacity duration-300
          ${isMaximized ? "opacity-100 delay-300 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>

          <button className="flex items-center w-full h-[52px] bg-[#1db954] rounded-[16px] px-4 active:scale-95 transition-transform">
            <span className="text-lg mr-3">💬</span>
            <span className="text-white font-bold text-[14px]">Pedir no WhatsApp</span>
          </button>

          <button className="flex items-center w-full h-[52px] bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] rounded-[16px] px-4 active:scale-95 transition-transform">
            <span className="text-lg mr-3">📷</span>
            <span className="text-white font-bold text-[14px]">Siga nosso Instagram</span>
          </button>

          <button className="flex items-center w-full h-[52px] bg-[#e63232] rounded-[16px] px-4 active:scale-95 transition-transform">
            <span className="text-lg mr-3">📍</span>
            <span className="text-white font-bold text-[14px]">Como Chegar (Maps)</span>
          </button>

          <div className="flex flex-col justify-center items-center w-full h-[52px] bg-white text-black rounded-[16px]">
            <strong className="text-[13px] font-black leading-tight tracking-tight">Goiânia - GO</strong>
            <span className="text-[11px] font-medium tracking-tight leading-none mt-0.5">unidade: bairro são francisco</span>
          </div>
        </div>

      </div>
    </div>
  );
}
