"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TableCard from "./components/TableCard";
import EditOrderModal from "./components/EditOrderModal";
import PDVModal from "./components/PDVModal";

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
  }>;
  total: number;
  status: string;
  waiter_status: string | null;
  kitchen_status: string | null;
  notes: string | null;
  created_at: string;
  waiter_confirmed_at?: string | null;
};

interface WaiterClientProps {
  unitId: string;
  unitName: string;
  restaurantName: string;
  initialOrders: WaiterOrder[];
}

type Tab = "queue" | "tables";

export default function WaiterClient({
  unitId,
  unitName,
  restaurantName,
  initialOrders,
}: WaiterClientProps) {
  const [orders, setOrders] = useState<WaiterOrder[]>(initialOrders);
  const [tab, setTab] = useState<Tab>("queue");
  const [editOrder, setEditOrder] = useState<WaiterOrder | null>(null);
  const [pdvOrder, setPdvOrder] = useState<WaiterOrder | null>(null);
  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  // Realtime
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
  }, [unitId]);

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
          <div className="flex gap-2 items-center">
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
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-0 flex gap-0">
          {(["queue", "tables"] as Tab[]).map((t) => (
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
                ? `Fila de Pedidos${queue.length > 0 ? ` (${queue.length})` : ""}`
                : `Mesas Ativas${active.length > 0 ? ` (${active.length})` : ""}`}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
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
                      onStatusChange={(id, status) => {
                        if (status === "delivered") {
                          setPdvOrder(tableOrders.find((o) => o.id === id) ?? null);
                        } else {
                          updateOrder(id, { waiter_status: status } as any);
                        }
                      }}
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
          onClose={() => setEditOrder(null)}
          onSave={async (updatedOrder) => {
            await supabase
              .from("order_intents")
              .update({ items: updatedOrder.items, total: updatedOrder.total, notes: updatedOrder.notes })
              .eq("id", updatedOrder.id);
            setOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            );
            setEditOrder(null);
          }}
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
            // Registrar pagamento
            await supabase.from("payments").insert({
              order_id: pdvOrder.id,
              amount: pdvOrder.total,
              method,
              status: "confirmed",
            });
            setOrders((prev) => prev.filter((o) => o.id !== pdvOrder.id));
            setPdvOrder(null);
          }}
        />
      )}
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
          <li key={i} className="text-slate-200 text-sm flex justify-between">
            <span>
              {item.qty}× {item.code_name ?? `Item ${i + 1}`}
              {item.notes && (
                <span className="text-slate-500 text-xs ml-1">({item.notes})</span>
              )}
            </span>
            <span className="text-slate-400 text-xs">
              R$ {((item.qty * item.unit_price) / 100).toFixed(2)}
            </span>
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
