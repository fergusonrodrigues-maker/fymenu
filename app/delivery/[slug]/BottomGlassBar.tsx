// FILE: /app/u/[slug]/BottomGlassBar.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

// Shared icon sizes
const ICON_SIZE = 40;
const ICON_RADIUS = 12;
const LOGO_SIZE = 44;

interface Props {
  unit: Unit;
  visible: boolean;
  minimized?: boolean; // kept for compat, unused — expansion is scroll/click-driven
  onIfoodClick?: () => void;
}

export default function BottomGlassBar({ unit, visible, onIfoodClick }: Props) {
  const [glassExpanded, setGlassExpanded] = useState(false);
  const glassExpandedRef = useRef(false); // mirror for scroll handler (avoids stale closure)

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Keep ref in sync
  useEffect(() => { glassExpandedRef.current = glassExpanded; }, [glassExpanded]);

  // Scroll-driven expand/collapse
  useEffect(() => {
    if (!visible) return;
    const lastYRef = { current: window.scrollY };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = maxScroll > 0 && currentY >= maxScroll - 50;
      const scrolledUpEnough = currentY < lastYRef.current - 10;
      const farFromBottom = currentY < maxScroll - 200;

      if (atBottom && !glassExpandedRef.current) {
        setGlassExpanded(true);
      } else if (scrolledUpEnough && glassExpandedRef.current && farFromBottom) {
        setGlassExpanded(false);
      }

      lastYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visible]);

  const collapse = useCallback(() => setGlassExpanded(false), []);
  const backToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setGlassExpanded(false);
  }, []);

  const wa = normalizeWhatsapp(unit.whatsapp || "");
  const ig = normalizeInstagram(unit.instagram || "");
  const maps = mapsUrl(unit);
  const logo = unit.logo_url || null;
  const { isOpen, label: openLabel, nextChange } = getOpenStatus(unit);

  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

  // Theme tokens
  const bg = isDark ? "rgba(10,10,10,0.92)" : "rgba(255,255,255,0.92)";
  const border = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#fff" : "#1a1a1a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  // Shared icon style for minimized bar
  const iconBase: React.CSSProperties = {
    width: ICON_SIZE, height: ICON_SIZE,
    borderRadius: ICON_RADIUS,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, flexShrink: 0,
    textDecoration: "none",
  };

  return (
    <>
      {/* ── MINIMIZED pill — floating centered ── */}
      <div
        onClick={() => setGlassExpanded(true)}
        style={{
          position: "fixed",
          bottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
          left: "50%",
          transform: visible && !glassExpanded
            ? "translateX(-50%) translateY(0)"
            : "translateX(-50%) translateY(20px)",
          zIndex: 101,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 24,
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
          cursor: "pointer",
        }}
      >
        {/* Maps */}
        {maps && (
          <a
            href={maps} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              ...iconBase,
              background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
            }}
          >📍</a>
        )}

        {/* City / Neighborhood */}
        <div
          style={{
            height: ICON_SIZE,
            padding: "0 10px",
            borderRadius: ICON_RADIUS,
            background: isDark ? "rgba(0,255,174,0.06)" : "rgba(0,150,100,0.06)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: isDark ? "#00ffae" : "#00a06a", lineHeight: 1.3 }}>
            {unit.city || ""}
          </div>
          {unit.neighborhood && (
            <div style={{ fontSize: 7, color: isDark ? "rgba(0,255,174,0.5)" : "rgba(0,130,80,0.5)" }}>
              {unit.neighborhood}
            </div>
          )}
        </div>

        {/* Logo — circular, same height as icons, centered in bar */}
        <div
          onClick={e => { e.stopPropagation(); setGlassExpanded(true); }}
          style={{
            width: LOGO_SIZE, height: LOGO_SIZE,
            borderRadius: "50%",
            background: "#00ffae",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            border: isDark ? "2px solid rgba(10,10,10,0.9)" : "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: "pointer",
          }}
        >
          {logo ? (
            <img src={logo} alt={unit.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 900, color: "#000", fontStyle: "italic" }}>fy</span>
          )}
        </div>

        {/* WhatsApp */}
        {wa && (
          <a
            href={wa} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              ...iconBase,
              background: isDark ? "rgba(37,211,102,0.12)" : "rgba(37,211,102,0.1)",
            }}
          >💬</a>
        )}

        {/* Instagram */}
        {ig && (
          <a
            href={ig} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              ...iconBase,
              background: isDark
                ? "linear-gradient(135deg, rgba(131,58,180,0.12), rgba(253,29,29,0.12))"
                : "linear-gradient(135deg, rgba(131,58,180,0.08), rgba(253,29,29,0.08))",
            }}
          >📸</a>
        )}

        {/* iFood / external platform */}
        {unit.ifood_url && (
          <a
            href={unit.ifood_url} target="_blank" rel="noopener noreferrer"
            onClick={e => { e.stopPropagation(); onIfoodClick?.(); }}
            style={{
              ...iconBase,
              borderRadius: ICON_RADIUS,
              background: getPlatformGradient(unit.ifood_platform),
            }}
          >
            {getPlatformIcon(unit.ifood_platform)}
          </a>
        )}
      </div>

      {/* ── Backdrop ── */}
      <div
        onClick={collapse}
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
        bottom: 0, left: 0, right: 0,
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
        {/* Handle row: centered drag pill + back-to-top button */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", marginBottom: 16,
        }}>
          <div
            onClick={collapse}
            style={{
              width: 36, height: 4, borderRadius: 2,
              background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
              cursor: "pointer",
            }}
          />
          {/* Back to top */}
          <button
            onClick={backToTop}
            style={{
              position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
              width: 36, height: 36, borderRadius: 12,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, cursor: "pointer",
              boxShadow: isDark
                ? "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset"
                : "0 1px 3px rgba(0,0,0,0.06)",
            }}
            aria-label="Voltar ao topo"
          >↑</button>
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
            <div style={{ fontSize: 16, fontWeight: 900, color: textPrimary, lineHeight: 1.2 }}>{unit.name}</div>
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
                background: cardBg, border: `1px solid ${cardBorder}`,
                textDecoration: "none",
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: getPlatformGradient(unit.ifood_platform),
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>{getPlatformIcon(unit.ifood_platform)}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>
                {getPlatformName(unit.ifood_platform)}
              </span>
            </a>
          )}

          {/* Horário */}
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
                color: isOpen ? (isDark ? "#00ffae" : "#00a06a") : (isDark ? "#f87171" : "#dc2626"),
              }}>{openLabel}</span>
              {nextChange && (
                <span style={{ fontSize: 10, color: textSecondary }}>· {nextChange}</span>
              )}
            </div>
          )}

          {/* Powered by */}
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4px 0" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
              Powered by FyMenu
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
