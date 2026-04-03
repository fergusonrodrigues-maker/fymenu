// FILE: /app/u/[slug]/BottomGlassBar.tsx
"use client";

import { useEffect, useState } from "react";
import type { Unit } from "./menuTypes";

const ICONS = {
  maps:      "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/GLASSBAR%20MESTRE/BOTOM-MAPS.png",
  unidade:   "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/GLASSBAR%20MESTRE/BOTOM-UNIDADS.png",
  whatsapp:  "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/GLASSBAR%20MESTRE/WHATSPP-BOTOM.png",
  instagram: "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/GLASSBAR%20MESTRE/INSTAGRAM-BOTOM.png",
};

function normalizeWhatsapp(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function normalizeInstagram(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const handle = s.startsWith("@") ? s.slice(1) : s;
  if (/^https?:\/\//i.test(handle)) return handle;
  if (/instagram\.com/i.test(handle)) return `https://${handle.replace(/^\/\//, "")}`;
  return `https://instagram.com/${handle}`;
}

function mapsUrl(unit: Unit): string | null {
  if (unit.maps_url?.trim()) return unit.maps_url.trim();
  const q = [unit.name, unit.neighborhood, unit.city].filter(Boolean).join(" - ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

interface Props {
  unit: Unit;
  visible: boolean;
  minimized: boolean;
}

export default function BottomGlassBar({ unit, visible, minimized }: Props) {
  const isMaximized = !minimized;

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const wa   = normalizeWhatsapp(unit.whatsapp || "");
  const ig   = normalizeInstagram(unit.instagram || "");
  const maps = mapsUrl(unit);
  const logo = unit.logo_url || null;
  const city = [unit.city, unit.neighborhood].filter(Boolean).join(" - ");

  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const DUR  = "400ms";

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: "flex",
      justifyContent: "center",
      padding: isMaximized ? "0" : minimized ? "0 8px" : "0 12px",
      paddingBottom: isMaximized ? "0" : minimized ? "calc(4px + env(safe-area-inset-bottom, 0px))" : "calc(12px + env(safe-area-inset-bottom, 0px))",
      pointerEvents: "none",
      transform: visible ? "translateY(0)" : "translateY(110%)",
      transition: `transform ${DUR} ${EASE}, padding ${DUR} ${EASE}`,
    }}>
      <div style={{
        position: "relative",
        width: isMaximized ? "100%" : minimized ? "min(96vw, 280px)" : "min(96vw, 520px)",
        height: isMaximized ? "min(50vh, 340px)" : minimized ? 58 : 72,
        borderRadius: isMaximized ? "28px 28px 0 0" : minimized ? 14 : 20,
        background: isDark
          ? "rgba(10, 10, 10, 0.15)"
          : "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(80px) saturate(1.8)",
        WebkitBackdropFilter: "blur(80px) saturate(1.8)",
        border: isDark
          ? "0.5px solid rgba(255,255,255,0.08)"
          : "0.5px solid rgba(0,0,0,0.08)",
        boxShadow: isDark
          ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 -8px 24px rgba(0,0,0,0.2)"
          : "0 1px 0 rgba(255,255,255,0.6) inset, 0 -1px 0 rgba(0,0,0,0.05) inset, 0 -8px 24px rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "auto",
        transition: `all ${DUR} ${EASE}`,
        overflow: "visible",
      }}>

        {/* LOGO — flutua acima */}
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: isMaximized ? -32 : minimized ? -8 : -10,
          width: isMaximized ? 72 : minimized ? 44 : 56,
          height: isMaximized ? 72 : minimized ? 44 : 56,
          borderRadius: isMaximized ? 20 : minimized ? 12 : 16,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          transition: `all ${DUR} ${EASE}`,
          overflow: "hidden",
        }}>
          <img
            src={logo ?? "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/GLASSBAR%20MESTRE/PERFIL-BOTOM-MEIO.png"}
            alt={unit.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
          />
        </div>

        {/* ── MINIMIZADO (horizontal) ── */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "0 6px",
          opacity: isMaximized ? 0 : 1,
          pointerEvents: isMaximized ? "none" : "auto",
          transition: `opacity 250ms ease ${isMaximized ? "0ms" : "300ms"}`,
        }}>
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" style={{
              width: 46, height: 46, borderRadius: 14,
              overflow: "hidden", flexShrink: 0,
            }}>
              <img src={ICONS.maps} alt="Maps"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </a>
          )}

          <div style={{
            width: 46, height: 46, borderRadius: 14,
            position: "relative", overflow: "hidden", flexShrink: 0,
          }}>
            <img src={ICONS.unidade} alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{
              position: "relative", zIndex: 1,
              height: "100%", display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center", padding: "0 3px",
            }}>
              <span style={{ fontSize: 7, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.2, textAlign: "center" }}>
                {unit.city || ""}
              </span>
              <span style={{ fontSize: 6, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2, textAlign: "center" }}>
                {unit.neighborhood || unit.name}
              </span>
            </div>
          </div>

          {/* Spacer para o logo flutuante */}
          <div style={{ width: minimized ? 48 : 60, flexShrink: 0 }} />

          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{
              width: 46, height: 46, borderRadius: 14,
              overflow: "hidden", flexShrink: 0,
            }}>
              <img src={ICONS.whatsapp} alt="WhatsApp"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </a>
          )}

          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" style={{
              width: 46, height: 46, borderRadius: 14,
              overflow: "hidden", flexShrink: 0,
            }}>
              <img src={ICONS.instagram} alt="Instagram"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </a>
          )}
        </div>

        {/* ── MAXIMIZADO (vertical) ── */}
        <div style={{
          position: "absolute",
          inset: 0,
          padding: "52px 20px 20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 8,
          opacity: isMaximized ? 1 : 0,
          pointerEvents: isMaximized ? "auto" : "none",
          transition: `opacity 250ms ease ${isMaximized ? "300ms" : "0ms"}`,
        }}>
          {/* Botão voltar ao topo — canto superior direito */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "rgba(255,255,255,0.10)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Voltar ao topo"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M8 3L4 7M8 3L12 7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center",
              width: "100%", height: 48, borderRadius: 14,
              background: "#25D366", padding: "0 18px", gap: 12,
              textDecoration: "none",
            }}>
              <img src={ICONS.whatsapp} alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Pedir no WhatsApp</span>
            </a>
          )}

          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center",
              width: "100%", height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              padding: "0 18px", gap: 12, textDecoration: "none",
            }}>
              <img src={ICONS.instagram} alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Siga no Instagram</span>
            </a>
          )}

          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center",
              width: "100%", height: 48, borderRadius: 14,
              background: "#E53935", padding: "0 18px", gap: 12,
              textDecoration: "none",
            }}>
              <img src={ICONS.maps} alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Como Chegar</span>
            </a>
          )}

          <div style={{
            display: "flex", alignItems: "center",
            width: "100%", height: 48, borderRadius: 14,
            position: "relative", overflow: "hidden",
          }}>
            <img src={ICONS.unidade} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            }} />
            <div style={{ position: "relative", zIndex: 1, width: "100%", textAlign: "center", padding: "0 18px" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a1a" }}>{city}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{unit.name}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
