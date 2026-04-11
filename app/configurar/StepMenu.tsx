"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingData } from "./OnboardingClient";

export default function StepMenu({
  data,
  userId,
  restaurantId,
}: {
  data: OnboardingData;
  userId: string;
  restaurantId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/onboarding/complete", {
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

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Erro ao finalizar configuração. Tente novamente.");
      setSaving(false);
      return;
    }

    router.push("/painel");
  }

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
            name="Menu"
            price="R$ 199,90/mês"
            features={["1 unidade", "WhatsApp", "Modo TV"]}
            accent="#00ffae"
          />
          <PlanCard
            name="MenuPro"
            price="R$ 399,90/mês"
            features={["Até 3 unidades", "Comanda Digital", "CRM"]}
            highlight
            accent="#00d9ff"
          />
          <PlanCard
            name="Business"
            price="R$ 1.599/mês"
            features={["Até 4 unidades", "Equipe completa", "Estoque + IA"]}
            accent="#fbbf24"
          />
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>
          No teste você monta tudo. Para publicar e compartilhar, ative um plano.
        </p>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(255,80,80,0.1)",
          border: "1px solid rgba(255,80,80,0.3)",
          color: "#ff6b6b", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        <button
          onClick={finish}
          disabled={saving}
          style={{
            padding: "16px", borderRadius: 14, width: "100%",
            background: saving ? "rgba(255,255,255,0.5)" : "#fff",
            color: "#000", fontWeight: 900, fontSize: 16,
            cursor: saving ? "not-allowed" : "pointer", border: "none",
            transition: "background 0.2s",
          }}
        >
          {saving ? "Criando..." : "Testar grátis por 7 dias"}
        </button>

        <button
          onClick={() => router.push("/planos")}
          disabled={saving}
          style={{
            padding: "14px", borderRadius: 14, width: "100%",
            background: "transparent", color: "rgba(255,255,255,0.7)",
            fontWeight: 800, fontSize: 14, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          Já quero ativar um plano
        </button>

        <p style={{
          color: "rgba(255,255,255,0.25)", fontSize: 11,
          margin: 0, textAlign: "center",
        }}>
          No teste você monta tudo. Para publicar e compartilhar, ative um plano.
        </p>
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
