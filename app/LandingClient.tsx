"use client";

import { useState, useEffect, useRef } from "react";

// ── Loader Component ──────────────────────────────────────────────────────────
function PageLoader({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.5s ease",
      }}
    >
      <div className="fy-loader" />
    </div>
  );
}

// ── Dot Reveal Background ─────────────────────────────────────────────────────
function DotRevealBG({ isDark }: { isDark: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <div className={isDark ? "dot-grid-dark" : "dot-grid-light"} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDark
            ? "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.95) 100%)"
            : "radial-gradient(circle at 50% 50%, transparent 0%, rgba(250,250,250,0.5) 50%, rgba(250,250,250,0.9) 100%)",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDark
            ? "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.95) 100%)"
            : "linear-gradient(to bottom, rgba(250,250,250,0.85) 0%, transparent 30%, transparent 70%, rgba(250,250,250,0.9) 100%)",
          zIndex: 2,
        }}
      />
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
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: theme === "dark" ? "#fff" : "#222",
          marginBottom: 8,
          letterSpacing: "-0.3px",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, color: theme === "dark" ? "rgba(255,255,255,0.45)" : "rgba(34,34,34,0.45)", lineHeight: 1.6 }}>{desc}</p>
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
        <span style={{ fontSize: 14, color: theme === "dark" ? "rgba(255,255,255,0.4)" : "rgba(34,34,34,0.4)" }}>/mês</span>
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

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [heroVisible, setHeroVisible] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setHeroVisible(true), 100);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; color: #fff; font-family: 'Montserrat', -apple-system, sans-serif; overflow-x: hidden; font-weight: 500; }

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

        /* ── Dot Grid Background ── */
        .dot-grid-dark {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(0,255,174,0.4) 1.5px, transparent 1.5px);
          background-size: 22px 22px;
          animation: dotFadeIn 3s ease forwards;
          opacity: 0;
          filter: drop-shadow(0 0 6px rgba(0,255,174,0.45));
        }
        .dot-grid-light {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(213,22,89,0.22) 1.5px, transparent 1.5px);
          background-size: 22px 22px;
          animation: dotFadeIn 3s ease forwards;
          opacity: 0;
          filter: drop-shadow(0 0 5px rgba(213,22,89,0.25));
        }
        @keyframes dotFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* ── Light Theme Overrides ── */
        .landing-light { background: #fafafa !important; color: #111 !important; }
        .landing-light .fy-nav {
          background: rgba(255,255,255,0.75) !important;
          border-color: rgba(213,22,89,0.1) !important;
        }
        .landing-light .fy-nav a { color: rgba(34,34,34,0.5) !important; }
        .landing-light .fy-nav a:hover { color: #222 !important; }
        .landing-light h1, .landing-light h2 { color: #222 !important; }
        .landing-light .feature-card {
          background: rgba(0,0,0,0.015);
          border-color: rgba(213,22,89,0.08);
        }
        .landing-light .feature-card:hover {
          border-color: rgba(213,22,89,0.2);
          background: rgba(213,22,89,0.03);
        }
        .landing-light .pricing-card {
          background: rgba(0,0,0,0.015);
          border-color: rgba(213,22,89,0.1);
          color: #222 !important;
        }
        .landing-light .pricing-card:hover {
          border-color: rgba(213,22,89,0.25);
        }
        .landing-light .pricing-highlight {
          border-color: rgba(213,22,89,0.3);
          background: rgba(213,22,89,0.03);
          box-shadow: 0 0 60px rgba(213,22,89,0.06);
        }
        .landing-light .pricing-badge {
          background: linear-gradient(135deg, #d51659, #fe4a2c);
          color: #fff;
        }
        .landing-light .btn-primary {
          background: linear-gradient(145deg, #d51659 0%, #fe4a2c 100%);
          box-shadow: 0 4px 20px rgba(213,22,89,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.1);
          color: #fff;
        }
        .landing-light .btn-primary:hover {
          box-shadow: 0 8px 32px rgba(213,22,89,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
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
        .landing-light footer { border-color: rgba(0,0,0,0.06) !important; }
        /* ── Gradient Text ── */
        .gradient-text-dark {
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-light {
          background: linear-gradient(135deg, #d51659 0%, #fe4a2c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
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
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          border-color: rgba(0,255,174,0.2);
          background: rgba(0,255,174,0.03);
          transform: translateY(-4px);
        }

        /* ── Pricing ── */
        .pricing-card {
          padding: 32px;
          border-radius: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.3s ease;
        }
        .pricing-card:hover {
          border-color: rgba(0,255,174,0.2);
          transform: translateY(-4px);
        }
        .pricing-highlight {
          border-color: rgba(0,255,174,0.3);
          background: rgba(0,255,174,0.04);
          box-shadow: 0 0 60px rgba(0,255,174,0.08);
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
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 13px;
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

        /* ── Shine Text Effect ── */
        .text-shine-dark {
          background: linear-gradient(to right, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.9) 15%, rgba(255,255,255,0.35) 30%);
          background-position: 0;
          background-size: 400px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textShine 6s infinite linear;
        }
        .text-shine-light {
          background: linear-gradient(to right, rgba(34,34,34,0.35) 0%, rgba(34,34,34,0.85) 15%, rgba(34,34,34,0.35) 30%);
          background-position: 0;
          background-size: 400px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textShine 6s infinite linear;
        }
        @keyframes textShine {
          0% { background-position: 0; }
          60% { background-position: 400px; }
          100% { background-position: 400px; }
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .fy-nav { gap: 16px; padding: 10px 20px; }
          .fy-nav a { font-size: 12px; }
          .hero-title { font-size: 36px !important; }
          .hero-sub { font-size: 16px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <PageLoader visible={loading} />

      <div className={theme === "light" ? "landing-light" : ""} style={{ minHeight: "100vh", position: "relative", background: theme === "light" ? "#fafafa" : "#000", transition: "background 0.5s ease" }}>
        <DotRevealBG isDark={theme === "dark"} />

        {/* ── NAVBAR ── */}
        <nav className="fy-nav">
          <div style={{ fontWeight: 900, fontSize: 18, color: "#00ffae", letterSpacing: "-0.5px" }}>
            FyMenu
          </div>
          <a href="#features">Recursos</a>
          <a href="#pricing">Planos</a>
          <a href="/painel" className="btn-primary" style={{ width: "auto", padding: "8px 20px", fontSize: 12, borderRadius: 999, fontWeight: 800, color: theme === "dark" ? "#000" : "#fff", WebkitTextFillColor: theme === "dark" ? "#000" : "#fff" }}>
            Entrar
          </a>
        </nav>

        {/* ── HERO ── */}
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "120px 24px 80px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Glow orbs */}
          <div className="glow-orb" style={{ width: 400, height: 400, background: theme === "dark" ? "rgba(0,255,174,0.08)" : "rgba(213,22,89,0.04)", top: "20%", left: "10%" }} />
          <div className="glow-orb" style={{ width: 300, height: 300, background: theme === "dark" ? "rgba(0,217,255,0.06)" : "rgba(254,74,44,0.04)", bottom: "20%", right: "10%" }} />

          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(40px)",
              transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
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

            <h1
              className="hero-title"
              style={{
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-2px",
                maxWidth: 800,
                margin: "0 auto 24px",
              }}
            >
              Seu cardápio.{" "}
              <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"}>
                Inteligente.
              </span>
            </h1>

            <p
              className={`hero-sub ${theme === "dark" ? "text-shine-dark" : "text-shine-light"}`}
              style={{
                fontSize: 20,
                maxWidth: 560,
                margin: "0 auto 48px",
                lineHeight: 1.6,
              }}
            >
              Cardápio digital com vídeo, swipe, analytics e IA.
              Feito para restaurantes que querem converter mais.
            </p>

            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
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
          </div>
        </section>

        {/* ── STATS ── */}
        <section
          style={{
            padding: "80px 24px",
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
            }}
          >
            {[
              { value: 500, suffix: "+", label: "Restaurantes" },
              { value: 12, suffix: "K", label: "Pedidos/mês" },
              { value: 98, suffix: "%", label: "Uptime" },
              { value: 4, suffix: ".8⭐", label: "Avaliação" },
            ].map((s) => (
              <div key={s.label}>
                <AnimatedCounter target={s.value} suffix={s.suffix} />
                <div className={theme === "dark" ? "text-shine-dark" : "text-shine-light"} style={{ fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          style={{
            padding: "80px 24px 120px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
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
            <p className={theme === "dark" ? "text-shine-dark" : "text-shine-light"} style={{ fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
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
          style={{
            padding: "80px 24px 120px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontSize: 40,
                fontWeight: 900,
                letterSpacing: "-1px",
                marginBottom: 16,
              }}
            >
              Planos simples,{" "}
              <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"}>
                resultado real
              </span>
            </h2>
          </div>

          <div
            className="pricing-grid"
            style={{
              maxWidth: 900,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <PricingCard
              name="Starter"
              price="R$ 97"
              features={["1 unidade", "Cardápio delivery", "Pedidos WhatsApp", "Analytics básico", "Modo TV"]}
              cta="Começar agora"
              theme={theme}
            />
            <PricingCard
              name="Pro"
              price="R$ 197"
              features={["Múltiplas unidades", "Analytics avançado", "IA integrada", "Relatórios completos", "Hub de operações", "Suporte prioritário"]}
              highlight
              cta="Quero o Pro"
              theme={theme}
            />
            <PricingCard
              name="Pro+"
              price="R$ 397"
              features={["Tudo do Pro", "PDV integrado", "CRM + WhatsApp", "Comanda digital", "Consultoria IA", "API dedicada"]}
              highlight
              cta="Fale conosco"
              theme={theme}
            />
          </div>
        </section>

        {/* ── CTA Final ── */}
        <section
          style={{
            padding: "120px 24px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="glow-orb" style={{ width: 500, height: 500, background: theme === "dark" ? "rgba(0,255,174,0.06)" : "rgba(213,22,89,0.04)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px", marginBottom: 16 }}>
            Pronto pra{" "}
            <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"}>
              vender mais?
            </span>
          </h2>
          <p className={theme === "dark" ? "text-shine-dark" : "text-shine-light"} style={{ fontSize: 16, maxWidth: 400, margin: "0 auto 40px" }}>
            Comece grátis por 7 dias. Sem cartão de crédito.
          </p>
          <a href="/cadastro" className="btn-hero">
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
            <span className={theme === "dark" ? "gradient-text-dark" : "gradient-text-light"} style={{ fontWeight: 900, fontSize: 18 }}>FyMenu</span>
            <a href="#features" style={{ color: theme === "dark" ? "rgba(255,255,255,0.4)" : "rgba(34,34,34,0.4)", textDecoration: "none", fontSize: 13 }}>Recursos</a>
            <a href="#pricing" style={{ color: theme === "dark" ? "rgba(255,255,255,0.4)" : "rgba(34,34,34,0.4)", textDecoration: "none", fontSize: 13 }}>Planos</a>
            <a href="/entrar" style={{ color: theme === "dark" ? "rgba(255,255,255,0.4)" : "rgba(34,34,34,0.4)", textDecoration: "none", fontSize: 13 }}>Entrar</a>
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(34,34,34,0.2)" }}>
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
