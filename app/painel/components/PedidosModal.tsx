"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Unit } from "../types";
import FyLoader from "@/components/FyLoader";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = {
  product_id: string;
  qty: number;
  unit_price: number;
  total: number;
  code_name?: string;
  notes?: string;
  addons?: Array<{ id: string; name: string; price: number }>;
};

type Order = {
  id: string;
  table_number: number | null;
  items: OrderItem[];
  total: number;
  status: string;
  waiter_status: string | null;
  kitchen_status: string | null;
  delivery_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
};

type FilterTab = "todos" | "ativos" | "entregues";
type MainTab = "pedidos" | "delivery";

// ── Helpers ───────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--dash-input-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)", fontSize: 16, boxSizing: "border-box",
  outline: "none",
};

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

const DELIVERY_STEPS: Array<{
  id: string;
  emoji: string;
  label: string;
  message: string;
}> = [
  {
    id: "pending",
    emoji: "⏳",
    label: "Aguardando",
    message: "Recebemos seu pedido! Em breve começaremos a preparar.",
  },
  {
    id: "preparing",
    emoji: "🔥",
    label: "Preparando",
    message: "Seu pedido está sendo preparado com carinho!",
  },
  {
    id: "ready",
    emoji: "✅",
    label: "Pronto",
    message: "Seu pedido está pronto! Saindo pra entrega em instantes.",
  },
  {
    id: "delivering",
    emoji: "🛵",
    label: "Saiu pra entrega",
    message: "Seu pedido saiu pra entrega! Em breve estará com você.",
  },
  {
    id: "delivered",
    emoji: "🎉",
    label: "Entregue",
    message: "Pedido entregue! Bom apetite! Avalie-nos no Google ⭐",
  },
];

const STEP_IDS = DELIVERY_STEPS.map((s) => s.id);

