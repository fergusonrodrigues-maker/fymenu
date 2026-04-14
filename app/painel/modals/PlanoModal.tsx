"use client";

import { useState } from "react";
import { Restaurant } from "../types";

function planLabel(plan: string | null | undefined): string {
  if (plan === "business") return "Business";
  if (plan === "menupro") return "MenuPro";
  if (plan === "menu") return "Menu";
  return plan ?? "";
}

const PLANS = [
  {
    key: "menu",
    name: "Menu",
    description: "Cardápio digital profissional",
    prices: { monthly: 129, quarterly: 104, semiannual: 89 },
    accent: "#00ffae",
    accentSoft: "rgba(0,255,174,0.06)",
    accentBorder: "rgba(0,255,174,0.12)",
    features: ["1 unidade", "Cardápio de vídeo", "Pedidos WhatsApp", "Analytics básico", "Modo TV"],
    trial: false,
  },
  {
    key: "menupro",
    name: "MenuPro",
    description: "Gestão completa do restaurante",
    prices: { monthly: 249, quarterly: 219, semiannual: 179 },
    accent: "#00d9ff",
    accentSoft: "rgba(0,217,255,0.06)",
    accentBorder: "rgba(0,217,255,0.12)",
    popular: true,
    features: ["Até 3 unidades", "Comanda Digital", "Cozinha + Garçom", "CRM", "Analytics IA", "PDF"],
    trial: false,
  },
  {
    key: "business",
    name: "Business",
    description: "Operação profissional completa",
    prices: { monthly: 1090, quarterly: 999, semiannual: 849 },
    accent: "#a855f7",
    accentSoft: "rgba(168,85,247,0.06)",
    accentBorder: "rgba(168,85,247,0.12)",
    features: ["Até 4 unidades", "Equipe + ponto", "Estoque IA", "CRM + disparos", "Financeiro custos", "Relatórios IA"],
    trial: true,
  },
];

type Cycle = "monthly" | "quarterly" | "semiannual";

