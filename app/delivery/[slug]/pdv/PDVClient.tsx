"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useKitchenAlertContext } from "@/lib/context/KitchenAlertContext";

type PDVOrder = {
  id: string;
  table_number: number | null;
  items: Array<{ product_id: string; qty: number; unit_price: number; total: number; code_name?: string; notes?: string }>;
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
  { id: "cash", label: "Dinheiro", icon: "💵", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  { id: "card", label: "Cartão",   icon: "💳", color: "#60a5fa", bg: "rgba(96,165,250,0.08)" },
  { id: "pix",  label: "PIX",      icon: "📲", color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
];

function fmt(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function tableLabel(t: number | null) {
  return t != null ? `Mesa ${t}` : "S/ Mesa";
}

export default function PDVClient({ unitId, unitName, restaurantName, slug, initialOrders }: Props) {
  const [orders, setOrders] = useState<PDVOrder[]>(initialOrders);
  const [selected, setSelected] = useState<PDVOrder | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [cashInput, setCashInput] = useState("");
  const [screen, setScreen] = useState<Screen>("list");
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ order: PDVOrder; method: PaymentMethod; cash?: number; change?: number } | null>(null);

  const supabase = createClient();
  const { playAlert } = useKitchenAlertContext();

  useEffect(() => {
    const channel = supabase
      .channel(`pdv-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const o = payload.new as PDVOrder;
          if (o.status === "confirmed" && !o.paid_at) {
            if (payload.eventType === "INSERT") playAlert();
            setOrders((prev) => {
              const exists = prev.find((x) => x.id === o.id);
              if (exists) return prev.map((x) => x.id === o.id ? { ...x, ...o } : x);
              return [...prev, o].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          } else {
            setOrders((prev) => prev.filter((x) => x.id !== o.id));
          }
        } else if (payload.eventType === "DELETE") {
          setOrders((prev) => prev.filter((x) => x.id !== (payload.old as PDVOrder).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const openCheckout = (order: PDVOrder) => {
    setSelected(order); setMethod(null); setCashInput(""); setScreen("checkout");
  };

  const handlePay = async () => {
    if (!selected || !method) return;
    setProcessing(true);
    const cashPaid = method === "cash" && cashInput ? parseFloat(cashInput) * 100 : undefined;
    const change = cashPaid != null ? cashPaid - selected.total : undefined;
    await supabase.from("order_intents").update({ payment_method: method, paid_at: new Date().toISOString(), waiter_status: "delivered" }).eq("id", selected.id);
    await supabase.from("payments").insert({ order_id: selected.id, amount: selected.total, method, status: "confirmed" });
    playAlert();
    setLastReceipt({ order: selected, method, cash: cashPaid, change });
    setOrders((prev) => prev.filter((o) => o.id !== selected.id));
    setScreen("receipt");
    setProcessing(false);
  };

  const cashPaidCents = method === "cash" && cashInput ? Math.round(parseFloat(cashInput) * 100) : 0;
  const change = method === "cash" && cashPaidCents > 0 ? cashPaidCents - (selected?.total ?? 0) : 0;
  const canPay = method !== null && (method !== "cash" || (cashPaidCents >= (selected?.total ?? 0) && cashPaidCents > 0));

  // ─── RECIBO ────────────────────────────────────────────────────────────────

  if (screen === "receipt" && lastReceipt) {
    const { order, method: m, cash, change: chg } = lastReceipt;
    const mInfo = METHODS.find((x) => x.id === m)!;
    return (
      <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 400, background: "#0d0d0d", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ background: "rgba(0,255,174,0.08)", borderBottom: "1px solid rgba(0,255,174,0.15)", padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00ffae" }}>Pagamento Confirmado</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{tableLabel(order.table_number)}</div>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Método</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: mInfo.color }}>{mInfo.icon} {mInfo.label}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#00ffae" }}>{fmt(order.total)}</span>
            </div>
            {m === "cash" && cash != null && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Pago</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(cash)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Troco</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24" }}>{fmt(chg ?? 0)}</span>
                </div>
              </>
            )}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 24px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, fontWeight: 700 }}>Itens</div>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{item.qty}× {item.code_name ?? `Item ${i + 1}`}</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>{fmt(item.qty * item.unit_price)}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 24px 24px" }}>
            <button onClick={() => setScreen("list")} style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700 }}>
              ← Voltar ao PDV
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHECKOUT ──────────────────────────────────────────────────────────────

  if (screen === "checkout" && selected) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setScreen("list")} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>←</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>💳 Pagamento — {tableLabel(selected.table_number)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{unitName}</div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 520, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Resumo */}
            <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Resumo do Pedido</div>
              </div>
              {selected.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    <span style={{ color: "#fff", fontWeight: 700, marginRight: 6 }}>{item.qty}×</span>
                    {item.code_name ?? `Item ${i + 1}`}
                    {item.notes && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginLeft: 4 }}>({item.notes})</span>}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{fmt(item.qty * item.unit_price)}</span>
                </div>
              ))}
              {selected.notes && (
                <div style={{ padding: "8px 16px", fontSize: 12, color: "#fbbf24", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>⚠️ {selected.notes}</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>{fmt(selected.total)}</span>
              </div>
            </div>

            {/* Método */}
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: 10 }}>Forma de Pagamento</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setCashInput(""); }}
                    style={{
                      padding: "18px 12px", borderRadius: 14, border: `2px solid ${method === m.id ? m.color : "rgba(255,255,255,0.06)"}`,
                      cursor: "pointer", background: method === m.id ? m.bg : "rgba(255,255,255,0.02)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: method === m.id ? m.color : "rgba(255,255,255,0.5)" }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Troco */}
            {method === "cash" && (
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: 12 }}>Calculadora de Troco</div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block" }}>Valor recebido (R$)</label>
                <input
                  type="number" min="0" step="0.01" value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder={`mín. ${(selected.total / 100).toFixed(2)}`}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                />
                {cashPaidCents > 0 && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: change >= 0 ? "rgba(0,255,174,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${change >= 0 ? "rgba(0,255,174,0.15)" : "rgba(248,113,113,0.15)"}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Troco</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: change >= 0 ? "#00ffae" : "#f87171" }}>
                      {change >= 0 ? fmt(change) : `− ${fmt(Math.abs(change))}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", padding: "12px 16px" }}>
          <button
            onClick={handlePay}
            disabled={!canPay || processing}
            style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", cursor: !canPay || processing ? "not-allowed" : "pointer", background: "rgba(96,165,250,0.14)", color: "#60a5fa", fontSize: 15, fontWeight: 800, opacity: !canPay || processing ? 0.4 : 1, boxShadow: "0 1px 0 rgba(96,165,250,0.1) inset, 0 -1px 0 rgba(0,0,0,0.2) inset" }}
          >
            {processing ? "Processando..." : "✅ Confirmar Pagamento"}
          </button>
        </div>
      </div>
    );
  }

  // ─── LISTA ─────────────────────────────────────────────────────────────────

  const totalDia = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>💳 PDV <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: 13 }}>— {unitName}</span></div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{restaurantName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {orders.length > 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>{orders.length}</span> {orders.length === 1 ? "pedido" : "pedidos"} · <span style={{ color: "#60a5fa", fontWeight: 700 }}>{fmt(totalDia)}</span>
            </span>
          )}
          <a href="/operacoes" style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600, textDecoration: "none" }}>
            🍳 Hub
          </a>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto" }}>
        {orders.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "80px 20px", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>Nenhum pedido pendente</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Todos os pedidos foram pagos!</div>
          </div>
        ) : (
          <div style={{ maxWidth: 600, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {orders.map((order) => (
              <PDVOrderItem key={order.id} order={order} onSelect={() => openCheckout(order)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PDVOrderItem({ order, onSelect }: { order: PDVOrder; onSelect: () => void }) {
  const ks = order.kitchen_status;
  const badge =
    ks === "ready"     ? { label: "Pronto",     color: "#00ffae", bg: "rgba(0,255,174,0.08)",    border: "rgba(0,255,174,0.2)" } :
    ks === "preparing" ? { label: "Preparando", color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.2)" } :
                         { label: "Aguardando", color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" };

  return (
    <button
      onClick={onSelect}
      style={{ width: "100%", textAlign: "left", padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", background: "rgba(255,255,255,0.02)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "border-color 0.2s" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{tableLabel(order.table_number)}</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
        {order.items?.map((item, i) => (
          <span key={i}>{item.qty}× {item.code_name ?? "Item"}{i < (order.items?.length ?? 0) - 1 ? ", " : ""}</span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#60a5fa" }}>{fmt(order.total)}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Cobrar →</span>
      </div>
    </button>
  );
}
