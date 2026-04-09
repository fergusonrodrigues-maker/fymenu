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

  // Realtime — order_intents
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

  // Realtime — comandas
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

  // Realtime — table_calls
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
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "table_calls",
        filter: `unit_id=eq.${unitId}`,
      }, (payload) => {
        setTableCalls(prev => [payload.new as any, ...prev]);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        try { new Audio("/notification.mp3").play(); } catch {}
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "table_calls",
        filter: `unit_id=eq.${unitId}`,
      }, (payload) => {
        setTableCalls(prev => prev.map(c => c.id === payload.new.id ? payload.new as any : c));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOrder = async (orderId: string, patch: Partial<WaiterOrder>) => {
    await supabase.from("order_intents").update(patch).eq("id", orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o))
    );
  };

  // Confirmar pedido para cozinha
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

  // Tabs
  const queue = orders.filter(
    (o) => !o.waiter_status || o.waiter_status === "pending"
  );
  const active = orders.filter(
    (o) => o.waiter_status && o.waiter_status !== "pending" && o.waiter_status !== "delivered"
  );

  // Agrupar por mesa (para aba Mesas)
  const tableGroups = active.reduce<Record<string, WaiterOrder[]>>((acc, o) => {
    const key = o.table_number != null ? String(o.table_number) : "s/n";
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const readyCount = orders.filter((o) => o.kitchen_status === "ready").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">🍽️ {unitName}</h1>
            <p className="text-slate-400 text-xs">{restaurantName}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            {queue.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 animate-pulse">
                {queue.length} novo{queue.length > 1 ? "s" : ""}
              </span>
            )}
            {readyCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                {readyCount} pronto{readyCount > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setQrOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors"
            >
              📱 QR Mesa
            </button>
            <button
              onClick={() => { setTab("comandas"); setShowNewComanda(true); }}
              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-colors"
            >
              🧾 Comanda
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-0 flex gap-0">
          {(["queue", "tables", "comandas"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Chamados de garçom pendentes */}
        {tableCalls.filter(c => c.status === "pending").length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {tableCalls.filter(c => c.status === "pending").map(call => (
              <div key={call.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 14, marginBottom: 6,
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.2)",
                animation: "pulse 1.5s infinite",
              }}>
                <div>
                  <div style={{ color: "#fbbf24", fontSize: 14, fontWeight: 800 }}>
                    🖐️ Mesa {call.table_number} chamando!
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
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
                  style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "rgba(0,255,174,0.1)", color: "#00ffae",
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  ✓ Atender
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ABA: FILA */}
        {tab === "queue" && (
          <>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-500">
                <span className="text-5xl mb-3">📥</span>
                <p className="text-lg font-medium">Fila vazia</p>
                <p className="text-sm">Novos pedidos aparecerão aqui</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {queue.map((order) => (
                  <QueueCard
                    key={order.id}
                    order={order}
                    onEdit={() => setEditOrder(order)}
                    onConfirm={() => confirmToKitchen(order)}
                    onCancel={() =>
                      updateOrder(order.id, { waiter_status: "delivered" } as any)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA: MESAS */}
        {tab === "tables" && (
          <>
            {Object.keys(tableGroups).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-500">
                <span className="text-5xl mb-3">🪑</span>
                <p className="text-lg font-medium">Sem pedidos em preparo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              comanda_id: id,
                              order_id: id,
                              unit_id: unitId,
                              action: "sent_to_cashier",
                              new_value: { table_number: order.table_number },
                              performed_by_role: "garcom",
                              performed_by_name: unitName,
                            });
                          }
                        } else {
                          await updateOrder(id, { waiter_status: status } as any);
                        }
                      }}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {/* ABA: COMANDAS */}
        {tab === "comandas" && (
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-semibold text-base">Comandas abertas</h2>
              <button
                onClick={() => setShowNewComanda(true)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm transition-colors"
              >
                + Abrir Comanda
              </button>
            </div>

            {openComandas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                <span className="text-5xl mb-3">📋</span>
                <p className="text-lg font-medium">Sem comandas abertas</p>
                <p className="text-sm mt-1">Clique em "Abrir Comanda" para criar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {openComandas.map(c => (
                  <ComandaCard
                    key={c.id}
                    comanda={c}
                    onClick={() => router.push(`/garcom/comanda/${c.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          unitId={unitId}
          operatorName={unitName}
          onClose={() => setEditOrder(null)}
          onSave={async (updatedOrder) => {
            const originalItems = editOrder.items;
            await supabase
              .from("order_intents")
              .update({ items: updatedOrder.items, total: updatedOrder.total, notes: updatedOrder.notes })
              .eq("id", updatedOrder.id);
            setOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            );
            setEditOrder(null);
            for (const updated of updatedOrder.items) {
              const original = originalItems.find((i) => i.product_id === updated.product_id);
              if (original && original.qty !== updated.qty) {
                await logComandaAction({
                  comanda_id: updatedOrder.id,
                  order_id: updatedOrder.id,
                  unit_id: unitId,
                  action: "item_qty_changed",
                  item_name: updated.code_name,
                  old_value: { qty: original.qty },
                  new_value: { qty: updated.qty },
                  performed_by_role: "garcom",
                  performed_by_name: unitName,
                });
              }
            }
          }}
        />
      )}

      {/* QR Mesa Modal */}
      {qrOpen && (
        <QRMesaModal
          unitSlug={unitSlug}
          onClose={() => setQrOpen(false)}
        />
      )}

      {/* PDV Modal */}
      {pdvOrder && (
        <PDVModal
          order={pdvOrder}
          onClose={() => setPdvOrder(null)}
          onPaid={async (method) => {
            await supabase.from("order_intents").update({
              waiter_status: "delivered",
              payment_method: method,
              paid_at: new Date().toISOString(),
            }).eq("id", pdvOrder.id);
            await supabase.from("payments").insert({
              order_id: pdvOrder.id,
              amount: pdvOrder.total,
              method,
              status: "confirmed",
            });
            await logComandaAction({
              comanda_id: pdvOrder.id,
              order_id: pdvOrder.id,
              unit_id: unitId,
              action: "payment_received",
              new_value: { amount: pdvOrder.total, method, received_by: unitName },
              performed_by_role: "garcom",
              performed_by_name: unitName,
            });
            await logComandaAction({
              comanda_id: pdvOrder.id,
              order_id: pdvOrder.id,
              unit_id: unitId,
              action: "comanda_closed",
              new_value: { total: pdvOrder.total, payment_method: method, closed_by: unitName },
              performed_by_role: "garcom",
              performed_by_name: unitName,
            });
            setOrders((prev) => prev.filter((o) => o.id !== pdvOrder.id));
            setPdvOrder(null);
          }}
        />
      )}

      {/* Abrir Comanda Modal */}
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

// ─── QR Mesa Modal ──────────────────────────────────────────────────────────

function QRMesaModal({ unitSlug, onClose }: { unitSlug: string; onClose: () => void }) {
  const [mesa, setMesa] = useState("");
  const qrUrl = mesa
    ? `${window.location.origin}/menu/${unitSlug}?mesa=${mesa}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">QR Code da Mesa</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex gap-3 mb-5">
          <input
            type="number"
            min={1}
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
            placeholder="Número da mesa"
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-base focus:outline-none focus:border-orange-500"
            autoFocus
          />
        </div>

        {qrUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={qrUrl} size={220} />
            </div>
            <p className="text-slate-400 text-xs text-center">Mesa {mesa} — cliente escaneia para pedir</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-slate-600">
            <span className="text-4xl mb-2">📱</span>
            <p className="text-sm">Digite o número da mesa para gerar o QR</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Queue Card ─────────────────────────────────────────────────────────────

function QueueCard({
  order,
  onEdit,
  onConfirm,
  onCancel,
}: {
  order: WaiterOrder;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tableLabel =
    order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";
  const itemCount = order.items?.length ?? 0;

  return (
    <div className="bg-slate-800/70 border border-orange-500/50 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-orange-400 font-bold text-lg">{tableLabel}</span>
          <span className="ml-2 text-slate-400 text-sm">
            {new Date(order.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold border border-orange-500/30">
          NOVO
        </span>
      </div>

      {/* Items */}
      <ul className="space-y-1 mb-3">
        {order.items?.map((item, i) => (
          <li key={i} className="text-slate-200 text-sm">
            <div className="flex justify-between">
              <span>
                {item.qty}× {item.code_name ?? `Item ${i + 1}`}
                {item.notes && (
                  <span className="text-slate-500 text-xs ml-1">({item.notes})</span>
                )}
              </span>
              <span className="text-slate-400 text-xs">
                R$ {((item.qty * item.unit_price) / 100).toFixed(2)}
              </span>
            </div>
            {item.addons && item.addons.length > 0 && (
              <ul className="ml-4 mt-0.5 space-y-0.5">
                {item.addons.map((a: { id: string; name: string; price: number }) => (
                  <li key={a.id} className="text-slate-400 text-xs">+ {a.name}</li>
                ))}
              </ul>
            )}
          </li>
        )) ?? <li className="text-slate-400 text-sm">{itemCount} item(ns)</li>}
      </ul>

      {order.notes && (
        <p className="text-slate-400 text-xs italic border-t border-slate-700 pt-2 mb-3">
          Obs: {order.notes}
        </p>
      )}

      <div className="flex justify-between items-center mb-4 pt-2 border-t border-slate-700">
        <span className="text-slate-400 text-sm">Total</span>
        <span className="text-green-400 font-bold">
          R$ {(order.total / 100).toFixed(2)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-500 transition-colors"
        >
          ✏️ Editar
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
        >
          ✕
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors"
        >
          ✅ Confirmar
        </button>
      </div>
    </div>
  );
}

// ─── Comanda Card ─────────────────────────────────────────────────────────────

function ComandaCard({ comanda, onClick }: { comanda: OpenComanda; onClick: () => void }) {
  const itemCount = comanda.comanda_items?.[0]?.count ?? 0;
  const ageMs = Date.now() - new Date(comanda.created_at).getTime();
  const ageMin = Math.floor(ageMs / 60000);
  const ageLabel = ageMin < 60
    ? `${ageMin}min`
    : `${Math.floor(ageMin / 60)}h${ageMin % 60 > 0 ? `${ageMin % 60}m` : ""}`;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800/70 border border-slate-700 hover:border-orange-500/50 rounded-xl p-5 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-orange-400 font-bold text-lg">
            Mesa {comanda.table_number ?? "S/N"}
          </span>
          <span className="ml-2 text-slate-400 text-xs">{ageLabel} atrás</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
          Aberta
        </span>
      </div>
      <div className="flex gap-4 text-sm text-slate-400">
        <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        {comanda.opened_by_name && (
          <span className="truncate">por {comanda.opened_by_name}</span>
        )}
        {comanda.total != null && comanda.total > 0 && (
          <span className="ml-auto text-green-400 font-semibold">
            R$ {(comanda.total / 100).toFixed(2).replace(".", ",")}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Abrir Comanda Modal ─────────────────────────────────────────────────────

function AbrirComandaModal({
  unitId,
  unitSlug,
  userId,
  waiterName,
  onClose,
  onCreated,
}: {
  unitId: string;
  unitSlug: string;
  userId: string;
  waiterName: string;
  onClose: () => void;
  onCreated: (comanda: OpenComanda) => void;
}) {
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleCreate = async () => {
    if (!tableNumber.trim()) { setError("Digite o número da mesa"); return; }
    setLoading(true);
    setError("");

    const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const { data, error: insertError } = await supabase
      .from("comandas")
      .insert({
        unit_id: unitId,
        table_number: parseInt(tableNumber),
        hash,
        opened_by: userId,
        opened_by_name: waiterName,
        opened_by_role: "garcom",
        status: "open",
      })
      .select()
      .single();

    setLoading(false);

    if (insertError || !data) {
      setError("Erro ao criar comanda. Tente novamente.");
      return;
    }

    await logComandaAction({
      comanda_id: data.id,
      unit_id: unitId,
      action: "comanda_opened",
      new_value: { table_number: parseInt(tableNumber) },
      performed_by: userId,
      performed_by_role: "garcom",
      performed_by_name: waiterName,
    });

    onCreated({ ...data, comanda_items: [] });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Abrir Comanda</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="mb-5">
          <label className="text-slate-400 text-xs mb-1.5 block">Número da mesa</label>
          <input
            type="number"
            min={1}
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Ex: 5"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-base focus:outline-none focus:border-orange-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
        </div>

        <button
          disabled={loading || !tableNumber.trim()}
          onClick={handleCreate}
          className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {loading ? "Abrindo…" : "Abrir comanda"}
        </button>
      </div>
    </div>
  );
}
