"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────
   FONT + KEYFRAMES (injected once)
───────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("fy-font")) {
  const l = document.createElement("link");
  l.id = "fy-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap";
  document.head.appendChild(l);
}
if (typeof document !== "undefined" && !document.getElementById("fy-dash-anim")) {
  const s = document.createElement("style");
  s.id = "fy-dash-anim";
  s.textContent = `
    @keyframes springIn {
      0%   { opacity:0; transform:scale(0.86) translateY(-20px); }
      55%  { opacity:1; transform:scale(1.025) translateY(4px); }
      75%  { transform:scale(0.988) translateY(-2px); }
      88%  { transform:scale(1.005) translateY(1px); }
      100% { opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes springOut {
      0%   { opacity:1; transform:scale(1) translateY(0); }
      30%  { opacity:.8; transform:scale(1.02) translateY(-4px); }
      100% { opacity:0; transform:scale(0.86) translateY(20px); }
    }
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes barGrow {
      from { transform:scaleX(0); }
      to   { transform:scaleX(1); }
    }
    @keyframes pulse {
      0%,100%{opacity:1} 50%{opacity:.35}
    }
    @keyframes chevBounce {
      0%,100% { transform:translateX(-50%) translateY(0); }
      50%     { transform:translateX(-50%) translateY(3px); }
    }
    @keyframes slideUp {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .fy-quickaction:hover { background: rgba(0,255,174,0.06) !important; border-color: rgba(0,255,174,0.22) !important; }
    .fy-bento { display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(5,80px); gap:10px; }
    @media(max-width:900px){ .fy-bento { grid-template-columns:repeat(2,1fr); grid-template-rows:none; grid-auto-rows:160px; } }
    @media(max-width:560px){ .fy-bento { grid-template-columns:1fr; grid-template-rows:none; grid-auto-rows:auto; } }
    @media(max-width:560px){ .fy-bento > div { grid-column:auto!important; grid-row:auto!important; min-height:160px; } }
  `;
  document.head.appendChild(s);
}

/* ─────────────────────────────────────────
   TOKENS
───────────────────────────────────────── */
const G1 = "#00ffae";
const G2 = "#00ffcc";
const GRAD_R = `linear-gradient(90deg,${G1},${G2})`;
const F = "'Montserrat',sans-serif";

const THEMES = {
  light: {
    bg: "#e8e8ea",
    cardFace: "linear-gradient(160deg,#ffffff 0%,#f6f6f6 50%,#f1f1f1 100%)",
    cardBorder: "rgba(255,255,255,0.9)",
    text: "#1e1e1e", muted: "#888", dim: "#ccc",
    border: "rgba(0,0,0,0.07)", surf: "rgba(0,0,0,0.03)", chip: "rgba(0,0,0,0.05)",
    overlayBg: "#fff", overlayBorder: "rgba(0,0,0,0.07)",
    inputBg: "rgba(0,0,0,0.03)",
    pillBg: "rgba(0,0,0,0.05)", pillActive: "#fff",
    headerBg: "rgba(232,232,234,0.92)",
  },
  dark: {
    bg: "#0f0f11",
    cardFace: "linear-gradient(160deg,#1c1c1e 0%,#161618 50%,#111113 100%)",
    cardBorder: "rgba(255,255,255,0.06)",
    text: "#f0f0f0", muted: "#777", dim: "#444",
    border: "rgba(255,255,255,0.07)", surf: "rgba(255,255,255,0.03)", chip: "rgba(255,255,255,0.07)",
    overlayBg: "#1c1c1e", overlayBorder: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.05)",
    pillBg: "rgba(255,255,255,0.06)", pillActive: "rgba(255,255,255,0.12)",
    headerBg: "rgba(15,15,17,0.92)",
  },
};

/* ─────────────────────────────────────────
   PROPS
───────────────────────────────────────── */
type Props = {
  restaurant: any;
  units: any[];
  activeUnit: any;
  stats: {
    totalProducts: number;
    totalCategories: number;
    planLabel: string;
    trialDaysLeft: number | null;
  };
};

