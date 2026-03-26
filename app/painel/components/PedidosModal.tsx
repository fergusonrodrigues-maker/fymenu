"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = {
  product_id: string;
  qty: number;
  unit_price: number;
  total: number;
  code_name?: string;
  notes?: string;
};

type Order = {
  id: string;
  table_number: number | null;
  items: OrderItem[];
  total: number;
  status: string;
  waiter_status: string | null;
  kitchen_status: string | null;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
};

type FilterTab = "todos" | "ativos" | "entregues";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const WAITER_LABEL: Record<string, string> = {
  pending: "Novo",
  confirmed: "Confirmado",
  delivered: "Entregue",
};

const KITCHEN_LABEL: Record<string, string> = {
  waiting: "Aguardando cozinha",
  received: "Preparando",
  ready: "Pronto",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f87171",
  confirmed: "#fbbf24",
  delivered: "#00ffae",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PedidosModal({ unitId }: { unitId: string }) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ativos");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("order_intents")
        .select("id, table_number, items, total, status, waiter_status, kitchen_status, notes, payment_method, created_at")
        .eq("unit_id", unitId)
        .gte("created_at", todayStart())
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel(`pedidos-modal:${unitId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const o = payload.new as Order;
            if (o.created_at >= todayStart()) {
              setOrders((prev) => [o, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const filtered = orders.filter((o) => {
    if (filter === "ativos") return o.waiter_status !== "delivered";
    if (filter === "entregues") return o.waiter_status === "delivered";
    return true;
  });

  const totals = {
    todos: orders.length,
    ativos: orders.filter((o) => o.waiter_status !== "delivered").length,
    entregues: orders.filter((o) => o.waiter_status === "delivered").length,
  };

  const revenueDelivered = orders
    .filter((o) => o.waiter_status === "delivered")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "ativos", label: `Ativos ${totals.ativos > 0 ? `(${totals.ativos})` : ""}` },
    { id: "entregues", label: `Entregues (${totals.entregues})` },
    { id: "todos", label: `Todos (${totals.todos})` },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dash-text-muted)" }}>
        Carregando pedidos...
      </div>
    );
  }

  return (
    <div>
      {/* Revenue summary */}
      <div style={{
        background: "rgba(0,255,174,0.06)", border: "1px solid rgba(0,255,174,0.15)",
        borderRadius: 14, padding: "14px 18px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 2 }}>Faturamento do dia</div>
          <div style={{ color: "#00ffae", fontSize: 22, fontWeight: 900 }}>
            R$ {revenueDelivered.toFixed(2)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 2 }}>Pedidos entregues</div>
          <div style={{ color: "var(--dash-text)", fontSize: 22, fontWeight: 900 }}>{totals.entregues}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--dash-input-bg)", borderRadius: 12, padding: 3 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 9, border: "none",
              background: filter === t.id ? "var(--dash-card)" : "transparent",
              color: filter === t.id ? "var(--dash-text)" : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: filter === t.id ? 700 : 500,
              cursor: "pointer",
              boxShadow: filter === t.id ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--dash-text-muted)", fontSize: 13 }}>
          {filter === "ativos" ? "Nenhum pedido ativo no momento" : "Nenhum pedido encontrado"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((order) => {
            const ws = order.waiter_status ?? "pending";
            const ks = order.kitchen_status ?? "waiting";
            const statusColor = STATUS_COLOR[ws] ?? "#888";
            const isExpanded = expanded === order.id;

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--dash-card)",
                  border: "1px solid var(--dash-card-border)",
                  borderRadius: 14, overflow: "hidden",
                  cursor: "pointer",
                }}
                onClick={() => setExpanded(isExpanded ? null : order.id)}
              >
                {/* Header row */}
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>
                      {order.table_number ? `Mesa ${order.table_number}` : "Sem mesa"}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35`,
                    }}>
                      {WAITER_LABEL[ws]}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#00ffae", fontSize: 14, fontWeight: 700 }}>
                      R$ {Number(order.total).toFixed(2)}
                    </span>
                    <span style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
                      {timeStr(order.created_at)}
                    </span>
                    <span style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{
                    borderTop: "1px solid var(--dash-card-border)",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    {/* Kitchen status */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                        background: "rgba(255,255,255,0.05)", color: "var(--dash-text-muted)",
                        border: "1px solid var(--dash-card-border)",
                      }}>
                        🍳 {KITCHEN_LABEL[ks]}
                      </span>
                    </div>

                    {/* Items */}
                    <div style={{ marginBottom: 10 }}>
                      {order.items?.map((item, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between",
                          fontSize: 13, color: "var(--dash-text-dim)", padding: "3px 0",
                          borderBottom: i < order.items.length - 1 ? "1px solid var(--dash-card-border)" : "none",
                        }}>
                          <span>{item.qty}× {item.code_name ?? "Item"}</span>
                          <span>R$ {Number(item.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div style={{
                        fontSize: 12, color: "var(--dash-text-muted)", fontStyle: "italic",
                        padding: "8px", background: "rgba(255,255,255,0.03)", borderRadius: 8,
                        marginBottom: 8,
                      }}>
                        💬 {order.notes}
                      </div>
                    )}

                    {/* Payment */}
                    {order.payment_method && (
                      <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>
                        Pagamento: <span style={{ color: "var(--dash-text)" }}>{order.payment_method}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
