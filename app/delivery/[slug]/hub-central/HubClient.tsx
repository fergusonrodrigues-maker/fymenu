"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HubOrder = {
  id: string;
  table_number: number | null;
  items: Array<{ product_id: string; qty: number; unit_price: number; total: number; code_name?: string; notes?: string }>;
  total: number;
  status: string;
  waiter_status: string | null;
  kitchen_status: string | null;
  notes: string | null;
  created_at: string;
  waiter_confirmed_at: string | null;
};

interface Props {
  unitId: string;
  unitName: string;
  restaurantName: string;
  slug: string;
  initialOrders: HubOrder[];
}

function elapsed(from: string) {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}min`;
}

function elapsedSeconds(from: string) {
  return Math.floor((Date.now() - new Date(from).getTime()) / 1000);
}

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default function HubClient({ unitId, unitName, restaurantName, slug, initialOrders }: Props) {
  const [orders, setOrders] = useState<HubOrder[]>(initialOrders);
  const [tick, setTick] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tableCalls, setTableCalls] = useState<any[]>([]);
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
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
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
      .channel(`hub-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const o = payload.new as HubOrder;
          if (o.status === "confirmed" && o.kitchen_status !== "delivered") {
            if (payload.eventType === "INSERT") playBell();
            setOrders((prev) => {
              const exists = prev.find((x) => x.id === o.id);
              if (exists) return prev.map((x) => (x.id === o.id ? { ...x, ...o } : x));
              playBell();
              return [o, ...prev];
            });
          } else {
            setOrders((prev) => prev.filter((x) => x.id !== o.id));
          }
        } else if (payload.eventType === "DELETE") {
          setOrders((prev) => prev.filter((x) => x.id !== (payload.old as HubOrder).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  useEffect(() => {
    supabase.from("table_calls").select("*").eq("unit_id", unitId).eq("status", "pending").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTableCalls(data); });

    const channel = supabase
      .channel("hub-table-calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        const call = payload.new as any;
        setTableCalls(prev => [call, ...prev]);
        if (call.type === "manager" && navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
        else if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        try { new Audio("/notification.mp3").play(); } catch {}
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        setTableCalls(prev => prev.map(c => c.id === payload.new.id ? payload.new as any : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markKitchenStatus = async (orderId: string, status: string) => {
    await supabase.from("order_intents").update({ kitchen_status: status }).eq("id", orderId);
    if (status === "delivered") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, kitchen_status: status } : o)));
    }
  };

  const novos = orders.filter((o) => !o.kitchen_status || o.kitchen_status === "waiting");
  const preparando = orders.filter((o) => o.kitchen_status === "preparing");
  const prontos = orders.filter((o) => o.kitchen_status === "ready");
  const pendingCalls = tableCalls.filter(c => c.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>🍳 Hub Central <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>— {unitName}</span></div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{restaurantName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {orders.length === 0 ? (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Nenhum pedido</span>
          ) : (
            <>
              <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 10, fontWeight: 700, border: "1px solid rgba(248,113,113,0.2)" }}>{novos.length} novos</span>
              <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(251,191,36,0.08)", color: "#fbbf24", fontSize: 10, fontWeight: 700, border: "1px solid rgba(251,191,36,0.2)" }}>{preparando.length} prep.</span>
              <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(0,255,174,0.06)", color: "#00ffae", fontSize: 10, fontWeight: 700, border: "1px solid rgba(0,255,174,0.15)" }}>{prontos.length} pronto{prontos.length !== 1 ? "s" : ""}</span>
            </>
          )}
          <a href="/pdv" style={{ marginLeft: 4, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(167,139,250,0.12)", color: "#a78bfa", fontSize: 10, fontWeight: 700, textDecoration: "none" }}>💳 PDV</a>
        </div>
      </header>

      {/* Chamados */}
      {pendingCalls.length > 0 && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {pendingCalls.filter(c => c.type === "manager").map(call => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <div>
                <div style={{ color: "#a855f7", fontSize: 13, fontWeight: 800 }}>👔 Mesa {call.table_number} — GERENTE!</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>{new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <button onClick={async () => { await supabase.from("table_calls").update({ status: "resolved", acknowledged_by: "Gerente", acknowledged_at: new Date().toISOString(), resolved_at: new Date().toISOString() }).eq("id", call.id); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(168,85,247,0.12)", color: "#a855f7", fontSize: 11, fontWeight: 700 }}>✓ Atender</button>
            </div>
          ))}
          {pendingCalls.filter(c => c.type === "waiter").map(call => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <div>
                <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 800 }}>🖐️ Mesa {call.table_number} chamando!</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>{new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <button onClick={async () => { await supabase.from("table_calls").update({ status: "resolved", acknowledged_by: unitName, acknowledged_at: new Date().toISOString(), resolved_at: new Date().toISOString() }).eq("id", call.id); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 11, fontWeight: 700 }}>✓ Atender</button>
            </div>
          ))}
        </div>
      )}

      {/* Kanban */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>
        {/* NOVOS */}
        <HubColumn title="🔴 NOVOS" accentColor="rgba(248,113,113,0.5)" titleColor="#f87171" bg="rgba(248,113,113,0.015)">
          {novos.length === 0 && <HubEmptyState text="Nenhum pedido novo" />}
          {novos.map((o) => (
            <HubOrderCard key={o.id} order={o} tick={tick}>
              <button onClick={() => markKitchenStatus(o.id, "preparing")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontSize: 12, fontWeight: 700, marginTop: 10, boxShadow: "0 1px 0 rgba(251,191,36,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                🍳 Iniciar Preparo
              </button>
            </HubOrderCard>
          ))}
        </HubColumn>

        {/* EM PREPARO */}
        <HubColumn title="🟡 EM PREPARO" accentColor="rgba(251,191,36,0.5)" titleColor="#fbbf24" bg="rgba(251,191,36,0.015)">
          {preparando.length === 0 && <HubEmptyState text="Nenhum em preparo" />}
          {preparando.map((o) => (
            <HubOrderCard key={o.id} order={o} tick={tick}>
              <button onClick={() => markKitchenStatus(o.id, "ready")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 12, fontWeight: 700, marginTop: 10, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                ✅ Marcar Pronto
              </button>
            </HubOrderCard>
          ))}
        </HubColumn>

        {/* PRONTOS */}
        <HubColumn title="🟢 PRONTOS" accentColor="rgba(0,255,174,0.4)" titleColor="#00ffae" bg="rgba(0,255,174,0.01)">
          {prontos.length === 0 && <HubEmptyState text="Nenhum pronto ainda" />}
          {prontos.map((o) => (
            <HubOrderCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => { const link = `${window.location.origin}/entrega/${o.id}`; navigator.clipboard.writeText(link).then(() => { setCopiedId(o.id); setTimeout(() => setCopiedId(null), 2000); }); }}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer", background: "rgba(96,165,250,0.08)", color: "#60a5fa", fontSize: 12, fontWeight: 600, marginTop: 10 }}
              >
                {copiedId === o.id ? "✓ Link copiado!" : "🔗 Enviar pro entregador"}
              </button>
              <button onClick={() => markKitchenStatus(o.id, "delivered")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                🚀 Entregue — Remover
              </button>
            </HubOrderCard>
          ))}
        </HubColumn>
      </div>
    </div>
  );
}

function HubColumn({ title, accentColor, titleColor, bg, children }: { title: string; accentColor: string; titleColor: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRight: "1px solid rgba(255,255,255,0.04)", background: bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `2px solid ${accentColor}`, background: "rgba(5,5,5,0.6)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.5px", color: titleColor }}>{title}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function HubEmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: "rgba(255,255,255,0.15)", fontSize: 12 }}>{text}</div>
  );
}

function HubOrderCard({ order, tick, children }: { order: HubOrder; tick: number; children: React.ReactNode }) {
  const label = order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";
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
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: isLate ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.06)", color: isLate ? "#f87171" : "rgba(255,255,255,0.4)" }}>
          {elapsed(since)}
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: "0 0 6px", padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {order.items?.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 4, fontSize: 13, alignItems: "baseline" }}>
            <span style={{ color: "#fff", fontWeight: 700, minWidth: 20 }}>{item.qty}×</span>
            <span style={{ color: "rgba(255,255,255,0.7)", flex: 1 }}>{item.code_name ?? `Item ${i + 1}`}</span>
            {item.notes && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>({item.notes})</span>}
          </li>
        ))}
      </ul>
      {order.notes && (
        <div style={{ marginBottom: 6, padding: "5px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 11, color: "#fbbf24" }}>⚠️ {order.notes}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{formatPrice(order.total)}</span>
      </div>
      {children}
    </div>
  );
}
