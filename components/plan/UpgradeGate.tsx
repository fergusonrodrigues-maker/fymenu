"use client";

import { ReactNode, useState } from "react";
import {
  hasPlanFeature,
  minPlanForFeature,
  PLANS,
  type PlanCode,
  type FeatureKey,
} from "@/lib/plans";

type Mode = "block" | "overlay" | "invisible";

type Props = {
  children: ReactNode;
  plan: PlanCode | string | null | undefined;
  feature: FeatureKey;
  unitFeatures?: Record<string, boolean>;
  /**
   * 'block'     = não renderiza children, mostra placeholder com CTA
   * 'overlay'   = renderiza children + overlay clicável que abre popup (default)
   * 'invisible' = não renderiza nada (esconde por completo)
   */
  mode?: Mode;
  /** Trackear analytics de upgrade ou outros side-effects ao clicar no gate. */
  onUpgradeClick?: () => void;
};

export function UpgradeGate({
  children,
  plan,
  feature,
  unitFeatures,
  mode = "overlay",
  onUpgradeClick,
}: Props) {
  const allowed = hasPlanFeature(plan, feature, unitFeatures);
  const [open, setOpen] = useState(false);

  if (allowed) return <>{children}</>;
  if (mode === "invisible") return null;

  const minPlan = minPlanForFeature(feature);
  const minPlanLabel = minPlan ? PLANS[minPlan].name : "um plano superior";

  const triggerOpen = () => {
    onUpgradeClick?.();
    setOpen(true);
  };

  if (mode === "block") {
    return (
      <>
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            padding: 24,
            textAlign: "center",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
            Disponível no plano {minPlanLabel}
          </div>
          <button
            type="button"
            onClick={triggerOpen}
            style={{
              marginTop: 12,
              padding: "8px 18px",
              borderRadius: 999,
              background: "var(--dash-accent, #00ffae)",
              color: "#000",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Fazer upgrade
          </button>
        </div>
        {open && <UpgradePopup minPlan={minPlan} onClose={() => setOpen(false)} />}
      </>
    );
  }

  // overlay: renderiza children mas com cadeado por cima
  return (
    <div style={{ position: "relative" }}>
      <div style={{ opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <button
        type="button"
        onClick={triggerOpen}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "none",
          borderRadius: "inherit",
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>🔒</span>
        <span style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
          Disponível no {minPlanLabel}
        </span>
      </button>
      {open && <UpgradePopup minPlan={minPlan} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function UpgradePopup({
  minPlan,
  onClose,
  onViewPlans,
  description,
}: {
  minPlan: PlanCode | null;
  onClose: () => void;
  /** When provided, overrides the default <a href="/checkout?plan=..."> with a button. */
  onViewPlans?: () => void;
  /** Optional override for the body copy. */
  description?: string;
}) {
  const planName = minPlan ? PLANS[minPlan].name : "superior";
  const href = minPlan ? `/checkout?plan=${minPlan}` : "/checkout";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          background: "var(--dash-modal-bg, rgba(15,15,15,0.97))",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 22,
          padding: "32px 28px 24px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--dash-text, #fff)",
              marginBottom: 10,
              letterSpacing: "-0.3px",
            }}
          >
            Disponível no plano {planName}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            {description ?? "Faça upgrade pra desbloquear essa funcionalidade."}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {onViewPlans ? (
            <button
              type="button"
              onClick={onViewPlans}
              style={{
                width: "100%",
                padding: "13px",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 12,
                background: "var(--dash-accent, #00ffae)",
                color: "#000",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Ver planos
            </button>
          ) : (
            <a
              href={href}
              style={{
                display: "block",
                textAlign: "center",
                width: "100%",
                padding: "13px",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 12,
                background: "var(--dash-accent, #00ffae)",
                color: "#000",
                textDecoration: "none",
                fontFamily: "inherit",
              }}
            >
              Ver planos
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.55)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
