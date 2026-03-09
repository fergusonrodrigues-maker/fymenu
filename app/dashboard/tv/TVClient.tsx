"use client";

import { useEffect, useRef, useState } from "react";

type TvItem = {
  id: string;
  name: string;
  description?: string | null;
  base_price?: number | null;
  price_type?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
};

type Props = {
  items: TvItem[];
  unitName: string;
  logoUrl?: string | null;
};

function moneyBR(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default function TvClient({ items, unitName, logoUrl }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = items[index % items.length];

  // Oculta UI após 3s de inatividade
  function resetUiTimer() {
    setShowUI(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => setShowUI(false), 3000);
  }

  useEffect(() => {
    resetUiTimer();
    return () => { if (uiTimerRef.current) clearTimeout(uiTimerRef.current); };
  }, []);

  // Reinicia vídeo ao trocar
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    if (!paused) v.play().catch(() => {});
  }, [index]);

  function goNext() {
    setIndex(i => (i + 1) % items.length);
  }

  function goPrev() {
    setIndex(i => (i - 1 + items.length) % items.length);
  }

  function togglePause() {
    const v = videoRef.current;
    if (!v) return;
    if (paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }

  // Teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      resetUiTimer();
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") { e.preventDefault(); togglePause(); }
      else if (e.key === "Escape") window.close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, index]);

  if (!current) {
    return (
      <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif", fontSize: 18 }}>
        Nenhum vídeo cadastrado nos produtos.
      </div>
    );
  }

  const priceDisplay = current.price_type === "variable"
    ? "A partir de R$ —"
    : current.base_price != null ? moneyBR(Number(current.base_price)) : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", cursor: showUI ? "default" : "none" }}
      onMouseMove={resetUiTimer}
      onClick={resetUiTimer}
    >
      {/* ── VÍDEO ── */}
      <video
        ref={videoRef}
        key={current.id}
        src={current.video_url}
        autoPlay
        muted
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        onEnded={goNext}
      />

      {/* Thumbnail fallback enquanto vídeo carrega */}
      {current.thumbnail_url && (
        <img
          src={current.thumbnail_url}
          alt={current.name}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            zIndex: 0,
          }}
        />
      )}

      {/* Gradiente de legibilidade */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* ── LOGO + NOME (topo esquerdo) ── */}
      <div style={{
        position: "absolute", top: 32, left: 40, zIndex: 10,
        display: "flex", alignItems: "center", gap: 14,
        opacity: showUI ? 1 : 0, transition: "opacity .4s ease",
      }}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={unitName} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "1px solid rgba(255,255,255,0.18)" }} />
        )}
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: "-0.4px", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          {unitName}
        </span>
      </div>

      {/* ── CONTADOR (topo direito) ── */}
      <div style={{
        position: "absolute", top: 36, right: 40, zIndex: 10,
        color: "rgba(255,255,255,0.55)", fontSize: 16, fontWeight: 600,
        opacity: showUI ? 1 : 0, transition: "opacity .4s ease",
      }}>
        {(index % items.length) + 1} / {items.length}
      </div>

      {/* ── INFO DO PRODUTO (rodapé) ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: "0 48px 48px",
        opacity: showUI ? 1 : 0, transition: "opacity .4s ease",
      }}>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(28px,4vw,56px)", lineHeight: 1.1, marginBottom: 8, textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
          {current.name}
        </div>
        {current.description && (
          <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500, fontSize: "clamp(14px,2vw,20px)", marginBottom: 10, maxWidth: 600 }}>
            {current.description}
          </div>
        )}
        {priceDisplay && (
          <div style={{ color: "#00ffae", fontWeight: 900, fontSize: "clamp(22px,3vw,40px)", textShadow: "0 0 20px rgba(0,255,174,0.5)" }}>
            {priceDisplay}
          </div>
        )}
      </div>

      {/* ── CONTROLES (UI ao mover o mouse) ── */}
      <div style={{
        position: "absolute", bottom: 48, right: 48, zIndex: 10,
        display: "flex", gap: 12,
        opacity: showUI ? 1 : 0, transition: "opacity .4s ease",
      }}>
        <CtrlBtn onClick={goPrev} title="Anterior (←)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </CtrlBtn>
        <CtrlBtn onClick={togglePause} title={paused ? "Retomar (Espaço)" : "Pausar (Espaço)"}>
          {paused
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>
          }
        </CtrlBtn>
        <CtrlBtn onClick={goNext} title="Próximo (→)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </CtrlBtn>
      </div>

      {/* ── HINT DE TECLADO ── */}
      {showUI && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, color: "rgba(255,255,255,0.30)", fontSize: 12, letterSpacing: 0.3,
          whiteSpace: "nowrap",
        }}>
          ← → trocar · Espaço pausar · Esc fechar
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 48, height: 48, borderRadius: 14,
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.20)",
        color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)",
        transition: "background .15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
    >
      {children}
    </button>
  );
}
