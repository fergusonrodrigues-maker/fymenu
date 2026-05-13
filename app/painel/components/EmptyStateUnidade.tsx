"use client";

import { Store } from "lucide-react";

interface Props {
  onCreateClick: () => void;
}

export default function EmptyStateUnidade({ onCreateClick }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px 100px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 24,
          background: "var(--dash-card)",
          border: "1px solid var(--dash-border)",
          boxShadow: "var(--dash-shadow)",
          backdropFilter: "blur(60px)",
          WebkitBackdropFilter: "blur(60px)",
          padding: "36px 28px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(22,163,74,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--dash-accent)",
          }}
        >
          <Store size={36} />
        </div>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--dash-text)",
              marginBottom: 8,
              letterSpacing: "-0.3px",
            }}
          >
            Crie sua primeira unidade
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--dash-text-muted)",
              lineHeight: 1.6,
            }}
          >
            Sua unidade é o ponto de venda do seu cardápio. Pode ser
            restaurante, food truck, cafeteria — qualquer lugar que venda
            comida.
          </div>
        </div>
        <button
          onClick={onCreateClick}
          style={{
            padding: "14px 32px",
            borderRadius: 12,
            border: "none",
            background: "#16a34a",
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.2px",
            boxShadow: "0 4px 20px rgba(22,163,74,0.25)",
            transition: "opacity 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          + Nova Unidade
        </button>
      </div>
    </div>
  );
}
