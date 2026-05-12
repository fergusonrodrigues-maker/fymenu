"use client";

import { PLANS as PLAN_DEFS } from "@/lib/plans";
import { formatCents } from "@/lib/money";

export default function StepMenu({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0 }}>
          Quase lá!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>
          Seu cardápio de teste será criado agora.
          Você pode montar categorias e produtos antes de ativar um plano.
        </p>
      </div>

      {/* Card planos */}
      <div style={{
        borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)", padding: 20,
        display: "grid", gap: 12,
      }}>
        <div style={{
          color: "rgba(255,255,255,0.6)", fontSize: 12,
          fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
        }}>
          Planos disponíveis
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <PlanCard
            name={PLAN_DEFS.menu.name}
            price={`${formatCents(PLAN_DEFS.menu.prices.monthly)}/mês`}
            features={[`Até ${PLAN_DEFS.menu.maxUnits} unidades`, "Modo TV", "Analytics IA"]}
            accent="#00ffae"
          />
          <PlanCard
            name={PLAN_DEFS.menupro.name}
            price={`${formatCents(PLAN_DEFS.menupro.prices.monthly)}/mês`}
            features={[`Até ${PLAN_DEFS.menupro.maxUnits} unidades`, "Comanda Digital", "WhatsApp + iFood"]}
            highlight
            accent="#00d9ff"
          />
          <PlanCard
            name={PLAN_DEFS.business.name}
            price={`${formatCents(PLAN_DEFS.business.prices.monthly)}/mês`}
            features={[`${PLAN_DEFS.business.maxUnits} unidades fixo`, "Equipe completa", "Estoque + IA"]}
            accent="#fbbf24"
          />
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>
          No teste você monta tudo. Para publicar e compartilhar, ative um plano.
        </p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <button
          onClick={onNext}
          style={{
            padding: "16px", borderRadius: 14, width: "100%",
            background: "#fff",
            color: "#000", fontWeight: 900, fontSize: 16,
            cursor: "pointer", border: "none",
          }}
        >
          Continuar para escolha do plano →
        </button>

        <button
          onClick={onBack}
          style={{
            padding: "14px", borderRadius: 14, width: "100%",
            background: "transparent", color: "rgba(255,255,255,0.5)",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  name, price, features, highlight = false, accent = "rgba(255,255,255,0.4)",
}: {
  name: string; price: string; features: string[]; highlight?: boolean; accent?: string;
}) {
  return (
    <div style={{
      borderRadius: 12, padding: 14,
      border: highlight
        ? `1px solid ${accent}50`
        : "1px solid rgba(255,255,255,0.08)",
      background: highlight ? `${accent}10` : "transparent",
    }}>
      <div style={{ color: accent, fontWeight: 900, fontSize: 15 }}>{name}</div>
      <div style={{
        color: highlight ? "#fff" : "rgba(255,255,255,0.5)",
        fontWeight: 800, fontSize: 13, marginTop: 2,
      }}>{price}</div>
      <ul style={{
        margin: "8px 0 0", padding: 0, listStyle: "none",
        display: "grid", gap: 4,
      }}>
        {features.map((f) => (
          <li key={f} style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            ✓ {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
