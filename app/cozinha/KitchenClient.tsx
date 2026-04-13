"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type KOrder = {
  id: string;
  table_number: number | null;
  items: Array<{ product_id: string; qty: number; unit_price: number; total: number; code_name?: string; notes?: string; addons?: Array<{ id: string; name: string; price: number }> }>;
  total: number;
  status: string;
  waiter_status: string | null;
  kitchen_status: string | null;
  notes: string | null;
  created_at: string;
  waiter_confirmed_at: string | null;
  delivery_status?: string | null;
};

const deliveryLabels: Record<string, { text: string; color: string }> = {
  assigned: { text: "Entregador atribuído", color: "#60a5fa" },
  picked_up: { text: "Retirado", color: "#a855f7" },
  in_transit: { text: "Em trânsito", color: "#fbbf24" },
  delivered: { text: "Entregue ✓", color: "#00ffae" },
  failed: { text: "Problema na entrega", color: "#f87171" },
};

interface Props {
  unitId: string;
  unitName: string;
  restaurantName: string;
  initialOrders: KOrder[];
}

function elapsed(from: string) {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}min`;
}

function elapsedSeconds(from: string) {
  return Math.floor((Date.now() - new Date(from).getTime()) / 1000);
}

export default function KitchenClient({ unitId, unitName, restaurantName, initialOrders }: Props) {
  const [orders, setOrders] = useState<KOrder[]>(initialOrders);
  const [tick, setTick] = useState(0);
  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const playBell = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      [440, 550, 660].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = f; osc.type = "triangle";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.5);
      });
    } catch {}
  };

  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const o = payload.new as KOrder;
          if (o.status === "confirmed" && o.kitchen_status !== "delivered") {
            if (payload.eventType === "INSERT") playBell();
            setOrders((prev) => {
              const exists = prev.find((x) => x.id === o.id);
              if (exists) return prev.map((x) => x.id === o.id ? { ...x, ...o } : x);
              playBell();
              return [o, ...prev];
            });
            if (o.delivery_status === "delivered") {
              setTimeout(() => { setOrders((prev) => prev.filter((x) => x.id !== o.id)); }, 5000);
            }
          } else {
            setOrders((prev) => prev.filter((x) => x.id !== o.id));
          }
        } else if (payload.eventType === "DELETE") {
          setOrders((prev) => prev.filter((x) => x.id !== (payload.old as KOrder).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const markKitchenStatus = async (orderId: string, status: string) => {
    const patch: Record<string, unknown> = { kitchen_status: status };
    if (status === "ready") patch.ready_at = new Date().toISOString();
    await supabase.from("order_intents").update(patch).eq("id", orderId);
    if (status === "ready") {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, kitchen_status: "ready" } : o));
    } else if (status === "delivered") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, kitchen_status: status } : o));
    }
  };

  const waiting = orders.filter((o) => !o.kitchen_status || o.kitchen_status === "waiting");
  const preparing = orders.filter((o) => o.kitchen_status === "preparing");
  const ready = orders.filter((o) => o.kitchen_status === "ready");

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>🍳 Cozinha — {unitName}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{restaurantName}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 10, fontWeight: 700, border: "1px solid rgba(248,113,113,0.2)" }}>{waiting.length} novos</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(251,191,36,0.08)", color: "#fbbf24", fontSize: 10, fontWeight: 700, border: "1px solid rgba(251,191,36,0.2)" }}>{preparing.length} prep.</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(0,255,174,0.06)", color: "#00ffae", fontSize: 10, fontWeight: 700, border: "1px solid rgba(0,255,174,0.15)" }}>{ready.length} pronto{ready.length !== 1 ? "s" : ""}</span>
        </div>
      </header>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden", height: "calc(100vh - 57px)" }}>
        {/* NOVOS */}
        <KColumn title="🔴 NOVOS" accentColor="rgba(248,113,113,0.5)" titleColor="#f87171" bg="rgba(248,113,113,0.015)">
          {waiting.length === 0 && <KEmptyCol text="Nenhum pedido novo" />}
          {waiting.map((o) => (
            <KitchenCard key={o.id} order={o} tick={tick}>
              <button onClick={() => markKitchenStatus(o.id, "preparing")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontSize: 12, fontWeight: 700, marginTop: 10, boxShadow: "0 1px 0 rgba(251,191,36,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                🍳 Iniciar Preparo
              </button>
            </KitchenCard>
          ))}
        </KColumn>

        {/* EM PREPARO */}
        <KColumn title="🟡 EM PREPARO" accentColor="rgba(251,191,36,0.5)" titleColor="#fbbf24" bg="rgba(251,191,36,0.015)">
          {preparing.length === 0 && <KEmptyCol text="Nenhum em preparo" />}
          {preparing.map((o) => (
            <KitchenCard key={o.id} order={o} tick={tick}>
              <button onClick={() => markKitchenStatus(o.id, "ready")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 12, fontWeight: 700, marginTop: 10, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                ✅ Marcar Pronto
              </button>
            </KitchenCard>
          ))}
        </KColumn>

        {/* PRONTOS */}
        <KColumn title="🟢 PRONTOS" accentColor="rgba(0,255,174,0.4)" titleColor="#00ffae" bg="rgba(0,255,174,0.01)">
          {ready.length === 0 && <KEmptyCol text="Nenhum pronto ainda" />}
          {ready.map((o) => (
            <KitchenCard key={o.id} order={o} tick={tick}>
              {o.delivery_status !== "delivered" && (
                <button onClick={() => markKitchenStatus(o.id, "delivered")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginTop: 10 }}>
                  🚀 Entregue — Remover
                </button>
              )}
            </KitchenCard>
          ))}
        </KColumn>
      </div>
    </div>
  );
}

function KColumn({ title, accentColor, titleColor, bg, children }: { title: string; accentColor: string; titleColor: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRight: "1px solid rgba(255,255,255,0.04)", background: bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `2px solid ${accentColor}`, background: "rgba(5,5,5,0.6)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.5px", color: titleColor }}>{title}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function KEmptyCol({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: "rgba(255,255,255,0.15)", fontSize: 12 }}>{text}</div>
  );
}

function KitchenCard({ order, tick, children }: { order: KOrder; tick: number; children: React.ReactNode }) {
  const tableLabel = order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";
  const since = order.waiter_confirmed_at ?? order.created_at;
  const secs = elapsedSeconds(since);
  const isLate = secs > 600;

  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: isLate ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isLate ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.05)"}`,
      boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{tableLabel}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: isLate ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.06)", color: isLate ? "#f87171" : "rgba(255,255,255,0.4)" }}>
          {elapsed(since)}
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {order.items?.map((item, i) => (
          <li key={i} style={{ fontSize: 13 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>{item.qty}×</span>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>{item.code_name ?? `Item ${i + 1}`}</span>
              {item.notes && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>({item.notes})</span>}
            </div>
            {item.addons && item.addons.length > 0 && (
              <ul style={{ listStyle: "none", marginLeft: 16, padding: 0 }}>
                {item.addons.map((a: { id: string; name: string; price: number }) => (
                  <li key={a.id} style={{ fontSize: 11, color: "#fbbf24" }}>+ {a.name}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {order.notes && (
        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 11, color: "#fbbf24" }}>
          ⚠️ {order.notes}
        </div>
      )}
      {order.delivery_status && order.delivery_status !== "pending" && deliveryLabels[order.delivery_status] && (
        <div style={{ marginTop: 8, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: `${deliveryLabels[order.delivery_status].color}20`, color: deliveryLabels[order.delivery_status].color, border: `1px solid ${deliveryLabels[order.delivery_status].color}40` }}>
          {deliveryLabels[order.delivery_status].text}
        </div>
      )}
      {children}
    </div>
  );
}
