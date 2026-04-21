"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Restaurant } from "../types";

type Cycle = "monthly" | "quarterly" | "semiannual";

function formatPlanPrice(price: number): string {
  if (price >= 1000) {
    return `R$\u00a0${price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  }
  return `R$\u00a0${price.toFixed(2).replace(".", ",")}`;
}

const PLANS = [
  {
    key: "menu",
    name: "Menu",
    icon: "🍽️",
    tagline: "1 unidade",
    prices: { monthly: 199.90, quarterly: 179.90, semiannual: 159.90 },
    accent: "#a78bfa",
    accentRgb: "167,139,250",
    borderColor: "rgba(139,92,246,0.25)",
    features: [
      "Cardápio de vídeo 9:16",
      "Categorias com horário",
      "Pedidos via WhatsApp",
      "Analytics básico",
      "Modo TV autoplay",
      "Link personalizado",
    ],
    trial: false,
    ctaNoplan: "Começar agora",
    ctaUpgrade: "Mudar pra Menu",
  },
  {
    key: "menupro",
    name: "MenuPro",
    icon: "⭐",
    tagline: "Até 3 unidades",
    badge: "MAIS VENDIDO",
    prices: { monthly: 399.90, quarterly: 359.90, semiannual: 319.90 },
    accent: "#00ffae",
    accentRgb: "0,255,174",
    borderColor: "rgba(0,255,174,0.25)",
    popular: true,
    features: [
      "Tudo do Menu +",
      "Comanda Digital",
      "Cozinha + Garçom em tempo real",
      "CRM de clientes",
      "Analytics avançado com IA",
      "Estoque básico",
      "Relatórios em PDF",
    ],
    trial: false,
    ctaNoplan: "Assinar MenuPro",
    ctaUpgrade: "Upgrade → MenuPro",
  },
  {
    key: "business",
    name: "Business",
    icon: "🏢",
    tagline: "Até 4 unidades",
    badge: "7 DIAS GRÁTIS",
    prices: { monthly: 1599, quarterly: 1399, semiannual: 1199 },
    accent: "#d4af37",
    accentRgb: "212,175,55",
    borderColor: "rgba(212,175,55,0.35)",
    features: [
      "Tudo do MenuPro +",
      "Gestão completa de equipe + ponto",
      "Estoque completo com IA",
      "CRM com disparo de mensagens",
      "Financeiro com custos e margens",
      "Relatórios financeiros com IA",
      "Hub do gerente",
    ],
    trial: true,
    ctaNoplan: "Testar 7 dias grátis",
    ctaUpgrade: "Upgrade → Business",
  },
];

interface Coupon {
  coupon_code: string;
  discount_type: string | null;
  trial_extra_days: number;
  discount_value: number | null;
}

export default function PlanoModal({
  restaurant,
  highlightPlan,
  onClose,
}: {
  restaurant: Restaurant;
  highlightPlan?: string | null;
  trialDays?: number;
  onUpgrade?: () => void;
  onClose?: () => void;
}) {
  const [planCycle, setPlanCycle] = useState<Cycle>("quarterly");
  const [planLoading, setPlanLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const currentPlan = (restaurant?.plan as string | null) ?? null;
  const hasActivePlan =
    !!currentPlan &&
    (restaurant?.status === "active" ||
      restaurant?.status === "trial" ||
      restaurant?.free_access);

  // Load coupons from partner_referrals
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("partner_referrals")
      .select("coupon_code, partner_coupons(discount_type, trial_extra_days, discount_value)")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) {
          setCoupons(data.map((d: any) => ({
            coupon_code: d.coupon_code,
            discount_type: d.partner_coupons?.discount_type ?? null,
            trial_extra_days: d.partner_coupons?.trial_extra_days ?? 0,
            discount_value: d.partner_coupons?.discount_value ?? null,
          })));
        }
      });
  }, [restaurant.id]);

  const trialExtensionDays = coupons
    .filter((c) => c.discount_type === "trial_extension")
    .reduce((sum, c) => sum + c.trial_extra_days, 0);

  async function handleSelectPlan(planKey: string) {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan/checkout", {
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
          return;
        }

        // Apply trial_extension coupons for business plan
        if (planKey === "business" && trialExtensionDays > 0) {
          const supabase = createClient();
          const { data: rest } = await supabase
            .from("restaurants")
            .select("trial_ends_at")
            .eq("id", restaurant.id)
            .single();
          if (rest?.trial_ends_at) {
            const extended = new Date(rest.trial_ends_at);
            extended.setDate(extended.getDate() + trialExtensionDays);
            await supabase
              .from("restaurants")
              .update({ trial_ends_at: extended.toISOString() })
              .eq("id", restaurant.id);
          }
        }

        const msg =
          planKey === "business"
            ? `Trial Business ativado! ${7 + trialExtensionDays} dias grátis iniciados 🎉`
            : "Plano ativado com sucesso!";
        setToast(msg);
        setTimeout(() => window.location.reload(), 2200);
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
        body: JSON.stringify({ restaurantId: restaurant.id, plan: "cancel" }),
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

  // ── Toast overlay ──────────────────────────────────────────────────────────
  if (toast) {
    return (
      <div style={{ paddingTop: 24, textAlign: "center" }}>
        <div style={{
          padding: "24px 28px", borderRadius: 20,
          background: "rgba(0,255,174,0.06)", border: "1px solid rgba(0,255,174,0.18)",
          animation: "planGoldSpin 0s",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--dash-accent)", marginBottom: 8 }}>
            {toast}
          </div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>
            Recarregando o painel...
          </div>
        </div>
      </div>
    );
  }

  // ── Cancel confirm screen ──────────────────────────────────────────────────
  if (showCancelConfirm) {
    return (
      <div style={{ paddingTop: 8 }}>
        <div style={{
          padding: 24, borderRadius: 20,
          background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.12)",
          marginBottom: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#f87171", marginBottom: 8 }}>
            Cancelar plano?
          </div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)", lineHeight: 1.6 }}>
            Seu cardápio ficará offline e você perderá acesso às funcionalidades do plano{" "}
            {currentPlanData ? currentPlanData.name : ""}.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={handleCancelPlan} disabled={planLoading} style={{
            width: "100%", padding: 16, borderRadius: 14, border: "none",
            cursor: planLoading ? "not-allowed" : "pointer",
            background: "rgba(248,113,113,0.1)", color: "#f87171",
            fontSize: 14, fontWeight: 900, opacity: planLoading ? 0.5 : 1,
          }}>
            {planLoading ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
          <button onClick={() => setShowCancelConfirm(false)} style={{
            width: "100%", padding: 14, borderRadius: 14,
            border: "1px solid var(--dash-border)", background: "transparent",
            color: "var(--dash-text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <style>{`
        @keyframes planGoldSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes planHighlightPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--plan-rgb), 0.15); }
          50%       { box-shadow: 0 0 0 8px rgba(var(--plan-rgb), 0); }
        }
      `}</style>

      {/* ── Subtitle ── */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "var(--dash-text-muted)", lineHeight: 1.5 }}>
          Desbloqueie todos os recursos do FyMenu
        </div>
      </div>

      {/* ── Coupon pills ── */}
      {coupons.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {coupons.map((c) => (
            <span key={c.coupon_code} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 999,
              background: "rgba(0,255,174,0.08)", border: "1px solid rgba(0,255,174,0.22)",
              color: "var(--dash-accent)", fontSize: 11, fontWeight: 700,
            }}>
              🎟 {c.coupon_code}
              {c.discount_type === "trial_extension" && c.trial_extra_days > 0 && (
                <span style={{ opacity: 0.7 }}> +{c.trial_extra_days}d</span>
              )}
              {c.discount_type === "percent" && c.discount_value && (
                <span style={{ opacity: 0.7 }}> -{c.discount_value}%</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Status do plano atual ── */}
      <div style={{
        padding: "14px 18px", borderRadius: 16, marginBottom: 20, textAlign: "center",
        background: hasActivePlan
          ? `rgba(${currentPlanData?.accentRgb ?? "0,255,174"},0.04)`
          : "rgba(248,113,113,0.04)",
        border: `1px solid ${hasActivePlan
          ? `rgba(${currentPlanData?.accentRgb ?? "0,255,174"},0.1)`
          : "rgba(248,113,113,0.1)"}`,
      }}>
        {hasActivePlan ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: currentPlanData?.accent ?? "var(--dash-accent)" }}>
              Plano {currentPlanData?.name ?? currentPlan} ativo
            </div>
            {restaurant?.status === "trial" && restaurant?.trial_ends_at && (
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 4 }}>
                Trial até {new Date(restaurant.trial_ends_at).toLocaleDateString("pt-BR")}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>Nenhum plano ativo</div>
            <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 4 }}>
              Escolha um plano pra publicar seu cardápio
            </div>
          </>
        )}
      </div>

      {/* ── Seletor de ciclo ── */}
      <div style={{
        display: "flex", gap: 2, padding: 3, marginBottom: 20,
        background: "var(--dash-card)", borderRadius: 14,
        border: "1px solid var(--dash-border)",
      }}>
        {[
          { key: "monthly",   label: "Mensal" },
          { key: "quarterly", label: "Trimestral", badge: "-15%" },
          { key: "semiannual", label: "Semestral", badge: "-30%" },
        ].map((c) => (
          <button key={c.key} onClick={() => setPlanCycle(c.key as Cycle)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 12, border: "none", cursor: "pointer",
            background: planCycle === c.key ? "var(--dash-card-hover)" : "transparent",
            color: planCycle === c.key ? "var(--dash-text)" : "var(--dash-text-muted)",
            fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            transition: "all 0.2s",
          }}>
            {c.label}
            {c.badge && planCycle === c.key && (
              <span style={{
                padding: "1px 5px", borderRadius: 4,
                background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
                fontSize: 8, fontWeight: 900,
              }}>{c.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Cards dos planos ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 16,
        alignItems: "stretch",
      }}>
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
          const isGold = plan.key === "business";
          const isHighlighted = !!highlightPlan && plan.key === highlightPlan && !isCurrent;

          return (
            <div key={plan.key} style={{
              borderRadius: 20,
              padding: 24,
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: `${isCurrent || isGold || isHighlighted ? "2px" : "1px"} solid ${
                isCurrent
                  ? plan.borderColor
                  : isHighlighted
                    ? plan.borderColor
                    : isGold
                      ? "rgba(212,175,55,0.3)"
                      : "rgba(255,255,255,0.08)"
              }`,
              boxShadow: isHighlighted
                ? `0 0 0 3px rgba(${plan.accentRgb},0.18), 0 8px 40px rgba(${plan.accentRgb},0.12), 0 4px 24px rgba(0,0,0,0.2)`
                : isCurrent
                  ? `0 0 40px rgba(${plan.accentRgb},0.08), 0 4px 24px rgba(0,0,0,0.2)`
                  : "0 4px 24px rgba(0,0,0,0.15)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
              transform: isHighlighted ? "scale(1.02)" : "scale(1)",
            }}>

              {/* Gold animated border — Business only */}
              {isGold && (
                <div style={{
                  position: "absolute", inset: -2, borderRadius: "inherit",
                  overflow: "hidden", pointerEvents: "none", zIndex: 0,
                }}>
                  <div style={{
                    position: "absolute",
                    width: "200%", height: "200%", top: "-50%", left: "-50%",
                    background: "conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(180,140,20,0.2) 42%, rgba(212,175,55,0.45) 50%, rgba(255,215,0,0.65) 51%, rgba(212,175,55,0.45) 58%, rgba(180,140,20,0.2) 65%, transparent 70%, transparent 100%)",
                    animation: "planGoldSpin 4s linear infinite",
                  }} />
                  <div style={{
                    position: "absolute", inset: 2, borderRadius: 18,
                    background: "rgba(10,10,10,1)",
                  }} />
                </div>
              )}

              {/* Card content above gold overlay */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>

                {/* Badge top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ height: 20 }}>
                    {"badge" in plan && plan.badge ? (
                      <span style={{
                        padding: "3px 10px", borderRadius: 6,
                        background: isGold ? "rgba(212,175,55,0.15)" : `rgba(${plan.accentRgb},0.1)`,
                        color: plan.accent,
                        fontSize: 9, fontWeight: 900,
                        textTransform: "uppercase" as const, letterSpacing: "0.08em",
                        border: `1px solid ${isGold ? "rgba(212,175,55,0.3)" : `rgba(${plan.accentRgb},0.2)`}`,
                      }}>
                        {plan.key === "business" && trialExtensionDays > 0
                          ? `${7 + trialExtensionDays} DIAS GRÁTIS`
                          : plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isHighlighted && (
                      <span style={{
                        padding: "3px 10px", borderRadius: 6,
                        background: `rgba(${plan.accentRgb},0.12)`,
                        color: plan.accent, fontSize: 9, fontWeight: 900,
                        textTransform: "uppercase" as const, letterSpacing: "0.08em",
                        border: `1px solid rgba(${plan.accentRgb},0.2)`,
                      }}>Recomendado</span>
                    )}
                    {isCurrent && (
                      <span style={{
                        padding: "3px 10px", borderRadius: 6,
                        background: `rgba(${plan.accentRgb},0.12)`,
                        color: plan.accent, fontSize: 9, fontWeight: 900,
                        textTransform: "uppercase" as const, letterSpacing: "0.08em",
                        border: `1px solid rgba(${plan.accentRgb},0.2)`,
                      }}>✓ Atual</span>
                    )}
                  </div>
                </div>

                {/* Icon + Name + Tagline */}
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{plan.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: plan.accent, marginBottom: 2 }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>{plan.tagline}</div>
                </div>

                {/* Price */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                    <span style={{ fontSize: 38, fontWeight: 900, color: "var(--dash-text)", lineHeight: 1 }}>
                      {formatPlanPrice(price)}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--dash-text-muted)", fontWeight: 400 }}>/mês</span>
                  </div>
                  {planCycle !== "monthly" && (
                    <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 4 }}>
                      {planCycle === "quarterly" ? "cobrado trimestralmente" : "cobrado semestralmente"}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />

                {/* Features list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      fontSize: 12, color: "var(--dash-text)",
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                        background: `rgba(${plan.accentRgb},0.12)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: plan.accent, fontWeight: 900,
                      }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {!isCurrent ? (
                  <>
                    <button
                      onClick={() => handleSelectPlan(plan.key)}
                      disabled={planLoading}
                      style={{
                        width: "100%", padding: "14px 0", borderRadius: 14,
                        border: isGold
                          ? "2px solid rgba(212,175,55,0.4)"
                          : `1px solid rgba(${plan.accentRgb},0.25)`,
                        cursor: planLoading ? "not-allowed" : "pointer",
                        background: isGold
                          ? "rgba(212,175,55,0.08)"
                          : `rgba(${plan.accentRgb},0.08)`,
                        color: plan.accent,
                        fontSize: 14, fontWeight: 900,
                        opacity: planLoading ? 0.5 : 1,
                        transition: "all 0.2s",
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
                      <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "var(--dash-text-muted)" }}>
                        {7 + trialExtensionDays} dias grátis, cancele quando quiser
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    width: "100%", padding: 14, borderRadius: 14, textAlign: "center",
                    background: `rgba(${plan.accentRgb},0.06)`,
                    color: plan.accent, fontSize: 13, fontWeight: 800,
                    border: `1px solid rgba(${plan.accentRgb},0.12)`,
                  }}>
                    ✓ Plano atual
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Cancelar plano ── */}
      {hasActivePlan && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          style={{
            width: "100%", padding: 12, borderRadius: 12, marginTop: 20,
            border: "1px solid rgba(248,113,113,0.1)", background: "transparent",
            color: "rgba(248,113,113,0.4)", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancelar plano
        </button>
      )}
    </div>
  );
}
