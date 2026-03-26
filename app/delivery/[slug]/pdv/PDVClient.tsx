"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PDVOrder = {
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
  kitchen_status: string | null;
  waiter_status: string | null;
  notes: string | null;
  created_at: string;
  payment_method: string | null;
  paid_at: string | null;
};

type PaymentMethod = "cash" | "card" | "pix";
type Screen = "list" | "checkout" | "receipt";

interface Props {
  unitId: string;
  unitName: string;
  restaurantName: string;
  slug: string;
  initialOrders: PDVOrder[];
}

const METHODS: { id: PaymentMethod; label: string; icon: string; color: string; bg: string }[] = [
  { id: "cash", label: "Dinheiro", icon: "💵", color: "#16a34a", bg: "#14532d22" },
  { id: "card", label: "Cartão",   icon: "💳", color: "#2563eb", bg: "#1e3a8a22" },
  { id: "pix",  label: "PIX",      icon: "📲", color: "#7c3aed", bg: "#4c1d9522" },
];

function fmt(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function tableLabel(t: number | null) {
  return t != null ? `Mesa ${t}` : "S/ Mesa";
}

export default function PDVClient({
  unitId,
  unitName,
  restaurantName,
  slug,
  initialOrders,
}: Props) {
  const [orders, setOrders] = useState<PDVOrder[]>(initialOrders);
  const [selected, setSelected] = useState<PDVOrder | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [cashInput, setCashInput] = useState("");
  const [screen, setScreen] = useState<Screen>("list");
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    order: PDVOrder;
    method: PaymentMethod;
    cash?: number;
    change?: number;
  } | null>(null);

  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = f; osc.type = "sine";
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.4);
      });
    } catch {}
  };

  // Realtime — atualiza lista quando novos pedidos chegam ou são pagos
  useEffect(() => {
    const channel = supabase
      .channel(`pdv-${unitId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const o = payload.new as PDVOrder;
            if (o.status === "confirmed" && !o.paid_at) {
              setOrders((prev) => {
                const exists = prev.find((x) => x.id === o.id);
                if (exists) return prev.map((x) => x.id === o.id ? { ...x, ...o } : x);
                return [...prev, o].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
            } else {
              setOrders((prev) => prev.filter((x) => x.id !== o.id));
            }
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((x) => x.id !== (payload.old as PDVOrder).id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const openCheckout = (order: PDVOrder) => {
    setSelected(order);
    setMethod(null);
    setCashInput("");
    setScreen("checkout");
  };

  const handlePay = async () => {
    if (!selected || !method) return;
    setProcessing(true);

    const cashPaid = method === "cash" && cashInput ? parseFloat(cashInput) * 100 : undefined;
    const change = cashPaid != null ? cashPaid - selected.total : undefined;

    await supabase.from("order_intents").update({
      payment_method: method,
      paid_at: new Date().toISOString(),
      waiter_status: "delivered",
    }).eq("id", selected.id);

    await supabase.from("payments").insert({
      order_id: selected.id,
      amount: selected.total,
      method,
      status: "confirmed",
    });

    playChime();
    setLastReceipt({ order: selected, method, cash: cashPaid, change });
    setOrders((prev) => prev.filter((o) => o.id !== selected.id));
    setScreen("receipt");
    setProcessing(false);
  };

  const cashPaidCents =
    method === "cash" && cashInput ? Math.round(parseFloat(cashInput) * 100) : 0;
  const change =
    method === "cash" && cashPaidCents > 0 ? cashPaidCents - (selected?.total ?? 0) : 0;
  const canPay =
    method !== null &&
    (method !== "cash" || (cashPaidCents >= (selected?.total ?? 0) && cashPaidCents > 0));

  // ─── TELA: RECIBO ────────────────────────────────────────────────────────

  if (screen === "receipt" && lastReceipt) {
    const { order, method: m, cash, change: chg } = lastReceipt;
    const mInfo = METHODS.find((x) => x.id === m)!;
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
          {/* Topo */}
          <div className="bg-green-600 px-6 py-8 text-center">
            <div className="text-5xl mb-2">✅</div>
            <p className="text-white font-black text-2xl">Pagamento Confirmado</p>
            <p className="text-green-200 text-sm mt-1">{tableLabel(order.table_number)}</p>
          </div>

          {/* Detalhes */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Método</span>
              <span className="font-semibold">
                {mInfo.icon} {mInfo.label}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total</span>
              <span className="text-green-400 font-black text-xl">{fmt(order.total)}</span>
            </div>
            {m === "cash" && cash != null && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Pago</span>
                  <span className="font-semibold">{fmt(cash)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-700 pt-3">
                  <span className="text-gray-400 text-sm font-bold">Troco</span>
                  <span className="text-yellow-400 font-black text-lg">
                    {fmt(chg ?? 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Itens */}
          <div className="border-t border-gray-800 px-6 py-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-semibold">
              Itens
            </p>
            <ul className="space-y-1">
              {order.items?.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {item.qty}× {item.code_name ?? `Item ${i + 1}`}
                  </span>
                  <span className="text-gray-500">{fmt(item.qty * item.unit_price)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ações */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            <button
              onClick={() => setScreen("list")}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors"
            >
              ← Voltar ao PDV
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TELA: CHECKOUT ──────────────────────────────────────────────────────

  if (screen === "checkout" && selected) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setScreen("list")}
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="font-black text-lg leading-tight">
              💳 Pagamento — {tableLabel(selected.table_number)}
            </h1>
            <p className="text-gray-500 text-xs">{unitName}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-6 py-6 space-y-6">
            {/* Resumo do pedido */}
            <section className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">
                  Resumo do Pedido
                </p>
              </div>
              <ul className="divide-y divide-gray-800">
                {selected.items?.map((item, i) => (
                  <li key={i} className="flex justify-between items-center px-5 py-3">
                    <span className="text-gray-200 text-sm">
                      <span className="text-white font-bold mr-1.5">{item.qty}×</span>
                      {item.code_name ?? `Item ${i + 1}`}
                      {item.notes && (
                        <span className="text-gray-500 text-xs ml-1">({item.notes})</span>
                      )}
                    </span>
                    <span className="text-gray-400 text-sm font-medium">
                      {fmt(item.qty * item.unit_price)}
                    </span>
                  </li>
                ))}
              </ul>
              {selected.notes && (
                <p className="px-5 py-2 text-gray-500 text-xs italic border-t border-gray-800">
                  ⚠️ {selected.notes}
                </p>
              )}
              <div className="flex justify-between items-center px-5 py-4 bg-gray-800/50">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-black text-2xl">
                  {fmt(selected.total)}
                </span>
              </div>
            </section>

            {/* Método de pagamento */}
            <section>
              <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">
                Forma de Pagamento
              </p>
              <div className="grid grid-cols-3 gap-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMethod(m.id);
                      setCashInput("");
                    }}
                    style={
                      method === m.id
                        ? { borderColor: m.color, background: m.bg }
                        : undefined
                    }
                    className={`flex flex-col items-center gap-1.5 py-5 rounded-2xl border-2 transition-all ${
                      method === m.id
                        ? ""
                        : "border-gray-700 bg-gray-900 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-3xl">{m.icon}</span>
                    <span
                      className="font-bold text-sm"
                      style={{ color: method === m.id ? m.color : undefined }}
                    >
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Calculadora de troco (só dinheiro) */}
            {method === "cash" && (
              <section className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">
                  Calculadora de Troco
                </p>
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">
                    Valor recebido (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder={`mín. ${(selected.total / 100).toFixed(2)}`}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                {cashPaidCents > 0 && (
                  <div
                    className={`flex justify-between items-center rounded-xl px-4 py-3 ${
                      change >= 0
                        ? "bg-green-900/30 border border-green-700/50"
                        : "bg-red-900/30 border border-red-700/50"
                    }`}
                  >
                    <span className="text-sm font-semibold text-gray-300">Troco</span>
                    <span
                      className={`font-black text-xl ${
                        change >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {change >= 0 ? fmt(change) : `− ${fmt(Math.abs(change))}`}
                    </span>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Botão confirmar fixo no rodapé */}
        <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
          <button
            onClick={handlePay}
            disabled={!canPay || processing}
            className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? "Processando..." : "✅ Confirmar Pagamento"}
          </button>
        </div>
      </div>
    );
  }

  // ─── TELA: LISTA DE PEDIDOS ──────────────────────────────────────────────

  const totalDia = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black tracking-tight">
            💳 PDV
            <span className="ml-2 text-gray-400 font-medium text-base">— {unitName}</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">{restaurantName}</p>
        </div>
        <div className="flex items-center gap-3">
          {orders.length > 0 && (
            <span className="text-sm text-gray-400">
              <span className="text-white font-bold">{orders.length}</span>{" "}
              {orders.length === 1 ? "pedido" : "pedidos"} •{" "}
              <span className="text-green-400 font-bold">{fmt(totalDia)}</span>
            </span>
          )}
          <a
            href="/operacoes"
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition-colors"
          >
            🍳 Hub
          </a>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-gray-600">
            <span className="text-6xl mb-4">🎉</span>
            <p className="text-xl font-bold text-gray-400">Nenhum pedido pendente</p>
            <p className="text-sm mt-1">Todos os pedidos foram pagos!</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-3">
            {orders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onSelect={() => openCheckout(order)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── OrderListItem ────────────────────────────────────────────────────────────

function OrderListItem({
  order,
  onSelect,
}: {
  order: PDVOrder;
  onSelect: () => void;
}) {
  const ks = order.kitchen_status;
  const kitchenBadge =
    ks === "ready"
      ? { label: "Pronto", cls: "bg-green-900/40 text-green-300 border-green-700/50" }
      : ks === "preparing"
      ? { label: "Preparando", cls: "bg-yellow-900/40 text-yellow-300 border-yellow-700/50" }
      : { label: "Aguardando", cls: "bg-gray-700/60 text-gray-400 border-gray-600/50" };

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-white font-black text-lg">
            {tableLabel(order.table_number)}
          </span>
          <span className="ml-2 text-gray-500 text-sm">
            {new Date(order.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${kitchenBadge.cls}`}
        >
          {kitchenBadge.label}
        </span>
      </div>

      <div className="text-gray-400 text-sm mb-3">
        {order.items?.map((item, i) => (
          <span key={i}>
            {item.qty}× {item.code_name ?? "Item"}
            {i < (order.items?.length ?? 0) - 1 ? ", " : ""}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-green-400 font-black text-xl">{fmt(order.total)}</span>
        <span className="text-gray-500 text-sm group-hover:text-white transition-colors font-semibold">
          Cobrar →
        </span>
      </div>
    </button>
  );
}
