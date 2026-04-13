"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import TableCard from "./components/TableCard";
import EditOrderModal from "./components/EditOrderModal";
import PDVModal from "./components/PDVModal";
import { logComandaAction } from "@/app/hooks/useComandaAudit";

export type WaiterOrder = {
  id: string;
  table_number: number | null;
  items: Array<{
    product_id: string;
    qty: number;
    unit_price: number;
    total: number;
    code_name?: string;
    notes?: string;
    addons?: Array<{ id: string; name: string; price: number }>;
  }>;
  total: number;
  status: string;
  waiter_status: string | null;
  kitchen_status: string | null;
  notes: string | null;
  created_at: string;
  waiter_confirmed_at?: string | null;
};

type OpenComanda = {
  id: string;
  table_number: number | null;
  hash: string;
  status: string;
  opened_by_name: string | null;
  created_at: string;
  total: number | null;
  comanda_items: { count: number }[];
};

interface WaiterClientProps {
  unitId: string;
  unitName: string;
  unitSlug: string;
  restaurantName: string;
  canCloseComanda: boolean;
  initialOrders: WaiterOrder[];
  userId: string;
  initialComandas: OpenComanda[];
}

type Tab = "queue" | "tables" | "comandas";

export default function WaiterClient({
  unitId,
  unitName,
  unitSlug,
  restaurantName,
  canCloseComanda,
  initialOrders,
  userId,
  initialComandas,
}: WaiterClientProps) {
  const [orders, setOrders] = useState<WaiterOrder[]>(initialOrders);
  const [openComandas, setOpenComandas] = useState<OpenComanda[]>(initialComandas);
  const [tableCalls, setTableCalls] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("queue");
  const [editOrder, setEditOrder] = useState<WaiterOrder | null>(null);
  const [pdvOrder, setPdvOrder] = useState<WaiterOrder | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [showNewComanda, setShowNewComanda] = useState(false);
  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const router = useRouter();

  const playSound = (type: "new" | "ready") => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const configs =
        type === "new"
          ? [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.15 }, { f: 783.99, t: 0.3 }]
          : [{ f: 783.99, t: 0 }, { f: 1046.5, t: 0.15 }];
      configs.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = f;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.35);
      });
    } catch {}
  };

  useEffect(() => {
    const channel = supabase
      .channel(`waiter-${unitId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const o = payload.new as WaiterOrder;
            if (o.waiter_status !== "delivered") {
              playSound("new");
              setOrders((prev) => [o, ...prev]);
              setTab("queue");
            }
          } else if (payload.eventType === "UPDATE") {
            const o = payload.new as WaiterOrder;
            if (o.waiter_status === "delivered") {
              setOrders((prev) => prev.filter((x) => x.id !== o.id));
            } else {
              if (o.kitchen_status === "ready") playSound("ready");
              setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...o } : x)));
            }
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((x) => x.id !== (payload.old as WaiterOrder).id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refetch = async () => {
      const { data } = await supabase
        .from("comandas")
        .select("id, table_number, hash, status, opened_by_name, created_at, total, comanda_items(count)")
        .eq("unit_id", unitId)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setOpenComandas(data ?? []);
    };
    const channel = supabase
      .channel(`waiter-comandas-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas", filter: `unit_id=eq.${unitId}` }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase
      .from("table_calls")
      .select("*")
      .eq("unit_id", unitId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTableCalls(data); });

    const channel = supabase
      .channel("table-calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        setTableCalls(prev => [payload.new as any, ...prev]);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        try { new Audio("/notification.mp3").play(); } catch {}
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        setTableCalls(prev => prev.map(c => c.id === payload.new.id ? payload.new as any : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOrder = async (orderId: string, patch: Partial<WaiterOrder>) => {
    await supabase.from("order_intents").update(patch).eq("id", orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
  };

  const confirmToKitchen = async (order: WaiterOrder) => {
    await updateOrder(order.id, {
      status: "confirmed",
      waiter_status: "confirmed",
      waiter_confirmed_at: new Date().toISOString(),
      kitchen_status: "waiting",
    } as any);
    await logComandaAction({
      comanda_id: order.id,
      order_id: order.id,
      unit_id: unitId,
      action: "comanda_opened",
      new_value: { table_number: order.table_number },
      performed_by_role: "garcom",
      performed_by_name: unitName,
    });
  };

  const queue = orders.filter((o) => !o.waiter_status || o.waiter_status === "pending");
  const active = orders.filter((o) => o.waiter_status && o.waiter_status !== "pending" && o.waiter_status !== "delivered");

  const tableGroups = active.reduce<Record<string, WaiterOrder[]>>((acc, o) => {
    const key = o.table_number != null ? String(o.table_number) : "s/n";
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const readyCount = orders.filter((o) => o.kitchen_status === "ready").length;
  const pendingCalls = tableCalls.filter(c => c.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>🍽️ {unitName}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{restaurantName} · Garçom</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {queue.length > 0 && (
              <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(0,255,174,0.08)", color: "#00ffae", fontSize: 10, fontWeight: 700, border: "1px solid rgba(0,255,174,0.2)" }}>
                {queue.length} novo{queue.length > 1 ? "s" : ""}
              </span>
            )}
            {readyCount > 0 && (
              <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(0,255,174,0.06)", color: "#00ffae", fontSize: 10, fontWeight: 600, border: "1px solid rgba(0,255,174,0.15)" }}>
                {readyCount} pronto{readyCount > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setQrOpen(true)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600 }}
            >
              📱 QR Mesa
            </button>
            <button
              onClick={() => { setTab("comandas"); setShowNewComanda(true); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 10, fontWeight: 700 }}
            >
              🧾 Comanda
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px", display: "flex" }}>
          {(["queue", "tables", "comandas"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: "transparent",
                borderBottom: `2px solid ${tab === t ? "#00ffae" : "transparent"}`,
                color: tab === t ? "#00ffae" : "rgba(255,255,255,0.3)",
                transition: "all 0.2s",
              }}
            >
              {t === "queue"
                ? `Fila${queue.length > 0 ? ` (${queue.length})` : ""}`
                : t === "tables"
                ? `Mesas${active.length > 0 ? ` (${active.length})` : ""}`
                : `Comandas${openComandas.length > 0 ? ` (${openComandas.length})` : ""}`}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "16px" }}>
        {/* Chamados pendentes */}
        {pendingCalls.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {pendingCalls.map(call => (
              <div key={call.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 14, marginBottom: 6,
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
              }}>
                <div>
                  <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 800 }}>🖐️ Mesa {call.table_number} chamando!</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 }}>
                    {new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from("table_calls").update({
                      status: "resolved",
                      acknowledged_by: unitName,
                      acknowledged_at: new Date().toISOString(),
                      resolved_at: new Date().toISOString(),
                    }).eq("id", call.id);
                  }}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 11, fontWeight: 700 }}
                >
                  ✓ Atender
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ABA: FILA */}
        {tab === "queue" && (
          queue.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📥</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Fila vazia</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Novos pedidos aparecerão aqui</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queue.map((order) => (
                <QueueCard
                  key={order.id}
                  order={order}
                  onEdit={() => setEditOrder(order)}
                  onConfirm={() => confirmToKitchen(order)}
                  onCancel={() => updateOrder(order.id, { waiter_status: "delivered" } as any)}
                />
              ))}
            </div>
          )
        )}

        {/* ABA: MESAS */}
        {tab === "tables" && (
          Object.keys(tableGroups).length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🪑</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sem pedidos em preparo</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {Object.entries(tableGroups)
                .sort(([a], [b]) => {
                  const na = Number(a); const nb = Number(b);
                  return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
                })
                .map(([key, tableOrders]) => (
                  <TableCard
                    key={key}
                    tableKey={key}
                    orders={tableOrders}
                    canCloseComanda={canCloseComanda}
                    onStatusChange={async (id, status) => {
                      if (status === "delivered" && canCloseComanda) {
                        setPdvOrder(tableOrders.find((o) => o.id === id) ?? null);
                      } else if (status === "pending_payment") {
                        await updateOrder(id, { waiter_status: "pending_payment" } as any);
                        const order = tableOrders.find((o) => o.id === id);
                        if (order) {
                          await logComandaAction({
                            comanda_id: id, order_id: id, unit_id: unitId,
                            action: "sent_to_cashier",
                            new_value: { table_number: order.table_number },
                            performed_by_role: "garcom", performed_by_name: unitName,
                          });
                        }
                      } else {
                        await updateOrder(id, { waiter_status: status } as any);
                      }
                    }}
                  />
                ))}
            </div>
          )
        )}

        {/* ABA: COMANDAS */}
        {tab === "comandas" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Comandas abertas</div>
              <button
                onClick={() => setShowNewComanda(true)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 11, fontWeight: 700 }}
              >
                + Abrir Comanda
              </button>
            </div>
            {openComandas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sem comandas abertas</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Clique em "Abrir Comanda" para criar</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {openComandas.map(c => (
                  <ComandaCard key={c.id} comanda={c} onClick={() => router.push(`/garcom/comanda/${c.id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {editOrder && (
        <EditOrderModal
          order={editOrder}
          unitId={unitId}
          operatorName={unitName}
          onClose={() => setEditOrder(null)}
          onSave={async (updatedOrder) => {
            const originalItems = editOrder.items;
            await supabase.from("order_intents").update({ items: updatedOrder.items, total: updatedOrder.total, notes: updatedOrder.notes }).eq("id", updatedOrder.id);
            setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)));
            setEditOrder(null);
            for (const updated of updatedOrder.items) {
              const original = originalItems.find((i) => i.product_id === updated.product_id);
              if (original && original.qty !== updated.qty) {
                await logComandaAction({
                  comanda_id: updatedOrder.id, order_id: updatedOrder.id, unit_id: unitId,
                  action: "item_qty_changed", item_name: updated.code_name,
                  old_value: { qty: original.qty }, new_value: { qty: updated.qty },
                  performed_by_role: "garcom", performed_by_name: unitName,
                });
              }
            }
          }}
        />
      )}

      {qrOpen && <QRMesaModal unitSlug={unitSlug} onClose={() => setQrOpen(false)} />}

      {pdvOrder && (
        <PDVModal
          order={pdvOrder}
          onClose={() => setPdvOrder(null)}
          onPaid={async (method) => {
            await supabase.from("order_intents").update({ waiter_status: "delivered", payment_method: method, paid_at: new Date().toISOString() }).eq("id", pdvOrder.id);
            await supabase.from("payments").insert({ order_id: pdvOrder.id, amount: pdvOrder.total, method, status: "confirmed" });
            await logComandaAction({ comanda_id: pdvOrder.id, order_id: pdvOrder.id, unit_id: unitId, action: "payment_received", new_value: { amount: pdvOrder.total, method, received_by: unitName }, performed_by_role: "garcom", performed_by_name: unitName });
            await logComandaAction({ comanda_id: pdvOrder.id, order_id: pdvOrder.id, unit_id: unitId, action: "comanda_closed", new_value: { total: pdvOrder.total, payment_method: method, closed_by: unitName }, performed_by_role: "garcom", performed_by_name: unitName });
            setOrders((prev) => prev.filter((o) => o.id !== pdvOrder.id));
            setPdvOrder(null);
          }}
        />
      )}

      {showNewComanda && (
        <AbrirComandaModal
          unitId={unitId}
          unitSlug={unitSlug}
          userId={userId}
          waiterName={unitName}
          onClose={() => setShowNewComanda(false)}
          onCreated={(comanda) => {
            setOpenComandas(prev => [comanda, ...prev]);
            setShowNewComanda(false);
            router.push(`/garcom/comanda/${comanda.id}`);
          }}
        />
      )}
    </div>
  );
}

// ─── QR Mesa Modal ───────────────────────────────────────────────────────────

function QRMesaModal({ unitSlug, onClose }: { unitSlug: string; onClose: () => void }) {
  const [mesa, setMesa] = useState("");
  const qrUrl = mesa ? `${window.location.origin}/menu/${unitSlug}?mesa=${mesa}` : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 440, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px 20px 0 0", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>QR Code da Mesa</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(220,38,38,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>✕</button>
        </div>
        <input
          type="number" min={1} value={mesa}
          onChange={(e) => setMesa(e.target.value)}
          placeholder="Número da mesa"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
          autoFocus
        />
        {qrUrl ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#fff", padding: 16, borderRadius: 12 }}>
              <QRCodeSVG value={qrUrl} size={220} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Mesa {mesa} — cliente escaneia para pedir</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", color: "rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize: 36, marginBottom: 8 }}>📱</span>
            <div style={{ fontSize: 12 }}>Digite o número da mesa para gerar o QR</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Queue Card ──────────────────────────────────────────────────────────────

function QueueCard({ order, onEdit, onConfirm, onCancel }: { order: WaiterOrder; onEdit: () => void; onConfirm: () => void; onCancel: () => void }) {
  const tableLabel = order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";

  return (
    <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,174,0.12)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#00ffae" }}>{tableLabel}</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,174,0.08)", color: "#00ffae", fontSize: 9, fontWeight: 700, border: "1px solid rgba(0,255,174,0.2)" }}>NOVO</span>
      </div>

      <ul style={{ margin: "0 0 10px", padding: 0, listStyle: "none" }}>
        {order.items?.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", padding: "2px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {item.qty}× {item.code_name ?? `Item ${i + 1}`}
                {item.notes && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginLeft: 4 }}>({item.notes})</span>}
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>R$ {((item.qty * item.unit_price) / 100).toFixed(2)}</span>
            </div>
            {item.addons && item.addons.length > 0 && (
              <ul style={{ marginLeft: 16, listStyle: "none", padding: 0 }}>
                {item.addons.map((a) => <li key={a.id} style={{ fontSize: 11, color: "rgba(0,255,174,0.6)" }}>+ {a.name}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <div style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 11, color: "#fbbf24", marginBottom: 10 }}>
          Obs: {order.notes}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.04)", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Total</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#00ffae" }}>R$ {(order.total / 100).toFixed(2).replace(".", ",")}</span>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onEdit} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600 }}>✏️ Editar</button>
        <button onClick={onCancel} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer", background: "rgba(248,113,113,0.05)", color: "#f87171", fontSize: 12, fontWeight: 600 }}>✕</button>
        <button onClick={onConfirm} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 12, fontWeight: 700, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>✅ Confirmar</button>
      </div>
    </div>
  );
}

// ─── Comanda Card ─────────────────────────────────────────────────────────────

function ComandaCard({ comanda, onClick }: { comanda: OpenComanda; onClick: () => void }) {
  const itemCount = comanda.comanda_items?.[0]?.count ?? 0;
  const ageMs = Date.now() - new Date(comanda.created_at).getTime();
  const ageMin = Math.floor(ageMs / 60000);
  const ageLabel = ageMin < 60 ? `${ageMin}min` : `${Math.floor(ageMin / 60)}h${ageMin % 60 > 0 ? `${ageMin % 60}m` : ""}`;

  return (
    <button
      onClick={onClick}
      style={{ width: "100%", textAlign: "left", padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#00ffae" }}>Mesa {comanda.table_number ?? "S/N"}</span>
        <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(0,255,174,0.08)", color: "#00ffae", fontSize: 9, fontWeight: 700, border: "1px solid rgba(0,255,174,0.2)" }}>Aberta</span>
      </div>
      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.35)", flexWrap: "wrap" }}>
        <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        <span>{ageLabel} atrás</span>
        {comanda.opened_by_name && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>por {comanda.opened_by_name}</span>}
        {comanda.total != null && comanda.total > 0 && (
          <span style={{ marginLeft: "auto", color: "#00ffae", fontWeight: 700 }}>R$ {(comanda.total / 100).toFixed(2).replace(".", ",")}</span>
        )}
      </div>
    </button>
  );
}

// ─── Abrir Comanda Modal ──────────────────────────────────────────────────────

function AbrirComandaModal({ unitId, unitSlug, userId, waiterName, onClose, onCreated }: {
  unitId: string; unitSlug: string; userId: string; waiterName: string;
  onClose: () => void; onCreated: (comanda: OpenComanda) => void;
}) {
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleCreate = async () => {
    if (!tableNumber.trim()) { setError("Digite o número da mesa"); return; }
    setLoading(true); setError("");
    const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { data, error: insertError } = await supabase.from("comandas").insert({
      unit_id: unitId, table_number: parseInt(tableNumber), hash,
      opened_by: userId, opened_by_name: waiterName, opened_by_role: "garcom", status: "open",
    }).select().single();
    setLoading(false);
    if (insertError || !data) { setError("Erro ao criar comanda. Tente novamente."); return; }
    await logComandaAction({ comanda_id: data.id, unit_id: unitId, action: "comanda_opened", new_value: { table_number: parseInt(tableNumber) }, performed_by: userId, performed_by_role: "garcom", performed_by_name: waiterName });
    onCreated({ ...data, comanda_items: [] });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 440, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px 20px 0 0", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Abrir Comanda</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(220,38,38,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>✕</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Número da mesa</label>
          <input
            type="number" min={1} value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Ex: 5"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            autoFocus
          />
          {error && <div style={{ color: "#f87171", fontSize: 11, marginTop: 6 }}>{error}</div>}
        </div>
        <button
          disabled={loading || !tableNumber.trim()}
          onClick={handleCreate}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: loading || !tableNumber.trim() ? "not-allowed" : "pointer", background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 13, fontWeight: 700, opacity: loading || !tableNumber.trim() ? 0.5 : 1 }}
        >
          {loading ? "Abrindo…" : "Abrir comanda"}
        </button>
      </div>
    </div>
  );
}
