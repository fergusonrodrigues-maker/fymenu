"use client";

import { useState } from "react";

function formatPlanPrice(price: number): string {
  if (price >= 1000) {
    return `R$${price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  }
  return `R$${price.toFixed(2).replace(".", ",")}`;
}

interface ConfigurarClientProps {
  restaurantId: string;
  restaurantName: string;
  currentPlan: string | null;
}

export default function ConfigurarClient({
  restaurantId,
  restaurantName,
  currentPlan,
}: ConfigurarClientProps) {
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "quarterly" | "semiannual">("quarterly");
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      key: "menu",
      name: "Menu",
      description: "Cardápio digital profissional",
      prices: { monthly: 199.90, quarterly: 179.90, semiannual: 159.90 },
      color: "#00ffae",
      features: [
        "1 unidade",
        "Cardápio de vídeo 9:16",
        "Pedidos via WhatsApp",
        "Analytics básico",
        "Modo TV",
        "Link personalizado",
      ],
      trial: false,
      cta: "Acessar grátis",
    },
    {
      key: "menupro",
      name: "MenuPro",
      description: "Gestão completa do restaurante",
      prices: { monthly: 399.90, quarterly: 359.90, semiannual: 319.90 },
      color: "#00d9ff",
      popular: true,
      features: [
        "Até 3 unidades",
        "Comanda Digital",
        "Cozinha + Garçom Realtime",
        "CRM de clientes",
        "Analytics com IA",
        "Estoque básico",
        "Relatórios em PDF",
      ],
      trial: false,
      cta: "Assinar MenuPro",
    },
    {
      key: "business",
      name: "Business",
      description: "Operação profissional completa",
      prices: { monthly: 1599, quarterly: 1399, semiannual: 1199 },
      color: "#a855f7",
      features: [
        "Até 4 unidades",
        "Equipe completa + ponto",
        "Estoque com IA",
        "CRM + disparos",
        "Financeiro com custos",
        "Relatórios com IA",
        "Hub do gerente",
      ],
      trial: true,
      cta: "Testar 7 dias grátis",
    },
  ];

  async function handleSelectPlan(planKey: string) {
    setLoading(true);

    if (planKey === "menu") {
      const res = await fetch("/api/plan/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, plan: "menu" }),
      });

      if (res.ok) {
        window.location.href = "/painel";
      } else {
        alert("Erro ao ativar plano. Tente novamente.");
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          window.location.href = "/painel";
        }
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao processar. Tente novamente.");
        setLoading(false);
      }
    } catch {
      alert("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        padding: "40px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "#00ffae",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 0 40px rgba(0,255,174,0.15)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: "#050505",
            fontStyle: "italic",
          }}
        >
          fy
        </span>
      </div>

      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#fff",
            margin: 0,
          }}
        >
          Bem-vindo ao FyMenu
        </h1>
      </div>
      <div
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        {restaurantName
          ? `Escolha o plano ideal pra ${restaurantName}`
          : "Escolha o plano ideal pro seu restaurante"}
      </div>

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
          const price = plan.prices[selectedCycle];
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
                  {formatPlanPrice(price)}
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

      {/* Footer */}
      <div style={{ marginTop: 40, textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)" }}>
          Powered by FyMenu
        </span>
      </div>
    </div>
  );
}