function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PedidosModal({ unitId, unit }: { unitId: string; unit?: Unit }) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ativos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("pedidos");

  // Delivery states
  const [waCopied, setWaCopied] = useState(false);
  const [deliveryPlatform, setDeliveryPlatform] = useState("");
  const [deliveryLink, setDeliveryLink] = useState(unit?.delivery_link ?? "");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);

  const waLink = unit?.whatsapp ? `https://wa.me/55${unit.whatsapp.replace(/\D/g, "")}` : null;

  async function saveDeliveryLink() {
    if (!unit || !deliveryLink.trim()) return;
    setDeliverySaving(true);
    const { createClient: cc } = await import("@/lib/supabase/client");
    await cc().from("units").update({ delivery_link: deliveryLink.trim() }).eq("id", unit.id);
    setDeliverySaving(false);
    setDeliverySaved(true);
    setTimeout(() => setDeliverySaved(false), 2000);
  }

  useEffect(() => {
    if (!unitId) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("order_intents")
        .select("id, table_number, items, total, status, waiter_status, kitchen_status, delivery_status, customer_name, customer_phone, notes, payment_method, created_at")
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

  async function handleChangeDeliveryStatus(order: Order, newStatus: string) {
    const updates: Record<string, string> = {
      delivery_status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "delivered") updates.waiter_status = "delivered";

    await supabase.from("order_intents").update(updates).eq("id", order.id);

    const phone = (order.customer_phone || "").replace(/\D/g, "");

    // When status becomes "delivering", create tracking record + send WA with tracking link
    if (newStatus === "delivering") {
      const trackingCode = generateTrackingCode();
      const { data: tracking } = await supabase
        .from("delivery_tracking")
        .insert({
          order_intent_id: order.id,
          unit_id: unitId,
          driver_name: "Entregador",
          tracking_status: "active",
          tracking_code: trackingCode,
          started_at: new Date().toISOString(),
        })
        .select("id, tracking_code")
        .single();

      if (tracking && phone.length >= 10) {
        const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
        const trackingUrl = `${window.location.origin}/rastreio/${tracking.tracking_code}`;
        const shortId = order.id.slice(-6).toUpperCase();
        const msg = encodeURIComponent(
          `🛵 *${unit?.name || "Restaurante"}*\n\n` +
            `Seu pedido saiu pra entrega!\n\n` +
            `📍 Acompanhe em tempo real:\n👉 ${trackingUrl}\n\n` +
            `📋 Pedido: #${shortId}\n` +
            `💰 Total: R$ ${Number(order.total || 0).toFixed(2).replace(".", ",")}\n\n` +
            `_Rastreio via FyMenu_`
        );
        window.open(`https://wa.me/${fullPhone}?text=${msg}`, "_blank");
      }
      return; // Skip generic notification for "delivering"
    }

    if (phone.length >= 10) {
      const step = DELIVERY_STEPS.find((s) => s.id === newStatus);
      if (step) openWaNotification(order, step);
    }
  }

  function openWaNotification(
    order: Order,
    step: (typeof DELIVERY_STEPS)[number]
  ) {
    const phone = (order.customer_phone || "").replace(/\D/g, "");
    if (phone.length < 10) return;
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const shortId = order.id.slice(-6).toUpperCase();
    const msg = encodeURIComponent(
      `${step.emoji} *${unit?.name || "Restaurante"}*\n\n` +
        `${step.message}\n\n` +
        `📋 Pedido: #${shortId}\n` +
        `💰 Total: R$ ${Number(order.total || 0)
          .toFixed(2)
          .replace(".", ",")}\n\n` +
        `_Atualização automática via FyMenu_`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, "_blank");
  }

  const revenueDelivered = orders
    .filter((o) => o.waiter_status === "delivered")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: "ativos", label: `Ativos ${totals.ativos > 0 ? `(${totals.ativos})` : ""}` },
    { id: "entregues", label: `Entregues (${totals.entregues})` },
    { id: "todos", label: `Todos (${totals.todos})` },
  ];

  const mainTabs: { id: MainTab; label: string }[] = [
    { id: "pedidos", label: "Pedidos" },
    { id: "delivery", label: "Delivery" },
  ];

  return (
    <div>
      {/* Main tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--dash-input-bg)", borderRadius: 12, padding: 3 }}>
        {mainTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 9, border: "none",
              background: mainTab === t.id ? "var(--dash-accent-soft)" : "transparent",
              color: mainTab === t.id ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: mainTab === t.id ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PEDIDOS ── */}
      {mainTab === "pedidos" && (
        <>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <FyLoader size="sm" />
            </div>
          ) : (
            <>
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
                {filterTabs.map((t) => (
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

                    const ds = order.delivery_status ?? "pending";
                    const dsIndex = STEP_IDS.indexOf(ds);
                    const currentStep = DELIVERY_STEPS.find((s) => s.id === ds) ?? DELIVERY_STEPS[0];
                    const hasPhone = (order.customer_phone || "").replace(/\D/g, "").length >= 10;

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
                        <div style={{ padding: "12px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>
                              {order.customer_name || (order.table_number ? `Mesa ${order.table_number}` : "Pedido")}
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35`,
                            }}>
                              {WAITER_LABEL[ws] ?? ws}
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

                        {/* Delivery progress bar */}
                        <div style={{ padding: "0 14px 10px", display: "flex", gap: 3 }} onClick={(e) => e.stopPropagation()}>
                          {DELIVERY_STEPS.map((step, i) => (
                            <div
                              key={step.id}
                              title={step.label}
                              style={{
                                flex: 1, height: 3, borderRadius: 2,
                                background: i <= dsIndex ? "#00ffae" : "rgba(255,255,255,0.06)",
                                transition: "background 0.3s",
                              }}
                            />
                          ))}
                        </div>

                        {/* Current delivery status label */}
                        <div style={{ padding: "0 14px 8px" }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: 10, color: ds === "delivered" ? "#00ffae" : "var(--dash-text-muted)", fontWeight: 600 }}>
                            {currentStep.emoji} {currentStep.label}
                            {order.customer_name && order.customer_phone && (
                              <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 6 }}>· {order.customer_phone}</span>
                            )}
                          </span>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div
                            style={{
                              borderTop: "1px solid var(--dash-card-border)",
                              padding: "12px 14px",
                              background: "var(--dash-card)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Kitchen status */}
                            <div style={{ marginBottom: 10 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                                background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                                border: "1px solid var(--dash-card-border)",
                              }}>
                                🍳 {KITCHEN_LABEL[ks] ?? ks}
                              </span>
                            </div>

                            {/* Delivery status buttons */}
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                                Status do pedido
                              </div>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {DELIVERY_STEPS.map((step, i) => {
                                  const isCurrent = ds === step.id;
                                  const isPast = i < dsIndex;
                                  return (
                                    <button
                                      key={step.id}
                                      onClick={() => !isCurrent && handleChangeDeliveryStatus(order, step.id)}
                                      disabled={isCurrent}
                                      style={{
                                        padding: "6px 10px", borderRadius: 8,
                                        border: isCurrent ? "1px solid var(--dash-accent)" : "1px solid var(--dash-card-border)",
                                        cursor: isCurrent ? "default" : "pointer",
                                        background: isCurrent
                                          ? "var(--dash-accent-soft)"
                                          : isPast
                                          ? "rgba(0,255,174,0.03)"
                                          : "var(--dash-card-hover)",
                                        color: isCurrent
                                          ? "var(--dash-accent)"
                                          : isPast
                                          ? "rgba(0,255,174,0.4)"
                                          : "var(--dash-text-muted)",
                                        fontSize: 11, fontWeight: 700,
                                        transition: "all 0.15s",
                                      }}
                                    >
                                      {step.emoji} {step.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Notify client button */}
                            {hasPhone && ds !== "pending" && (
                              <button
                                onClick={() => openWaNotification(order, currentStep)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  padding: "8px 12px", borderRadius: 10,
                                  border: "1px solid rgba(37,211,102,0.2)",
                                  background: "rgba(37,211,102,0.06)",
                                  color: "#25d366", fontSize: 11, fontWeight: 700,
                                  cursor: "pointer", marginBottom: 12, width: "100%",
                                  justifyContent: "center",
                                }}
                              >
                                💬 Notificar cliente via WhatsApp
                              </button>
                            )}

                            {/* Items */}
                            <div style={{ marginBottom: 10 }}>
                              {order.items?.map((item, i) => (
                                <div key={i} style={{
                                  fontSize: 13, color: "var(--dash-text-dim)", padding: "3px 0",
                                  borderBottom: i < order.items.length - 1 ? "1px solid var(--dash-card-border)" : "none",
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>{item.qty}× {item.code_name ?? "Item"}</span>
                                    <span>R$ {Number(item.total).toFixed(2)}</span>
                                  </div>
                                  {item.addons && item.addons.length > 0 && (
                                    <div style={{ paddingLeft: 12, marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                                      {item.addons.map((a: { id: string; name: string; price: number }) => (
                                        <span key={a.id} style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>+ {a.name}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Notes */}
                            {order.notes && (
                              <div style={{
                                fontSize: 12, color: "var(--dash-text-muted)", fontStyle: "italic",
                                padding: "8px", background: "var(--dash-card)", borderRadius: 8,
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
            </>
          )}
        </>
      )}

      {/* ── DELIVERY ── */}
      {mainTab === "delivery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* WhatsApp */}
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "16px", background: "var(--dash-card)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>WhatsApp</div>
            </div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 10 }}>
              Pedidos enviados automaticamente com rastreamento
            </div>
            {waLink ? (
              <>
                <div style={{
                  padding: "8px 12px", borderRadius: 8, background: "var(--dash-card-hover)",
                  border: "1px solid var(--dash-card-border)", fontSize: 12, color: "var(--dash-text-muted)",
                  fontFamily: "monospace", marginBottom: 8, wordBreak: "break-all",
                }}>{waLink}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(waLink); setWaCopied(true); setTimeout(() => setWaCopied(false), 1800); }}
                    style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: waCopied ? "var(--dash-accent-soft)" : "rgba(22,163,74,0.10)", color: waCopied ? "var(--dash-accent)" : "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {waCopied ? "✓ Copiado!" : "Copiar link"}
                  </button>
                  <a href="/painel" style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                    ✎ Editar número
                  </a>
                </div>
              </>
            ) : (
              <div style={{ color: "#f87171", fontSize: 12 }}>WhatsApp não configurado — edite na seção Unidade.</div>
            )}
          </div>

          {/* iFood / Delivery */}
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "16px", background: "var(--dash-card)", border: "1px solid rgba(234,88,12,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🛵</span>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>iFood / Delivery</div>
            </div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 10 }}>
              Configure o link da sua loja nas plataformas de delivery
            </div>
            <select
              value={deliveryPlatform}
              onChange={(e) => setDeliveryPlatform(e.target.value)}
              style={{ ...inp, background: undefined as any, backgroundColor: "var(--dash-input-bg)" }}
            >
              <option value="">Selecionar plataforma...</option>
              <option value="ifood">iFood</option>
              <option value="rappi">Rappi</option>
              <option value="99food">99Food</option>
              <option value="outro">Outro</option>
            </select>
            <input
              type="url"
              value={deliveryLink}
              onChange={(e) => { setDeliveryLink(e.target.value); setDeliverySaved(false); }}
              placeholder="Cole o link da sua loja"
              style={{ ...inp, marginTop: 8 }}
            />
            <button
              onClick={saveDeliveryLink}
              disabled={deliverySaving || !deliveryLink.trim()}
              style={{
                width: "100%", padding: "10px", borderRadius: 9, border: "none", marginTop: 8,
                background: deliverySaved ? "var(--dash-accent-soft)" : "rgba(234,88,12,0.15)",
                color: deliverySaved ? "var(--dash-accent)" : "#fb923c",
                fontSize: 13, fontWeight: 700, cursor: deliverySaving ? "not-allowed" : "pointer",
                opacity: deliverySaving ? 0.6 : 1,
              }}
            >
              {deliverySaved ? "✓ Salvo!" : deliverySaving ? "Salvando..." : "Salvar link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
