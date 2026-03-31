"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type KOrder = {
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
  initialOrders: KOrder[];
}

function elapsed(from: string) {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  return `${m}min`;
}

function elapsedSeconds(from: string) {
  return Math.floor((Date.now() - new Date(from).getTime()) / 1000);
}

export default function KitchenClient({ unitId, unitName, restaurantName, initialOrders }: Props) {
  const [orders, setOrders] = useState<KOrder[]>(initialOrders);
  const [tick, setTick] = useState(0);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const o = payload.new as KOrder;
            if (o.status === "confirmed" && o.kitchen_status !== "delivered") {
              playBell();
              setOrders((prev) => {
                const exists = prev.find((x) => x.id === o.id);
                if (exists) return prev.map((x) => x.id === o.id ? { ...x, ...o } : x);
                return [o, ...prev];
              });
            } else {
              setOrders((prev) => prev.filter((x) => x.id !== o.id));
            }
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((x) => x.id !== (payload.old as KOrder).id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const markKitchenStatus = async (orderId: string, status: string) => {
    await supabase.from("order_intents").update({ kitchen_status: status }).eq("id", orderId);
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight">🍳 Hub Central — {unitName}</h1>
          <p className="text-gray-400 text-sm">{restaurantName}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-red-900/40 text-red-300 border border-red-700/50 font-semibold">
            {waiting.length} aguardando
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-yellow-900/40 text-yellow-300 border border-yellow-700/50 font-semibold">
            {preparing.length} preparando
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-green-900/40 text-green-300 border border-green-700/50 font-semibold">
            {ready.length} prontos
          </span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-0 h-[calc(100vh-73px)]">
        {/* COLUNA 1: Aguardando */}
        <Column
          title="🔴 NOVOS"
          accent="border-red-600"
          titleColor="text-red-400"
          bg="bg-red-950/20"
        >
          {waiting.length === 0 && <EmptyCol text="Nenhum pedido novo" />}
          {waiting.map((o) => (
            <KitchenCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => markKitchenStatus(o.id, "preparing")}
                className="w-full py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm mt-3 transition-colors"
              >
                🍳 Iniciar Preparo
              </button>
            </KitchenCard>
          ))}
        </Column>

        {/* COLUNA 2: Preparando */}
        <Column
          title="🟡 EM PREPARO"
          accent="border-yellow-600"
          titleColor="text-yellow-400"
          bg="bg-yellow-950/20"
        >
          {preparing.length === 0 && <EmptyCol text="Nenhum em preparo" />}
          {preparing.map((o) => (
            <KitchenCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => markKitchenStatus(o.id, "ready")}
                className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm mt-3 transition-colors"
              >
                ✅ Marcar Pronto
              </button>
            </KitchenCard>
          ))}
        </Column>

        {/* COLUNA 3: Prontos */}
        <Column
          title="🟢 PRONTOS"
          accent="border-green-600"
          titleColor="text-green-400"
          bg="bg-green-950/20"
        >
          {ready.length === 0 && <EmptyCol text="Nenhum pronto ainda" />}
          {ready.map((o) => (
            <KitchenCard key={o.id} order={o} tick={tick}>
              <button
                onClick={() => markKitchenStatus(o.id, "delivered")}
                className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm mt-3 transition-colors"
              >
                🚀 Entregue — Remover
              </button>
            </KitchenCard>
          ))}
        </Column>
      </div>
    </div>
  );
}

function Column({
  title, accent, titleColor, bg, children,
}: {
  title: string; accent: string; titleColor: string; bg: string; children: React.ReactNode;
}) {
  return (
    <div className={`border-r border-gray-800 last:border-r-0 ${bg} flex flex-col`}>
      <div className={`px-4 py-3 border-b-2 ${accent} bg-gray-900/50`}>
        <h2 className={`font-black text-sm tracking-wider ${titleColor}`}>{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">{children}</div>
    </div>
  );
}

function EmptyCol({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-gray-600 text-sm">{text}</div>
  );
}

function KitchenCard({ order, tick, children }: { order: KOrder; tick: number; children: React.ReactNode }) {
  const tableLabel = order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";
  const since = order.waiter_confirmed_at ?? order.created_at;
  const secs = elapsedSeconds(since);
  const isLate = secs > 600; // >10 min

  return (
    <div className={`rounded-xl border p-4 ${isLate ? "border-red-500 bg-red-950/30" : "border-gray-700 bg-gray-900/60"}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-black text-lg">{tableLabel}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLate ? "bg-red-500/20 text-red-400" : "bg-gray-700 text-gray-300"}`}>
          {elapsed(since)}
        </span>
      </div>
      <ul className="space-y-1 text-sm">
        {order.items?.map((item, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <div className="flex gap-1">
              <span className="text-white font-bold">{item.qty}×</span>
              <span className="text-gray-200">{item.code_name ?? `Item ${i + 1}`}</span>
              {item.notes && <span className="text-gray-500 text-xs">({item.notes})</span>}
            </div>
            {item.addons && item.addons.length > 0 && (
              <ul className="ml-4 space-y-0.5">
                {item.addons.map((a: { id: string; name: string; price: number }) => (
                  <li key={a.id} className="text-yellow-400 text-xs">+ {a.name}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="text-gray-500 text-xs italic mt-2 border-t border-gray-700 pt-1.5">
          ⚠️ {order.notes}
        </p>
      )}
      {children}
    </div>
  );
}
