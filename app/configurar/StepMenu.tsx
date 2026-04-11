"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();

    // 1. Salva dados pessoais na tabela profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        document: data.document,
      }, { onConflict: "id" });

    if (profileError) {
      setError("Erro ao salvar dados pessoais. Tente novamente.");
      setSaving(false);
      return;
    }

    // 2. Atualiza restaurant (sem onboarding_completed ainda)
    const { error: restError } = await supabase
      .from("restaurants")
      .update({
        name: data.restaurant_name,
        whatsapp: data.whatsapp,
        instagram: data.instagram,
      })
      .eq("id", restaurantId);

    if (restError) {
      setError("Erro ao salvar dados do restaurante. Tente novamente.");
      setSaving(false);
      return;
    }

    // 3. Cria unit de preview
    const slug = `preview-${restaurantId.slice(0, 8)}`;
    const { error: unitError } = await supabase
      .from("units")
      .insert({
        restaurant_id: restaurantId,
        name: data.restaurant_name,
        slug,
        whatsapp: data.whatsapp,
        instagram: data.instagram,
        is_published: false,
      });

    if (unitError) {
      setError("Erro ao criar cardápio de preview. Tente novamente.");
      setSaving(false);
      return;
    }

    // 4. Marca onboarding como completo apenas após a unit ser criada com sucesso
    const { error: completeError } = await supabase
      .from("restaurants")
      .update({ onboarding_completed: true })
      .eq("id", restaurantId);

    if (completeError) {
      setError("Erro ao finalizar configuração. Tente novamente.");
      setSaving(false);
      return;
    }

    // 5. Redireciona via router (sem quebrar a SPA)
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
