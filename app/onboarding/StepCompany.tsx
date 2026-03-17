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

    try {
      // 1. Salva dados pessoais na tabela profiles (se existir)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          phone: data.phone || null,
          document: data.document || null,
        }, { onConflict: "id" })
        .select();

      // Não falhar se profiles não existir

      // 2. Atualiza restaurant
      const { error: restError, data: restData } = await supabase
        .from("restaurants")
        .update({
          name: data.restaurant_name || "Meu Restaurante",
          whatsapp: data.whatsapp || null,
          instagram: data.instagram || null,
          onboarding_completed: true,
        })
        .eq("id", restaurantId)
        .select();

      if (restError) {
        console.error("Rest error:", restError);
        setError("Erro ao salvar dados do restaurante. Tente novamente.");
        setSaving(false);
        return;
      }

      // 3. Cria unit de teste
      const slug = `preview-${restaurantId.slice(0, 8)}`;
      
      const unitData = {
        restaurant_id: restaurantId,
        name: data.restaurant_name || "Meu Restaurante",
        slug: slug,
        whatsapp: data.whatsapp || null,
        instagram: data.instagram || null,
      };

      const { error: unitError, data: unitData_result } = await supabase
        .from("units")
        .insert([unitData])
        .select();

      if (unitError) {
        console.error("Unit creation error:", unitError);
        setError("Erro ao criar cardápio de preview. Tente novamente.");
        setSaving(false);
        return;
      }

      // 4. Redireciona para dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Erro inesperado. Tente novamente.");
      setSaving(false);
    }
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

      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(248, 66, 51, 0.15)",
          border: "1px solid rgba(248, 66, 51, 0.3)",
          color: "#ff9999", fontSize: 13,
        }}>
          ⚠️ {error}
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