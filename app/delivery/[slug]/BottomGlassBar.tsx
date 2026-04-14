// FILE: /app/u/[slug]/BottomGlassBar.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Unit } from "./menuTypes";
import type { CartItem } from "./CartModal";
import { buildCartWhatsAppMessage } from "./orderBuilder";

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
function getPlatformIcon(p: string | null | undefined) {
  return p === "ifood" ? "🍔" : p === "rappi" ? "🛵" : p === "uber_eats" ? "🥡" : p === "aiqfome" ? "🍕" : "📱";
}
function getPlatformName(p: string | null | undefined) {
  return p === "ifood" ? "iFood" : p === "rappi" ? "Rappi" : p === "uber_eats" ? "Uber Eats" : p === "aiqfome" ? "AiQFome" : "Delivery";
}

const ICON_SIZE = 40;
const ICON_RADIUS = 12;
const LOGO_SIZE = 44;
const CUST_KEY = "fy_cust_info";

function loadCustInfo(): { name: string; phone: string } {
  if (typeof window === "undefined") return { name: "", phone: "" };
  try { return JSON.parse(localStorage.getItem(CUST_KEY) || "{}"); } catch { return { name: "", phone: "" }; }
}

interface AiSuggestion { id: string; name: string; price: number; reason: string; }
interface ComboItem { id: string; name: string; combo_price: number; original_price: number; }
interface UpsellData { combos: ComboItem[]; suggestions: AiSuggestion[]; }

interface Props {
  unit: Unit;
  visible: boolean;
  minimized?: boolean;
  onIfoodClick?: () => void;
  cart?: CartItem[];
  cartTotal?: number;
  onUpdateQty?: (productId: string, qty: number) => void;
  onClearCart?: () => void;
}

