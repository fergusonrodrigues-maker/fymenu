"use client";

import { useState } from "react";
import { PLANS as PLAN_DEFS, type BillingCycle, type PlanCode } from "@/lib/plans";
import { formatCents } from "@/lib/money";
import type { OnboardingData } from "./OnboardingClient";

const cycleToCanonical: Record<"monthly" | "quarterly" | "semiannual", BillingCycle> = {
  monthly: "monthly",
  quarterly: "quarterly",
  semiannual: "semestral",
};

function planPriceCents(planKey: PlanCode, cycle: "monthly" | "quarterly" | "semiannual"): number {
  return PLAN_DEFS[planKey].prices[cycleToCanonical[cycle]];
}

interface StepPlanProps {
  restaurantId: string;
  data: OnboardingData;
  onBack: () => void;
}

export default function StepPlan({
  restaurantId,
  data,
  onBack,
}: StepPlanProps) {
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "quarterly" | "semiannual">("quarterly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = [
    {
      key: "menu" as PlanCode,
      name: PLAN_DEFS.menu.name,
      description: "Vitrine premium + Analytics IA",
      color: "#00ffae",
      features: [
        `Até ${PLAN_DEFS.menu.maxUnits} unidades`,
        "Cardápio de vídeo 9:16",
        "Categorias com horário",
        "Modo TV autoplay",
        "Analytics com IA",
        "Relatório em PDF",
      ],
      trial: PLAN_DEFS.menu.hasTrial,
      cta: "Acessar grátis",
    },
    {
      key: "menupro" as PlanCode,
      name: PLAN_DEFS.menupro.name,
      description: "Operação Restaurante completa",
      color: "#00d9ff",
      popular: true,
      features: [
        `Até ${PLAN_DEFS.menupro.maxUnits} unidades`,
        "Pedidos via WhatsApp + iFood",
        "Comanda digital + Cozinha realtime",
        "CRM básico",
        "Estoque básico",
        "Financeiro delivery + mesa",
      ],
      trial: PLAN_DEFS.menupro.hasTrial,
      cta: "Testar 7 dias grátis",
    },
    {
      key: "business" as PlanCode,
      name: PLAN_DEFS.business.name,
      description: "Gestão Completa",
      color: "#a855f7",
      features: [
        `${PLAN_DEFS.business.maxUnits} unidades fixo`,
        "Equipe completa + ponto + salários",
        "Estoque com ficha técnica + IA",
        "CRM com disparo",
        "Financeiro com custos + balanço + IA",
        "Chatbot IA WhatsApp",
        "Portal do gerente",
      ],
      trial: PLAN_DEFS.business.hasTrial,
      cta: "Testar 7 dias grátis",
    },
  ];

  async function handleSelectPlan(planKey: string) {
    setLoading(true);
    setError(null);

    // 1. PRIMEIRO: gravar profile + membership + unit
    //    (precisa rodar antes de qualquer window.location.href que mate o JS)
    try {
      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
          document: data.document,
          restaurantName: data.restaurant_name,
          whatsapp: data.whatsapp,
          instagram: data.instagram,
        }),
      });
      if (!completeRes.ok) {
        const json = await completeRes.json().catch(() => ({}));
        setError(json.error || "Erro ao salvar dados. Tente novamente.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Erro de conexão ao salvar dados. Tente novamente.");
      setLoading(false);
      return;
    }

    // 2. DEPOIS: ativar plano grátis OU cobrar via Asaas
    if (planKey === "menu") {
      const res = await fetch("/api/plan/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, plan: "menu" }),
      });

      if (res.ok) {
        window.location.href = "/painel";
      } else {
        setError("Erro ao ativar plano. Tente novamente.");
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/plan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          plan: planKey,
          cycle: selectedCycle,
          coupon_code: data.coupon_code || undefined,
        }),
      });

      const respData = await res.json().catch(() => ({}));
      if (res.ok && respData.checkoutUrl) {
        window.location.href = respData.checkoutUrl;
        return;
      }
      if (res.ok && respData.complimentary) {
        window.location.href = "/painel?msg=complimentary";
        return;
      }
      setError(respData?.error || "Erro ao processar. Tente novamente.");
      setLoading(false);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      {/* Header com Voltar */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-start",
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            background: "transparent",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            fontWeight: 700,
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
          }}
        >
          ← Voltar
        </button>
      </div>

      {error && (
        <div
          style={{
            width: "100%",
            maxWidth: 960,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(255,80,80,0.1)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#ff6b6b",
            fontSize: 13,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {/* Seletor de ciclo */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 14,
          marginBottom: 32,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {[
          { key: "monthly", label: "Mensal" },
          { key: "quarterly", label: "Trimestral", badge: "-15%" },
          { key: "semiannual", label: "Semestral", badge: "-30%" },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() =>
              setSelectedCycle(c.key as "monthly" | "quarterly" | "semiannual")
            }
            style={{
              padding: "8px 18px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background:
                selectedCycle === c.key
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color:
                selectedCycle === c.key ? "#fff" : "rgba(255,255,255,0.3)",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.2s",
            }}
          >
            {c.label}
            {c.badge && selectedCycle === c.key && (
              <span
                style={{
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "rgba(0,255,174,0.1)",
                  color: "#00ffae",
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                {c.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards de planos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          maxWidth: 960,
          width: "100%",
        }}
      >
        {plans.map((plan) => {
          const priceCents = planPriceCents(plan.key, selectedCycle);
          return (
            <div
              key={plan.key}
              style={{
                padding: 28,
                borderRadius: 24,
                background:
                  plan.popular
                    ? "rgba(0,217,255,0.03)"
                    : plan.key === "business"
                    ? "rgba(168,85,247,0.03)"
                    : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  plan.popular
                    ? "rgba(0,217,255,0.12)"
                    : plan.key === "business"
                    ? "rgba(168,85,247,0.12)"
                    : "rgba(255,255,255,0.06)"
                }`,
                position: "relative",
                boxShadow: plan.popular
                  ? "0 0 40px rgba(0,217,255,0.05)"
                  : plan.key === "business"
                  ? "0 0 40px rgba(168,85,247,0.05)"
                  : "none",
              }}
            >
              {/* Badge popular */}
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "4px 14px",
                    borderRadius: 8,
                    background: "rgba(0,217,255,0.12)",
                    color: "#00d9ff",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    border: "1px solid rgba(0,217,255,0.2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Mais popular
                </div>
              )}

              {/* Nome + descrição */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: plan.color,
                  marginBottom: 4,
                }}
              >
                {plan.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 20,
                }}
              >
                {plan.description}
              </div>

              {/* Preço */}
              <div style={{ marginBottom: 20 }}>
                <span
                  style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}
                >
                  {formatCents(priceCents)}
                </span>
                <span
                  style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}
                >
                  /mês
                </span>
              </div>

              {/* Features */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                {plan.features.map((f, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: `${plan.color}15`,
                        color: plan.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(plan.key)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 14,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background:
                    plan.key === "business"
                      ? "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.08))"
                      : plan.popular
                      ? "linear-gradient(135deg, rgba(0,217,255,0.15), rgba(0,217,255,0.08))"
                      : "rgba(0,255,174,0.08)",
                  color: plan.color,
                  fontSize: 15,
                  fontWeight: 800,
                  boxShadow: `0 1px 0 ${plan.color}15 inset, 0 -1px 0 rgba(0,0,0,0.15) inset`,
                  opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Processando..." : plan.cta}
              </button>

              {/* Trial info */}
              {plan.trial && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 8,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.2)",
                  }}
                >
                  7 dias grátis, cancele quando quiser
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
