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

export default function BottomGlassBar({ unit }: { unit: Unit }) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Maximiza quando faltam ~12% para o fim da página
  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      setIsMaximized(scrolled >= total * 0.88);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // checa no mount
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const wa   = normalizeWhatsapp(unit.whatsapp || "");
  const ig   = normalizeInstagram(unit.instagram || "");
  const maps = mapsUrl(unit);
  const logo = unit.logo_url || null;
  const city = [unit.city, unit.neighborhood].filter(Boolean).join(" - ");

  const EASE = "cubic-bezier(0.34,1.56,0.64,1)";
  const DUR  = "700ms";

  return (
    <div style={{
      position: "fixed", bottom: 24, left: 0, right: 0,
      display: "flex", justifyContent: "center",
      zIndex: 50, padding: "0 8px",
      pointerEvents: "none",
    }}>
      <div style={{
        position: "relative",
        width: isMaximized ? "min(84vw, 300px)" : "min(96vw, 520px)",
        height: isMaximized ? 196 : 80,
        borderRadius: isMaximized ? 28 : 24,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "auto",
        transition: `all ${DUR} ${EASE}`,
        overflow: "visible",
      }}>

        {/* LOGO — flutua acima */}
        <div style={{
          position: "absolute",
          left: "50%", transform: "translateX(-50%)",
          top: isMaximized ? -32 : -8,
          width: isMaximized ? 72 : 96,
          height: isMaximized ? 72 : 96,
          borderRadius: isMaximized ? 20 : 28,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
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
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px", gap: 6,
          opacity: isMaximized ? 0 : 1,
          pointerEvents: isMaximized ? "none" : "auto",
          transition: `opacity 250ms ease ${isMaximized ? "0ms" : "350ms"}`,
        }}>
          {/* esquerda: maps + unidade — ambos 60x60 */}
          <div style={{ display: "flex", gap: 6 }}>
            {maps && (
              <a href={maps} target="_blank" rel="noreferrer" style={{
                width: 60, height: 60, borderRadius: 18,
                overflow: "hidden", flexShrink: 0,
              }}>
                <img src={ICONS.maps} alt="Maps"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </a>
            )}
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              position: "relative", overflow: "hidden", flexShrink: 0,
            }}>
              <img src={ICONS.unidade} alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{
                position: "relative", zIndex: 1,
                height: "100%", display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center", padding: "0 4px",
              }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.2, textAlign: "center" }}>
                  {unit.city || ""}
                </span>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2, textAlign: "center" }}>
                  {unit.neighborhood || unit.name}
                </span>
              </div>
            </div>
          </div>

          {/* espaço central logo */}
          <div style={{ width: 80, flexShrink: 0 }} />

          {/* direita: whatsapp + instagram — ambos 60x60 */}
          <div style={{ display: "flex", gap: 6 }}>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" style={{
                width: 60, height: 60, borderRadius: 18,
                overflow: "hidden", flexShrink: 0,
              }}>
                <img src={ICONS.whatsapp} alt="WhatsApp"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </a>
            )}
            {ig && (
              <a href={ig} target="_blank" rel="noreferrer" style={{
                width: 60, height: 60, borderRadius: 18,
                overflow: "hidden", flexShrink: 0,
              }}>
                <img src={ICONS.instagram} alt="Instagram"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </a>
            )}
          </div>
        </div>

        {/* ── MAXIMIZADO (vertical) ── */}
        <div style={{
          position: "absolute", inset: 0,
          padding: "48px 14px 12px",
          display: "flex", flexDirection: "column",
          justifyContent: "center", gap: 6,
          opacity: isMaximized ? 1 : 0,
          pointerEvents: isMaximized ? "auto" : "none",
          transition: `opacity 250ms ease ${isMaximized ? "350ms" : "0ms"}`,
        }}>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center",
              width: "100%", height: 40, borderRadius: 14,
              background: "#25D366", padding: "0 16px", gap: 10,
              textDecoration: "none",
            }}>
              <img src={ICONS.whatsapp} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Pedir no WhatsApp</span>
            </a>
          )}

          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center",
              width: "100%", height: 40, borderRadius: 14,
              background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              padding: "0 16px", gap: 10, textDecoration: "none",
            }}>
              <img src={ICONS.instagram} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Siga no Instagram</span>
            </a>
          )}

          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center",
              width: "100%", height: 40, borderRadius: 14,
              background: "#E53935", padding: "0 16px", gap: 10,
              textDecoration: "none",
            }}>
              <img src={ICONS.maps} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Como Chegar</span>
            </a>
          )}

          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", width: "100%", height: 44,
            borderRadius: 18, position: "relative", overflow: "hidden",
          }}>
            <img src={ICONS.unidade} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            }} />
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1a1a" }}>{city}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#444" }}>{unit.name}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
