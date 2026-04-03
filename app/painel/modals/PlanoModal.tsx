"use client";

import { Restaurant } from "../types";

const PLANS = [
  {
    key: "menu",
    name: "Menu",
    price: "R$ 199,90",
    suffix: "/mês",
    features: ["1 unidade", "Cardápio de vídeo", "WhatsApp + tracking", "Modo TV", "Analytics básico"],
    highlight: false,
  },
  {
    key: "menupro",
    name: "MenuPro",
    price: "R$ 399,90",
    suffix: "/mês",
    label: "MAIS VENDIDO",
    features: ["Até 3 unidades", "Comanda Digital", "Cozinha + Garçom Realtime", "CRM de clientes", "Analytics com IA", "Estoque básico"],
    highlight: true,
  },
  {
    key: "business",
    name: "Business",
    price: "R$ 1.599",
    suffix: "/mês",
    label: "7 DIAS GRÁTIS",
    features: ["Até 4 unidades", "Equipe completa + ponto", "Estoque com IA", "CRM + disparos", "Financeiro com custos", "Relatórios com IA"],
    highlight: false,
  },
];

export default function PlanoModal({ restaurant }: { restaurant: Restaurant; trialDays: number; onUpgrade: () => void; onClose: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Plano atual */}
      <div style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(0,255,174,0.06)", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Plano atual</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 4 }}>
          {restaurant.plan === "menu" ? "Menu" : restaurant.plan === "menupro" ? "MenuPro" : restaurant.plan === "business" ? "Business" : restaurant.plan ?? "Nenhum"}
        </div>
        {restaurant.free_access && <span style={{ fontSize: 11, color: "#00ffae", marginTop: 2, display: "block" }}>Acesso gratuito ativo</span>}
        {restaurant.status === "trial" && <span style={{ fontSize: 11, color: "#fbbf24", marginTop: 2, display: "block" }}>Período de teste</span>}
      </div>

      {/* Cards dos planos */}
      {PLANS.map(plan => (
        <div key={plan.key} style={{
          borderRadius: 18, padding: "20px 18px", marginBottom: 12,
          background: plan.highlight ? "rgba(0,255,174,0.04)" : "rgba(255,255,255,0.03)",
          boxShadow: plan.highlight
            ? "0 1px 0 rgba(0,255,174,0.06) inset, 0 -1px 0 rgba(0,0,0,0.2) inset"
            : "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
          position: "relative",
        }}>
          {plan.label && (
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
              background: "linear-gradient(135deg, #00ffae, #00d9ff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", marginBottom: 6,
            }}>
              {plan.label}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{plan.name}</div>
              <div style={{
                fontSize: 13,
                color: plan.highlight ? "rgba(0,255,174,0.8)" : "rgba(255,255,255,0.5)",
                fontWeight: 700, marginTop: 2,
              }}>
                {plan.price}<span style={{ fontSize: 11, fontWeight: 400 }}>{plan.suffix}</span>
              </div>
            </div>
            {restaurant.plan === plan.key ? (
              <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 11, fontWeight: 700 }}>Atual</span>
            ) : (
              <button
                onClick={() => window.location.href = "/painel/planos"}
                style={{
                  padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: plan.highlight ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.06)",
                  color: plan.highlight ? "#00ffae" : "rgba(255,255,255,0.5)",
                  fontSize: 12, fontWeight: 700,
                  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                }}
              >
                {plan.key === "business" ? "Testar grátis" : "Assinar"}
              </button>
            )}
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            {plan.features.map(f => (
              <div key={f} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "rgba(0,255,174,0.5)" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
