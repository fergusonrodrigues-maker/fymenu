"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HubOrder = {
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
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export default function HubClient({
  unitId,
  unitName,
  restaurantName,
  slug,
  initialOrders,
}: Props) {
  const [orders, setOrders] = useState<HubOrder[]>(initialOrders);
  const [tick, setTick] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Atualizar timers a cada 10s
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
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = f;
        osc.type = "triangle";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.5);
      });
    } catch {}
  };

  // Realtime Supabase
  useEffect(() => {
    const channel = supabase
      .channel(`hub-${unitId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_intents",
          filter: `unit_id=eq.${unitId}`,
        },
        (payload) => {
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
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const markKitchenStatus = async (orderId: string, status: string) => {
    await supabase
      .from("order_intents")
      .update({ kitchen_status: status })
      .eq("id", orderId);

    if (status === "delivered") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, kitchen_status: status } : o))
      );
    }
  };

  const novos = orders.filter(
    (o) => !o.kitchen_status || o.kitchen_status === "waiting"
  );
  const preparando = orders.filter((o) => o.kitchen_status === "preparing");
  const prontos = orders.filter((o) => o.kitchen_status === "ready");
  const totalAtivos = orders.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black tracking-tight">
            🍳 Hub Central
            <span className="ml-2 text-gray-400 font-medium text-base">— {unitName}</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">{restaurantName}</p>
        </div>

        <div className="flex items-center gap-3">
          {totalAtivos === 0 ? (
            <span className="text-gray-500 text-sm">Nenhum pedido ativo</span>
          ) : (
            <>
              <Pill color="red" count={novos.length} label="novos" />
              <Pill color="yellow" count={preparando.length} label="em preparo" />
              <Pill color="green" count={prontos.length} label="prontos" />
            </>
          )}
          <a
            href="/pdv"
            className="ml-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
          >
            💳 PDV
          </a>
        </div>
      </header>

      {/* Kanban */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-gray-800 min-h-0">
        {/* NOVOS */}
        <KanbanColumn
          title="🔴 NOVOS"
          accentClass="border-red-600"
          titleClass="text-red-400"
          bgClass="bg-red-950/10"
          isEmpty={novos.length === 0}
          emptyText="Nenhum pedido novo"
        >
          {novos.map((o) => (
            <OrderCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => markKitchenStatus(o.id, "preparing")}
                className="w-full py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm mt-3 transition-colors"
              >
                🍳 Iniciar Preparo
              </button>
            </OrderCard>
          ))}
        </KanbanColumn>

        {/* EM PREPARO */}
        <KanbanColumn
          title="🟡 EM PREPARO"
          accentClass="border-yellow-500"
          titleClass="text-yellow-400"
          bgClass="bg-yellow-950/10"
          isEmpty={preparando.length === 0}
          emptyText="Nenhum em preparo"
        >
          {preparando.map((o) => (
            <OrderCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => markKitchenStatus(o.id, "ready")}
                className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm mt-3 transition-colors"
              >
                ✅ Marcar Pronto
              </button>
            </OrderCard>
          ))}
        </KanbanColumn>

        {/* PRONTOS */}
        <KanbanColumn
          title="🟢 PRONTOS"
          accentClass="border-green-600"
          titleClass="text-green-400"
          bgClass="bg-green-950/10"
          isEmpty={prontos.length === 0}
          emptyText="Nenhum pronto ainda"
        >
          {prontos.map((o) => (
            <OrderCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/entrega/${o.id}`;
                  navigator.clipboard.writeText(link).then(() => {
                    setCopiedId(o.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  });
                }}
                className="w-full py-2 rounded-lg text-sm mt-3 transition-colors"
                style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa", fontWeight: 600 }}
              >
                {copiedId === o.id ? "✓ Link copiado!" : "🔗 Enviar pro entregador"}
              </button>
              <button
                onClick={() => markKitchenStatus(o.id, "delivered")}
                className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm mt-2 transition-colors"
              >
                🚀 Entregue — Remover
              </button>
            </OrderCard>
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Pill({
  color,
  count,
  label,
}: {
  color: "red" | "yellow" | "green";
  count: number;
  label: string;
}) {
  const styles = {
    red: "bg-red-900/40 text-red-300 border-red-700/50",
    yellow: "bg-yellow-900/40 text-yellow-300 border-yellow-700/50",
    green: "bg-green-900/40 text-green-300 border-green-700/50",
  };
  return (
    <span
      className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${styles[color]}`}
    >
      {count} {label}
    </span>
  );
}

function KanbanColumn({
  title,
  accentClass,
  titleClass,
  bgClass,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  accentClass: string;
  titleClass: string;
  bgClass: string;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${bgClass}`}>
      <div className={`px-4 py-3 border-b-2 ${accentClass} bg-gray-900/50 sticky top-[73px] z-[5]`}>
        <h2 className={`font-black text-sm tracking-widest uppercase ${titleClass}`}>
          {title}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {isEmpty ? <EmptyState text={emptyText} /> : children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
      {text}
    </div>
  );
}

function OrderCard({
  order,
  tick,
  children,
}: {
  order: HubOrder;
  tick: number;
  children: React.ReactNode;
}) {
  const tableLabel =
    order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";
  const since = order.waiter_confirmed_at ?? order.created_at;
  const secs = elapsedSeconds(since);
  const isLate = secs > 600; // >10 min

  return (
    <div
      className={`rounded-xl border p-4 ${
        isLate
          ? "border-red-500 bg-red-950/30"
          : "border-gray-700 bg-gray-900/60"
      }`}
    >
      {/* Header do card */}
      <div className="flex justify-between items-start mb-2">
        <span className="font-black text-lg">{tableLabel}</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isLate
                ? "bg-red-500/20 text-red-400"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {elapsed(since)}
          </span>
        </div>
      </div>

      {/* Itens */}
      <ul className="space-y-1 text-sm mb-2">
        {order.items?.map((item, i) => (
          <li key={i} className="flex gap-1.5 items-baseline">
            <span className="text-white font-bold min-w-[20px]">{item.qty}×</span>
            <span className="text-gray-200 flex-1">
              {item.code_name ?? `Item ${i + 1}`}
            </span>
            {item.notes && (
              <span className="text-gray-500 text-xs">({item.notes})</span>
            )}
          </li>
        ))}
      </ul>

      {/* Observações */}
      {order.notes && (
        <p className="text-gray-500 text-xs italic border-t border-gray-700 pt-1.5 mb-1">
          ⚠️ {order.notes}
        </p>
      )}

      {/* Total */}
      <div className="flex justify-end mt-1">
        <span className="text-green-400 font-bold text-sm">
          {formatPrice(order.total)}
        </span>
      </div>

      {/* Ação */}
      {children}
    </div>
  );
}
