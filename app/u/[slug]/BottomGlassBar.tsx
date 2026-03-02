"use client";

export default function BottomGlassBar({ isMaximized = false }: { isMaximized?: boolean }) {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-2 pointer-events-none">

      {/* Container Principal que Anima (Estica e Encolhe) */}
      <div
        className={`relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto flex justify-center
        ${isMaximized
          ? "w-[90vw] max-w-[340px] h-[350px] rounded-[36px]"
          : "w-[96vw] sm:w-max h-[80px] rounded-[24px]"
        }`}
      >

        {/* Logo (absoluta para deslizar suave entre os dois estados) */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex justify-center items-center bg-white shadow-xl z-20
          ${isMaximized
            ? "-top-[56px] w-[124px] h-[124px] rounded-[34px]"
            : "-top-3 w-[104px] h-[104px] rounded-[30px]"
          }`}
        >
          <div className={`flex justify-center items-center bg-[#1a9cff] overflow-hidden transition-all duration-700
            ${isMaximized ? "w-[110px] h-[110px] rounded-[26px]" : "w-[92px] h-[92px] rounded-[24px]"}`}>
            {/* Substitua pelo <img> do seu bucket quando disponível */}
            <span className="text-white text-4xl font-black">Â</span>
          </div>
        </div>

        {/* ESTADO 1: HORIZONTAL — desaparece ao maximizar */}
        <div className={`absolute inset-0 flex items-center justify-between px-2 gap-2 transition-opacity duration-300
          ${isMaximized ? "opacity-0 pointer-events-none" : "opacity-100 delay-300 pointer-events-auto"}`}>

          {/* Grupo esquerda */}
          <div className="flex gap-2">
            <button className="flex justify-center items-center w-[56px] sm:w-[64px] h-[64px] bg-[#e63232] rounded-[18px] active:scale-95 transition-transform">
              📍
            </button>
            <div className="flex flex-col justify-center items-start w-[110px] sm:w-[140px] h-[64px] bg-white text-black px-3 rounded-[18px]">
              <strong className="text-[12px] sm:text-[14px] font-black leading-tight tracking-tight">Goiânia - GO</strong>
              <span className="text-[10px] sm:text-[12px] font-medium tracking-tight leading-none mt-1">bairro são francisco</span>
            </div>
          </div>

          {/* Espaço central para a logo absoluta não cobrir os botões */}
          <div className="w-[70px] sm:w-[90px] shrink-0" />

          {/* Grupo direita */}
          <div className="flex gap-2">
            <button className="flex justify-center items-center w-[56px] sm:w-[64px] h-[64px] bg-[#1db954] rounded-[18px] active:scale-95 transition-transform">
              💬
            </button>
            <button className="flex justify-center items-center w-[56px] sm:w-[64px] h-[64px] bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] rounded-[18px] active:scale-95 transition-transform">
              📷
            </button>
          </div>
        </div>

        {/* ESTADO 2: VERTICAL MAXIMIZADO — aparece ao maximizar */}
        <div className={`absolute inset-0 pt-[80px] pb-5 px-5 flex flex-col justify-center gap-3 transition-opacity duration-300
          ${isMaximized ? "opacity-100 delay-300 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>

          <button className="flex items-center w-full h-[56px] bg-[#1db954] rounded-[18px] px-4 active:scale-95 transition-transform">
            <span className="text-xl mr-3">💬</span>
            <span className="text-white font-bold text-[15px]">Pedir no WhatsApp</span>
          </button>

          <button className="flex items-center w-full h-[56px] bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] rounded-[18px] px-4 active:scale-95 transition-transform">
            <span className="text-xl mr-3">📷</span>
            <span className="text-white font-bold text-[15px]">Siga nosso Instagram</span>
          </button>

          <button className="flex items-center w-full h-[56px] bg-[#e63232] rounded-[18px] px-4 active:scale-95 transition-transform">
            <span className="text-xl mr-3">📍</span>
            <span className="text-white font-bold text-[15px]">Como Chegar (Maps)</span>
          </button>

          <div className="flex flex-col justify-center items-center w-full h-[56px] bg-white text-black rounded-[18px]">
            <strong className="text-[14px] font-black leading-tight tracking-tight">Goiânia - GO</strong>
            <span className="text-[12px] font-medium tracking-tight leading-none">unidade: bairro são francisco</span>
          </div>
        </div>

      </div>
    </div>
  );
}
