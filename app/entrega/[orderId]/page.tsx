"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type OrderItem = {
  qty: number;
  code_name?: string;
  unit_price: number;
  total: number;
  notes?: string;
};

type DriverOrder = {
  id: string;
  table_number: number | null;
  items: OrderItem[];
  total: number;
  notes: string | null;
  delivery_status: string | null;
  delivery_picked_at: string | null;
  delivery_completed_at: string | null;
  created_at: string;
};

const STEPS: { status: string; label: string; icon: string; nextLabel: string; nextIcon: string }[] = [
  { status: "pending",    label: "Aguardando",        icon: "⏳", nextLabel: "Aceitar entrega",     nextIcon: "✋" },
  { status: "assigned",   label: "Atribuído",          icon: "✋", nextLabel: "Peguei o pedido",      nextIcon: "📦" },
  { status: "picked_up",  label: "Retirado",           icon: "📦", nextLabel: "Em trânsito",          nextIcon: "🛵" },
  { status: "in_transit", label: "Em trânsito",        icon: "🛵", nextLabel: "Entrega concluída",    nextIcon: "✅" },
  { status: "delivered",  label: "Entregue ✓",         icon: "✅", nextLabel: "",                     nextIcon: "" },
  { status: "failed",     label: "Problema na entrega",icon: "❌", nextLabel: "",                     nextIcon: "" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:    "#888",
  assigned:   "#60a5fa",
  picked_up:  "#a855f7",
  in_transit: "#fbbf24",
  delivered:  "#00ffae",
  failed:     "#f87171",
};

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export default function DriverPortalPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("order_intents")
      .select("id, table_number, items, total, notes, delivery_status, delivery_picked_at, delivery_completed_at, created_at")
      .eq("id", orderId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError("Pedido não encontrado");
        else setOrder(data as DriverOrder);
        setLoading(false);
      });

    // Realtime: atualizar se outro dispositivo mudar o status
    const channel = supabase
      .channel(`driver-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_intents", filter: `id=eq.${orderId}` }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<DriverOrder>) } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  async function advanceStatus() {
    if (!order) return;
    const current = order.delivery_status ?? "pending";
    const currentIdx = STEPS.findIndex(s => s.status === current);
    if (currentIdx < 0 || currentIdx >= STEPS.length - 2) return; // -2 = don't advance past in_transit via this button
    const next = STEPS[currentIdx + 1].status;

    const updates: Record<string, unknown> = { delivery_status: next };
    if (next === "picked_up") updates.delivery_picked_at = new Date().toISOString();
    if (next === "delivered") updates.delivery_completed_at = new Date().toISOString();

    setUpdating(true);
    const { error: err } = await supabase.from("order_intents").update(updates).eq("id", orderId);
    if (!err) setOrder(prev => prev ? { ...prev, delivery_status: next, ...updates } as DriverOrder : prev);
    else setError("Erro ao atualizar status");
    setUpdating(false);
  }

  async function markFailed() {
    if (!order) return;
    setUpdating(true);
    const { error: err } = await supabase.from("order_intents").update({ delivery_status: "failed" }).eq("id", orderId);
    if (!err) setOrder(prev => prev ? { ...prev, delivery_status: "failed" } : prev);
    else setError("Erro ao atualizar status");
    setUpdating(false);
  }

  const current = order?.delivery_status ?? "pending";
  const step = STEPS.find(s => s.status === current) ?? STEPS[0];
  const currentIdx = STEPS.findIndex(s => s.status === current);
  const canAdvance = currentIdx >= 0 && currentIdx < 4 && current !== "failed" && current !== "delivered";
  const color = STATUS_COLORS[current] ?? "#888";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      color: "#fff",
      padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{ padding: "48px 20px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>Portal do entregador</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>🛵 Pedido #{orderId.slice(-6).toUpperCase()}</div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div>Carregando pedido...</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
            <div style={{ color: "#f87171", fontWeight: 700 }}>{error}</div>
          </div>
        )}

        {order && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Status atual */}
            <div style={{
              borderRadius: 18, padding: "24px 20px", textAlign: "center",
              background: `${color}10`, border: `1px solid ${color}30`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 6 }}>{step.icon}</div>
              <div style={{ color, fontSize: 20, fontWeight: 800 }}>{step.label}</div>
            </div>

            {/* Detalhes do pedido */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "#888", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Pedido</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "#ccc" }}>{item.qty}× {item.code_name ?? `Item ${i + 1}`}{item.notes ? ` (${item.notes})` : ""}</span>
                    <span style={{ color: "#888" }}>{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
              {order.notes && (
                <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", fontSize: 13, color: "#fbbf24" }}>
                  ⚠️ {order.notes}
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ color: "#888" }}>Total</span>
                <span style={{ color: "#fff" }}>{formatPrice(order.total)}</span>
              </div>
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{order.table_number != null ? `Mesa ${order.table_number}` : "Sem mesa"}</span>
              </div>
            </div>

            {/* Botão de avançar status */}
            {canAdvance && (
              <button
                disabled={updating}
                onClick={advanceStatus}
                style={{
                  width: "100%", padding: "18px 0", borderRadius: 16, border: "none",
                  background: color, color: "#000", fontSize: 17, fontWeight: 800,
                  cursor: updating ? "not-allowed" : "pointer",
                  opacity: updating ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span>{step.nextIcon}</span>
                <span>{updating ? "Atualizando..." : step.nextLabel}</span>
              </button>
            )}

            {/* Botão de problema — mostrar só enquanto em andamento */}
            {canAdvance && current !== "pending" && (
              <button
                disabled={updating}
                onClick={markFailed}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12, border: "1px solid rgba(248,113,113,0.3)",
                  background: "rgba(248,113,113,0.08)", color: "#f87171",
                  fontSize: 14, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer",
                }}
              >
                ❌ Problema na entrega
              </button>
            )}

            {current === "delivered" && (
              <div style={{ textAlign: "center", padding: "12px", color: "#00ffae", fontSize: 15, fontWeight: 700 }}>
                🎉 Entrega concluída! Obrigado.
              </div>
            )}
            {current === "failed" && (
              <div style={{ textAlign: "center", padding: "12px", color: "#f87171", fontSize: 14, fontWeight: 600 }}>
                Entre em contato com o restaurante para resolver o problema.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
