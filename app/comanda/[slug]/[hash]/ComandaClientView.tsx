"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ComandaRecord = {
  id: string;
  table_number: number | null;
  hash: string;
  status: string;
  created_at: string;
};

type ComandaItem = {
  id: string;
  comanda_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  addons: { name: string }[] | null;
  notes: string | null;
  status: string;
};

interface Props {
  comanda: ComandaRecord;
  initialItems: ComandaItem[];
  unitName: string;
  unitLogo: string | null;
}

export default function ComandaClientView({ comanda: initialComanda, initialItems, unitName }: Props) {
  const [comanda, setComanda] = useState<ComandaRecord>(initialComanda);
  const [items, setItems] = useState<ComandaItem[]>(initialItems);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`comanda-client-${comanda.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_items", filter: `comanda_id=eq.${comanda.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setItems(prev => [...prev, payload.new as ComandaItem]);
        } else if (payload.eventType === "UPDATE") {
          setItems(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
        } else if (payload.eventType === "DELETE") {
          setItems(prev => prev.filter(i => i.id !== (payload.old as any).id));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "comandas", filter: `id=eq.${comanda.id}` }, (payload) => {
        setComanda(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [comanda.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeItems = items.filter(i => i.status !== "canceled");
  const total = activeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const statusLabel = comanda.status === "open"
    ? "Comanda aberta"
    : comanda.status === "pending_payment"
    ? "Aguardando pagamento"
    : "Fechada";

  const statusStyle = comanda.status === "open"
    ? { background: "rgba(0,255,174,0.1)", color: "#00ffae" }
    : comanda.status === "pending_payment"
    ? { background: "rgba(251,191,36,0.1)", color: "#fbbf24" }
    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" };

  function itemStatusLabel(s: string) {
    if (s === "pending") return "⏳ Aguardando";
    if (s === "confirmed") return "✅ Confirmado";
    if (s === "preparing") return "🔥 Preparando";
    if (s === "ready") return "🍽️ Pronto";
    if (s === "delivered") return "✓ Entregue";
    return "❌ Cancelado";
  }

  function itemStatusColor(s: string) {
    if (s === "delivered") return "#00ffae";
    if (s === "preparing" || s === "ready") return "#fbbf24";
    return "rgba(255,255,255,0.3)";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "0 0 100px" }}>
      {/* Header */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{unitName}</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Mesa {comanda.table_number ?? "—"}</div>
        <div style={{
          display: "inline-block", padding: "3px 10px", borderRadius: 8, marginTop: 6,
          fontSize: 11, fontWeight: 600, ...statusStyle,
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Items list */}
      <div style={{ padding: "16px" }}>
        {activeItems.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
            Nenhum item adicionado ainda. Aguarde o garçom.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeItems.map(item => (
              <div key={item.id} style={{
                padding: "12px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{item.quantity}× </span>
                    <span style={{ fontSize: 14 }}>{item.product_name}</span>
                  </div>
                  <span style={{ color: "#00ffae", fontWeight: 700, fontSize: 14 }}>
                    R$ {((item.quantity * item.unit_price) / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {item.notes && (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
                    📝 {item.notes}
                  </p>
                )}
                {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    + {item.addons.map(a => a.name).join(", ")}
                  </div>
                )}
                <div style={{
                  marginTop: 6, fontSize: 11, fontWeight: 600,
                  color: itemStatusColor(item.status),
                }}>
                  {itemStatusLabel(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with total */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "16px 20px", background: "rgba(10,10,10,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              {activeItems.length} ite{activeItems.length !== 1 ? "ns" : "m"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#00ffae" }}>
              R$ {(total / 100).toFixed(2).replace(".", ",")}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Atualiza em tempo real
          </div>
        </div>
      </div>
    </div>
  );
}
