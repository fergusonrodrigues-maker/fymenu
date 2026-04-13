// FILE: /app/u/[slug]/BottomGlassBar.tsx
"use client";

import { useEffect, useState } from "react";
import type { Unit } from "./menuTypes";

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

function getOpenStatus(unit: Unit): { isOpen: boolean; label: string; nextChange: string } {
  if (unit.force_status === "open") return { isOpen: true, label: "Aberto agora", nextChange: "" };
  if (unit.force_status === "closed") return { isOpen: false, label: "Fechado", nextChange: "" };

  const hours = unit.business_hours || [];
  if (hours.length === 0) return { isOpen: true, label: "", nextChange: "" };

  const now = new Date();
  const dayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const currentDay = dayNames[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayHours = hours.find((h: any) => h.day === currentDay);

  if (!todayHours || !todayHours.enabled) {
    for (let i = 1; i <= 7; i++) {
      const next = hours.find((h: any) => h.day === dayNames[(now.getDay() + i) % 7]);
      if (next?.enabled) return { isOpen: false, label: "Fechado hoje", nextChange: `Abre ${next.day} às ${next.open}` };
    }
    return { isOpen: false, label: "Fechado", nextChange: "" };
  }

  const { open: openTime, close: closeTime } = todayHours;
  const overnight = closeTime <= openTime;

  if (overnight ? (currentTime >= openTime || currentTime < closeTime) : (currentTime >= openTime && currentTime < closeTime)) {
    return { isOpen: true, label: "Aberto agora", nextChange: `Fecha às ${closeTime}` };
  }

  if (currentTime < openTime) return { isOpen: false, label: "Fechado", nextChange: `Abre hoje às ${openTime}` };

  for (let i = 1; i <= 7; i++) {
    const next = hours.find((h: any) => h.day === dayNames[(now.getDay() + i) % 7]);
    if (next?.enabled) return { isOpen: false, label: "Fechado", nextChange: `Abre ${next.day} às ${next.open}` };
  }
  return { isOpen: false, label: "Fechado", nextChange: "" };
}

function getPlatformGradient(platform: string | null | undefined): string {
  switch (platform) {
    case "ifood": return "linear-gradient(135deg, #EA1D2C, #B71C1C)";
    case "rappi": return "linear-gradient(135deg, #FF6B00, #E65100)";
    case "uber_eats": return "linear-gradient(135deg, #06C167, #048A46)";
    case "aiqfome": return "linear-gradient(135deg, #7B1FA2, #4A148C)";
    default: return "linear-gradient(135deg, #6B7280, #4B5563)";
  }
}

function getPlatformIcon(platform: string | null | undefined): string {
  switch (platform) {
    case "ifood": return "🍔";
    case "rappi": return "🛵";
    case "uber_eats": return "🥡";
    case "aiqfome": return "🍕";
    default: return "📱";
  }
}

function getPlatformName(platform: string | null | undefined): string {
  switch (platform) {
    case "ifood": return "iFood";
    case "rappi": return "Rappi";
    case "uber_eats": return "Uber Eats";
    case "aiqfome": return "AiQFome";
    default: return "Delivery";
  }
}

interface Props {
  unit: Unit;
  visible: boolean;
  minimized?: boolean; // kept for compat, unused — expansion is click-driven
  onIfoodClick?: () => void;
}

export default function BottomGlassBar({ unit, visible, onIfoodClick }: Props) {
  const [glassExpanded, setGlassExpanded] = useState(false);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const wa = normalizeWhatsapp(unit.whatsapp || "");
  const ig = normalizeInstagram(unit.instagram || "");
  const maps = mapsUrl(unit);
  const logo = unit.logo_url || null;
  const { isOpen, label: openLabel, nextChange } = getOpenStatus(unit);

  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const DUR = "400ms";

  // Colors
  const bg = isDark ? "rgba(10,10,10,0.92)" : "rgba(255,255,255,0.92)";
  const border = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#fff" : "#1a1a1a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  return (
    <>
      {/* ── MINIMIZED pill — floating centered ── */}
      <div style={{
        position: "fixed",
        bottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
        left: "50%",
        transform: visible && !glassExpanded ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(24px)",
        zIndex: 101,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        paddingTop: 16,
        borderRadius: 22,
        background: bg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.45)"
          : "0 8px 32px rgba(0,0,0,0.12)",
        opacity: visible && !glassExpanded ? 1 : 0,
        pointerEvents: visible && !glassExpanded ? "auto" : "none",
        transition: `opacity 300ms ${EASE}, transform 300ms ${EASE}`,
        whiteSpace: "nowrap",
      }}>
          {/* Maps */}
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" style={{
              width: 44, height: 44, borderRadius: 12,
              background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", flexShrink: 0, fontSize: 20,
            }}>
              📍
            </a>
          )}

          {/* City / Neighborhood */}
          <div style={{
            padding: "6px 10px", borderRadius: 10,
            background: isDark ? "rgba(0,255,174,0.06)" : "rgba(0,150,100,0.06)",
            textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#00ffae" : "#00a06a", lineHeight: 1.2 }}>
              {unit.city || ""}
            </div>
            {unit.neighborhood && (
              <div style={{ fontSize: 8, color: isDark ? "rgba(0,255,174,0.5)" : "rgba(0,130,80,0.5)" }}>
                {unit.neighborhood}
              </div>
            )}
          </div>

          {/* Logo — circular, pops above the bar, click to expand */}
          <div
            onClick={() => setGlassExpanded(true)}
            style={{
              width: 52, height: 52,
              borderRadius: "50%",
              background: "#00ffae",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              marginTop: -28,
              border: isDark ? "3px solid rgba(10,10,10,0.95)" : "3px solid rgba(255,255,255,0.95)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {logo ? (
              <img src={logo} alt={unit.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 900, color: "#000" }}>fy</span>
            )}
          </div>

          {/* WhatsApp */}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{
              width: 44, height: 44, borderRadius: 12,
              background: isDark ? "rgba(37,211,102,0.12)" : "rgba(37,211,102,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", flexShrink: 0, fontSize: 20,
            }}>
              💬
            </a>
          )}

          {/* Instagram */}
          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" style={{
              width: 44, height: 44, borderRadius: 12,
              background: isDark
                ? "linear-gradient(135deg, rgba(131,58,180,0.12), rgba(253,29,29,0.12))"
                : "linear-gradient(135deg, rgba(131,58,180,0.08), rgba(253,29,29,0.08))",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", flexShrink: 0, fontSize: 20,
            }}>
              📸
            </a>
          )}

          {/* iFood / external platform */}
          {unit.ifood_url && (
            <a href={unit.ifood_url} target="_blank" rel="noopener noreferrer" onClick={onIfoodClick}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: getPlatformGradient(unit.ifood_platform),
                display: "flex", alignItems: "center", justifyContent: "center",
                textDecoration: "none", fontSize: 22,
              }}>
              {getPlatformIcon(unit.ifood_platform)}
            </a>
          )}
      </div>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setGlassExpanded(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 102,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: glassExpanded ? 1 : 0,
          pointerEvents: glassExpanded ? "auto" : "none",
          transition: `opacity 300ms ${EASE}`,
        }}
      />

      {/* ── EXPANDED bento bottom sheet ── */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 103,
        opacity: glassExpanded ? 1 : 0,
        transform: glassExpanded ? "translateY(0)" : "translateY(100%)",
        transition: `opacity 350ms ${EASE}, transform 350ms ${EASE}`,
        pointerEvents: glassExpanded ? "auto" : "none",
        borderRadius: "24px 24px 0 0",
        background: isDark ? "rgba(10,10,10,0.97)" : "rgba(255,255,255,0.97)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        border,
        borderBottom: "none",
        boxShadow: isDark ? "0 -8px 40px rgba(0,0,0,0.5)" : "0 -8px 40px rgba(0,0,0,0.15)",
        padding: "16px 16px",
        paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
      }}>
        {/* Drag handle — click to close */}
        <div
          onClick={() => setGlassExpanded(false)}
          style={{ display: "flex", justifyContent: "center", marginBottom: 16, cursor: "pointer", padding: "4px 0" }}
        >
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
          }} />
        </div>

        {/* Logo + unit name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "#00ffae", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}>
            {logo ? (
              <img src={logo} alt={unit.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 900, color: "#000" }}>fy</span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: textPrimary, lineHeight: 1.2 }}>
              {unit.name}
            </div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
              {[unit.city, unit.neighborhood].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* WhatsApp — full width */}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{
              gridColumn: "1 / -1",
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", borderRadius: 18,
              background: isDark ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.07)",
              border: `1px solid ${isDark ? "rgba(37,211,102,0.14)" : "rgba(37,211,102,0.12)"}`,
              textDecoration: "none",
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 13,
                background: "rgba(37,211,102,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>💬</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#25d366" }}>Pedir no WhatsApp</div>
                <div style={{ fontSize: 10, color: textSecondary }}>Envie seu pedido direto</div>
              </div>
            </a>
          )}

          {/* Instagram */}
          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "18px 10px", borderRadius: 18,
              background: isDark
                ? "linear-gradient(135deg, rgba(131,58,180,0.07), rgba(253,29,29,0.07))"
                : "linear-gradient(135deg, rgba(131,58,180,0.05), rgba(253,29,29,0.05))",
              border: `1px solid ${cardBorder}`,
              textDecoration: "none",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, rgba(131,58,180,0.15), rgba(253,29,29,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>📸</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>Instagram</span>
            </a>
          )}

          {/* Maps */}
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" style={{
              gridColumn: ig ? "auto" : "1 / -1",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "18px 10px", borderRadius: 18,
              background: isDark ? "rgba(239,68,68,0.07)" : "rgba(239,68,68,0.05)",
              border: `1px solid ${cardBorder}`,
              textDecoration: "none",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(239,68,68,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>📍</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>Como Chegar</span>
            </a>
          )}

          {/* iFood / external platform */}
          {unit.ifood_url && (
            <a href={unit.ifood_url} target="_blank" rel="noopener noreferrer" onClick={onIfoodClick}
              style={{
                gridColumn: (!ig && !maps) ? "1 / -1" : "auto",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "18px 10px", borderRadius: 18,
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                textDecoration: "none",
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: getPlatformGradient(unit.ifood_platform),
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {getPlatformIcon(unit.ifood_platform)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>
                {getPlatformName(unit.ifood_platform)}
              </span>
            </a>
          )}

          {/* Horário — full width */}
          {openLabel && (
            <div style={{
              gridColumn: "1 / -1",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "10px 14px", borderRadius: 14,
              background: cardBg,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isOpen ? "#00ffae" : "#f87171",
                boxShadow: isOpen ? "0 0 6px rgba(0,255,174,0.4)" : "none",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: isOpen
                  ? (isDark ? "#00ffae" : "#00a06a")
                  : (isDark ? "#f87171" : "#dc2626"),
              }}>
                {openLabel}
              </span>
              {nextChange && (
                <span style={{ fontSize: 10, color: textSecondary }}>
                  · {nextChange}
                </span>
              )}
            </div>
          )}

          {/* Powered by */}
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4px 0" }}>
            <span style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", fontWeight: 600 }}>
              Powered by FyMenu
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
