"use client";

import { useState } from "react";
import { Restaurant } from "../types";

type Cycle = "monthly" | "quarterly" | "semiannual";

function formatPlanPrice(price: number): string {
  if (price >= 1000) {
    return `R$${price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  }
  return `R$${price.toFixed(2).replace(".", ",")}`;
}

const PLANS = [
  {
    key: "menu",
    name: "Menu",
    tagline: "Cardápio digital profissional",
    prices: { monthly: 199.90, quarterly: 179.90, semiannual: 159.90 },
    accent: "#00ffae",
    accentRgb: "0,255,174",
    gradientFrom: "rgba(0,255,174,0.08)",
    gradientTo: "rgba(0,255,174,0.02)",
    borderColor: "rgba(0,255,174,0.12)",
    features: [
      "1 unidade",
      "Cardápio de vídeo 9:16",
      "Categorias com horário",
      "Pedidos via WhatsApp",
      "Analytics básico",
      "Modo TV autoplay",
      "Link personalizado",
    ],
    trial: false,
    ctaNoplan: "Acessar grátis",
    ctaUpgrade: "Mudar pra Menu",
  },
  {
    key: "menupro",
    name: "MenuPro",
    tagline: "Gestão completa do restaurante",
    prices: { monthly: 399.90, quarterly: 359.90, semiannual: 319.90 },
    accent: "#00d9ff",
    accentRgb: "0,217,255",
    gradientFrom: "rgba(0,217,255,0.08)",
    gradientTo: "rgba(0,217,255,0.02)",
    borderColor: "rgba(0,217,255,0.12)",
    popular: true,
    features: [
      "Até 3 unidades",
      "Comanda Digital",
      "Cozinha + Garçom Realtime",
      "CRM de clientes",
      "Analytics com IA",
      "Estoque básico",
      "Relatórios em PDF",
      "Portal do garçom",
    ],
    trial: false,
    ctaNoplan: "Assinar MenuPro",
    ctaUpgrade: "Upgrade → MenuPro",
  },
  {
    key: "business",
    name: "Business",
    tagline: "Operação profissional completa",
    prices: { monthly: 1599, quarterly: 1399, semiannual: 1199 },
    accent: "#a855f7",
    accentRgb: "168,85,247",
    gradientFrom: "rgba(168,85,247,0.08)",
    gradientTo: "rgba(168,85,247,0.02)",
    borderColor: "rgba(168,85,247,0.12)",
    features: [
      "Até 4 unidades",
      "Equipe completa + ponto",
      "Estoque com IA",
      "CRM + disparos automáticos",
      "Financeiro com custos e margens",
      "Relatórios financeiros com IA",
      "Hub do gerente",
      "Portal completo funcionários",
    ],
    trial: true,
    ctaNoplan: "Testar 7 dias grátis",
    ctaUpgrade: "Upgrade → Business",
  },
];

export default function PlanoModal({
  restaurant,
}: {
  restaurant: Restaurant;
  trialDays?: number;
  onUpgrade?: () => void;
  onClose?: () => void;
}) {
  const [planCycle, setPlanCycle] = useState<Cycle>("quarterly");
  const [planLoading, setPlanLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentPlan = (restaurant?.plan as string | null) ?? null;
  const hasActivePlan =
    !!currentPlan &&
    (restaurant?.status === "active" ||
      restaurant?.status === "trial" ||
      restaurant?.free_access);

  async function handleSelectPlan(planKey: string) {
    setPlanLoading(true);
    try {
      const endpoint =
        planKey === "menu" && !hasActivePlan
          ? "/api/plan/activate"
          : "/api/plan/checkout";

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
      const res = await fetch("/api/plan/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          plan: "cancel",
        }),
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

  const currentPlanData = PLANS.find((p) => p.key === currentPlan);

  if (showCancelConfirm) {
    return (
      <div style={{ paddingTop: 8 }}>
        <div
          style={{
            padding: 24,
            borderRadius: 20,
            background: "rgba(248,113,113,0.05)",
            border: "1px solid rgba(248,113,113,0.12)",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: "#f87171",
              marginBottom: 8,
            }}
          >
            Cancelar plano?
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--dash-text-muted)",
              lineHeight: 1.6,
            }}
          >
            Seu cardápio ficará offline e você perderá acesso às
            funcionalidades do plano{" "}
            {currentPlanData ? currentPlanData.name : ""}.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleCancelPlan}
            disabled={planLoading}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 14,
              border: "none",
              cursor: planLoading ? "not-allowed" : "pointer",
              background: "rgba(248,113,113,0.1)",
              color: "#f87171",
              fontSize: 14,
              fontWeight: 900,
              opacity: planLoading ? 0.5 : 1,
            }}
          >
            {planLoading ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
          <button
            onClick={() => setShowCancelConfirm(false)}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "1px solid var(--dash-border)",
              background: "transparent",
              color: "var(--dash-text-muted)",
              fontSize: 13,
              fontWeight: 700,
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
    <div style={{ paddingTop: 8 }}>
      {/* Status do plano atual */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 16,
          marginBottom: 20,
          textAlign: "center",
          background: hasActivePlan
            ? `rgba(${currentPlanData?.accentRgb ?? "0,255,174"},0.04)`
            : "rgba(248,113,113,0.04)",
          border: `1px solid ${
            hasActivePlan
              ? `rgba(${currentPlanData?.accentRgb ?? "0,255,174"},0.1)`
              : "rgba(248,113,113,0.1)"
          }`,
        }}
      >
        {hasActivePlan ? (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: currentPlanData?.accent ?? "var(--dash-accent)",
              }}
            >
              Plano {currentPlanData?.name ?? currentPlan} ativo
            </div>
            {restaurant?.status === "trial" && restaurant?.trial_ends_at && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--dash-text-muted)",
                  marginTop: 4,
                }}
              >
                Trial até{" "}
                {new Date(restaurant.trial_ends_at).toLocaleDateString(
                  "pt-BR"
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}
            >
              Nenhum plano ativo
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--dash-text-muted)",
                marginTop: 4,
              }}
            >
              Escolha um plano pra publicar seu cardápio
            </div>
          </>
        )}
      </div>

      {/* Seletor de ciclo */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          marginBottom: 20,
          background: "var(--dash-card)",
          borderRadius: 14,
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
              padding: "10px 8px",
              borderRadius: 12,
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
              fontWeight: 700,
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
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "var(--dash-accent-soft)",
                  color: "var(--dash-accent)",
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                {c.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards dos planos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PLANS.map((plan) => {
          const price = plan.prices[planCycle];
          const isCurrent =
            currentPlan === plan.key &&
            (restaurant?.status === "active" ||
              restaurant?.status === "trial" ||
              restaurant?.free_access);
          const isUpgrade =
            !hasActivePlan ||
            (currentPlan === "menu" && plan.key !== "menu") ||
            (currentPlan === "menupro" && plan.key === "business");

          return (
            <div
              key={plan.key}
              style={{
                padding: 24,
                borderRadius: 20,
                background: isCurrent
                  ? `linear-gradient(135deg, ${plan.gradientFrom}, ${plan.gradientTo})`
                  : "var(--dash-card)",
                border: `1px solid ${
                  isCurrent ? plan.borderColor : "var(--dash-border)"
                }`,
                position: "relative",
                overflow: "hidden",
                boxShadow: isCurrent
                  ? `0 0 40px rgba(${plan.accentRgb},0.06)`
                  : "var(--dash-shadow)",
                transition: "all 0.3s",
              }}
            >
              {/* Glow de fundo para Business */}
              {plan.key === "business" && (
                <div
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: "rgba(168,85,247,0.06)",
                    filter: "blur(40px)",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Badges */}
              {isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 14,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: `rgba(${plan.accentRgb},0.1)`,
                    color: plan.accent,
                    fontSize: 9,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    border: `1px solid rgba(${plan.accentRgb},0.15)`,
                  }}
                >
                  Atual
                </div>
              )}
              {(plan as any).popular && !isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 14,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: `rgba(${plan.accentRgb},0.1)`,
                    color: plan.accent,
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: 1,
                    border: `1px solid rgba(${plan.accentRgb},0.15)`,
                  }}
                >
                  Popular
                </div>
              )}

              {/* Header: Nome + Preço */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 20,
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
                    {plan.tagline}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 900,
                        color: "var(--dash-text)",
                        lineHeight: 1,
                      }}
                    >
                      {formatPlanPrice(price)}
                    </span>
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

              {/* Features em pills */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginBottom: 18,
                }}
              >
                {plan.features.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: `rgba(${plan.accentRgb},0.05)`,
                      color: `rgba(${plan.accentRgb},0.75)`,
                      fontSize: 10,
                      fontWeight: 600,
                      border: `1px solid rgba(${plan.accentRgb},0.08)`,
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
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={planLoading}
                    style={{
                      width: "100%",
                      padding: 16,
                      borderRadius: 14,
                      border: "none",
                      cursor: planLoading ? "not-allowed" : "pointer",
                      background:
                        plan.key === "business"
                          ? "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.08))"
                          : plan.key === "menupro"
                          ? "linear-gradient(135deg, rgba(0,217,255,0.15), rgba(0,217,255,0.06))"
                          : `rgba(${plan.accentRgb},0.08)`,
                      color: plan.accent,
                      fontSize: 14,
                      fontWeight: 900,
                      boxShadow: `0 1px 0 rgba(${plan.accentRgb},0.12) inset, 0 -1px 0 rgba(0,0,0,0.15) inset`,
                      opacity: planLoading ? 0.5 : 1,
                      transition: "all 0.2s",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {planLoading
                      ? "Processando..."
                      : !hasActivePlan
                      ? plan.ctaNoplan
                      : isUpgrade
                      ? plan.ctaUpgrade
                      : `Mudar pra ${plan.name}`}
                  </button>
                  {plan.trial && !hasActivePlan && (
                    <div
                      style={{
                        textAlign: "center",
                        marginTop: 8,
                        fontSize: 10,
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
                    padding: 14,
                    borderRadius: 14,
                    textAlign: "center",
                    background: `rgba(${plan.accentRgb},0.06)`,
                    color: plan.accent,
                    fontSize: 13,
                    fontWeight: 800,
                    border: `1px solid rgba(${plan.accentRgb},0.1)`,
                  }}
                >
                  ✓ Plano atual
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelar plano */}
      {hasActivePlan && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            marginTop: 20,
            border: "1px solid rgba(248,113,113,0.1)",
            background: "transparent",
            color: "rgba(248,113,113,0.4)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancelar plano
        </button>
      )}
    </div>
  );
}
