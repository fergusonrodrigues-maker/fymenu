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

type Tab = "mesas" | "queue" | "tables" | "comandas";
type MesaScreen = "grid" | "abrir";

type Mesa = {
  id: string;
  number: number;
  label: string | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "inactive";
  current_comanda_id: string | null;
  current_waiter_id: string | null;
  is_active: boolean;
};

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
  const [tab, setTab] = useState<Tab>("mesas");
  const [editOrder, setEditOrder] = useState<WaiterOrder | null>(null);
  const [pdvOrder, setPdvOrder] = useState<WaiterOrder | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [showNewComanda, setShowNewComanda] = useState(false);
  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const router = useRouter();

  // ── Mesas flow ───────────────────────────────────────────────────────────────
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaFilter, setMesaFilter] = useState<"all" | "available" | "occupied">("all");
  const [mesaScreen, setMesaScreen] = useState<MesaScreen>("grid");
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [opening, setOpening] = useState(false);
  const [mesaError, setMesaError] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [newCall, setNewCall] = useState<any>(null);
  const [showCalls, setShowCalls] = useState(false);

  const playSound = (type: "new" | "ready" | "call") => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const configs =
        type === "new"
          ? [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.15 }, { f: 783.99, t: 0.3 }]
          : type === "call"
          ? [{ f: 880, t: 0 }, { f: 1100, t: 0.15 }, { f: 880, t: 0.3 }]
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
        const call = payload.new as any;
        setTableCalls(prev => [call, ...prev]);
        setNewCall(call);
        playSound("call");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        setTimeout(() => setNewCall(null), 10000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        const updated = payload.new as any;
        setTableCalls(prev =>
          prev.map(c => c.id === updated.id ? updated : c).filter(c => c.status === "pending")
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Employee name from localStorage ─────────────────────────────────────────
  useEffect(() => {
    setEmployeeName(localStorage.getItem("fy_employee_name") ?? "Garçom");
  }, []);

  // ── Mesas: load + realtime ───────────────────────────────────────────────────
  const loadMesas = async () => {
    const { data } = await supabase.from("mesas")
      .select("*").eq("unit_id", unitId).eq("is_active", true).order("number");
    if (data) setMesas(data as Mesa[]);
  };

  useEffect(() => {
    loadMesas();
    const channel = supabase.channel("garcom-mesas")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas", filter: `unit_id=eq.${unitId}` },
        () => loadMesas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers mesas ───────────────────────────────────────────────────────────
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    setClientPhone(v);
  }

  async function handleOpenComanda() {
    if (!clientName.trim() || !selectedMesa) return;
    setOpening(true);
    setMesaError("");

    const { data: mesaCheck } = await supabase
      .from("mesas").select("status").eq("id", selectedMesa.id).single();
    if (mesaCheck?.status === "occupied") {
      setMesaError("Esta mesa foi ocupada por outro garçom agora.");
      setOpening(false);
      return;
    }

    const shortCode = generateShortCode();
    const { data: comanda, error: cmdError } = await supabase
      .from("comandas").insert({
        unit_id: unitId,
        mesa_id: selectedMesa.id,
        mesa_number: selectedMesa.number,
        table_number: selectedMesa.number,
        waiter_id: userId,
        waiter_name: employeeName,
        opened_by: userId,
        opened_by_name: employeeName,
        opened_by_role: "garcom",
        customer_name: clientName.trim(),
        customer_phone: clientPhone.replace(/\D/g, ""),
        guest_count: guestCount || 2,
        short_code: shortCode,
        status: "open",
        hash: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      }).select().single();

    if (cmdError || !comanda) {
      setMesaError("Erro ao abrir comanda. Tente novamente.");
      setOpening(false);
      return;
    }

    await supabase.from("mesas").update({
      status: "occupied",
      current_comanda_id: comanda.id,
      current_waiter_id: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedMesa.id);

    const phoneClean = clientPhone.replace(/\D/g, "");
    if (phoneClean.length >= 10) {
      await supabase.from("crm_customers").upsert({
        unit_id: unitId,
        phone: phoneClean,
        name: clientName.trim(),
        source: "mesa",
        last_visit_at: new Date().toISOString(),
      }, { onConflict: "unit_id,phone" });

      const fullPhone = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
      const msg = encodeURIComponent(
        `Olá ${clientName.trim()}! Sua comanda está pronta 🍽️\n\n` +
        `Acompanhe seus pedidos:\n👉 https://fymenu.com/comanda/${shortCode}\n\n` +
        `Mesa ${selectedMesa.number} · ${unitName}`
      );
      window.open(`https://wa.me/${fullPhone}?text=${msg}`, "_blank");
    }

    await logComandaAction({
      comanda_id: comanda.id, unit_id: unitId, action: "comanda_opened",
      new_value: { mesa_number: selectedMesa.number, customer_name: clientName.trim() },
      performed_by_role: "garcom", performed_by_name: employeeName,
    });

    setClientName(""); setClientPhone(""); setGuestCount(2);
    setOpening(false);
    router.push(`/garcom/comanda/${comanda.id}`);
  }

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

  async function handleAnswerCall(callId: string) {
    await supabase.from("table_calls").update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    }).eq("id", callId);
    setTableCalls(prev => prev.filter(c => c.id !== callId));
    if (newCall?.id === callId) setNewCall(null);
  }

  async function handleDismissCall(callId: string) {
    await supabase.from("table_calls").update({ status: "dismissed" }).eq("id", callId);
    setTableCalls(prev => prev.filter(c => c.id !== callId));
    if (newCall?.id === callId) setNewCall(null);
  }

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
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button
                onClick={() => setShowCalls(s => !s)}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                  background: pendingCalls.length > 0 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}
              >🔔</button>
              {pendingCalls.length > 0 && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  minWidth: 16, height: 16, borderRadius: 8, padding: "0 3px",
                  background: "#fbbf24", color: "#000",
                  fontSize: 9, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>{pendingCalls.length}</div>
              )}
            </div>
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
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px", display: "flex", overflowX: "auto" }}>
          {(["mesas", "queue", "tables", "comandas"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t !== "mesas") { setMesaScreen("grid"); setSelectedMesa(null); } }}
              style={{
                flex: 1, minWidth: 64, padding: "10px 0", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                background: "transparent",
                borderBottom: `2px solid ${tab === t ? "#00ffae" : "transparent"}`,
                color: tab === t ? "#00ffae" : "rgba(255,255,255,0.3)",
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >
              {t === "mesas"
                ? `🪑 Mesas${mesas.filter(m => m.status === "occupied").length > 0 ? ` (${mesas.filter(m => m.status === "occupied").length})` : ""}`
                : t === "queue"
                ? `Fila${queue.length > 0 ? ` (${queue.length})` : ""}`
                : t === "tables"
                ? `Pedidos${active.length > 0 ? ` (${active.length})` : ""}`
                : `Comandas${openComandas.length > 0 ? ` (${openComandas.length})` : ""}`}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "16px" }}>
        {/* Chamados pendentes (inline) */}
        {pendingCalls.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {pendingCalls.map(call => (
              <div key={call.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 14, marginBottom: 6,
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
              }}>
                <div>
                  <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 800 }}>
                    🖐️ Mesa {call.mesa_number ?? call.table_number} chamando!
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 }}>
                    {call.customer_name ? `${call.customer_name} · ` : ""}
                    {new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleAnswerCall(call.id)}
                    style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 11, fontWeight: 700 }}
                  >✓ Atender</button>
                  <button
                    onClick={() => handleDismissCall(call.id)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA: MESAS */}
        {tab === "mesas" && (
          mesaScreen === "grid" ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Mesas</div>

              {/* Filtro rápido */}
              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                {([
                  { key: "all", label: "Todas", count: mesas.length },
                  { key: "available", label: "Livres", count: mesas.filter(m => m.status === "available").length },
                  { key: "occupied", label: "Ocupadas", count: mesas.filter(m => m.status === "occupied").length },
                ] as { key: "all" | "available" | "occupied"; label: string; count: number }[]).map(f => (
                  <button key={f.key} onClick={() => setMesaFilter(f.key)} style={{
                    padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: mesaFilter === f.key ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.03)",
                    color: mesaFilter === f.key ? "#00ffae" : "rgba(255,255,255,0.4)",
                    fontSize: 11, fontWeight: 600,
                  }}>{f.label} ({f.count})</button>
                ))}
              </div>

              {/* Grid */}
              {mesas.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.2)", fontSize: 12, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🪑</div>
                  Nenhuma mesa cadastrada.<br />Peça ao gerente pra adicionar em Operações.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {mesas
                    .filter(m => mesaFilter === "all" || m.status === mesaFilter)
                    .map(m => {
                      const isOwn = m.status === "occupied" && m.current_waiter_id === userId;
                      const isOther = m.status === "occupied" && m.current_waiter_id !== userId;
                      return (
                        <button key={m.id} onClick={() => {
                          if (isOther) return;
                          setSelectedMesa(m);
                          if (m.status === "occupied" && m.current_comanda_id) {
                            router.push(`/garcom/comanda/${m.current_comanda_id}`);
                          } else if (m.status === "available") {
                            setMesaError("");
                            setMesaScreen("abrir");
                          }
                        }} style={{
                          padding: 16, borderRadius: 16, textAlign: "center",
                          background: m.status === "occupied" ? "rgba(251,191,36,0.06)" : m.status === "reserved" ? "rgba(96,165,250,0.06)" : "rgba(0,255,174,0.04)",
                          border: `1px solid ${m.status === "occupied" ? "rgba(251,191,36,0.15)" : m.status === "reserved" ? "rgba(96,165,250,0.15)" : "rgba(0,255,174,0.1)"}`,
                          cursor: isOther ? "not-allowed" : "pointer",
                          opacity: isOther ? 0.45 : 1,
                          boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                        }}>
                          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{m.number}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            {m.label || `Mesa ${m.number}`}
                          </div>
                          <div style={{
                            marginTop: 6, padding: "2px 8px", borderRadius: 6, display: "inline-block",
                            fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                            background: m.status === "occupied" ? "rgba(251,191,36,0.1)" : m.status === "reserved" ? "rgba(96,165,250,0.1)" : "rgba(0,255,174,0.1)",
                            color: m.status === "occupied" ? "#fbbf24" : m.status === "reserved" ? "#60a5fa" : "#00ffae",
                          }}>
                            {m.status === "available" ? "Livre" : m.status === "occupied" ? "Ocupada" : "Reservada"}
                          </div>
                          {isOwn && (
                            <div style={{ fontSize: 8, color: "rgba(0,255,174,0.5)", marginTop: 4 }}>Sua mesa</div>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            /* TELA: ABRIR COMANDA */
            <div>
              <button onClick={() => { setMesaScreen("grid"); setSelectedMesa(null); }} style={{
                background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
                fontSize: 12, cursor: "pointer", marginBottom: 12, padding: 0,
              }}>← Voltar</button>

              <div style={{ padding: 20, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
                  Mesa {selectedMesa?.number}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>
                  Abrir comanda para o cliente
                </div>

                {/* Nome */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Nome do cliente</label>
                  <input
                    value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Nome" autoFocus
                    style={{ width: "100%", padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#00ffae"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>

                {/* Telefone */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>WhatsApp do cliente</label>
                  <input
                    value={clientPhone} onChange={handlePhoneChange}
                    placeholder="(62) 99999-9999" inputMode="numeric"
                    style={{ width: "100%", padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#00ffae"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>

                {/* Pessoas */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Pessoas na mesa</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => setGuestCount(n)} style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                        background: guestCount === n ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.03)",
                        color: guestCount === n ? "#00ffae" : "rgba(255,255,255,0.3)",
                        fontSize: 14, fontWeight: 700,
                      }}>{n}</button>
                    ))}
                    <button onClick={() => setGuestCount(prev => Math.min(prev + 1, 20))} style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                      background: guestCount > 6 ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.03)",
                      color: guestCount > 6 ? "#00ffae" : "rgba(255,255,255,0.3)",
                      fontSize: 14, fontWeight: 700,
                    }}>{guestCount > 6 ? guestCount : "+"}</button>
                  </div>
                </div>

                {mesaError && (
                  <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 12, marginBottom: 14 }}>
                    {mesaError}
                  </div>
                )}

                <button
                  onClick={handleOpenComanda}
                  disabled={opening || !clientName.trim()}
                  style={{
                    width: "100%", padding: 16, borderRadius: 14, border: "none", cursor: "pointer",
                    background: "rgba(0,255,174,0.1)", color: "#00ffae",
                    fontSize: 16, fontWeight: 800,
                    boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                    opacity: opening || !clientName.trim() ? 0.4 : 1,
                  }}
                >{opening ? "Abrindo..." : "Abrir comanda"}</button>
              </div>
            </div>
          )
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

      {/* Popup: novo chamado */}
      {newCall && (
        <div style={{
          position: "fixed", top: 16, left: 16, right: 16,
          padding: 18, borderRadius: 18,
          background: "rgba(251,191,36,0.12)",
          border: "1px solid rgba(251,191,36,0.25)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(251,191,36,0.15), 0 0 0 1px rgba(251,191,36,0.1) inset",
          zIndex: 9999,
          animation: "callSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{
            position: "absolute", top: -4, right: -4,
            width: 12, height: 12, borderRadius: "50%",
            background: "#fbbf24",
            animation: "callPulse 1s ease infinite",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "rgba(251,191,36,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fbbf24" }}>
                Mesa {newCall.mesa_number ?? newCall.table_number} chamando!
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {newCall.customer_name || "Cliente"} · {newCall.type === "waiter" ? "Garçom" : "Gerente"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => handleAnswerCall(newCall.id)} style={{
                padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "rgba(0,255,174,0.12)", color: "#00ffae",
                fontSize: 12, fontWeight: 800,
                boxShadow: "0 1px 0 rgba(0,255,174,0.1) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>Atender</button>
              <button onClick={() => handleDismissCall(newCall.id)} style={{
                padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)",
                fontSize: 12,
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown: lista de chamados pendentes */}
      {showCalls && pendingCalls.length > 0 && (
        <div style={{
          position: "fixed", top: 60, right: 16, width: 280,
          padding: 14, borderRadius: 18,
          background: "rgba(10,10,10,0.95)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          zIndex: 9998, maxHeight: 400, overflowY: "auto",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
            Chamados pendentes ({pendingCalls.length})
          </div>
          {pendingCalls.map(call => (
            <div key={call.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: "rgba(251,191,36,0.04)",
              border: "1px solid rgba(251,191,36,0.08)",
              marginBottom: 6,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(251,191,36,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>🔔</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
                  Mesa {call.mesa_number ?? call.table_number}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                  {call.customer_name || "Cliente"} · {new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button onClick={() => { handleAnswerCall(call.id); setShowCalls(false); }} style={{
                padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(0,255,174,0.08)", color: "#00ffae",
                fontSize: 10, fontWeight: 700,
              }}>Atender</button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes callSlideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes callPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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
