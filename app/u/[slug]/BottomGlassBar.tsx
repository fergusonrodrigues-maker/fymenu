"use client";

const IconMaps = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
  </svg>
);

const IconWhatsApp = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const IconInstagram = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const glassBarStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.52)",
  backdropFilter: "blur(30px) saturate(200%) brightness(0.85)",
  WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(0.85)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  boxShadow: [
    "0 10px 40px rgba(0,0,0,0.7)",
    "0 2px 8px rgba(0,0,0,0.5)",
    "inset 0 1px 0 rgba(255,255,255,0.07)",
    "inset 0 -1px 0 rgba(0,0,0,0.4)",
  ].join(", "),
};

export default function BottomGlassBar({ isMaximized = false }: { isMaximized?: boolean }) {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-2 pointer-events-none">

      <div
        className={`relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto flex justify-center
        ${isMaximized
          ? "w-[90vw] max-w-[340px] h-[320px] rounded-[32px]"
          : "w-[96vw] max-w-[360px] h-[72px] rounded-[22px]"
        }`}
        style={glassBarStyle}
      >
        {/* Reflexo interno (shimmer) */}
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none" style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 45%, rgba(255,255,255,0.02) 100%)",
        }} />

        {/* Logo Central (absoluta — anima entre os dois estados) */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isMaximized ? "-top-[50px]" : "-top-[18px]"}`}
        >
          {/* Anel dark glass (visível no estado minimizado) */}
          <div style={{
            padding: 5,
            borderRadius: 24,
            background: isMaximized ? "rgba(255,255,255,1)" : "rgba(20, 20, 20, 0.65)",
            backdropFilter: "blur(12px)",
            border: "2px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)",
            transition: "background 700ms cubic-bezier(0.34,1.56,0.64,1), width 700ms, height 700ms",
          }}>
            <div style={{
              width: isMaximized ? 98 : 76,
              height: isMaximized ? 98 : 76,
              borderRadius: isMaximized ? 24 : 20,
              background: "#1E88E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 6px 20px rgba(30,136,229,0.5)",
              transition: "width 700ms cubic-bezier(0.34,1.56,0.64,1), height 700ms, border-radius 700ms",
            }}>
              {/* Substitua pelo <img> do bucket */}
              <span style={{ color: "white", fontSize: 34, fontWeight: 900, fontStyle: "italic" }}>Â</span>
            </div>
          </div>
        </div>

        {/* ── ESTADO MINIMIZADO ── */}
        <div
          className={`flex items-center gap-1.5 px-2 transition-opacity duration-300
          ${isMaximized ? "opacity-0 pointer-events-none" : "opacity-100 delay-300 pointer-events-auto"}`}
        >
          {/* Maps */}
          <button
            className="flex-shrink-0 flex items-center justify-center rounded-[16px] active:scale-95 transition-transform"
            style={{ width: 52, height: 52, background: "#E53935", boxShadow: "0 4px 14px rgba(229,57,53,0.45)" }}
          >
            <IconMaps />
          </button>

          {/* Endereço */}
          <div
            className="flex-shrink-0 flex flex-col justify-center items-start rounded-[16px]"
            style={{ width: 96, height: 52, background: "rgba(255,255,255,0.93)", padding: "0 10px", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>Goiânia - Go</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: "#777", whiteSpace: "nowrap" }}>unidade:</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>são francisco</span>
          </div>

          {/* Espaço reservado para a logo */}
          <div className="flex-shrink-0" style={{ width: 70 }} />

          {/* WhatsApp */}
          <button
            className="flex-shrink-0 flex items-center justify-center rounded-[16px] active:scale-95 transition-transform"
            style={{ width: 52, height: 52, background: "#25D366", boxShadow: "0 4px 14px rgba(37,211,102,0.45)" }}
          >
            <IconWhatsApp />
          </button>

          {/* Instagram */}
          <button
            className="flex-shrink-0 flex items-center justify-center rounded-[16px] active:scale-95 transition-transform"
            style={{
              width: 52, height: 52,
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              boxShadow: "0 4px 14px rgba(220,39,67,0.4)",
            }}
          >
            <IconInstagram />
          </button>
        </div>

        {/* ── ESTADO MAXIMIZADO ── */}
        <div
          className={`absolute inset-0 pt-[70px] pb-4 px-4 flex flex-col justify-center gap-2.5 transition-opacity duration-300
          ${isMaximized ? "opacity-100 delay-300 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        >
          <button className="flex items-center w-full h-[52px] rounded-[16px] px-4 active:scale-95 transition-transform gap-3"
            style={{ background: "#25D366", boxShadow: "0 4px 14px rgba(37,211,102,0.45)" }}>
            <IconWhatsApp />
            <span className="text-white font-bold text-[14px]">Pedir no WhatsApp</span>
          </button>

          <button className="flex items-center w-full h-[52px] rounded-[16px] px-4 active:scale-95 transition-transform gap-3"
            style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
            <IconInstagram />
            <span className="text-white font-bold text-[14px]">Siga nosso Instagram</span>
          </button>

          <button className="flex items-center w-full h-[52px] rounded-[16px] px-4 active:scale-95 transition-transform gap-3"
            style={{ background: "#E53935", boxShadow: "0 4px 14px rgba(229,57,53,0.45)" }}>
            <IconMaps />
            <span className="text-white font-bold text-[14px]">Como Chegar (Maps)</span>
          </button>

          <div className="flex flex-col justify-center items-center w-full h-[52px] rounded-[16px]"
            style={{ background: "rgba(255,255,255,0.93)" }}>
            <strong className="text-[13px] font-black leading-tight tracking-tight text-black">Goiânia - GO</strong>
            <span className="text-[11px] font-medium tracking-tight text-black/60">unidade: bairro são francisco</span>
          </div>
        </div>

      </div>
    </div>
  );
}
