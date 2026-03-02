"use client";

import React from "react";

const IconMaps = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
  </svg>
);

const IconWhatsApp = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const IconInstagram = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const glassStyle: React.CSSProperties = {
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
    <div style={{
      position: "fixed",
      bottom: 20,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 50,
      padding: "0 4px",
      pointerEvents: "none",
      // sobe do bottom quando isMaximized, escondido embaixo quando não
      transform: isMaximized ? "translateY(0)" : "translateY(150px)",
      transition: "transform 0.65s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{
        ...glassStyle,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 26,
        width: "min(92vw, 400px)",
        pointerEvents: isMaximized ? "auto" : "none",
      }}>
        {/* Shimmer interno */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 45%, rgba(255,255,255,0.02) 100%)",
        }} />

        {/* 1. Maps — quadrado esquerdo */}
        <button style={{
          flexShrink: 0, width: 52, height: 52, borderRadius: 16, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#E53935", boxShadow: "0 4px 14px rgba(229,57,53,0.45)",
          cursor: "pointer",
        }}>
          <IconMaps />
        </button>

        {/* 2. Endereço — retângulo esquerdo */}
        <div style={{
          flexShrink: 0, width: 108, height: 52, borderRadius: 16,
          display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
          padding: "0 12px",
          background: "rgba(255,255,255,0.93)", boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>Goiânia - Go</span>
          <span style={{ fontSize: 9,  fontWeight: 500, color: "#777", whiteSpace: "nowrap" }}>unidade:</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>são francisco</span>
        </div>

        {/* 3. Logo central — elevated, fora do fluxo flex */}
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          top: -18, zIndex: 20, pointerEvents: "auto",
        }}>
          <div style={{
            padding: 5, borderRadius: 22,
            background: "rgba(20, 20, 20, 0.65)",
            backdropFilter: "blur(12px)",
            border: "2px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)",
          }}>
            <div style={{
              width: 66, height: 66, borderRadius: 18,
              background: "#1E88E5",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 6px 20px rgba(30,136,229,0.5)",
              cursor: "pointer",
            }}>
              {/* Trocar pelo <img src="logo.png"> do bucket */}
              <span style={{ color: "white", fontSize: 28, fontWeight: 900, fontStyle: "italic" }}>Â</span>
            </div>
          </div>
        </div>

        {/* 4. WhatsApp — retângulo direito */}
        <button style={{
          flexShrink: 0, width: 108, height: 52, borderRadius: 16, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          padding: "0 12px",
          background: "#25D366", boxShadow: "0 4px 14px rgba(37,211,102,0.45)",
          cursor: "pointer",
        }}>
          <IconWhatsApp />
          <span style={{ color: "white", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>WhatsApp</span>
        </button>

        {/* 5. Instagram — quadrado direito */}
        <button style={{
          flexShrink: 0, width: 52, height: 52, borderRadius: 16, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
          boxShadow: "0 4px 14px rgba(220,39,67,0.4)",
          cursor: "pointer",
        }}>
          <IconInstagram />
        </button>

      </div>
    </div>
  );
}
