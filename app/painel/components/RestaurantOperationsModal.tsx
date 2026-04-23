"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import FyLoader from "@/components/FyLoader";
import { Armchair, ChefHat, Target, BarChart3, Search, UserCog, Users, CreditCard, Truck, CheckCircle2, XCircle, AlertCircle, Circle, X } from "lucide-react";

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
  created_at: string;
};

type AuditLog = {
  id: string;
  comanda_id: string;
  order_id: string | null;
  unit_id: string;
  action: string;
  item_name: string | null;
  old_value: string | null;
  new_value: string | null;
  performed_by_role: string;
  performed_by_name: string;
  reason: string | null;
  created_at: string;
};

type Mesa = {
  id: string;
  unit_id: string;
  number: number;
  label: string | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "inactive";
  current_comanda_id: string | null;
  current_waiter_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Tab = "mesas" | "cozinha" | "garcom" | "andamento" | "auditoria";

// ── Status helpers ────────────────────────────────────────────────────────────

const KITCHEN_LABELS: Record<string, string> = {
  waiting: "Aguardando",
  received: "Preparando",
  ready: "Pronto",
};

const KITCHEN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  waiting: { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", text: "#f87171" },
  received: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", text: "#fbbf24" },
  ready: { bg: "rgba(0,255,174,0.08)", border: "rgba(0,255,174,0.3)", text: "#00ffae" },
};

const WAITER_LABELS: Record<string, string> = {
  pending: "Novo",
  confirmed: "Confirmado",
  delivered: "Entregue",
};

const WAITER_COLORS: Record<string, string> = {
  pending: "#f87171",
  confirmed: "#fbbf24",
  delivered: "#00ffae",
};

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function within24h(iso: string) {
  return Date.now() - new Date(iso).getTime() < 86400000;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RestaurantOperationsModal({
  unitId,
  comandaClosePermission: initialPermission,
}: {
  unitId: string;
  comandaClosePermission: "garcom_e_caixa" | "somente_caixa";
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("mesas");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [comandaPermission, setComandaPermission] = useState<"garcom_e_caixa" | "somente_caixa">(
    initialPermission
  );

  // ── Mesas state ──────────────────────────────────────────────────────────────
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [showAddMesa, setShowAddMesa] = useState(false);
  const [mesaFrom, setMesaFrom] = useState(1);
  const [mesaTo, setMesaTo] = useState(10);
  const [mesaCapacity, setMesaCapacity] = useState(4);
  const [addingMesas, setAddingMesas] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [editMesaLabel, setEditMesaLabel] = useState("");

  useEffect(() => {
    if (!unitId) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("order_intents")
        .select("id, table_number, items, total, status, waiter_status, kitchen_status, notes, created_at")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false })
        .limit(200);
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel(`operations:${unitId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== (payload.old as Order).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  // ── Mesas: load + realtime ───────────────────────────────────────────────────
  useEffect(() => {
    if (!unitId) return;
    supabase.from("mesas").select("*").eq("unit_id", unitId).order("number")
      .then(({ data }) => { if (data) setMesas(data as Mesa[]); });

    const channel = supabase.channel("mesas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas", filter: `unit_id=eq.${unitId}` },
        () => {
          supabase.from("mesas").select("*").eq("unit_id", unitId).order("number")
            .then(({ data }) => { if (data) setMesas(data as Mesa[]); });
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  useEffect(() => { setEditMesaLabel(selectedMesa?.label ?? ""); }, [selectedMesa]);

  // ── Mesas handlers ───────────────────────────────────────────────────────────
  async function handleAddMesas() {
    if (mesaFrom > mesaTo || mesaFrom < 1) return;
    setAddingMesas(true);
    const inserts = [];
    for (let i = mesaFrom; i <= mesaTo; i++) {
      inserts.push({ unit_id: unitId, number: i, capacity: mesaCapacity });
    }
    const { error } = await supabase.from("mesas").upsert(inserts, { onConflict: "unit_id,number" });
    if (!error) {
      setShowAddMesa(false);
      const { data } = await supabase.from("mesas").select("*").eq("unit_id", unitId).order("number");
      if (data) setMesas(data as Mesa[]);
    }
    setAddingMesas(false);
  }

  async function handleForceCloseMesa(mesaId: string) {
    await supabase.from("mesas").update({
      status: "available", current_comanda_id: null, current_waiter_id: null, updated_at: new Date().toISOString(),
    }).eq("id", mesaId);
    setSelectedMesa(null);
  }

  async function handleToggleMesaStatus(mesaId: string, newStatus: string) {
    await supabase.from("mesas").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", mesaId);
    setSelectedMesa(null);
  }

  async function handleDeleteMesa(mesaId: string) {
    await supabase.from("mesas").update({ is_active: false }).eq("id", mesaId);
    setSelectedMesa(null);
  }

  async function updateKitchenStatus(orderId: string, kitchen_status: string) {
    await supabase.from("order_intents").update({ kitchen_status }).eq("id", orderId);
  }

  async function updateWaiterStatus(orderId: string, waiter_status: string) {
    await supabase.from("order_intents").update({ waiter_status }).eq("id", orderId);
  }

  async function updateComandaPermission(value: "garcom_e_caixa" | "somente_caixa") {
    setComandaPermission(value);
    await supabase.from("units").update({ comanda_close_permission: value }).eq("id", unitId);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "mesas",    label: "Mesas",     icon: <Armchair size={13} /> },
    { id: "cozinha",  label: "Cozinha",   icon: <ChefHat size={13} /> },
    { id: "garcom",   label: "Garçom",    icon: <Target size={13} /> },
    { id: "andamento",label: "Andamento", icon: <BarChart3 size={13} /> },
    { id: "auditoria",label: "Auditoria", icon: <Search size={13} /> },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <FyLoader size="sm" />
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--dash-input-bg)", borderRadius: 14, padding: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, border: "none",
              background: tab === t.id ? "var(--dash-accent-soft)" : "transparent",
              color: tab === t.id ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{t.icon}{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "mesas" && (
        <MesasTab
          mesas={mesas}
          showAddMesa={showAddMesa}
          setShowAddMesa={setShowAddMesa}
          mesaFrom={mesaFrom}
          setMesaFrom={setMesaFrom}
          mesaTo={mesaTo}
          setMesaTo={setMesaTo}
          mesaCapacity={mesaCapacity}
          setMesaCapacity={setMesaCapacity}
          addingMesas={addingMesas}
          onAddMesas={handleAddMesas}
          selectedMesa={selectedMesa}
          setSelectedMesa={setSelectedMesa}
          editMesaLabel={editMesaLabel}
          setEditMesaLabel={setEditMesaLabel}
          onUpdateLabel={async (label) => {
            if (!selectedMesa) return;
            await supabase.from("mesas").update({ label }).eq("id", selectedMesa.id);
          }}
          onForceClose={handleForceCloseMesa}
          onToggleStatus={handleToggleMesaStatus}
          onDelete={handleDeleteMesa}
        />
      )}
      {tab === "cozinha" && (
        <CozinhaTab orders={orders} onUpdateKitchen={updateKitchenStatus} />
      )}
      {tab === "garcom" && (
        <GarcomTab
          orders={orders}
          onUpdateWaiter={updateWaiterStatus}
          comandaPermission={comandaPermission}
          onUpdatePermission={updateComandaPermission}
        />
      )}
      {tab === "andamento" && (
        <AndamentoTab orders={orders} />
      )}
      {tab === "auditoria" && (
        <AuditoriaTab unitId={unitId} />
      )}
    </div>
  );
}

// ── Aba Cozinha ───────────────────────────────────────────────────────────────

function CozinhaTab({
  orders,
  onUpdateKitchen,
}: {
  orders: Order[];
  onUpdateKitchen: (id: string, status: string) => void;
}) {
  const active = orders.filter((o) => o.waiter_status !== "delivered");
  const byStatus = {
    waiting: active.filter((o) => (o.kitchen_status ?? "waiting") === "waiting"),
    received: active.filter((o) => o.kitchen_status === "received"),
    ready: active.filter((o) => o.kitchen_status === "ready"),
  };

  const nextKitchen: Record<string, string> = {
    waiting: "received",
    received: "ready",
    ready: "ready",
  };

  const nextLabel: Record<string, string> = {
    waiting: "Iniciar preparo",
    received: "Marcar pronto",
    ready: "Pronto",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>
        {active.length} pedido{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""}
      </div>

      {(["waiting", "received", "ready"] as const).map((ks) => {
        const col = KITCHEN_COLORS[ks];
        const list = byStatus[ks];
        return (
          <div key={ks}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{
                background: col.bg, border: `1px solid ${col.border}`, color: col.text,
                borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
              }}>{list.length}</span>
              <span style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>
                {KITCHEN_LABELS[ks]}
              </span>
            </div>
            {list.length === 0 ? (
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12, padding: "8px 0" }}>
                Nenhum pedido
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actionLabel={nextLabel[ks]}
                    actionDisabled={ks === "ready"}
                    onAction={() => onUpdateKitchen(order.id, nextKitchen[ks])}
                    accentColor={col.text}
                    accentBg={col.bg}
                    accentBorder={col.border}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Aba Garçom ────────────────────────────────────────────────────────────────

function GarcomTab({
  orders,
  onUpdateWaiter,
  comandaPermission,
  onUpdatePermission,
}: {
  orders: Order[];
  onUpdateWaiter: (id: string, status: string) => void;
  comandaPermission: "garcom_e_caixa" | "somente_caixa";
  onUpdatePermission: (value: "garcom_e_caixa" | "somente_caixa") => void;
}) {
  const [viewAs, setViewAs] = useState<"owner" | string>("owner");
  const active = orders.filter((o) => o.waiter_status !== "delivered");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Super Admin header */}
      <div style={{
        borderRadius: 12, padding: "12px 14px",
        background: "rgba(0,255,174,0.05)", border: "1px solid rgba(0,255,174,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: "rgba(0,255,174,0.12)", color: "#00ffae", border: "1px solid rgba(0,255,174,0.3)",
          }}>
            DONO · Super Admin
          </span>
        </div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 6 }}>Visualizar como:</div>
        <select
          value={viewAs}
          onChange={(e) => setViewAs(e.target.value)}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 9,
            border: "1px solid var(--dash-input-border)", backgroundColor: "var(--dash-input-bg)",
            color: "var(--dash-text)", fontSize: 13, outline: "none",
          }}
        >
          <option value="owner">Sua visão (Dono) — todos os pedidos</option>
          <option value="garcom">Visão do Garçom — comandas ativas</option>
          <option value="cozinha">Visão da Cozinha — fila de preparo</option>
        </select>
      </div>

      {/* Permissão de fechamento */}
      <div style={{ marginTop: 4 }}>
        <label style={{ color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>
          Quem pode fechar comanda e receber pagamento?
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onUpdatePermission("garcom_e_caixa")}
            style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "1px solid",
              borderColor: comandaPermission === "garcom_e_caixa" ? "#00ffae" : "var(--dash-border)",
              background: comandaPermission === "garcom_e_caixa" ? "rgba(0,255,174,0.08)" : "transparent",
              color: comandaPermission === "garcom_e_caixa" ? "#00ffae" : "var(--dash-text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Garçom e Caixa
          </button>
          <button
            onClick={() => onUpdatePermission("somente_caixa")}
            style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "1px solid",
              borderColor: comandaPermission === "somente_caixa" ? "#00ffae" : "var(--dash-border)",
              background: comandaPermission === "somente_caixa" ? "rgba(0,255,174,0.08)" : "transparent",
              color: comandaPermission === "somente_caixa" ? "#00ffae" : "var(--dash-text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Somente Caixa
          </button>
        </div>
        <p style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 6, marginBottom: 0 }}>
          {comandaPermission === "somente_caixa"
            ? "Garçom só lança pedidos. Fechamento e pagamento são feitos no caixa."
            : "Garçom pode fechar a comanda e receber pagamento direto na mesa."
          }
        </p>
      </div>

      <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 4 }}>
        {active.length} comanda{active.length !== 1 ? "s" : ""} em aberto
      </div>

      {active.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--dash-text-muted)", fontSize: 13 }}>
          Nenhuma comanda em aberto
        </div>
      ) : (
        active.map((order) => {
          const ws = order.waiter_status ?? "pending";
          const color = WAITER_COLORS[ws] ?? "#888";
          const kitchenColor = KITCHEN_COLORS[order.kitchen_status ?? "waiting"];
          const nextWaiter: Record<string, string | null> = {
            pending: "confirmed",
            confirmed: "delivered",
            delivered: null,
          };
          const nextLabel: Record<string, string> = {
            pending: "Confirmar pedido",
            confirmed: "Entregar",
            delivered: "Entregue",
          };
          const canAdvance = ws !== "delivered";

          return (
            <div key={order.id} style={{
              background: "var(--dash-card)",
              border: `1px solid var(--dash-card-border)`,
              borderRadius: 14, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 800 }}>
                    {order.table_number ? `Mesa ${order.table_number}` : "Sem mesa"}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: `${color}20`, color, border: `1px solid ${color}40`,
                  }}>
                    {WAITER_LABELS[ws]}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#00ffae", fontSize: 14, fontWeight: 700 }}>
                    R$ {Number(order.total).toFixed(2)}
                  </div>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>{timeStr(order.created_at)}</div>
                </div>
              </div>

              {/* Kitchen status badge */}
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  background: kitchenColor.bg, color: kitchenColor.text, border: `1px solid ${kitchenColor.border}`,
                }}>
                  Cozinha: {KITCHEN_LABELS[order.kitchen_status ?? "waiting"]}
                </span>
              </div>

              {/* Items */}
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 10 }}>
                {order.items?.slice(0, 3).map((item, i) => (
                  <div key={i}>• {item.qty}× {item.code_name ?? "Item"}</div>
                ))}
                {(order.items?.length ?? 0) > 3 && (
                  <div>+ {order.items.length - 3} item{order.items.length - 3 !== 1 ? "s" : ""}</div>
                )}
              </div>

              {canAdvance && (
                <button
                  onClick={() => onUpdateWaiter(order.id, nextWaiter[ws]!)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 10, border: "none",
                    background: "rgba(0,255,174,0.12)", color: "#00ffae",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {nextLabel[ws]}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Aba Andamento ─────────────────────────────────────────────────────────────

function AndamentoTab({ orders }: { orders: Order[] }) {
  const recent = orders.filter((o) => within24h(o.created_at));

  const stats = {
    waiting: recent.filter((o) => (o.kitchen_status ?? "waiting") === "waiting" && o.waiter_status !== "delivered").length,
    received: recent.filter((o) => o.kitchen_status === "received").length,
    ready: recent.filter((o) => o.kitchen_status === "ready").length,
    delivered: recent.filter((o) => o.waiter_status === "delivered").length,
  };

  const statCards = [
    { label: "Aguardando", value: stats.waiting, color: "#f87171" },
    { label: "Preparando", value: stats.received, color: "#fbbf24" },
    { label: "Prontos", value: stats.ready, color: "#00ffae" },
    { label: "Entregues", value: stats.delivered, color: "#60a5fa" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: "var(--dash-card)", border: "1px solid var(--dash-card-border)",
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Timeline (últimas 24h)
        </div>
        {recent.length === 0 ? (
          <div style={{ color: "var(--dash-text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            Nenhum pedido nas últimas 24h
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 320, overflowY: "auto" }}>
            {recent.map((order, idx) => {
              const ws = order.waiter_status ?? "pending";
              const isDelivered = ws === "delivered";
              const dotColor = isDelivered ? "#00ffae" : "var(--dash-card-border)";
              return (
                <div key={order.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    {idx < recent.length - 1 && (
                      <div style={{ width: 1, height: 32, background: "var(--dash-card-border)", marginTop: 2 }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 20, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>
                        {order.table_number ? `Mesa ${order.table_number}` : "Sem mesa"}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20,
                        background: isDelivered ? "rgba(0,255,174,0.1)" : "var(--dash-card-hover)",
                        color: isDelivered ? "#00ffae" : "var(--dash-text-muted)",
                      }}>
                        {WAITER_LABELS[ws]}
                      </span>
                    </div>
                    <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>
                      R$ {Number(order.total).toFixed(2)} · {timeStr(order.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aba Auditoria ─────────────────────────────────────────────────────────────

const AUDIT_ACTION_CONFIG: Record<string, { color: string; label: string }> = {
  item_added:       { color: "#00ffae", label: "Item adicionado" },
  comanda_opened:   { color: "#00ffae", label: "Comanda aberta" },
  payment_received: { color: "#00ffae", label: "Pagamento recebido" },
  item_removed:     { color: "#f87171", label: "Item removido" },
  item_qty_changed: { color: "#fbbf24", label: "Qtd alterada" },
  price_changed:    { color: "#fbbf24", label: "Preço alterado" },
  comanda_closed:   { color: "#94a3b8", label: "Comanda fechada" },
  sent_to_cashier:  { color: "#94a3b8", label: "Enviado ao caixa" },
};

function AuditoriaTab({ unitId }: { unitId: string }) {
  const supabase = createClient();
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [dateFilter, setDateFilter] = useState<"hoje" | "7d" | "30d">("hoje");

  useEffect(() => {
    async function fetchAudit() {
      setLoadingAudit(true);
      const now = new Date();
      const daysMap: Record<string, number> = { hoje: 1, "7d": 7, "30d": 30 };
      const days = daysMap[dateFilter];
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from("comanda_audit_log")
        .select("*")
        .eq("unit_id", unitId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      setAuditLog((data as AuditLog[]) ?? []);
      setLoadingAudit(false);
    }
    fetchAudit();
  }, [unitId, dateFilter]);

  const filterBtns: { id: "hoje" | "7d" | "30d"; label: string }[] = [
    { id: "hoje", label: "Hoje" },
    { id: "7d", label: "7 dias" },
    { id: "30d", label: "30 dias" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Filtros de data */}
      <div style={{ display: "flex", gap: 6 }}>
        {filterBtns.map((f) => (
          <button
            key={f.id}
            onClick={() => setDateFilter(f.id)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid",
              borderColor: dateFilter === f.id ? "#00ffae" : "var(--dash-border)",
              background: dateFilter === f.id ? "rgba(0,255,174,0.08)" : "transparent",
              color: dateFilter === f.id ? "#00ffae" : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadingAudit ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <FyLoader size="sm" />
        </div>
      ) : auditLog.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--dash-text-muted)", fontSize: 13 }}>
          Nenhum registro no período
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 420, overflowY: "auto" }}>
          {auditLog.map((entry, idx) => {
            const cfg = AUDIT_ACTION_CONFIG[entry.action] ?? { color: "#94a3b8", label: entry.action };
            const isRemoval = entry.action === "item_removed";
            return (
              <div key={entry.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, flexShrink: 0, display: "inline-block" }} />
                  {idx < auditLog.length - 1 && (
                    <div style={{ width: 1, height: 28, background: "var(--dash-card-border)", marginTop: 3 }} />
                  )}
                </div>
                <div style={{
                  paddingBottom: 16, flex: 1,
                  borderBottom: idx < auditLog.length - 1 ? "none" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: cfg.color, fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
                    {entry.item_name && (
                      <span style={{ color: "var(--dash-text)", fontSize: 12 }}>— {entry.item_name}</span>
                    )}
                  </div>
                  {isRemoval && entry.reason && (
                    <div style={{
                      marginTop: 3, padding: "3px 8px", borderRadius: 6, display: "inline-block",
                      background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
                      color: "#f87171", fontSize: 11,
                    }}>
                      Motivo: {entry.reason}
                    </div>
                  )}
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>
                    {entry.performed_by_name} · {entry.performed_by_role} · {new Date(entry.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Aba Mesas ─────────────────────────────────────────────────────────────────

function MesasTab({
  mesas,
  showAddMesa, setShowAddMesa,
  mesaFrom, setMesaFrom,
  mesaTo, setMesaTo,
  mesaCapacity, setMesaCapacity,
  addingMesas,
  onAddMesas,
  selectedMesa, setSelectedMesa,
  editMesaLabel, setEditMesaLabel,
  onUpdateLabel,
  onForceClose,
  onToggleStatus,
  onDelete,
}: {
  mesas: Mesa[];
  showAddMesa: boolean;
  setShowAddMesa: (v: boolean) => void;
  mesaFrom: number;
  setMesaFrom: (v: number) => void;
  mesaTo: number;
  setMesaTo: (v: number) => void;
  mesaCapacity: number;
  setMesaCapacity: (v: number) => void;
  addingMesas: boolean;
  onAddMesas: () => void;
  selectedMesa: Mesa | null;
  setSelectedMesa: (m: Mesa | null) => void;
  editMesaLabel: string;
  setEditMesaLabel: (v: string) => void;
  onUpdateLabel: (label: string) => Promise<void>;
  onForceClose: (id: string) => Promise<void>;
  onToggleStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    available: { bg: "var(--dash-accent-soft)", color: "var(--dash-accent)", border: "rgba(0,255,174,0.15)" },
    occupied:  { bg: "var(--dash-warning-soft)", color: "var(--dash-warning)", border: "rgba(251,191,36,0.15)" },
    reserved:  { bg: "var(--dash-info-soft)", color: "var(--dash-info)", border: "rgba(96,165,250,0.15)" },
    inactive:  { bg: "var(--dash-card)", color: "var(--dash-text-muted)", border: "var(--dash-border)" },
  };

  const statusLabel: Record<string, string> = {
    available: "Livre",
    occupied: "Ocupada",
    reserved: "Reservada",
    inactive: "Inativa",
  };

  const activeMesas = mesas.filter((m) => m.is_active).sort((a, b) => a.number - b.number);

  return (
    <div>
      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--dash-text)" }}>{activeMesas.length}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Total</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-accent-soft)", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--dash-accent)" }}>{activeMesas.filter((m) => m.status === "available").length}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Livres</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-warning-soft)", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--dash-warning)" }}>{activeMesas.filter((m) => m.status === "occupied").length}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Ocupadas</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-info-soft)", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--dash-info)" }}>{activeMesas.filter((m) => m.status === "reserved").length}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Reservadas</div>
        </div>
      </div>

      {/* Grid de mesas */}
      {activeMesas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
          {activeMesas.map((m) => {
            const s = statusColors[m.status] ?? statusColors.available;
            return (
              <button key={m.id} onClick={() => setSelectedMesa(m)} style={{
                padding: 16, borderRadius: 14,
                background: s.bg, border: `1px solid ${s.border}`,
                cursor: "pointer", textAlign: "center",
                transition: "all 0.2s",
                boxShadow: "var(--dash-shadow)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{m.number}</div>
                <div style={{ fontSize: 9, color: "var(--dash-text-muted)", marginTop: 2 }}>
                  {m.label || `Mesa ${m.number}`}
                </div>
                <div style={{ fontSize: 8, color: s.color, marginTop: 4, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                  {statusLabel[m.status] ?? m.status}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Adicionar mesas */}
      {!showAddMesa ? (
        <button onClick={() => setShowAddMesa(true)} style={{
          width: "100%", padding: 12, borderRadius: 12,
          border: "1px dashed var(--dash-border)", background: "transparent",
          color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer",
        }}>+ Adicionar mesas</button>
      ) : (
        <div style={{
          padding: 16, borderRadius: 14,
          background: "var(--dash-card)", border: "1px solid var(--dash-border)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Adicionar mesas</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginBottom: 4 }}>De</div>
              <input type="number" min="1" value={mesaFrom} onChange={(e) => setMesaFrom(Number(e.target.value))}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "var(--dash-input-bg)", border: "1px solid var(--dash-input-border)",
                  color: "var(--dash-text)", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box",
                }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginBottom: 4 }}>Até</div>
              <input type="number" min="1" value={mesaTo} onChange={(e) => setMesaTo(Number(e.target.value))}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "var(--dash-input-bg)", border: "1px solid var(--dash-input-border)",
                  color: "var(--dash-text)", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box",
                }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginBottom: 4 }}>Lugares</div>
              <input type="number" min="1" max="20" value={mesaCapacity} onChange={(e) => setMesaCapacity(Number(e.target.value))}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "var(--dash-input-bg)", border: "1px solid var(--dash-input-border)",
                  color: "var(--dash-text)", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box",
                }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowAddMesa(false)} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12,
              boxShadow: "var(--dash-shadow)",
            }}>Cancelar</button>
            <button onClick={onAddMesas} disabled={addingMesas} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
              fontSize: 12, fontWeight: 700,
              boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              opacity: addingMesas ? 0.5 : 1,
            }}>{addingMesas ? "Criando..." : `Criar ${Math.max(0, mesaTo - mesaFrom + 1)} mesas`}</button>
          </div>
        </div>
      )}

      {/* Detalhe da mesa selecionada */}
      {selectedMesa && (
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 14,
          background: "var(--dash-card)", border: "1px solid var(--dash-border)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
              Mesa {selectedMesa.number}
            </div>
            <button onClick={() => setSelectedMesa(null)} style={{
              width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(220,38,38,0.12)", color: "var(--dash-danger)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><X size={14} /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)" }}>
                {selectedMesa.status === "available" ? "● Livre"
                  : selectedMesa.status === "occupied" ? "● Ocupada"
                  : selectedMesa.status === "reserved" ? "● Reservada"
                  : "● Inativa"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Capacidade</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)" }}>{selectedMesa.capacity} lugares</div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginBottom: 4 }}>Apelido (opcional)</div>
            <input
              value={editMesaLabel}
              onChange={(e) => setEditMesaLabel(e.target.value)}
              onBlur={() => onUpdateLabel(editMesaLabel)}
              placeholder="Ex: Varanda, VIP, Terraço"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 10,
                background: "var(--dash-input-bg)", border: "1px solid var(--dash-input-border)",
                color: "var(--dash-text)", fontSize: 12, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selectedMesa.status === "occupied" && (
              <button onClick={() => onForceClose(selectedMesa.id)} style={{
                flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer",
                background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
                fontSize: 11, fontWeight: 700,
              }}>Fechar comanda</button>
            )}
            <button onClick={() => onToggleStatus(selectedMesa.id, selectedMesa.status === "inactive" ? "available" : "inactive")} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-card)", color: "var(--dash-text-muted)",
              fontSize: 11, fontWeight: 600, boxShadow: "var(--dash-shadow)",
            }}>{selectedMesa.status === "inactive" ? "Ativar" : "Desativar"}</button>
            <button onClick={() => onDelete(selectedMesa.id)} style={{
              padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(220,38,38,0.08)", color: "var(--dash-danger)",
              fontSize: 11, fontWeight: 600,
            }}>Excluir</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Order Card (shared) ───────────────────────────────────────────────────────

function OrderCard({
  order,
  actionLabel,
  actionDisabled,
  onAction,
  accentColor,
  accentBg,
  accentBorder,
}: {
  order: Order;
  actionLabel: string;
  actionDisabled: boolean;
  onAction: () => void;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}) {
  return (
    <div style={{
      background: "var(--dash-card)",
      border: `1px solid ${accentBorder}`,
      borderRadius: 14, padding: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 800 }}>
            {order.table_number ? `Mesa ${order.table_number}` : "Sem mesa"}
          </div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
            {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""} · R$ {Number(order.total).toFixed(2)}
          </div>
        </div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>{timeStr(order.created_at)}</div>
      </div>

      {order.items && order.items.length > 0 && (
        <div style={{ borderTop: "1px solid var(--dash-card-border)", paddingTop: 8, marginBottom: 10 }}>
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 2 }}>
              • {item.qty}× {item.code_name ?? "Item"}
            </div>
          ))}
          {order.items.length > 3 && (
            <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>
              + {order.items.length - 3} item{order.items.length - 3 !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {!actionDisabled && (
        <button
          onClick={onAction}
          style={{
            width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${accentBorder}`,
            background: accentBg, color: accentColor,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