export default function PlanoModal({
  restaurant,
}: {
  restaurant: Restaurant;
  trialDays?: number;
  onUpgrade?: () => void;
  onClose?: () => void;
}) {
  const [planCycle, setPlanCycle] = useState<Cycle>("monthly");
  const [planLoading, setPlanLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentPlan = restaurant?.plan ?? null;
  const isNoPlan =
    !currentPlan ||
    currentPlan === "none" ||
    (restaurant?.status !== "active" &&
      restaurant?.status !== "trial" &&
      !restaurant?.free_access);

  async function handlePlanAction(planKey: string) {
    setPlanLoading(true);
    try {
      const endpoint =
        planKey === "menu" ? "/api/plan/activate" : "/api/plan/checkout";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          plan: planKey,
          cycle: planCycle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          window.location.reload();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erro ao processar plano");
      }
    } catch {
      alert("Erro de conexão");
    }
    setPlanLoading(false);
  }

  async function handleCancelPlan() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erro ao cancelar plano");
      }
    } catch {
      alert("Erro de conexão");
    }
    setPlanLoading(false);
    setShowCancelConfirm(false);
  }

  if (showCancelConfirm) {
    return (
      <div style={{ paddingTop: 8 }}>
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.12)",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f87171", marginBottom: 8 }}>
            Cancelar plano?
          </div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)", lineHeight: 1.5 }}>
            Seu cardápio ficará offline e você perderá acesso às funcionalidades do plano.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleCancelPlan}
            disabled={planLoading}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              border: "none",
              cursor: planLoading ? "not-allowed" : "pointer",
              background: "rgba(248,113,113,0.1)",
              color: "#f87171",
              fontSize: 14,
              fontWeight: 800,
              opacity: planLoading ? 0.5 : 1,
            }}
          >
            {planLoading ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
          <button
            onClick={() => setShowCancelConfirm(false)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--dash-border)",
              background: "transparent",
              color: "var(--dash-text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingTop: 8 }}>
      {/* Status do plano atual */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: isNoPlan
            ? "rgba(248,113,113,0.06)"
            : "var(--dash-accent-soft)",
          border: `1px solid ${
            isNoPlan ? "rgba(248,113,113,0.12)" : "var(--dash-accent-border)"
          }`,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isNoPlan ? "#f87171" : "var(--dash-accent)",
          }}
        >
          {isNoPlan
            ? "Nenhum plano ativo"
            : `Plano ${planLabel(currentPlan)} ativo`}
        </div>
        {isNoPlan && (
          <div
            style={{
              fontSize: 11,
              color: "var(--dash-text-muted)",
              marginTop: 4,
            }}
          >
            Assine um plano pra publicar seu cardápio
          </div>
        )}
        {!isNoPlan && restaurant?.status === "trial" && restaurant?.trial_ends_at && (
          <div
            style={{
              fontSize: 11,
              color: "var(--dash-text-muted)",
              marginTop: 4,
            }}
          >
            Trial até{" "}
            {new Date(restaurant.trial_ends_at).toLocaleDateString("pt-BR")}
          </div>
        )}
      </div>

      {/* Seletor de ciclo */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "var(--dash-card)",
          borderRadius: 12,
          marginBottom: 20,
          border: "1px solid var(--dash-border)",
        }}
      >
        {[
          { key: "monthly", label: "Mensal" },
          { key: "quarterly", label: "Trimestral", badge: "-15%" },
          { key: "semiannual", label: "Semestral", badge: "-30%" },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => setPlanCycle(c.key as Cycle)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background:
                planCycle === c.key
                  ? "var(--dash-card-hover)"
                  : "transparent",
              color:
                planCycle === c.key
                  ? "var(--dash-text)"
                  : "var(--dash-text-muted)",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              transition: "all 0.2s",
            }}
          >
            {c.label}
            {c.badge && planCycle === c.key && (
              <span
                style={{
                  padding: "1px 4px",
                  borderRadius: 4,
                  background: "var(--dash-accent-soft)",
                  color: "var(--dash-accent)",
                  fontSize: 8,
                  fontWeight: 800,
                }}
              >
                {c.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards dos planos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PLANS.map((plan) => {
          const price = plan.prices[planCycle];
          const isCurrent =
            currentPlan === plan.key &&
            (restaurant?.status === "active" ||
              restaurant?.status === "trial" ||
              restaurant?.free_access);

          return (
            <div
              key={plan.key}
              style={{
                padding: 20,
                borderRadius: 18,
                background: isCurrent
                  ? plan.accentSoft
                  : "var(--dash-card)",
                border: `1px solid ${
                  isCurrent ? plan.accentBorder : "var(--dash-border)"
                }`,
                position: "relative",
                boxShadow: isCurrent
                  ? `0 0 30px ${plan.accentSoft}`
                  : "var(--dash-shadow)",
              }}
            >
              {/* Badges */}
              {isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    right: 16,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: plan.accentSoft,
                    color: plan.accent,
                    fontSize: 9,
                    fontWeight: 800,
                    border: `1px solid ${plan.accentBorder}`,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Atual
                </div>
              )}
              {plan.popular && !isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    right: 16,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: plan.accentSoft,
                    color: plan.accent,
                    fontSize: 9,
                    fontWeight: 800,
                    border: `1px solid ${plan.accentBorder}`,
                  }}
                >
                  Popular
                </div>
              )}

              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: plan.accent,
                    }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--dash-text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {plan.description}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: "var(--dash-text)",
                      lineHeight: 1,
                    }}
                  >
                    R${price}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--dash-text-muted)",
                      marginTop: 2,
                    }}
                  >
                    /mês
                  </div>
                </div>
              </div>

              {/* Features compactas */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginBottom: 14,
                }}
              >
                {plan.features.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: plan.accentSoft,
                      color: plan.accent,
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>

              {/* CTA */}
              {!isCurrent ? (
                <>
                  <button
                    onClick={() => handlePlanAction(plan.key)}
                    disabled={planLoading}
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      border: "none",
                      cursor: planLoading ? "not-allowed" : "pointer",
                      background:
                        plan.key === "business"
                          ? "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.06))"
                          : plan.key === "menupro"
                          ? "linear-gradient(135deg, rgba(0,217,255,0.12), rgba(0,217,255,0.06))"
                          : "rgba(0,255,174,0.08)",
                      color: plan.accent,
                      fontSize: 13,
                      fontWeight: 800,
                      boxShadow: `0 1px 0 ${plan.accent}10 inset, 0 -1px 0 rgba(0,0,0,0.12) inset`,
                      opacity: planLoading ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {planLoading
                      ? "Processando..."
                      : isNoPlan && plan.key === "menu"
                      ? "Acessar grátis"
                      : isNoPlan && plan.trial
                      ? "Testar 7 dias grátis"
                      : isNoPlan
                      ? `Assinar ${plan.name}`
                      : currentPlan === "menu" && plan.key !== "menu"
                      ? `Upgrade → ${plan.name}`
                      : currentPlan === "menupro" && plan.key === "business"
                      ? `Upgrade → ${plan.name}`
                      : `Mudar pra ${plan.name}`}
                  </button>
                  {plan.trial && isNoPlan && (
                    <div
                      style={{
                        textAlign: "center",
                        marginTop: 6,
                        fontSize: 9,
                        color: "var(--dash-text-muted)",
                      }}
                    >
                      7 dias grátis, cancele quando quiser
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    textAlign: "center",
                    background: plan.accentSoft,
                    color: plan.accent,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Plano atual
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelar plano */}
      {!isNoPlan && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            marginTop: 16,
            border: "1px solid rgba(248,113,113,0.12)",
            background: "transparent",
            color: "rgba(248,113,113,0.5)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Cancelar plano
        </button>
      )}
    </div>
  );
}
