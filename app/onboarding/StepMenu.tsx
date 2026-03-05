"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingData } from "./OnboardingClient";

export default function StepMenu({
  data,
  restaurantId,
}: {
  data: OnboardingData;
  restaurantId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function finish() {
    setSaving(true);
    const supabase = createClient();

    // 1. Salva dados pessoais + empresa no restaurante
    await supabase.from("restaurants").update({
      name: data.restaurant_name,
      whatsapp: data.whatsapp,
      instagram: data.instagram,
      onboarding_completed: true,
    }).eq("id", restaurantId);

    // 2. Cria unit de teste (não publicada, sem slug definitivo)
    const slug = `preview-${restaurantId.slice(0, 8)}`;
    await supabase.from("units").insert({
      restaurant_id: restaurantId,
      name: data.restaurant_name,
      slug,
      whatsapp: data.whatsapp,
      instagram: data.instagram,
      is_published: false,
    });

    setDone(true);
    setSaving(false);

    // Redireciona pro dashboard
    window.location.href = "/dashboard";
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

      {/* Card planos — visível mas não bloqueante */}
      <div style={{
        borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)", padding: 20,
        display: "grid", gap: 12,
      }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12,
          fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
          Planos disponíveis
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <PlanCard
            name="Basic"
            price="R$ 49/mês"
            features={["1 unidade", "WhatsApp", "Link público"]}
          />
          <PlanCard
            name="Pro"
            price="R$ 99/mês"
            features={["Múltiplas unidades", "Tudo do Basic", "Subdomínio"]}
            highlight
          />
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>
          Você pode montar seu cardápio agora e ativar o plano quando quiser para publicar.
        </p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {/* Opção 1: teste grátis */}
        <button onClick={finish} disabled={saving || done} style={{
          padding: "16px", borderRadius: 14, width: "100%",
          background: "#fff", color: "#000",
          fontWeight: 900, fontSize: 16, cursor: "pointer", border: "none",
        }}>
          {saving ? "Criando..." : "Testar grátis por 7 dias"}
        </button>

        {/* Opção 2: já quero ativar plano */}
        <button onClick={() => window.location.href = "/planos"} style={{
          padding: "14px", borderRadius: 14, width: "100%",
          background: "transparent", color: "rgba(255,255,255,0.7)",
          fontWeight: 800, fontSize: 14, cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.15)",
        }}>
          Já quero ativar um plano
        </button>

        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11,
          margin: 0, textAlign: "center" }}>
          No teste você monta tudo. Para publicar e compartilhar, ative um plano.
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  name, price, features, highlight = false,
}: {
  name: string; price: string; features: string[]; highlight?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 12, padding: 14,
      border: highlight
        ? "1px solid rgba(255,255,255,0.3)"
        : "1px solid rgba(255,255,255,0.08)",
      background: highlight ? "rgba(255,255,255,0.08)" : "transparent",
    }}>
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>{name}</div>
      <div style={{ color: highlight ? "#fff" : "rgba(255,255,255,0.5)",
        fontWeight: 800, fontSize: 13, marginTop: 2 }}>{price}</div>
      <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none",
        display: "grid", gap: 4 }}>
        {features.map((f) => (
          <li key={f} style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            ✓ {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

