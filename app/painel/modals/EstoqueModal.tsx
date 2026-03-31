"use client";

import { Unit, StockStats } from "../types";

export default function EstoqueModal({ unit, stockStats }: { unit: Unit | null; stockStats: StockStats }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div className="modal-neon-card" style={{ borderRadius: 16, padding: "20px", background: "var(--dash-card)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#f87171", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stockStats.out}</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>Esgotados</div>
          </div>
          <div style={{ width: 1, background: "var(--dash-separator)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fbbf24", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stockStats.low}</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>Estoque baixo</div>
          </div>
        </div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16 }}>Gerencie o estoque dos seus produtos e acompanhe movimentações.</div>
        <a href="/painel/estoque" style={{ display: "block", padding: "12px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          Gerenciar estoque →
        </a>
      </div>
      <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card-subtle)" }}>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>📊 Ajuste estoque · Registre movimentações · Configure alertas</div>
      </div>
    </div>
  );
}
