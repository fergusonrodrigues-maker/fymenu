"use client";

import { useEffect, useState } from "react";
import {
  PLANS as PLAN_DEFS,
  type BillingCycle,
  type PlanCode,
} from "@/lib/plans";
import { formatCents } from "@/lib/money";

type Cycle = "monthly" | "quarterly" | "semiannual";

const cycleToCanonical: Record<Cycle, BillingCycle> = {
  monthly: "monthly",
  quarterly: "quarterly",
  semiannual: "semestral",
};

const PLAN_ACCENT: Record<PlanCode, string> = {
  menu: "#00ffae",
  menupro: "#00d9ff",
  business: "#a855f7",
};

type ValidatedCoupon = {
  code: string;
  trial_extra_days: number;
  discount_percent: number;
  discount_value: number;
  valid_for_plan: string | null;
};

export default function CheckoutClient({
  plan,
  planName,
  initialCoupon = "",
}: {
  plan: PlanCode;
  planName: string;
  initialCoupon?: string;
}) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCoupon, setShowCoupon] = useState(!!initialCoupon);
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [couponChecking, setCouponChecking] = useState(false);
  const [coupon, setCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const priceCents = PLAN_DEFS[plan].prices[cycleToCanonical[cycle]];
  const baseTrialDays = PLAN_DEFS[plan].hasTrial ? PLAN_DEFS[plan].trialDays : 0;
  const totalTrialDays = baseTrialDays + (coupon?.trial_extra_days ?? 0);
  const accent = PLAN_ACCENT[plan];

  async function validateCoupon(codeToValidate: string) {
    setCouponChecking(true);
    setCouponError(null);
    setCoupon(null);
    try {
      const url = `/api/coupon/validate?code=${encodeURIComponent(codeToValidate)}&plan=${plan}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        setCoupon(data.coupon as ValidatedCoupon);
      } else {
        setCouponError(data?.error ?? "Cupom inválido");
      }
    } catch {
      setCouponError("Erro ao validar cupom");
    }
    setCouponChecking(false);
  }

  useEffect(() => {
    if (initialCoupon) {
      validateCoupon(initialCoupon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          cycle,
          coupon_code: coupon ? coupon.code : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.complimentary) {
        window.location.href = "/painel?msg=complimentary";
        return;
      }
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data?.error || "Não foi possível abrir o checkout. Tente novamente.");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  const buttonLabel = loading
    ? "Abrindo checkout..."
    : coupon && coupon.trial_extra_days > 0
      ? "Ativar período grátis"
      : "Continuar para pagamento";

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

      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: "#fff",
          margin: 0,
          textAlign: "center",
        }}
      >
        Finalizar assinatura
      </h1>
      <div
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 32,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        Escolha o ciclo de cobrança e continue para o pagamento
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 14,
          marginBottom: 24,
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
            onClick={() => setCycle(c.key as Cycle)}
            style={{
              padding: "8px 18px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background:
                cycle === c.key
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color: cycle === c.key ? "#fff" : "rgba(255,255,255,0.3)",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.2s",
            }}
          >
            {c.label}
            {c.badge && cycle === c.key && (
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

      <div
        style={{
          padding: 28,
          borderRadius: 24,
          background: `rgba(${
            plan === "menu"
              ? "0,255,174"
              : plan === "menupro"
              ? "0,217,255"
              : "168,85,247"
          },0.04)`,
          border: `1px solid ${accent}33`,
          maxWidth: 420,
          width: "100%",
          boxShadow: `0 0 60px ${accent}10`,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: accent,
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          {planName}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {PLAN_DEFS[plan].tagline}
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: "#fff" }}>
            {formatCents(priceCents)}
          </span>
          <span
            style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}
          >
            /mês
          </span>
          {cycle !== "monthly" && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                marginTop: 6,
              }}
            >
              {cycle === "quarterly"
                ? "cobrado trimestralmente"
                : "cobrado semestralmente"}
            </div>
          )}
        </div>

        {/* Coupon area */}
        <div style={{ marginBottom: 16 }}>
          {!showCoupon ? (
            <button
              onClick={() => setShowCoupon(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Tem um cupom?
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) =>
                    setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ""))
                  }
                  placeholder="Código do cupom"
                  disabled={!!coupon}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "monospace",
                    letterSpacing: 2,
                    outline: "none",
                  }}
                />
                {coupon ? (
                  <button
                    onClick={() => {
                      setCoupon(null);
                      setCouponCode("");
                      setCouponError(null);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(248,113,113,0.25)",
                      background: "rgba(248,113,113,0.08)",
                      color: "#f87171",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Remover
                  </button>
                ) : (
                  <button
                    onClick={() => couponCode && validateCoupon(couponCode)}
                    disabled={couponChecking || !couponCode}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: `${accent}1f`,
                      color: accent,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: couponChecking || !couponCode ? "not-allowed" : "pointer",
                      opacity: couponChecking || !couponCode ? 0.5 : 1,
                    }}
                  >
                    {couponChecking ? "..." : "Aplicar"}
                  </button>
                )}
              </div>
              {couponError && (
                <div style={{ fontSize: 11, color: "#f87171" }}>{couponError}</div>
              )}
              {coupon && coupon.trial_extra_days > 0 && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(0,255,174,0.06)",
                    border: "1px solid rgba(0,255,174,0.2)",
                    color: "#00ffae",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ✓ Você ganhou {coupon.trial_extra_days} dias grátis! Após esse
                  período, cobramos {formatCents(priceCents)}/mês.
                </div>
              )}
              {coupon && coupon.trial_extra_days === 0 && coupon.discount_percent > 0 && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(0,255,174,0.06)",
                    border: "1px solid rgba(0,255,174,0.2)",
                    color: "#00ffae",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ✓ Desconto de {coupon.discount_percent}% aplicado na primeira cobrança.
                </div>
              )}
              {coupon && coupon.trial_extra_days === 0 && coupon.discount_value > 0 && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(0,255,174,0.06)",
                    border: "1px solid rgba(0,255,174,0.2)",
                    color: "#00ffae",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ✓ Desconto de R$ {coupon.discount_value.toFixed(2)} aplicado.
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171",
              fontSize: 12,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: `${accent}1f`,
            color: accent,
            fontSize: 15,
            fontWeight: 800,
            boxShadow: `0 1px 0 ${accent}30 inset, 0 -1px 0 rgba(0,0,0,0.15) inset`,
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {buttonLabel}
        </button>

        {totalTrialDays > 0 && (
          <div
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {totalTrialDays} dias grátis, cobrança só após o trial
          </div>
        )}
      </div>

      <div style={{ marginTop: 40, textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
          Pagamento seguro processado pelo Asaas
        </span>
      </div>
    </div>
  );
}