/* ─────────────────────────────────────────
   THEME TOGGLE
───────────────────────────────────────── */
function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke={dark ? "#555" : "#f59e0b"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ cursor: "pointer", transition: "stroke .2s" }} onClick={() => dark && onToggle()}>
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <div onClick={onToggle} style={{
        width: 40, height: 22, borderRadius: 11, cursor: "pointer", position: "relative",
        background: dark ? GRAD_R : "rgba(0,0,0,0.14)",
        transition: "background .25s",
        boxShadow: dark ? `0 0 10px rgba(0,255,174,.3)` : "none",
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 4, left: dark ? 22 : 4,
          transition: "left .22s", boxShadow: "0 1px 4px rgba(0,0,0,.25)",
        }} />
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke={dark ? G1 : "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ cursor: "pointer", transition: "stroke .2s" }} onClick={() => !dark && onToggle()}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────
   CARD SHELL — neon bottom glow inside card + soft shadow outside
───────────────────────────────────────── */
function Card({ children, onClick, th, glowColor, style: extraStyle }: {
  children: React.ReactNode;
  onClick?: () => void;
  th: "light" | "dark";
  glowColor?: string;
  style?: React.CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  const t = THEMES[th];
  const glow = glowColor ?? G1;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transform: hov && onClick ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "transform .22s cubic-bezier(.34,1.4,.64,1)",
        ...extraStyle,
      }}
    >
      {/* Inner card */}
      <div style={{
        background: t.cardFace,
        borderRadius: 36,
        border: `1px solid ${t.cardBorder}`,
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: th === "light"
          ? "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)"
          : "0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)",
      }}>
        {children}
        {/* Neon bottom glow — inside card, clipped to ellipse */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 64,
          background: glow,
          clipPath: "ellipse(68% 55% at 50% 100%)",
          opacity: th === "light" ? 0.30 : 0.45,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      </div>
      {/* Soft neon shadow projected outside card bottom */}
      <div style={{
        position: "absolute",
        bottom: -10,
        left: "22%", right: "22%",
        height: 28,
        background: glow,
        borderRadius: "50%",
        filter: "blur(18px)",
        opacity: th === "light" ? 0.20 : 0.35,
        pointerEvents: "none",
        zIndex: -1,
      }} />
    </div>
  );
}

