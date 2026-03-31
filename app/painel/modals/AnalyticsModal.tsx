"use client";

import { Unit } from "../types";

export default function AnalyticsModal({ analytics, unit }: { analytics: any; unit: Unit | null }) {
  const stats = [
    { label: "Visitas ao cardápio", value: analytics.views, icon: "👁", color: "#00ffae", desc: "últimos 7 dias" },
    { label: "Cliques em produtos", value: analytics.clicks, icon: "👆", color: "#60a5fa", desc: "últimos 7 dias" },
    { label: "Pedidos enviados", value: analytics.orders, icon: "✅", color: "#f472b6", desc: "últimos 7 dias" },
  ];
  const conversion = analytics.views > 0 ? ((analytics.orders / analytics.views) * 100).toFixed(1) : "0.0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {stats.map((s) => (
        <div key={s.label} className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 28 }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--dash-text-dim)", fontSize: 12 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <div className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)" }}>
        <div style={{ color: "var(--dash-text-dim)", fontSize: 12, marginBottom: 4 }}>Taxa de conversão</div>
        <div style={{ color: "var(--dash-text)", fontSize: 32, fontWeight: 900 }}>{conversion}%</div>
        <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>visitas → pedidos</div>
      </div>
      {unit && (
        <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 14, background: "var(--dash-link-bg)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)", color: "var(--dash-text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>
          Ver cardápio público ↗
        </a>
      )}
    </div>
  );
}
