"use client";

import { useState, useEffect, useRef } from "react";
import VideoShowcase from "@/components/VideoShowcase";

// ── Loader Component ──────────────────────────────────────────────────────────
function PageLoader({ visible, theme }: { visible: boolean; theme: "dark" | "light" }) {
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setMounted(false), 750);
      return () => clearTimeout(t);
    }
  }, [visible]);
  if (!mounted) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: theme === "light" ? "#fafafa" : "#050505",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 24,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      {/* Spinner */}
      <div className={theme === "light" ? "fy-loader fy-loader-light" : "fy-loader"} style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }} />
    </div>
  );
}

// ── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000;
          const increment = target / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: "inherit" }}>
      {count}
      {suffix}
    </div>
  );
}

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  delay,
  theme = "dark",
}: {
  icon: string;
  title: string;
  desc: string;
  delay: number;
  theme?: "dark" | "light";
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className="feature-card"
      data-dot-light=""
      data-dot-radius="200"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Internal radial light — top glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none",
        maskImage: "linear-gradient(to bottom, white 0%, transparent 60%)",
        WebkitMaskImage: "linear-gradient(to bottom, white 0%, transparent 60%)",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: theme === "light"
            ? "radial-gradient(ellipse at top, rgba(0,0,0,0.03) 0%, transparent 70%)"
            : "radial-gradient(ellipse at top, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }} />
      </div>
      <div style={{ fontSize: 36, marginBottom: 16, position: "relative" }}>{icon}</div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "var(--lp-price-color)",
          marginBottom: 8,
          letterSpacing: "-0.3px",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "var(--lp-text)", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ── Pricing Card ──────────────────────────────────────────────────────────────
function PricingCard({
  name,
  price,
  features,
  highlight,
  cta,
  theme = "dark",
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  cta: string;
  theme?: "dark" | "light";
}) {
  return (
    <div
      className={highlight ? "pricing-card pricing-highlight" : "pricing-card"}
    >
      {highlight && <div className="pricing-badge">Popular</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: theme === "dark" ? "#00ffae" : "#d51659", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
        {name}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
        <span style={{ fontSize: 42, fontWeight: 900, color: theme === "dark" ? "#fff" : "#222" }}>{price}</span>
        <span style={{ fontSize: 14, color: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(34,34,34,0.65)" }}>/mês</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, flex: 1 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: theme === "dark" ? "rgba(255,255,255,0.65)" : "rgba(34,34,34,0.65)" }}>
            <span style={{ color: theme === "dark" ? "#00ffae" : "#d51659", fontSize: 16 }}>✓</span>
            {f}
          </div>
        ))}
      </div>
      <button className={highlight ? "btn-primary" : "btn-outline"}>
        {cta}
      </button>
    </div>
  );
}

// ── Pricing Plans Data ────────────────────────────────────────────────────────
const PLANS = {
  menu: {
    name: "Menu", icon: "🍽️", units: "1 unidade",
    prices: { MONTHLY: "199,90", QUARTERLY: "179,90", SEMIANNUALLY: "159,90" },
    totals: { MONTHLY: "199,90", QUARTERLY: "539,70", SEMIANNUALLY: "959,40" },
    savings: { QUARTERLY: "10%", SEMIANNUALLY: "20%" } as Record<string, string>,
    features: ["Cardápio de vídeo 9:16", "Pedidos via WhatsApp", "Link público + QR Code", "Modo TV", "Analytics básico"],
    cta: "Começar agora", highlight: false,
  },
  menupro: {
    name: "MenuPro", icon: "⭐", units: "Até 3 unidades", badge: "MAIS VENDIDO",
    prices: { MONTHLY: "399,90", QUARTERLY: "359,90", SEMIANNUALLY: "319,90" },
    totals: { MONTHLY: "399,90", QUARTERLY: "1.079,70", SEMIANNUALLY: "1.919,40" },
    savings: { QUARTERLY: "10%", SEMIANNUALLY: "20%" } as Record<string, string>,
    features: ["Tudo do Menu +", "Comanda Digital", "Cozinha + Garçom em tempo real", "CRM de clientes", "Analytics avançado com IA", "Relatórios em PDF", "Equipe (garçom + avaliações)", "Estoque básico"],
    cta: "Começar agora", highlight: true,
  },
  business: {
    name: "Business", icon: "🏢", units: "Até 4 unidades", badge: "7 dias grátis",
    prices: { MONTHLY: "1.599", QUARTERLY: "1.399", SEMIANNUALLY: "1.199" },
    totals: { MONTHLY: "1.599", QUARTERLY: "4.197", SEMIANNUALLY: "7.194" },
    savings: { QUARTERLY: "13%", SEMIANNUALLY: "25%" } as Record<string, string>,
    features: ["Tudo do MenuPro +", "Gestão completa de equipe + ponto", "Estoque completo com IA", "CRM com disparo de mensagens", "Financeiro com custos e margens", "Relatórios financeiros com IA", "Hub do gerente"],
    cta: "Testar grátis 7 dias", highlight: false,
  },
} as const;

// ── Plan Card (with hover effects) ───────────────────────────────────────────
type PlanKey = keyof typeof PLANS;
function PlanCard({ planKey, plan, theme }: {
  planKey: PlanKey;
  plan: typeof PLANS[PlanKey];
  theme: "dark" | "light";
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [cycle, setCycle] = useState<"MONTHLY" | "QUARTERLY" | "SEMIANNUALLY">("QUARTERLY");
  const isAccent = plan.highlight; // menupro → cyan/green gradient
  const isPurple = planKey === "menu";
  const isGreen = planKey === "business";
  const dark = theme === "dark";

  // Per-plan accent color tokens
  const rgb = isAccent ? "0,255,174" : isPurple ? "139,92,246" : isGreen ? "212,175,55" : null;
  const hex = isAccent ? "#00ffae" : isPurple ? "#a78bfa" : isGreen ? "#d4af37" : null;
  const hasAccent = isAccent || isPurple || isGreen;

  const shadowBase = hasAccent
    ? dark
      ? `0 0 120px 40px rgba(${rgb},0.03), 0 0 60px 20px rgba(${rgb},0.02), 0 1px 0 rgba(${rgb},0.06) inset, 0 -1px 0 rgba(0,0,0,0.25) inset`
      : isAccent
        ? `0 8px 32px rgba(0,180,122,0.2), 0 0 100px 40px rgba(${rgb},0.02), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset`
        : `0 0 100px 40px rgba(${rgb},0.02), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset`
    : dark
      ? "0 0 80px 30px rgba(255,255,255,0.012), 0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.25) inset"
      : "0 0 80px 30px rgba(0,0,0,0.01), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset";

  const shadowHover = hasAccent
    ? dark
      ? `0 20px 40px rgba(0,0,0,0.3), 0 0 120px 40px rgba(${rgb},0.04), 0 1px 0 rgba(${rgb},0.08) inset, 0 -1px 0 rgba(0,0,0,0.25) inset`
      : `0 20px 40px rgba(0,0,0,0.08), 0 0 100px 40px rgba(${rgb},0.04), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset`
    : dark
      ? "0 20px 40px rgba(0,0,0,0.25), 0 0 80px 30px rgba(255,255,255,0.015), 0 1px 0 rgba(255,255,255,0.05) inset, 0 -1px 0 rgba(0,0,0,0.25) inset"
      : "0 20px 40px rgba(0,0,0,0.06), 0 0 80px 30px rgba(0,0,0,0.015), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset";

  const btnShadowBase = hasAccent
    ? `0 1px 0 rgba(${rgb},0.4) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 2px 8px rgba(0,0,0,0.2)`
    : dark
      ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 2px 4px rgba(0,0,0,0.15)"
      : "0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 2px 4px rgba(0,0,0,0.06)";

  const btnShadowHover = hasAccent
    ? dark
      ? `0 0 0 4px rgba(${rgb},0.12), 0 1px 0 rgba(${rgb},0.4) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 2px 8px rgba(0,0,0,0.2)`
      : `0 0 0 4px rgba(${rgb},0.1), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset`
    : dark
      ? "0 0 0 4px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 2px 4px rgba(0,0,0,0.15)"
      : "0 0 0 4px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.06) inset";

  return (
    // Outer wrapper: holds CSS-class border (::before), transform, mouse events.
    // No overflow:hidden here so pseudo-elements with inset:-2px are fully visible.
    <div
      className=""
      data-dot-light=""
      data-dot-radius="300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: "relative",
        borderRadius: 24,
        height: "100%",
        transform: pressed
          ? "translateY(-4px) scale(0.99)"
          : hovered
            ? "translateY(-8px)"
            : "none",
        transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
      }}
    >
      {/* Inner card: keeps overflow:hidden to clip glow/shine overlays */}
      <div
        style={{
          borderRadius: 24, padding: 32, height: "100%",
          background: dark
            ? (isAccent ? "var(--lp-highlight-bg)" : isGreen ? "rgba(255,255,255,0.04)" : "var(--lp-card-bg)")
            : isAccent
              ? "linear-gradient(135deg, #00b07a, #00d9a0)"
              : isPurple
                ? "linear-gradient(135deg, #8b5cf6, #a78bfa)"
                : isGreen
                  ? "linear-gradient(135deg, #1a1a1a, #2a2a2a)"
                  : "var(--lp-card-bg)",
          backdropFilter: "blur(80px)", WebkitBackdropFilter: "blur(80px)",
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: isGreen
            ? (hovered ? shadowHover + ", 0 0 40px rgba(212,175,55,0.08)" : shadowBase + ", 0 0 40px rgba(212,175,55,0.04)")
            : (hovered ? shadowHover : shadowBase),
          transition: "box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1), background 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Hover glow radial — top */}
        <div style={{
          position: "absolute", inset: -10, pointerEvents: "none",
          background: dark
            ? (hasAccent
              ? `radial-gradient(circle at 50% 0%, rgba(${rgb},0.15) 0%, transparent 70%)`
              : "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)")
            : "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 70%)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.5s ease",
        }} />

        {/* Shine diagonal */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit",
          background: "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
          opacity: hovered ? 1 : 0,
          animation: hovered ? "cardShine 3s infinite linear" : "none",
          transition: "opacity 0.3s ease",
        }} />

        {/* Internal radial light — top glow (static) */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none",
          maskImage: "linear-gradient(to bottom, white 0%, transparent 60%)",
          WebkitMaskImage: "linear-gradient(to bottom, white 0%, transparent 60%)",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: dark
              ? (hasAccent
                ? `radial-gradient(ellipse at top, rgba(${rgb},0.08) 0%, transparent 70%)`
                : "radial-gradient(ellipse at top, rgba(255,255,255,0.04) 0%, transparent 70%)")
              : "radial-gradient(ellipse at top, rgba(255,255,255,0.15) 0%, transparent 70%)",
          }} />
        </div>

        {/* Content (z-index above overlays) */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Inline badge label */}
        {"badge" in plan && plan.badge ? (
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "1px", textAlign: "center",
            marginBottom: 8,
            ...(isAccent
              ? dark
                ? { background: "linear-gradient(135deg, #00ffae, #00d9ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }
                : { display: "inline-block", padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.25)", color: "#fff", WebkitTextFillColor: "#fff" }
              : isGreen
                ? { display: "inline-block", padding: "3px 12px", borderRadius: 999, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "#FFD700" }
                : hex
                  ? { color: hex }
                  : { color: dark ? "#fbbf24" : "#a07800" }),
          }}>
            {plan.badge.toUpperCase()}
          </div>
        ) : (
          <div style={{ height: 18, marginBottom: 8 }} />
        )}

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, ...(isGreen ? { background: "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" } : { color: dark ? "var(--lp-price-color)" : "#fff" }) }}>{plan.name}</div>
          <div style={{ fontSize: 13, color: isGreen ? "#D4AF37" : (dark ? "var(--lp-text-secondary)" : "rgba(255,255,255,0.7)"), marginTop: 2 }}>{plan.units}</div>
        </div>

        {/* Per-card cycle selector */}
        <div style={{
          display: "flex",
          background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)",
          borderRadius: 10, padding: 3, marginBottom: 16, gap: 2,
        }}>
          {([
            { key: "MONTHLY", label: "Mensal" },
            { key: "QUARTERLY", label: "Trimestral" },
            { key: "SEMIANNUALLY", label: "Semestral" },
          ] as const).map((c) => (
            <button
              key={c.key}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCycle(c.key); }}
              style={{
                flex: 1, border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "6px 4px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: cycle === c.key
                  ? dark
                    ? (isGreen ? "#B8860B" : (hex ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.12)"))
                    : "rgba(255,255,255,0.3)"
                  : "transparent",
                color: cycle === c.key
                  ? dark
                    ? (isGreen ? "#000" : (hex ?? "#fff"))
                    : "#fff"
                  : dark
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.5)",
                transition: "all 0.2s ease",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 38, fontWeight: 900, ...(isGreen ? { background: "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" } : { color: dark ? (hex ?? "var(--lp-price-color)") : "#fff" }), transition: "all 0.2s ease" }}>
            R${plan.prices[cycle]}
            <span style={{ fontSize: 14, fontWeight: 400, color: dark ? "var(--lp-text-secondary)" : "rgba(255,255,255,0.7)" }}>/mês</span>
          </div>
          {cycle !== "MONTHLY" && (
            <div style={{
              display: "inline-flex", alignItems: "center", marginTop: 6,
              background: isGreen
                ? "rgba(255,215,0,0.12)"
                : dark
                  ? (hex ? `rgba(${rgb},0.12)` : "rgba(0,255,174,0.1)")
                  : "rgba(255,255,255,0.2)",
              color: isGreen ? "#FFD700" : (dark ? (hex ?? "#00ffae") : "#fff"),
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
            }}>
              Economia de {(plan.savings as Record<string, string>)[cycle]}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, flex: 1 }}>
          {plan.features.map((f) => (
            <div key={f} style={{ fontSize: 14, color: isGreen ? "rgba(255,255,255,0.85)" : (dark ? "var(--lp-text)" : "#fff"), display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isGreen ? "#FFD700" : (dark ? (hex ?? "#00cc8a") : "#fff"), fontSize: 12 }}>✓</span> {f}
            </div>
          ))}
        </div>

        <a href="/cadastro"
          style={{
            display: "block", textAlign: "center", padding: "14px", borderRadius: 14,
            background: isGreen
              ? "linear-gradient(rgba(12,12,12,0.92), rgba(12,12,12,0.92)) padding-box, linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C) border-box"
              : !dark
                ? "#fff"
                : isAccent
                  ? "linear-gradient(135deg, #00ffae, #00d9ff)"
                  : isPurple
                    ? `rgba(${rgb},0.15)`
                    : "var(--lp-btn-bg)",
            color: isGreen
              ? "#D4AF37"
              : !dark
                ? (isAccent ? "#00b07a" : isPurple ? "#8b5cf6" : "var(--lp-btn-color)")
                : (isAccent ? "#000" : (hex ?? "var(--lp-btn-color)")),
            fontWeight: 800, fontSize: 15, textDecoration: "none",
            border: isGreen ? "2px solid transparent" : isPurple ? `1px solid rgba(${rgb},0.3)` : "none",
            boxShadow: hovered ? btnShadowHover : btnShadowBase,
            transform: hovered ? "scale(1.02)" : "scale(1)",
            transition: "all 0.4s ease",
          }}
        >
          {isGreen ? (
            <span style={{ background: "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {plan.cta}
            </span>
          ) : plan.cta}
        </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [heroVisible, setHeroVisible] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // ── Mouse spotlight effect ────────────────────────────────────────────────
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const el = spotlightRef.current;
    let rafId = 0;
    let visible = false;

    function onMove(e: MouseEvent) {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!el) return;
        if (!visible) { el.style.opacity = "1"; visible = true; }
        el.style.background = `radial-gradient(circle 420px at ${e.clientX}px ${e.clientY}px, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 45%, transparent 100%)`;
      });
    }
    function onLeave() { if (el) { el.style.opacity = "0"; visible = false; } }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    const maxWait  = isMobile ? 3000 : 4000;
    const minWait  = 1000; // always show loader at least 1s
    const startTime = Date.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setLoading(false);
      // heroVisible fires after loader finishes fading out (~750ms)
      setTimeout(() => setHeroVisible(true), 800);
    };

    const hardTimeout = setTimeout(finish, maxWait);

    // window.onload as secondary fallback (fires after all resources incl. images)
    window.addEventListener("load", finish, { once: true });

    // Poll for at least one video with metadata ready.
    // readyState >= 1 (HAVE_METADATA) is reliable on iOS Safari even with
    // preload="metadata"; >= 2 (HAVE_CURRENT_DATA) can stall without interaction.
    const poll = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < minWait) return;
      const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video"));
      if (videos.length > 0 && videos.some((v) => v.readyState >= 1)) {
        clearInterval(poll);
        finish();
      }
    }, 200);

    return () => {
      clearTimeout(hardTimeout);
      clearInterval(poll);
      window.removeEventListener("load", finish);
    };
  }, []);

  // ── Theme side-effects: html classes, body bg, meta theme-color ─────────────
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (theme === "light") {
      root.classList.remove("dark", "bg-black");
      root.classList.add("light");
      document.body.style.background = "#fafafa";
      document.body.style.transition = "background 0.5s ease, color 0.5s ease";
      if (meta) meta.content = "#fafafa";
    } else {
      root.classList.remove("light");
      root.classList.add("dark", "bg-black");
      document.body.style.background = "#000";
      document.body.style.transition = "background 0.5s ease, color 0.5s ease";
      if (meta) meta.content = "#050505";
    }

    return () => {
      root.classList.remove("light");
      root.classList.add("dark", "bg-black");
      document.body.style.background = "";
      document.body.style.transition = "";
      if (meta) meta.content = "#050505";
    };
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let mouseX = -1000, mouseY = -1000;
    let ripples: Array<{ x: number; y: number; radius: number; startTime: number }> = [];
    let dots: Array<{ x: number; y: number; opacity: number }> = [];

    // ── Light sources: one circle per significant element ────────────────────
    type LightSource = { x: number; y: number; r: number };
    let lightSources: LightSource[] = [];

    function updateLightSources() {
      if (!canvas) return;
      const isMob = window.innerWidth < 640;
      const mf = isMob ? 0.7 : 1.0;
      const els = document.querySelectorAll<HTMLElement>("[data-dot-light]");
      const sources: LightSource[] = [];
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > -400 && rect.top < canvas.height + 400) {
          const radius = parseInt(el.dataset.dotRadius || "200", 10) * mf;
          sources.push({
            x: rect.left + rect.width  / 2,
            y: rect.top  + rect.height / 2,
            r: radius,
          });
        }
      });
      // Fallback: illuminate viewport center if nothing found yet
      if (sources.length === 0) {
        sources.push({ x: canvas.width / 2, y: canvas.height / 2, r: 400 });
      }
      lightSources = sources;
    }

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      dots = [];
      for (let x = 8; x < canvas.width; x += 16) {
        for (let y = 8; y < canvas.height; y += 16) {
          dots.push({ x, y, opacity: 0.06 });
        }
      }
      updateLightSources();
    }
    resize();
    window.addEventListener("resize", resize);
    let scrollRaf = 0;
    function onScroll() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; updateLightSources(); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function onMouseMove(e: MouseEvent) { mouseX = e.clientX; mouseY = e.clientY; }
    function onTouchMove(e: TouchEvent) { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; }
    function onClick(e: MouseEvent) {
      if (!reducedMotion) ripples.push({ x: e.clientX, y: e.clientY, radius: 0, startTime: performance.now() });
    }
    function onTouchStart(e: TouchEvent) {
      if (!reducedMotion) ripples.push({ x: e.touches[0].clientX, y: e.touches[0].clientY, radius: 0, startTime: performance.now() });
    }

    if (!reducedMotion) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove, { passive: true });
    }
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    const isDarkMode = () =>
      document.documentElement.classList.contains("dark") ||
      !document.documentElement.classList.contains("light");

    const themeObs = new MutationObserver(() => {});
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const MIN_BASE = 0.06;  // dots at edges (~20% visibility)
    const MAX_BASE = 0.34;  // dots over content (+35% from 0.25)

    let animId: number;
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      const RIPPLE_EXPAND_MS = 1200;
      const RIPPLE_TOTAL_MS  = 1500;
      ripples = ripples.filter((r) => {
        const elapsed = now - r.startTime;
        if (elapsed > RIPPLE_TOTAL_MS) return false;
        const progress = Math.min(elapsed / RIPPLE_EXPAND_MS, 1);
        r.radius = 400 * (1 - Math.pow(1 - progress, 3));
        return true;
      });

      const dark = isDarkMode();
      const DOT_RADIUS = 1.0;
      const cw = canvas.width;

      for (const dot of dots) {
        // ── Content-proximity base opacity ────────────────────────────────
        // Each section is an ellipse; pick the strongest illumination.
        let contentFactor = 0;
        for (const src of lightSources) {
          const d = Math.hypot(dot.x - src.x, dot.y - src.y) / src.r; // 0=center, 1=edge, >1=outside
          if (d < 1) contentFactor = Math.max(contentFactor, 1 - d);
        }

        // Horizontal edge vignette: content is always in the center column.
        // Dots near left/right edges are further attenuated regardless.
        const horzEdge = Math.abs(dot.x - cw / 2) / (cw / 2); // 0=center 1=edge
        const horzFactor = Math.max(0, 1 - Math.pow(horzEdge, 1.4));

        const combined  = contentFactor * (0.25 + 0.75 * horzFactor) * horzFactor;
        const baseOpacity = MIN_BASE + (MAX_BASE - MIN_BASE) * Math.min(combined, 1);

        // ── Interactive boosts (mouse + ripple) ───────────────────────────
        let targetOpacity = baseOpacity;

        if (!reducedMotion) {
          const distToMouse = Math.hypot(dot.x - mouseX, dot.y - mouseY);
          if (distToMouse < 120) {
            const t = 1 - distToMouse / 120;
            targetOpacity = Math.max(targetOpacity, baseOpacity + 0.52 * t * t);
          }
        }

        for (const ripple of ripples) {
          const elapsed      = now - ripple.startTime;
          const distToCenter = Math.hypot(dot.x - ripple.x, dot.y - ripple.y);
          const distToRing   = Math.abs(distToCenter - ripple.radius);
          if (distToRing < 80) {
            const waveFactor = 1 - distToRing / 80;
            const fade       = Math.max(0, 1 - elapsed / RIPPLE_TOTAL_MS);
            targetOpacity    = Math.max(targetOpacity, baseOpacity + 0.30 * waveFactor * fade);
          }
        }

        dot.opacity += (targetOpacity - dot.opacity) * 0.08;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(0, 255, 174, ${dot.opacity})`
          : `rgba(5, 5, 5, ${Math.min(dot.opacity * 0.43, 0.25)})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      themeObs.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme === "light" ? "#fafafa" : "#000"}; color: ${theme === "light" ? "#111" : "#fff"}; font-family: 'Montserrat', -apple-system, sans-serif; overflow-x: hidden; font-weight: 500; transition: background 0.5s ease, color 0.5s ease; }

        /* ── Landing CSS vars — dark (default) ── */
        :root {
          --lp-text: #a0a0a0;
          --lp-text-secondary: #787878;
          --lp-text-muted: #505050;
          --lp-check: #00cc8a;
          --lp-check-highlight: #00dda0;
          --lp-card-bg: rgba(10,10,10,0.12);
          --lp-card-border: rgba(255,255,255,0.04);
          --lp-card-shadow: 0 0 80px 20px rgba(255,255,255,0.015), 0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.3) inset;
          --lp-feature-shadow: 0 0 60px 15px rgba(255,255,255,0.01), 0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.2) inset;
          --lp-highlight-bg: rgba(0,40,30,0.15);
          --lp-highlight-border: rgba(0,255,174,0.12);
          --lp-highlight-shadow: 0 0 100px 30px rgba(0,255,174,0.02), 0 0 40px 10px rgba(0,255,174,0.015), 0 1px 0 rgba(0,255,174,0.05) inset, 0 -1px 0 rgba(0,0,0,0.25) inset;
          --lp-price-color: #fff;
          --lp-price-highlight: #00ffae;
          --lp-badge-neutral-bg: rgba(251,191,36,0.15);
          --lp-badge-neutral-color: #fbbf24;
          --lp-btn-bg: rgba(255,255,255,0.04);
          --lp-btn-border: rgba(255,255,255,0.06);
          --lp-btn-color: #fff;
        }
        /* ── Landing CSS vars — light override ── */
        .landing-light {
          --lp-text: #2a2a2a;
          --lp-text-secondary: #4a4a4a;
          --lp-text-muted: #888;
          --lp-check: #00b07a;
          --lp-check-highlight: #009868;
          --lp-card-bg: rgba(255,255,255,0.15);
          --lp-card-border: rgba(0,0,0,0.04);
          --lp-card-shadow: 0 0 80px 20px rgba(0,0,0,0.01), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset;
          --lp-feature-shadow: 0 0 60px 15px rgba(0,0,0,0.01), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset;
          --lp-highlight-bg: rgba(0,200,138,0.06);
          --lp-highlight-border: rgba(0,200,138,0.1);
          --lp-highlight-shadow: 0 0 100px 30px rgba(0,200,138,0.02), 0 -1px 0 rgba(255,255,255,0.6) inset, 0 1px 0 rgba(0,0,0,0.04) inset;
          --lp-price-color: #1a1a1a;
          --lp-price-highlight: #00a87a;
          --lp-badge-neutral-bg: rgba(212,156,0,0.12);
          --lp-badge-neutral-color: #a07800;
          --lp-btn-bg: rgba(0,0,0,0.04);
          --lp-btn-border: rgba(0,0,0,0.06);
          --lp-btn-color: #1a1a1a;
        }

        /* ── Loader ── */
        .fy-loader {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
        }
        .fy-loader::before, .fy-loader::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          filter: drop-shadow(0 0 1rem rgba(0, 255, 174, 0.6));
        }
        .fy-loader::before {
          width: 100%;
          padding-bottom: 100%;
          box-shadow: inset 0 0 0 1rem #00ffae;
          animation: pulsIn 1.8s ease-in-out infinite;
        }
        .fy-loader::after {
          width: calc(100% - 2rem);
          padding-bottom: calc(100% - 2rem);
          box-shadow: 0 0 0 0 #00ffae;
          animation: pulsOut 1.8s ease-in-out infinite;
        }
        @keyframes pulsIn {
          0% { box-shadow: inset 0 0 0 1rem #00ffae; opacity: 1; }
          50%, 100% { box-shadow: inset 0 0 0 0 #00ffae; opacity: 0; }
        }
        @keyframes pulsOut {
          0%, 50% { box-shadow: 0 0 0 0 #00ffae; opacity: 0; }
          100% { box-shadow: 0 0 0 1rem #00ffae; opacity: 1; }
        }

        /* ── Loader — Light Theme ── */
        .fy-loader-light::before, .fy-loader-light::after {
          filter: drop-shadow(0 0 1rem rgba(213, 22, 89, 0.6));
        }
        .fy-loader-light::before {
          box-shadow: inset 0 0 0 1rem #d51659;
          animation: pulsIn-light 1.8s ease-in-out infinite;
        }
        .fy-loader-light::after {
          box-shadow: 0 0 0 0 #d51659;
          animation: pulsOut-light 1.8s ease-in-out infinite;
        }
        @keyframes pulsIn-light {
          0% { box-shadow: inset 0 0 0 1rem #d51659; opacity: 1; }
          50%, 100% { box-shadow: inset 0 0 0 0 #d51659; opacity: 0; }
        }
        @keyframes pulsOut-light {
          0%, 50% { box-shadow: 0 0 0 0 #d51659; opacity: 0; }
          100% { box-shadow: 0 0 0 1rem #d51659; opacity: 1; }
        }

        /* ── Light Theme Overrides ── */
        .landing-light { background: #fafafa !important; color: #111 !important; }
        .landing-light .fy-nav {
          background: linear-gradient(135deg, rgba(213,22,89,0.95), rgba(254,74,44,0.95)) !important;
          border-color: rgba(213,22,89,0.3) !important;
        }
        .landing-light .fy-nav a { color: #fff !important; }
        .landing-light .fy-nav a:hover { color: #fff !important; text-shadow: 0 0 12px rgba(255,255,255,0.5); }
        .landing-light .fy-nav .btn-primary {
          background: #fff !important;
          color: #d51659 !important;
          -webkit-text-fill-color: #d51659 !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15) !important;
        }
        .landing-light .fy-nav .btn-primary:hover {
          background: rgba(255,255,255,0.92) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
        }
        .landing-light h1, .landing-light h2 { color: #222 !important; }
        .landing-light .feature-card {
          background: #fff;
          border-left: 3px solid transparent;
          border-image: linear-gradient(to bottom, #d51659, #fe4a2c) 1;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .landing-light .feature-card:hover {
          background: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .landing-light .pricing-card {
          background: rgba(255,255,255,0.85) !important;
          box-shadow: var(--lp-card-shadow);
        }
        .landing-light .pricing-card:hover {
          background: rgba(255,255,255,1) !important;
        }
        .landing-light .pricing-highlight {
          background: rgba(255,255,255,0.85) !important;
          box-shadow: var(--lp-highlight-shadow);
        }
        .landing-light .pricing-highlight:hover {
          background: rgba(255,255,255,1) !important;
        }
        /* PlanCard inner div — backgrounds now set via inline styles per theme */
        .landing-light .pricing-badge {
          background: linear-gradient(135deg, #d51659, #fe4a2c);
          color: #fff;
        }
        .landing-light .btn-primary {
          background: linear-gradient(145deg, #d51659 0%, #fe4a2c 100%);
          box-shadow: 0 4px 20px rgba(213,22,89,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.1);
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }
        .landing-light .btn-primary:hover {
          box-shadow: 0 8px 32px rgba(213,22,89,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }
        .landing-light .btn-hero {
          background: linear-gradient(135deg, #d51659 0%, #fe4a2c 50%, #d51659 100%);
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
          color: #fff;
          box-shadow: 0 6px 32px rgba(213,22,89,0.3), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.1);
        }
        .landing-light .btn-hero:hover {
          box-shadow: 0 12px 48px rgba(213,22,89,0.45), inset 0 1px 0 rgba(255,255,255,0.35);
        }
        .landing-light .btn-outline {
          border-color: rgba(213,22,89,0.15) !important;
          color: #222 !important;
          font-weight: 700 !important;
          background: rgba(0,0,0,0.02) !important;
        }
        .landing-light .btn-outline:hover {
          border-color: rgba(213,22,89,0.35) !important;
          color: #d51659 !important;
        }
        .landing-light .fy-hero-glow { opacity: 0 !important; }
        .landing-light footer { border-color: rgba(0,0,0,0.06) !important; }
        /* ── Gradient Text (headline only — subtle animated shine) ── */
        .gradient-text-dark {
          background: linear-gradient(90deg, #00ffae 0%, #00d9ff 35%, rgba(255,255,255,0.5) 50%, #00d9ff 65%, #00ffae 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: subtleShine 5s linear infinite;
          will-change: background-position;
        }
        .gradient-text-light {
          background: linear-gradient(90deg, #d51659 0%, #fe4a2c 35%, rgba(255,180,100,0.6) 50%, #fe4a2c 65%, #d51659 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: subtleShine 5s linear infinite;
          will-change: background-position;
        }
        @keyframes subtleShine {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes lp-enter {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-enter-down {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade-scale {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gradient-text-dark, .gradient-text-light { animation: none; }
        }


        /* ── Theme Toggle ── */
        .theme-toggle-landing {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 100;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.3s ease;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .theme-toggle-dark {
          background: rgba(255,255,255,0.08);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .theme-toggle-dark:hover { background: rgba(255,255,255,0.15); }
        .theme-toggle-light {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .theme-toggle-light:hover { background: rgba(0,0,0,0.1); }

        /* ── Buttons ── */
        .btn-primary {
          width: 100%;
          padding: 14px 32px;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          color: #000;
          cursor: pointer;
          background: linear-gradient(145deg, #00ffae 0%, #00d9ff 100%);
          box-shadow: 0 4px 20px rgba(0,255,174,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.1);
          transition: all 0.25s ease;
          transform: translateY(0);
          font-family: inherit;
        }
        .btn-primary:hover {
          box-shadow: 0 8px 32px rgba(0,255,174,0.45), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .btn-primary:active {
          transform: translateY(1px);
          box-shadow: 0 2px 8px rgba(0,255,174,0.2), inset 0 2px 4px rgba(0,0,0,0.15);
        }

        .btn-outline {
          width: 100%;
          padding: 14px 32px;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: rgba(255,255,255,0.04);
          transition: all 0.25s ease;
          font-family: inherit;
        }
        .btn-outline:hover {
          border-color: rgba(0,255,174,0.4);
          background: rgba(0,255,174,0.06);
          color: #00ffae;
        }

        .btn-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 40px;
          border: none;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 800;
          color: #000;
          cursor: pointer;
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 50%, #00ffae 100%);
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
          box-shadow: 0 6px 32px rgba(0,255,174,0.35), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          transform: translateY(0);
          font-family: inherit;
          text-decoration: none;
        }
        .btn-hero:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 48px rgba(0,255,174,0.5), inset 0 1px 0 rgba(255,255,255,0.35);
        }
        .btn-hero:active {
          transform: translateY(1px);
          box-shadow: 0 2px 12px rgba(0,255,174,0.2), inset 0 3px 6px rgba(0,0,0,0.15);
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Feature Cards ── */
        .feature-card {
          padding: 32px;
          border-radius: 20px;
          background: var(--lp-card-bg);
          backdrop-filter: blur(80px);
          -webkit-backdrop-filter: blur(80px);
          transition: all 0.3s ease;
          box-shadow: var(--lp-feature-shadow);
        }
        .feature-card:hover {
          background: rgba(0,255,174,0.03);
          transform: translateY(-4px);
        }

        /* ── Pricing ── */
        .pricing-card {
          padding: 32px;
          border-radius: 20px;
          background: var(--lp-card-bg);
          backdrop-filter: blur(80px);
          -webkit-backdrop-filter: blur(80px);
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.3s ease;
          box-shadow: var(--lp-card-shadow);
        }
        .pricing-card:hover {
          transform: translateY(-4px);
        }
        .pricing-highlight {
          background: var(--lp-highlight-bg);
          box-shadow: var(--lp-highlight-shadow);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #00ffae, #00d9ff);
          color: #000;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── Navbar ── */
        .fy-nav {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 10px 28px;
          border-radius: 999px;
          background: rgba(20,20,20,0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .fy-nav a {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          transition: color 0.2s;
        }
        .fy-nav a:hover { color: #fff; }

        /* ── Glow accent ── */
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Shine Text (static — animation removed from secondary texts) ── */
        .text-shine-dark  { color: rgba(255,255,255,0.6); }
        .text-shine-light { color: rgba(0,0,0,0.55); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .fy-nav { gap: 16px; padding: 10px 20px; }
          .fy-nav a { font-size: 14px; }
          .hero-title { font-size: 36px !important; }
          .hero-sub { font-size: 16px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <PageLoader visible={loading} theme={theme} />

      <div
        className={theme === "light" ? "landing-light" : ""}
        style={{
          minHeight: "100vh", position: "relative",
          background: theme === "light" ? "#fafafa" : "#000",
          transition: "background 0.5s ease, opacity 0.5s ease",
          // Keep content truly invisible while loading — more robust than relying
          // on the fixed PageLoader overlay alone (iOS Safari fixed-pos paint bugs)
          opacity: loading ? 0 : 1,
          visibility: loading ? "hidden" : "visible",
        }}
      >
        <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

        {/* ── Mouse spotlight ── */}
        <div
          ref={spotlightRef}
          style={{
            position: "fixed", inset: 0, pointerEvents: "none",
            zIndex: 1, opacity: 0,
            transition: "opacity 0.4s ease",
            willChange: "background",
          }}
        />

        {/* ── NAVBAR ── */}
        <nav className="fy-nav">
          <img
            src="/images/LOGO-FYMENU-DARK.png"
            alt="FyMenu"
            style={{ height: 28, width: "auto", display: "block", mixBlendMode: "screen" }}
          />
          <a href="#features">Recursos</a>
          <a href="#pricing">Planos</a>
          <a href="/painel" className="btn-primary" style={{ width: "auto", padding: "8px 20px", fontSize: 12, borderRadius: 999, fontWeight: 800, color: theme === "dark" ? "#000" : "#fff", WebkitTextFillColor: theme === "dark" ? "#000" : "#fff" }}>
            Entrar
          </a>
        </nav>

        <div style={heroVisible
          ? { animation: "lp-fade-scale 0.6s cubic-bezier(0.16,1,0.3,1) 0ms both" }
          : { opacity: 0 }}>
          <VideoShowcase />
        </div>

        {/* ── HERO ── */}
        <section
          data-light="hero"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "center",
            padding: "16px 24px 80px",
            position: "relative",
            zIndex: 1,
          }}
        >

          {/* Badge */}
          <div style={heroVisible
            ? { animation: "lp-enter 0.45s cubic-bezier(0.16,1,0.3,1) 100ms both" }
            : { opacity: 0 }}>
            <div
              style={{
                display: "inline-block",
                padding: "6px 18px",
                borderRadius: 999,
                background: theme === "dark" ? "rgba(0,255,174,0.08)" : "rgba(213,22,89,0.06)",
                border: theme === "dark" ? "1px solid rgba(0,255,174,0.2)" : "1px solid rgba(213,22,89,0.15)",
                fontSize: 13,
                fontWeight: 600,
                color: theme === "dark" ? "#00ffae" : "#d51659",
                marginBottom: 32,
              }}
            >
              📱 Cardápio digital que vende
            </div>
          </div>

          {/* Headline */}
          <h1
            className="hero-title"
            data-dot-light=""
            data-dot-radius="250"
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              maxWidth: 800,
              margin: "0 auto 24px",
              textAlign: "center",
              ...(heroVisible
                ? { animation: "lp-enter 0.5s cubic-bezier(0.16,1,0.3,1) 200ms both" }
                : { opacity: 0 }),
            }}
          >
            Primeiro cardápio de vídeo{" "}
            <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"}>
              para restaurantes
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="hero-sub"
            data-dot-light=""
            data-dot-radius="200"
            style={{
              fontSize: 20,
              maxWidth: 560,
              margin: "0 auto 48px",
              lineHeight: 1.6,
              textAlign: "center",
              color: theme === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)",
              ...(heroVisible
                ? { animation: "lp-enter 0.45s cubic-bezier(0.16,1,0.3,1) 320ms both" }
                : { opacity: 0 }),
            }}
          >
            Sistema de pedidos com análise de dados, gestão financeira, implementação de IA e infraestrutura interna completa para sua empresa.
          </p>

          {/* CTAs */}
          <div
            data-dot-light=""
            data-dot-radius="180"
            style={{
              display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap",
              ...(heroVisible
                ? { animation: "lp-enter 0.45s cubic-bezier(0.16,1,0.3,1) 440ms both" }
                : { opacity: 0 }),
            }}
          >
              <a href="/cadastro" className="btn-hero">
                Começar grátis →
              </a>
              <a
                href="#features"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 32px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                Ver recursos
              </a>
            </div>
        </section>

        {/* ── STATS ── */}
        <section
          data-light="stats"
          style={{
            padding: "80px 24px 80px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="stats-grid"
            style={{
              maxWidth: 900,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 32,
              textAlign: "center",
              ...(heroVisible
                ? { animation: "lp-enter 0.45s cubic-bezier(0.16,1,0.3,1) 560ms both" }
                : { opacity: 0 }),
            }}
          >
            {[
              { value: 500, suffix: "+", label: "Restaurantes" },
              { value: 12, suffix: "K", label: "Pedidos/mês" },
              { value: 98, suffix: "%", label: "Uptime" },
              { value: 4, suffix: ".8⭐", label: "Avaliação" },
            ].map((s) => (
              <div key={s.label} data-dot-light="" data-dot-radius="130">
                <AnimatedCounter target={s.value} suffix={s.suffix} />
                <div style={{ fontSize: 15, marginTop: 8, fontWeight: 600, color: theme === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          data-light="features"
          style={{
            padding: "80px 24px 120px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              data-dot-light=""
              data-dot-radius="250"
              style={{
                fontSize: 40,
                fontWeight: 900,
                letterSpacing: "-1px",
                marginBottom: 16,
              }}
            >
              Tudo que seu restaurante{" "}
              <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"}>
                precisa
              </span>
            </h2>
            <p style={{ fontSize: 16, maxWidth: 500, margin: "0 auto", color: theme === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)" }}>
              Funcionalidades pensadas para maximizar vendas e simplificar operações.
            </p>
          </div>

          <div
            className="features-grid"
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            <FeatureCard icon="📱" title="Cardápio 9:16" desc="Design mobile-first com vídeo e swipe. UX estilo reels para engajar clientes." delay={0} theme={theme} />
            <FeatureCard icon="📊" title="Analytics em tempo real" desc="12 eventos de tracking, tempo de atenção por produto e taxa de conversão." delay={100} theme={theme} />
            <FeatureCard icon="🤖" title="IA integrada" desc="Geração automática de descrições, sugestões de upsell e análise do cardápio." delay={200} theme={theme} />
            <FeatureCard icon="📺" title="Modo TV" desc="Autoplay vertical ou horizontal. Ideal para telas no restaurante." delay={300} theme={theme} />
            <FeatureCard icon="📦" title="Pedidos WhatsApp" desc="Pedido estruturado direto pelo WhatsApp com variações e upsell." delay={400} theme={theme} />
            <FeatureCard icon="🏭" title="Hub de operações" desc="Cozinha, garçom e comanda digital em tempo real com Supabase Realtime." delay={500} theme={theme} />
          </div>
        </section>

        {/* ── PRICING ── */}
        <section
          id="pricing"
          data-light="pricing"
          style={{
            padding: "80px 24px 120px",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          {/* Background light blobs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{
              position: "absolute", top: "-30%", left: "30%", width: "40%", height: "120%",
              background: theme === "light"
                ? "radial-gradient(50% 50% at 50% 50%, rgba(0,200,138,0.025) 0%, transparent 100%)"
                : "radial-gradient(50% 50% at 50% 50%, rgba(0,255,174,0.03) 0%, transparent 100%)",
              transform: "rotate(-15deg)",
            }} />
            <div style={{
              position: "absolute", top: "-40%", left: "10%", width: "30%", height: "100%",
              background: theme === "light"
                ? "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.01) 0%, transparent 100%)"
                : "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.015) 0%, transparent 100%)",
              transform: "rotate(-30deg)",
            }} />
          </div>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2
              data-dot-light=""
              data-dot-radius="250"
              style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0 }}
            >
              Planos que cabem no seu restaurante
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
              Monte seu cardápio grátis. Publique quando estiver pronto.
            </p>
          </div>

          {/* Plan cards */}
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", alignItems: "stretch", gap: 20, maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
            {(Object.keys(PLANS) as PlanKey[]).map((key) => (
              <PlanCard key={key} planKey={key} plan={PLANS[key]} theme={theme} />
            ))}
          </div>
        </section>

        {/* ── CTA Final ── */}
        <section
          data-light="cta"
          style={{
            padding: "120px 24px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="glow-orb" style={{ width: 500, height: 500, background: theme === "dark" ? "rgba(0,255,174,0.06)" : "rgba(213,22,89,0.04)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

          <h2
            data-dot-light=""
            data-dot-radius="250"
            style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px", marginBottom: 16 }}
          >
            Pronto pra{" "}
            <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"}>
              vender mais?
            </span>
          </h2>
          <p style={{ fontSize: 16, maxWidth: 400, margin: "0 auto 40px", color: theme === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)" }}>
            Comece grátis por 7 dias. Sem cartão de crédito.
          </p>
          <a href="/cadastro" className="btn-hero" data-dot-light="" data-dot-radius="180">
            Criar meu cardápio →
          </a>
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            padding: "40px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <img
              src={theme === "dark" ? "/images/LOGO-FYMENU-DARK.png" : "/images/LOGO-FYMENU-LIGHT.png"}
              alt="FyMenu"
              style={{ height: 24, width: "auto", display: "block", mixBlendMode: theme === "dark" ? "screen" : "multiply" }}
            />
            <a href="#features" style={{ color: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(34,34,34,0.65)", textDecoration: "none", fontSize: 15 }}>Recursos</a>
            <a href="#pricing" style={{ color: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(34,34,34,0.65)", textDecoration: "none", fontSize: 15 }}>Planos</a>
            <a href="/entrar" style={{ color: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(34,34,34,0.65)", textDecoration: "none", fontSize: 15 }}>Entrar</a>
          </div>
          <div style={{ marginTop: 20, fontSize: 14, color: theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(34,34,34,0.2)" }}>
            © {new Date().getFullYear()} FyMenu — Todos os direitos reservados.
          </div>
        </footer>

        {/* Theme Toggle */}
        <button
          className={`theme-toggle-landing ${theme === "dark" ? "theme-toggle-dark" : "theme-toggle-light"}`}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </>
  );
}
