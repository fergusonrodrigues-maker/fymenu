"use client";

import { ChefHat } from "lucide-react";

const ACCENT = "#FF6B00";

export default function CardapioEmPreparacao({
  restaurantName,
}: {
  restaurantName: string;
  slug: string;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Montserrat, system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes prep-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
      `}</style>

      <header
        style={{
          padding: "20px 24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <a
          href="https://fymenu.com"
          target="_blank"
          rel="noreferrer"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.5px",
            textDecoration: "none",
          }}
        >
          FyMenu
        </a>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px 32px",
          textAlign: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(circle at center, ${ACCENT}22 0%, transparent 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: ACCENT,
            animation: "prep-pulse 2.4s ease-in-out infinite",
          }}
        >
          <ChefHat size={64} strokeWidth={1.5} />
        </div>

        <div style={{ maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              margin: 0,
              color: "#fff",
            }}
          >
            Cardápio em preparação
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.6)",
              margin: 0,
            }}
          >
            <strong style={{ color: "rgba(255,255,255,0.85)" }}>{restaurantName}</strong>{" "}
            ainda está montando o cardápio digital. Em breve você poderá ver e pedir por aqui.
          </p>
        </div>

        <div
          style={{
            marginTop: 8,
            padding: "16px 20px",
            borderRadius: 14,
            border: `1px solid ${ACCENT}55`,
            background: `${ACCENT}0d`,
            maxWidth: 380,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
            É o dono desse cardápio?
          </div>
          <a
            href="https://fymenu.com/painel"
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              background: ACCENT,
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
              letterSpacing: "0.2px",
            }}
          >
            Acessar o painel pra ativar →
          </a>
        </div>
      </main>

      <footer
        style={{
          padding: "16px 24px 24px",
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: 11,
        }}
      >
        Powered by{" "}
        <a
          href="https://fymenu.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontWeight: 600 }}
        >
          FyMenu
        </a>{" "}
        — Cardápio digital para restaurantes
      </footer>
    </div>
  );
}