export default function BottomGlassBar({
  unit, visible, onIfoodClick,
  cart = [], cartTotal = 0, onUpdateQty, onClearCart,
}: Props) {
  const [glassExpanded, setGlassExpanded] = useState(false);
  const [glassView, setGlassView] = useState<"info" | "cart">("info");
  const glassExpandedRef = useRef(false);
  const cartRef = useRef(cart);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [upsellData, setUpsellData] = useState<UpsellData>({ combos: [], suggestions: [] });
  const [loadingUpsell, setLoadingUpsell] = useState(false);

  // Drag-to-minimize (refs for handler values, state for rendering)
  const dragStartYRef = useRef(0);
  const dragDeltaRef = useRef(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const isDraggingRef = useRef(false);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const saved = loadCustInfo();
    if (saved.name) setCustName(saved.name);
    if (saved.phone) setCustPhone(saved.phone);
  }, []);

  useEffect(() => { glassExpandedRef.current = glassExpanded; }, [glassExpanded]);

  // Lock body scroll when expanded
  useEffect(() => {
    if (glassExpanded) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [glassExpanded]);

  function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      try { localStorage.setItem("fy_theme", "light"); } catch {}
    } else {
      html.classList.add("dark");
      try { localStorage.setItem("fy_theme", "dark"); } catch {}
    }
  }

  // Load upsell suggestions when cart tab opens
  useEffect(() => {
    if (!glassExpanded || glassView !== "cart" || cart.length === 0) return;
    const lastItem = cart[cart.length - 1];
    const productId = lastItem.product_id.split("__")[0];
    let cancelled = false;
    setLoadingUpsell(true);
    setUpsellData({ combos: [], suggestions: [] });
    fetch("/api/upsell-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId: unit.id, productId, productName: lastItem.name, cartItems: [] }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled) setUpsellData(data ?? { combos: [], suggestions: [] }); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingUpsell(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glassExpanded, glassView, cart.length]);

  // Scroll-driven expand — ONLY at bottom of page
  useEffect(() => {
    if (!visible) return;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const isAtBottom = maxScroll > 0 && window.scrollY >= maxScroll - 30;
        if (isAtBottom && !glassExpandedRef.current) {
          setGlassView(cartRef.current.length > 0 ? "cart" : "info");
          setGlassExpanded(true);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visible]);

  const collapse = useCallback(() => setGlassExpanded(false), []);
  const backToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setGlassExpanded(false);
  }, []);

  // Drag-to-minimize handlers
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartYRef.current = clientY;
    dragDeltaRef.current = 0;
    setDragDeltaY(0);
    isDraggingRef.current = true;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const delta = Math.max(0, clientY - dragStartYRef.current);
    dragDeltaRef.current = delta;
    setDragDeltaY(delta);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const delta = dragDeltaRef.current;
    dragDeltaRef.current = 0;
    setDragDeltaY(0);
    if (delta > 80) setGlassExpanded(false);
  }, []);

  const handleSendOrder = useCallback(() => {
    if (cart.length === 0) return;
    const phone = (unit.whatsapp || "").replace(/\D/g, "");
    if (!phone) return;
    try { localStorage.setItem(CUST_KEY, JSON.stringify({ name: custName, phone: custPhone })); } catch {}
    const url = buildCartWhatsAppMessage(
      cart.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price })),
      unit.whatsapp || "",
      custName,
      custPhone
    );
    window.open(url, "_blank", "noreferrer");
    setSending(true);
    setTimeout(() => {
      onClearCart?.();
      setSending(false);
      setGlassExpanded(false);
    }, 1500);
  }, [cart, unit.whatsapp, custName, custPhone, onClearCart]);

  const wa = normalizeWhatsapp(unit.whatsapp || "");
  const ig = normalizeInstagram(unit.instagram || "");
  const maps = mapsUrl(unit);
  const logo = unit.logo_url || null;
  const { isOpen, label: openLabel, nextChange } = getOpenStatus(unit);

  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const bg = isDark ? "rgba(10,10,10,0.92)" : "rgba(255,255,255,0.92)";
  const border = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#fff" : "#1a1a1a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const iconBase: React.CSSProperties = {
    width: ICON_SIZE, height: ICON_SIZE,
    borderRadius: ICON_RADIUS,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, flexShrink: 0,
    textDecoration: "none",
  };

  return (
    <>
      {/* ── Theme toggle — fixed left, same level as pill ── */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed",
          bottom: `calc(18px + env(safe-area-inset-bottom, 0px))`,
          left: 16,
          width: 36, height: 36, borderRadius: 12,
          background: isDark ? "rgba(10,10,10,0.85)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, cursor: "pointer",
          zIndex: 100,
          boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.1)",
          opacity: visible && !glassExpanded ? 1 : 0,
          pointerEvents: visible && !glassExpanded ? "auto" : "none",
          transition: `opacity 300ms ${EASE}`,
        }}
        aria-label="Alternar tema"
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* ── MINIMIZED pill ── */}
      <div
        style={{
          position: "fixed",
          bottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
          left: "50%",
          transform: visible && !glassExpanded
            ? "translateX(-50%) translateY(0)"
            : "translateX(-50%) translateY(20px)",
          zIndex: 101,
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 24,
          background: bg,
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          border,
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.45)" : "0 8px 32px rgba(0,0,0,0.12)",
          opacity: visible && !glassExpanded ? 1 : 0,
          pointerEvents: visible && !glassExpanded ? "auto" : "none",
          transition: `opacity 300ms ${EASE}, transform 300ms ${EASE}`,
          whiteSpace: "nowrap", cursor: "default",
        }}
      >
        {/* Maps */}
        {maps && (
          <a href={maps} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ ...iconBase, background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)" }}
          >📍</a>
        )}

        {/* Cart icon — replaces city/neighborhood */}
        <button
          onClick={e => {
            e.stopPropagation();
            setGlassView("cart");
            setGlassExpanded(true);
          }}
          style={{
            ...iconBase,
            background: cartCount > 0
              ? (isDark ? "rgba(0,255,174,0.1)" : "rgba(0,160,106,0.08)")
              : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
            position: "relative",
            border: "none", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>🛒</span>
          {cartCount > 0 && (
            <div style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 18, height: 18, borderRadius: 9,
              padding: "0 4px",
              background: "#00ffae", color: "#000",
              fontSize: 9, fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${isDark ? "rgba(10,10,10,0.9)" : "rgba(255,255,255,0.9)"}`,
              pointerEvents: "none",
            }}>
              {cartCount > 99 ? "99+" : cartCount}
            </div>
          )}
        </button>

        {/* Logo */}
        <div
          onClick={e => { e.stopPropagation(); setGlassView("info"); setGlassExpanded(true); }}
          style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
        >
          <div style={{
            width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: "50%",
            background: "#00ffae",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            border: isDark ? "2px solid rgba(10,10,10,0.9)" : "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>
            {logo
              ? <img src={logo} alt={unit.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 16, fontWeight: 900, color: "#000", fontStyle: "italic" }}>fy</span>
            }
          </div>
        </div>

        {/* WhatsApp */}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ ...iconBase, background: isDark ? "rgba(37,211,102,0.12)" : "rgba(37,211,102,0.1)" }}
          >💬</a>
        )}

        {/* Instagram */}
        {ig && (
          <a href={ig} target="_blank" rel="noreferrer"
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
          <a href={unit.ifood_url} target="_blank" rel="noopener noreferrer"
            onClick={e => { e.stopPropagation(); onIfoodClick?.(); }}
            style={{ ...iconBase, borderRadius: ICON_RADIUS, background: getPlatformGradient(unit.ifood_platform) }}
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
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          opacity: glassExpanded ? 1 : 0,
          pointerEvents: glassExpanded ? "auto" : "none",
          transition: `opacity 300ms ${EASE}`,
        }}
      />

      {/* ── EXPANDED bottom sheet ── */}
      <div
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 103,
          maxHeight: "85dvh",
          display: "flex", flexDirection: "column",
          opacity: glassExpanded ? Math.max(0.3, 1 - dragDeltaY / 300) : 0,
          transform: glassExpanded ? `translateY(${dragDeltaY}px)` : "translateY(100%)",
          transition: isDraggingRef.current ? "none" : `opacity 350ms ${EASE}, transform 350ms ${EASE}`,
          pointerEvents: glassExpanded ? "auto" : "none",
          borderRadius: "24px 24px 0 0",
          background: isDark ? "rgba(10,10,10,0.97)" : "rgba(255,255,255,0.97)",
          backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
          border, borderBottom: "none",
          boxShadow: isDark ? "0 -8px 40px rgba(0,0,0,0.5)" : "0 -8px 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Non-scrollable header */}
        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          {/* Handle pill — drag indicator */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, cursor: "grab" }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <div style={{
              width: 40, height: 5, borderRadius: 3,
              background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)",
            }} />
          </div>

          {/* Back-to-top button row */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button
              onClick={backToTop}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: isDark
                  ? "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.15) inset"
                  : "0 1px 3px rgba(0,0,0,0.08)",
              }}
              aria-label="Voltar ao topo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={isDark ? "#ffffff" : "#1a1a1a"}
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 2, padding: 3,
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
            borderRadius: 12, marginBottom: 0,
          }}>
            <button onClick={() => setGlassView("info")} style={{
              flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
              background: glassView === "info"
                ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)")
                : "transparent",
              color: glassView === "info" ? textPrimary : textSecondary,
              fontSize: 12, fontWeight: 700,
              transition: "all 200ms",
            }}>Sobre</button>
            <button onClick={() => setGlassView("cart")} style={{
              flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
              background: glassView === "cart"
                ? (isDark ? "rgba(0,255,174,0.1)" : "rgba(0,160,106,0.08)")
                : "transparent",
              color: glassView === "cart"
                ? (isDark ? "#00ffae" : "#00a06a")
                : textSecondary,
              fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "all 200ms",
            }}>
              Carrinho
              {cartCount > 0 && (
                <span style={{
                  padding: "1px 5px", borderRadius: 6,
                  background: isDark ? "rgba(0,255,174,0.15)" : "rgba(0,160,106,0.1)",
                  color: isDark ? "#00ffae" : "#00a06a",
                  fontSize: 9, fontWeight: 900,
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 16px", paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>

          {/* ── VIEW: INFO ── */}
          {glassView === "info" && (
            <>
              {/* Logo + unit name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "#00ffae", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}>
                  {logo
                    ? <img src={logo} alt={unit.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 18, fontWeight: 900, color: "#000" }}>fy</span>
                  }
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

                {ig && (
                  <a href={ig} target="_blank" rel="noreferrer" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "18px 10px", borderRadius: 18,
                    background: isDark
                      ? "linear-gradient(135deg, rgba(131,58,180,0.07), rgba(253,29,29,0.07))"
                      : "linear-gradient(135deg, rgba(131,58,180,0.05), rgba(253,29,29,0.05))",
                    border: `1px solid ${cardBorder}`, textDecoration: "none",
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(131,58,180,0.15), rgba(253,29,29,0.15))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📸</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>Instagram</span>
                  </a>
                )}

                {maps && (
                  <a href={maps} target="_blank" rel="noreferrer" style={{
                    gridColumn: ig ? "auto" : "1 / -1",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "18px 10px", borderRadius: 18,
                    background: isDark ? "rgba(239,68,68,0.07)" : "rgba(239,68,68,0.05)",
                    border: `1px solid ${cardBorder}`, textDecoration: "none",
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(239,68,68,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📍</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>Como Chegar</span>
                  </a>
                )}

                {unit.ifood_url && (
                  <a href={unit.ifood_url} target="_blank" rel="noopener noreferrer" onClick={onIfoodClick}
                    style={{
                      gridColumn: (!ig && !maps) ? "1 / -1" : "auto",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 8, padding: "18px 10px", borderRadius: 18,
                      background: cardBg, border: `1px solid ${cardBorder}`, textDecoration: "none",
                    }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: getPlatformGradient(unit.ifood_platform), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {getPlatformIcon(unit.ifood_platform)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>{getPlatformName(unit.ifood_platform)}</span>
                  </a>
                )}

                {openLabel && (
                  <div style={{
                    gridColumn: "1 / -1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "10px 14px", borderRadius: 14, background: cardBg,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isOpen ? "#00ffae" : "#f87171",
                      boxShadow: isOpen ? "0 0 6px rgba(0,255,174,0.4)" : "none",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: isOpen ? (isDark ? "#00ffae" : "#00a06a") : (isDark ? "#f87171" : "#dc2626") }}>
                      {openLabel}
                    </span>
                    {nextChange && <span style={{ fontSize: 10, color: textSecondary }}>· {nextChange}</span>}
                  </div>
                )}

                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4px 0" }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                    Powered by FyMenu
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ── VIEW: CART ── */}
          {glassView === "cart" && (
            <>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: textSecondary }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Carrinho vazio</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: textSecondary }}>Adicione itens do cardápio</div>
                  <button onClick={collapse} style={{
                    marginTop: 20, padding: "10px 24px", borderRadius: 12, border: `1px solid ${cardBorder}`,
                    background: "transparent", color: textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>← Ver cardápio</button>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {cart.map(item => (
                      <div key={item.product_id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 12px", borderRadius: 12,
                        background: cardBg, border: `1px solid ${cardBorder}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: isDark ? "#00ffae" : "#00a06a", fontWeight: 600, marginTop: 1 }}>
                            R${(item.unit_price * item.qty).toFixed(2).replace(".", ",")}
                          </div>
                        </div>
                        {/* Qty controls */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <button onClick={e => { e.stopPropagation(); onUpdateQty?.(item.product_id, item.qty - 1); }} style={{
                            width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer",
                            background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                            color: textPrimary, fontSize: 15, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>−</button>
                          <span style={{ width: 20, textAlign: "center", fontSize: 13, fontWeight: 800, color: textPrimary }}>
                            {item.qty}
                          </span>
                          <button onClick={e => { e.stopPropagation(); onUpdateQty?.(item.product_id, item.qty + 1); }} style={{
                            width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer",
                            background: isDark ? "rgba(0,255,174,0.12)" : "rgba(0,160,106,0.1)",
                            color: isDark ? "#00ffae" : "#00a06a", fontSize: 15, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>+</button>
                        </div>
                        {/* Price */}
                        <span style={{ fontSize: 12, fontWeight: 800, minWidth: 52, textAlign: "right", flexShrink: 0, color: textPrimary }}>
                          R${(item.unit_price * item.qty).toFixed(2).replace(".", ",")}
                        </span>
                        {/* Remove */}
                        <button onClick={e => { e.stopPropagation(); onUpdateQty?.(item.product_id, 0); }} style={{
                          width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer",
                          background: "rgba(220,38,38,0.12)", color: "#f87171",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0,
                        }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* Combos */}
                  {upsellData.combos.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: textSecondary }}>🎁 Combos disponíveis</div>
                      {upsellData.combos.map(combo => (
                        <div key={combo.id} style={{
                          padding: "12px 14px", borderRadius: 12, marginBottom: 6,
                          background: isDark ? "rgba(0,255,174,0.04)" : "rgba(0,160,106,0.03)",
                          border: `1px solid ${isDark ? "rgba(0,255,174,0.1)" : "rgba(0,160,106,0.08)"}`,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{combo.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {combo.original_price > combo.combo_price && (
                              <span style={{ fontSize: 10, textDecoration: "line-through", color: textSecondary }}>
                                R${combo.original_price.toFixed(2).replace(".", ",")}
                              </span>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 900, color: isDark ? "#00ffae" : "#00a06a" }}>
                              R${combo.combo_price.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {(loadingUpsell || upsellData.suggestions.length > 0) && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: textSecondary }}>✨ Sugestões pra você</div>
                      {loadingUpsell ? (
                        <div style={{ fontSize: 11, color: textSecondary, padding: "8px 0" }}>Carregando sugestões...</div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                          {upsellData.suggestions.map(s => (
                            <div key={s.id} style={{
                              minWidth: 120, padding: 12, borderRadius: 12, flexShrink: 0,
                              background: cardBg, border: `1px solid ${cardBorder}`,
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: textPrimary, marginBottom: 2 }}>{s.name}</div>
                              {s.reason && <div style={{ fontSize: 9, color: textSecondary, marginBottom: 4, lineHeight: 1.3 }}>{s.reason}</div>}
                              <div style={{ fontSize: 12, fontWeight: 900, color: isDark ? "#00ffae" : "#00a06a" }}>
                                + R${s.price?.toFixed(2).replace(".", ",")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer info */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      type="text" placeholder="Seu nome (opcional)"
                      value={custName} onChange={e => setCustName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 12, fontSize: 12, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, outline: "none" }}
                    />
                    <input
                      type="tel" placeholder="Telefone (opcional)"
                      value={custPhone} onChange={e => setCustPhone(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 12, fontSize: 12, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, outline: "none" }}
                    />
                  </div>

                  {/* Add more + total + send */}
                  <button onClick={collapse} style={{
                    width: "100%", padding: "10px 16px", borderRadius: 12, marginBottom: 10,
                    background: "transparent", border: `1px solid ${cardBorder}`,
                    color: textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>← Adicionar mais itens</button>

                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 0", borderTop: `1px solid ${cardBorder}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: textSecondary }}>Total</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isDark ? "#00ffae" : "#00a06a" }}>
                        R${cartTotal.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onClearCart?.(); }}
                        style={{
                          padding: "14px 12px", borderRadius: 14,
                          background: cardBg, border: `1px solid ${cardBorder}`,
                          color: textSecondary, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        }}
                      >Limpar</button>
                      <button
                        onClick={e => { e.stopPropagation(); handleSendOrder(); }}
                        disabled={sending}
                        style={{
                          padding: "14px 24px", borderRadius: 14, border: "none", cursor: sending ? "default" : "pointer",
                          background: sending ? "rgba(255,255,255,0.5)" : "#ffffff",
                          color: "#000000", fontSize: 15, fontWeight: 900,
                          boxShadow: "0 0 20px rgba(255,255,255,0.1)",
                          transition: "opacity 200ms",
                        }}
                      >{sending ? "Enviando..." : "Pedir"}</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
