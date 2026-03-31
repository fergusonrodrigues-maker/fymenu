"use client";

import { useState } from "react";
import { changePlan } from "../actions";
import { Restaurant } from "../types";

export default function PlanoModal({ restaurant, trialDays, onUpgrade, onClose }: { restaurant: Restaurant; trialDays: number; onUpgrade: () => void; onClose: () => void }) {
  const isPro = restaurant.plan === "pro";
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<"downgrade" | null>(null);

  async function handleDowngrade() {
    setLoading(true);
    try {
      await changePlan("basic");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Status atual */}
      <div style={{ borderRadius: 16, padding: "20px", background: isPro ? "linear-gradient(135deg, rgba(250,204,21,0.08), rgba(251,146,60,0.08))" : "var(--dash-card)", border: isPro ? "1px solid rgba(250,204,21,0.2)" : "1px solid var(--dash-card-border)" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{isPro ? "⭐" : "🎯"}</div>
        <div style={{ color: "var(--dash-text)", fontSize: 18, fontWeight: 800 }}>{isPro ? "Plano Pro" : restaurant.status === "trial" ? "Trial ativo" : "Plano Basic"}</div>
        {restaurant.status === "trial" && <div style={{ color: "#fbbf24", fontSize: 13, marginTop: 4 }}>⏳ {trialDays} dia{trialDays !== 1 ? "s" : ""} restante{trialDays !== 1 ? "s" : ""}</div>}
        {isPro && <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 4 }}>Acesso completo a todos os recursos</div>}
      </div>

      {/* Usuário Pro: opções de gerenciamento */}
      {isPro && (
        <>
          {confirm === "downgrade" ? (
            <div style={{ borderRadius: 16, padding: "20px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Confirmar downgrade?</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                Você voltará para o Plano Basic. Unidades extras e recursos Pro ficarão inacessíveis.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirm(null)}
                  disabled={loading}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--dash-card-border)", background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDowngrade}
                  disabled={loading}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "rgba(248,113,113,0.2)", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? "Aguarde..." : "Confirmar downgrade"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)", border: "1px solid var(--dash-card-border)" }}>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Gerenciar assinatura</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16 }}>
                Para dúvidas sobre cobrança, entre em contato pelo suporte.
              </div>
              <button
                onClick={() => setConfirm("downgrade")}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(248,113,113,0.3)", background: "transparent", color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Voltar para o Plano Basic
              </button>
            </div>
          )}
        </>
      )}

      {/* Usuário não-Pro: mostrar planos disponíveis */}
      {!isPro && (
        <>
          {[
            { name: "Basic", price: "Grátis", features: ["1 unidade", "Cardápio digital", "Modo TV", "IA básica"], color: "var(--dash-link-bg)", highlight: false },
            { name: "Pro", price: "R$ 99/mês", features: ["Múltiplas unidades", "Analytics avançado", "Relatórios", "Suporte prioritário"], color: "rgba(0,255,174,0.06)", highlight: true },
          ].map((plan) => (
            <div key={plan.name} style={{ borderRadius: 16, padding: "18px 20px", background: plan.color, border: plan.highlight ? "1px solid rgba(0,255,174,0.2)" : "1px solid var(--dash-card-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 800 }}>{plan.name}</div>
                <div style={{ color: plan.highlight ? "#00ffae" : "var(--dash-text-dim)", fontSize: 14, fontWeight: 700 }}>{plan.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ color: "var(--dash-text-dim)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: plan.highlight ? "#00ffae" : "var(--dash-text-subtle)" }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {plan.highlight && (
                <button
                  onClick={onUpgrade}
                  style={{
                    marginTop: 16, width: "100%", padding: "13px",
                    borderRadius: 12, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #00ffae, #00d9b8)",
                    color: "#000", fontWeight: 800, fontSize: 14,
                  }}
                >
                  Fazer Upgrade →
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