/* label top-left + bounce chevron bottom-center */
function CardLayout({ label, children, onOpen, th, glowColor }: {
  label: string;
  children: React.ReactNode;
  onOpen?: () => void;
  th: "light" | "dark";
  glowColor?: string;
}) {
  const t = THEMES[th];
  return (
    <Card onClick={onOpen} th={th} glowColor={glowColor}>
      {/* Label — lowercase, font-light, top-left */}
      <div style={{ padding: "18px 18px 4px", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <span style={{
          fontSize: 15,
          fontWeight: 300,
          color: t.muted,
          fontFamily: F,
          letterSpacing: "-0.2px",
          lineHeight: 1,
        }}>
          {label.toLowerCase()}
        </span>
      </div>
      <div style={{ flex: 1, padding: "4px 18px", overflow: "hidden", minHeight: 0, position: "relative", zIndex: 1 }}>
        {children}
      </div>
      {onOpen && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 14px", flexShrink: 0, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: GRAD_R,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 14px rgba(0,255,174,.5)`,
            animation: "chevBounce 2s ease-in-out infinite",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────
   CATEGORIAS PILL — pill com brilho amarelo na base
───────────────────────────────────────── */
function CategoriasPill({ th }: { th: "light" | "dark" }) {
  const t = THEMES[th];
  return (
    <Link href="/dashboard/cardapio" style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <div style={{
        position: "relative",
        height: "100%",
        minHeight: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: t.cardFace,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 999,
          padding: "14px 28px",
          fontWeight: 300,
          fontSize: 17,
          color: t.text,
          fontFamily: F,
          letterSpacing: "-0.3px",
          overflow: "hidden",
          position: "relative",
          boxShadow: th === "light"
            ? "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)"
            : "0 2px 8px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}>
          categorias
          {/* Yellow/orange bottom glow */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: 28,
            background: "linear-gradient(90deg,#f59e0b,#f97316)",
            clipPath: "ellipse(68% 55% at 50% 100%)",
            opacity: th === "light" ? 0.40 : 0.55,
            pointerEvents: "none",
          }} />
        </div>
        {/* Shadow outside */}
        <div style={{
          position: "absolute",
          bottom: -8,
          left: "25%", right: "25%",
          height: 22,
          background: "#f59e0b",
          borderRadius: "50%",
          filter: "blur(14px)",
          opacity: th === "light" ? 0.25 : 0.40,
          pointerEvents: "none",
          zIndex: -1,
        }} />
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────
   OVERLAY — spring in / spring out
───────────────────────────────────────── */
function Overlay({ onClose, children, th }: {
  onClose: () => void;
  children: React.ReactNode;
  th: "light" | "dark";
}) {
  const t = THEMES[th];
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: closing ? "rgba(0,0,0,0)" : "rgba(0,0,0,.45)",
        backdropFilter: closing ? "blur(0px)" : "blur(7px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        transition: "background .28s",
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.overlayBg,
          borderRadius: 24,
          border: `1px solid ${t.overlayBorder}`,
          width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto",
          position: "relative",
          boxShadow: `0 0 0 5px ${t.overlayBg}, 0 5px 0 5px ${G1}, 0 30px 70px rgba(0,0,0,.22)`,
          animation: closing
            ? "springOut .28s cubic-bezier(.34,1,.64,1) both"
            : "springIn .44s cubic-bezier(.34,1.56,.64,1) both",
        }}
      >
        <button onClick={handleClose} style={{
          position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: "50%",
          background: t.chip, border: `1px solid ${t.border}`, cursor: "pointer", fontSize: 13,
          color: t.muted, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2, fontFamily: F,
        }}>✕</button>
        <div style={{ padding: "26px 26px 30px", position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MINI BARS (sparkline-style)
───────────────────────────────────────── */
function MiniBar({ value, max, th }: { value: number; max: number; th: "light" | "dark" }) {
  const t = THEMES[th];
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 4, background: t.border, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{
        width: `${pct}%`, height: "100%", background: GRAD_R, borderRadius: 2,
        animation: "barGrow .5s ease .1s both", transformOrigin: "left",
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   EXPANDED PANELS
───────────────────────────────────────── */

// Analytics expanded
function AnalyticsExpanded({ stats, th }: { stats: Props["stats"]; th: "light" | "dark" }) {
  const t = THEMES[th];
  const { totalProducts, totalCategories } = stats;
  const items = [
    { l: "Produtos", v: totalProducts, d: "no cardápio", c: G1 },
    { l: "Categorias", v: totalCategories, d: "organizadas", c: "#fb923c" },
  ];
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-.4px", marginBottom: 4 }}>Analytics</div>
      <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginBottom: 20 }}>Desempenho do seu cardápio</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {items.map((k, i) => (
          <div key={i} style={{ background: t.surf, borderRadius: 14, padding: "16px 16px 14px", border: `1px solid ${t.border}`, animation: `slideUp .3s ease ${i * .08}s both` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".1em", fontFamily: F, marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-1.2px", lineHeight: 1 }}>{k.v}</div>
            <MiniBar value={k.v} max={Math.max(k.v, 1) * 1.2} th={th} />
            <div style={{ fontSize: 10, color: k.c, fontWeight: 700, fontFamily: F, marginTop: 6 }}>{k.d}</div>
          </div>
        ))}
      </div>
      <div style={{ background: `rgba(0,255,174,.06)`, border: `1px solid rgba(0,255,174,.15)`, borderRadius: 14, padding: "14px 16px", animation: "slideUp .3s ease .2s both" }}>
        <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginBottom: 4 }}>Para métricas de views, acesse o painel de analytics completo em breve.</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: G1, fontFamily: F }}>Em desenvolvimento 🚀</div>
      </div>
    </div>
  );
}

// Plano expanded
function PlanoExpanded({ planLabel, trialDaysLeft, th }: { planLabel: string; trialDaysLeft: number | null; th: "light" | "dark" }) {
  const t = THEMES[th];
  const [annual, setAnnual] = useState(false);
  const isBasic = planLabel === "BASIC";
  const plans = [
    { name: "Basic", mo: 29, yr: 23, curr: isBasic, cta: isBasic ? "Plano Atual" : "Fazer Downgrade", features: ["1 Unidade", "Link /u/slug", "WhatsApp integrado", "QR Code", "Analytics básico"] },
    { name: "Pro", mo: 79, yr: 62, curr: !isBasic, hi: true, cta: isBasic ? "Fazer Upgrade" : "Plano Atual", features: ["Unidades ilimitadas", "Link /u/slug", "WhatsApp integrado", "QR Code", "Analytics avançado", "Domínio próprio", "Vídeos nos produtos", "Suporte prioritário"] },
  ];
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-.4px", marginBottom: 4 }}>Planos FyMenu</div>
      <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginBottom: 20 }}>Escolha o plano ideal para o seu negócio</div>
      {trialDaysLeft !== null && (
        <div style={{ background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12, fontWeight: 700, color: "#fbbf24", fontFamily: F }}>
          ⏳ {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} restantes no teste gratuito
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "10px 14px", background: t.surf, borderRadius: 11, border: `1px solid ${t.border}`, width: "fit-content" }}>
        <span style={{ fontSize: 12, color: annual ? t.muted : t.text, fontWeight: annual ? 500 : 700, fontFamily: F }}>Mensal</span>
        <div onClick={() => setAnnual(a => !a)} style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative", background: annual ? GRAD_R : t.border, transition: "background .22s" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 4, left: annual ? 20 : 4, transition: "left .2s" }} />
        </div>
        <span style={{ fontSize: 12, color: annual ? t.text : t.muted, fontWeight: annual ? 700 : 500, fontFamily: F }}>Anual</span>
        {annual && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, background: "rgba(0,255,174,.12)", color: G1, fontWeight: 800, fontFamily: F, animation: "springIn .3s cubic-bezier(.34,1.56,.64,1) both" }}>Economize 20%</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {plans.map((p, i) => (
          <div key={i} style={{
            background: p.hi ? "linear-gradient(135deg,rgba(0,255,174,.07),rgba(0,255,204,.04))" : t.surf,
            border: `1px solid ${p.hi ? "rgba(0,255,174,.22)" : t.border}`,
            borderRadius: 18, padding: 20,
            boxShadow: p.hi ? `0 0 0 3px rgba(0,255,174,.08), 0 8px 24px rgba(0,0,0,.1)` : "none",
            animation: `slideUp .35s ease ${i * .1}s both`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: t.text, fontFamily: F, marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: F, letterSpacing: "-1px", marginBottom: 4 }}>
              <span style={{ background: GRAD_R, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                R${annual ? p.yr : p.mo}
              </span>
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>/mês</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              {p.features.map((f, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: j < p.features.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: G1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: t.text, fontFamily: F }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{
              width: "100%", padding: "10px", borderRadius: 11, border: "none", cursor: p.curr ? "default" : "pointer",
              background: p.curr ? t.chip : GRAD_R,
              color: p.curr ? t.muted : "#1a1a1c",
              fontWeight: 800, fontSize: 12, fontFamily: F,
              boxShadow: p.curr ? "none" : `0 4px 12px rgba(0,255,174,.24)`,
            }}>{p.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Unidade expanded
function UnidadeExpanded({ units, activeUnit, th }: { units: Props["units"]; activeUnit: Props["activeUnit"]; th: "light" | "dark" }) {
  const t = THEMES[th];
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-.4px", marginBottom: 4 }}>Suas Unidades</div>
      <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginBottom: 20 }}>Gerencie e configure cada unidade</div>
      {units.map((unit: any, i: number) => (
        <div key={unit.id} style={{
          background: unit.id === activeUnit?.id ? "rgba(0,255,174,.05)" : t.surf,
          border: `1px solid ${unit.id === activeUnit?.id ? "rgba(0,255,174,.22)" : t.border}`,
          borderRadius: 14, padding: "14px 16px", marginBottom: 10,
          animation: `fadeUp .26s ease ${i * .05}s both`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: G1, boxShadow: `0 0 5px ${G1}` }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: F }}>{unit.name}</span>
                {unit.id === activeUnit?.id && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(0,255,174,.12)", color: G1, fontWeight: 800, fontFamily: F }}>Ativa</span>}
              </div>
              <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginLeft: 14 }}>fymenu.app/u/{unit.slug}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/u/${unit.slug}`} target="_blank" rel="noreferrer" style={{
                padding: "6px 12px", borderRadius: 9, border: `1px solid ${t.border}`,
                background: "transparent", color: t.muted, fontSize: 11, fontWeight: 700, fontFamily: F,
                textDecoration: "none", whiteSpace: "nowrap",
              }}>Ver ↗</a>
              <Link href="/dashboard/unit" style={{
                padding: "6px 12px", borderRadius: 9, border: "none",
                background: GRAD_R, color: "#1a1a1c", fontSize: 11, fontWeight: 800, fontFamily: F,
                textDecoration: "none", whiteSpace: "nowrap",
              }}>Config</Link>
            </div>
          </div>
        </div>
      ))}
      <Link href="/dashboard/unit" style={{
        display: "block", width: "100%", padding: "11px", borderRadius: 11,
        background: t.surf, border: `1px dashed ${t.border}`,
        color: t.muted, fontWeight: 700, fontSize: 12, fontFamily: F,
        textDecoration: "none", textAlign: "center", boxSizing: "border-box",
        marginTop: 4,
      }}>+ Configurar unidade</Link>
    </div>
  );
}

// Conta expanded
function ContaExpanded({ restaurant, th }: { restaurant: Props["restaurant"]; th: "light" | "dark" }) {
  const t = THEMES[th];
  const initials = (restaurant?.name ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-.4px", marginBottom: 4 }}>Minha Conta</div>
      <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginBottom: 20 }}>Gerencie informações e preferências</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px", background: t.surf, borderRadius: 16, border: `1px solid ${t.border}` }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: GRAD_R, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#1a1a1c", fontFamily: F, flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text, fontFamily: F }}>{restaurant?.name}</div>
          <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginTop: 3 }}>{restaurant?.email ?? "–"}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { href: "/dashboard/account", icon: "👤", label: "Dados pessoais", sub: "Nome, email, senha" },
          { href: "/dashboard/unit", icon: "🏪", label: "Configurar unidade", sub: "Logo, slug, WhatsApp, Instagram" },
          { href: "/dashboard/cardapio", icon: "📋", label: "Gerenciar cardápio", sub: "Categorias e produtos" },
        ].map((item, i) => (
          <Link key={i} href={item.href} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
            background: t.surf, border: `1px solid ${t.border}`, borderRadius: 13,
            textDecoration: "none", animation: `fadeUp .24s ease ${i * .06}s both`,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t.chip, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: F }}>{item.label}</div>
              <div style={{ fontSize: 11, color: t.muted, fontFamily: F, marginTop: 2 }}>{item.sub}</div>
            </div>
            <div style={{ marginLeft: "auto", color: t.muted, fontSize: 16 }}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COLLAPSED CARD COMPONENTS
───────────────────────────────────────── */

// C1 — Stats wide card
function CardStats({ stats, onOpen, th }: { stats: Props["stats"]; onOpen: () => void; th: "light" | "dark" }) {
  const t = THEMES[th];
  const { totalProducts, totalCategories } = stats;
  const items = [
    { l: "Produtos", v: totalProducts, c: G1 },
    { l: "Categorias", v: totalCategories, c: "#fb923c" },
  ];
  return (
    <CardLayout label="Visão Geral" onOpen={onOpen} th={th} glowColor={G1}>
      <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
        {items.map((k, i) => (
          <div key={i} style={{ flex: 1, background: t.surf, borderRadius: 10, padding: "8px 10px", border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.c, fontFamily: F, letterSpacing: "-1px", lineHeight: 1 }}>{k.v}</div>
            <div style={{ fontSize: 8, color: t.muted, fontFamily: F, marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 30 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: G1, animation: "pulse 2s ease infinite", boxShadow: `0 0 4px ${G1}` }} />
        <span style={{ fontSize: 9, color: t.muted, fontFamily: F }}>Analytics completo em breve</span>
      </div>
    </CardLayout>
  );
}

// C2 — Plano card
function CardPlano({ planLabel, trialDaysLeft, onOpen, th }: { planLabel: string; trialDaysLeft: number | null; onOpen: () => void; th: "light" | "dark" }) {
  const t = THEMES[th];
  const isBasic = planLabel === "BASIC";
  return (
    <CardLayout label="Plano Atual" onOpen={onOpen} th={th} glowColor="#818cf8">
      <div style={{ fontSize: 26, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-.5px", marginBottom: 2 }}>{planLabel}</div>
      <div style={{ fontSize: 9, color: t.muted, fontFamily: F, marginBottom: 8 }}>{isBasic ? "1 Unidade · WhatsApp" : "Ilimitado · Todos recursos"}</div>
      {trialDaysLeft !== null && (
        <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700, fontFamily: F, marginBottom: 6 }}>⏳ {trialDaysLeft}d restantes</div>
      )}
      <button style={{ width: "100%", padding: "7px", borderRadius: 10, border: "none", cursor: "pointer", background: GRAD_R, color: "#1a1a1c", fontFamily: F, fontWeight: 800, fontSize: 10, boxShadow: `0 3px 10px rgba(0,255,174,.28)`, marginBottom: 28 }}>
        {isBasic ? "Upgrade →" : "Ver Planos"}
      </button>
    </CardLayout>
  );
}

// C3 — Unidade card
function CardUnidade({ activeUnit, units, onOpen, th }: { activeUnit: Props["activeUnit"]; units: Props["units"]; onOpen: () => void; th: "light" | "dark" }) {
  const t = THEMES[th];
  return (
    <CardLayout label="Unidade Ativa" onOpen={onOpen} th={th}>
      <div style={{ fontSize: 14, fontWeight: 900, color: t.text, fontFamily: F, marginBottom: 3, letterSpacing: "-.3px" }}>{activeUnit?.name}</div>
      <div style={{ fontSize: 9, color: G1, fontFamily: F, marginBottom: 6, fontWeight: 700 }}>/u/{activeUnit?.slug}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: G1, boxShadow: `0 0 5px ${G1}`, animation: "pulse 2s ease infinite" }} />
        <span style={{ fontSize: 9, color: t.muted, fontFamily: F }}>{units.length} unidade{units.length !== 1 ? "s" : ""}</span>
      </div>
      <a href={`/u/${activeUnit?.slug}`} target="_blank" rel="noreferrer" style={{
        display: "block", marginTop: 8, padding: "6px 0", borderRadius: 8, background: t.surf,
        border: `1px solid ${t.border}`, color: t.muted, fontSize: 9, fontWeight: 700, fontFamily: F,
        textDecoration: "none", textAlign: "center", marginBottom: 28,
      }}>Ver ao vivo ↗</a>
    </CardLayout>
  );
}

// C5 — Conta quick card
function CardConta({ restaurant, onOpen, th }: { restaurant: Props["restaurant"]; onOpen: () => void; th: "light" | "dark" }) {
  const t = THEMES[th];
  const initials = (restaurant?.name ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
  return (
    <CardLayout label="Conta" onOpen={onOpen} th={th} glowColor="#818cf8">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, marginTop: 4 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, background: GRAD_R, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#1a1a1c", fontFamily: F }}>
          {initials}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: t.text, fontFamily: F }}>{(restaurant?.name ?? "").split(" ")[0]}</div>
        <div style={{ fontSize: 8, color: t.muted, fontFamily: F, marginTop: 2 }}>Gerenciar conta</div>
      </div>
      <div style={{ marginBottom: 28 }} />
    </CardLayout>
  );
}

/* ─────────────────────────────────────────
   ROOT COMPONENT
───────────────────────────────────────── */
export default function DashboardClient({ restaurant, units, activeUnit, stats }: Props) {
  const [dark, setDark] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const th = dark ? "dark" : "light";
  const t = THEMES[th];
  const { planLabel, trialDaysLeft } = stats;
  const isTrial = trialDaysLeft !== null;
  const initials = (restaurant?.name ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  const EXPANDED: Record<string, React.ReactNode> = {
    analytics: <AnalyticsExpanded stats={stats} th={th} />,
    plano: <PlanoExpanded planLabel={planLabel} trialDaysLeft={trialDaysLeft} th={th} />,
    unidade: <UnidadeExpanded units={units} activeUnit={activeUnit} th={th} />,
    conta: <ContaExpanded restaurant={restaurant} th={th} />,
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: F, padding: "20px 20px 56px", transition: "background .3s" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 980, margin: "0 auto 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: GRAD_R, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#1a1a1c", boxShadow: `0 4px 12px rgba(0,255,174,.3)` }}>F</div>
          <span style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: F, letterSpacing: "-.3px", transition: "color .3s" }}>FyMenu</span>
        </div>
        <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} />
        <div
          onClick={() => setOpen("conta")}
          style={{ width: 32, height: 32, borderRadius: 9, background: GRAD_R, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#1a1a1c", cursor: "pointer", boxShadow: `0 4px 12px rgba(0,255,174,.28)` }}
        >{initials}</div>
      </div>

      {/* ── TRIAL BANNER ── */}
      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div style={{
          maxWidth: 980, margin: "0 auto 14px",
          borderRadius: 14,
          background: trialDaysLeft <= 2 ? "rgba(239,68,68,.12)" : "rgba(251,191,36,.10)",
          border: `1px solid ${trialDaysLeft <= 2 ? "rgba(239,68,68,.3)" : "rgba(251,191,36,.25)"}`,
          padding: "12px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          animation: "slideUp .4s ease both",
        }}>
          <div>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 13, fontFamily: F }}>
              {trialDaysLeft <= 0 ? "Seu período de teste expirou" : `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restantes no teste`}
            </div>
            <div style={{ color: t.muted, fontSize: 11, marginTop: 2, fontFamily: F }}>Ative um plano para continuar publicado</div>
          </div>
          <button onClick={() => setOpen("plano")} style={{
            padding: "8px 16px", borderRadius: 10, border: "none",
            background: GRAD_R, color: "#1a1a1c", fontWeight: 800, fontSize: 12, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
          }}>Ver planos</button>
        </div>
      )}

      {/* ── BENTO GRID — responsivo via .fy-bento ── */}
      <div className="fy-bento" style={{ maxWidth: 980, margin: "0 auto" }}>

        {/* Stats — wide, 2 cols × 2 rows */}
        <div style={{ gridColumn: "span 2", gridRow: "span 2" }}>
          <CardStats stats={stats} onOpen={() => setOpen("analytics")} th={th} />
        </div>

        {/* Plano — 1 col × 2 rows */}
        <div style={{ gridRow: "span 2" }}>
          <CardPlano planLabel={planLabel} trialDaysLeft={trialDaysLeft} onOpen={() => setOpen("plano")} th={th} />
        </div>

        {/* Conta — 1 col × 2 rows */}
        <div style={{ gridRow: "span 2" }}>
          <CardConta restaurant={restaurant} onOpen={() => setOpen("conta")} th={th} />
        </div>

        {/* Unidade — 1 col × 3 rows */}
        <div style={{ gridRow: "span 3" }}>
          <CardUnidade activeUnit={activeUnit} units={units} onOpen={() => setOpen("unidade")} th={th} />
        </div>

        {/* Categorias pill — 1 col × 3 rows */}
        <div style={{ gridRow: "span 3" }}>
          <CategoriasPill th={th} />
        </div>

        {/* Configurar Unidade — link direto, 1 col × 3 rows */}
        <div style={{ gridRow: "span 3" }}>
          <Link href="/dashboard/unit" style={{ display: "block", height: "100%", textDecoration: "none" }}>
            <CardLayout label="Unidade" th={th}>
              <div style={{ fontSize: 13, fontWeight: 900, color: THEMES[th].text, fontFamily: F, marginBottom: 6 }}>Configurar</div>
              {["Logo", "Slug", "WhatsApp", "Instagram", "Endereço"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 4 ? `1px solid ${THEMES[th].border}` : "none" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#fb923c", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: THEMES[th].text, fontFamily: F, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginBottom: 28 }} />
            </CardLayout>
          </Link>
        </div>

        {/* Conta / Account — link direto, 1 col × 3 rows */}
        <div style={{ gridRow: "span 3" }}>
          <Link href="/dashboard/account" style={{ display: "block", height: "100%", textDecoration: "none" }}>
            <CardLayout label="Conta" th={th}>
              <div style={{ fontSize: 13, fontWeight: 900, color: THEMES[th].text, fontFamily: F, marginBottom: 6 }}>Minha Conta</div>
              {["Dados pessoais", "Senha", "Plano", "Faturamento"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 3 ? `1px solid ${THEMES[th].border}` : "none" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: THEMES[th].text, fontFamily: F, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginBottom: 28 }} />
            </CardLayout>
          </Link>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ textAlign: "center", marginTop: 18, maxWidth: 980, margin: "18px auto 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: "rgba(0,255,174,.08)", border: "1px solid rgba(0,255,174,.14)" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: G1, boxShadow: `0 0 4px ${G1}`, animation: "pulse 2s ease infinite" }} />
          <span style={{ fontSize: 9, color: G1, fontWeight: 700, fontFamily: F }}>fymenu.app/u/{activeUnit?.slug}</span>
        </div>
      </div>

      {/* ── OVERLAY ── */}
      {open && EXPANDED[open] && (
        <Overlay onClose={() => setOpen(null)} th={th}>
          {EXPANDED[open]}
        </Overlay>
      )}
    </div>
  );
}
