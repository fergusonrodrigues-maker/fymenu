"use client";

import { useEffect, useRef, useState } from "react";
import { ChefHat, CreditCard, ShieldAlert, BellRing, CheckCircle2, Link2, Truck, AlertTriangle, Printer, Shield, X as XIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ReceiptPrinter, { type PrintJobLite } from "@/components/print/ReceiptPrinter";
import { buildOrderIntentKitchenJobs, markKitchenPrinted, confirmOrderIntentEarly, rejectOrderIntent } from "@/app/painel/printActions";

type HubOrder = {
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
  kitchen_printed_at?: string | null;
  confirmation_deadline_at?: string | null;
  rejected_at?: string | null;
  customer_name?: string | null;
  source?: string | null;
};

interface Props {
  unitId: string;
  unitName: string;
  restaurantName: string;
  slug: string;
  initialOrders: HubOrder[];
  initialPendingOrders?: HubOrder[];
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
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default function HubClient({ unitId, unitName, restaurantName, slug, initialOrders, initialPendingOrders }: Props) {
  const [orders, setOrders] = useState<HubOrder[]>(initialOrders);
  const [pendingOrders, setPendingOrders] = useState<HubOrder[]>(initialPendingOrders ?? []);
  const [tick, setTick] = useState(0);
  // Separate fast tick for the 30s countdown — only runs while there's
  // something to count down on, so we don't spin a 1s interval forever.
  const [countdownTick, setCountdownTick] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tableCalls, setTableCalls] = useState<any[]>([]);
  const [rejectTarget, setRejectTarget] = useState<HubOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const supabase = createClient();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Print pipeline — same shape as KitchenClient.
  const [printJobs, setPrintJobs] = useState<PrintJobLite[] | null>(null);
  const [printingState, setPrintingState] = useState<{ orderId: string; markOnDone: boolean } | null>(null);
  const [noPrinterWarning, setNoPrinterWarning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const autoPrintedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (pendingOrders.length === 0) return;
    const id = setInterval(() => setCountdownTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [pendingOrders.length]);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2500);
  };

  const triggerPrint = async (orderId: string, markOnDone: boolean) => {
    if (printingState) return;
    const result = await buildOrderIntentKitchenJobs(orderId);
    if (!result.ok) {
      // Only surface the printer-config problem — the others are intentional
      // gates (no_active_plan, disabled_by_owner) that the owner is already
      // aware of, not errors to nag about.
      if (result.error === "no_printer_configured") setNoPrinterWarning(true);
      return;
    }
    setPrintingState({ orderId, markOnDone });
    setPrintJobs(result.jobs);
  };

  const handlePrintComplete = async () => {
    const finished = printingState;
    setPrintJobs(null);
    setPrintingState(null);
    if (!finished) return;
    if (finished.markOnDone) {
      await markKitchenPrinted(finished.orderId);
      setOrders((prev) => prev.map((o) => (o.id === finished.orderId ? { ...o, kitchen_printed_at: new Date().toISOString() } : o)));
      const shortId = finished.orderId.slice(0, 8).toUpperCase();
      flashToast(`Cupom #${shortId} impresso`);
    }
  };

  const handleReprint = async (orderId: string) => {
    await triggerPrint(orderId, false);
  };

  const handleConfirmEarly = async (orderId: string) => {
    if (actionBusy) return;
    setActionBusy(orderId);
    try {
      const res = await confirmOrderIntentEarly(orderId);
      if (res.ok) {
        // Optimistic remove — realtime will reconcile shortly anyway, but this
        // keeps the UI responsive instead of waiting on the round-trip.
        setPendingOrders((prev) => prev.filter((p) => p.id !== orderId));
      }
    } finally {
      setActionBusy(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || actionBusy) return;
    const id = rejectTarget.id;
    setActionBusy(id);
    try {
      const res = await rejectOrderIntent({ orderId: id, reason: rejectReason.trim() || undefined });
      if (res.ok) {
        setPendingOrders((prev) => prev.filter((p) => p.id !== id));
        setRejectTarget(null);
        setRejectReason("");
      }
    } finally {
      setActionBusy(null);
    }
  };

  // Read tick to force re-render every second while pending orders exist.
  // We don't *use* the value — the read is what subscribes us to changes.
  void countdownTick;

  useEffect(() => {
    if (printingState) return;
    const next = orders.find(
      (o) => o.status === "confirmed" && !o.kitchen_printed_at && !autoPrintedRef.current.has(o.id),
    );
    if (!next) return;
    autoPrintedRef.current.add(next.id);
    void triggerPrint(next.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, printingState]);

  const playBell = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      [440, 550, 660].forEach((f, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
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
      .channel(`hub-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_intents", filter: `unit_id=eq.${unitId}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const o = payload.new as HubOrder;
          const isPending = o.status === "pending" && o.waiter_status === "pending" && !o.rejected_at;
          const isActive = o.status === "confirmed" && o.kitchen_status !== "delivered";

          // Remove from either bucket first; the branches below re-add to the
          // correct one. Idempotent + handles transitions (pending→confirmed,
          // pending→cancelled) without leaving the row in both lists.
          setPendingOrders((prev) => prev.filter((x) => x.id !== o.id));

          if (isPending) {
            if (payload.eventType === "INSERT") playBell();
            setPendingOrders((prev) => [...prev, o].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setOrders((prev) => prev.filter((x) => x.id !== o.id));
          } else if (isActive) {
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
          const oldId = (payload.old as HubOrder).id;
          setOrders((prev) => prev.filter((x) => x.id !== oldId));
          setPendingOrders((prev) => prev.filter((x) => x.id !== oldId));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  useEffect(() => {
    supabase.from("table_calls").select("*").eq("unit_id", unitId).eq("status", "pending").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTableCalls(data); });

    const channel = supabase
      .channel("hub-table-calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        const call = payload.new as any;
        setTableCalls(prev => [call, ...prev]);
        if (call.type === "manager" && navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
        else if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        try { new Audio("/notification.mp3").play(); } catch {}
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "table_calls", filter: `unit_id=eq.${unitId}` }, (payload) => {
        setTableCalls(prev => prev.map(c => c.id === payload.new.id ? payload.new as any : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markKitchenStatus = async (orderId: string, status: string) => {
    await supabase.from("order_intents").update({ kitchen_status: status }).eq("id", orderId);
    if (status === "delivered") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, kitchen_status: status } : o)));
    }
  };

  const novos = orders.filter((o) => !o.kitchen_status || o.kitchen_status === "waiting");
  const preparando = orders.filter((o) => o.kitchen_status === "preparing");
  const prontos = orders.filter((o) => o.kitchen_status === "ready");
  const pendingCalls = tableCalls.filter(c => c.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}><ChefHat size={15} /> Hub Central <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>— {unitName}</span></div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{restaurantName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {orders.length === 0 ? (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Nenhum pedido</span>
          ) : (
            <>
              <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 10, fontWeight: 700, border: "1px solid rgba(248,113,113,0.2)" }}>{novos.length} novos</span>
              <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(251,191,36,0.08)", color: "#fbbf24", fontSize: 10, fontWeight: 700, border: "1px solid rgba(251,191,36,0.2)" }}>{preparando.length} prep.</span>
              <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(0,255,174,0.06)", color: "#00ffae", fontSize: 10, fontWeight: 700, border: "1px solid rgba(0,255,174,0.15)" }}>{prontos.length} pronto{prontos.length !== 1 ? "s" : ""}</span>
            </>
          )}
          {pendingOrders.length > 0 && (
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(96,165,250,0.08)", color: "#60a5fa", fontSize: 10, fontWeight: 700, border: "1px solid rgba(96,165,250,0.25)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Shield size={10} /> {pendingOrders.length} aguardando
            </span>
          )}
          <a href="/pdv" style={{ marginLeft: 4, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(167,139,250,0.12)", color: "#a78bfa", fontSize: 10, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><CreditCard size={12} /> PDV</a>
        </div>
      </header>

      {/* Chamados */}
      {pendingCalls.length > 0 && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {pendingCalls.filter(c => c.type === "manager").map(call => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <div>
                <div style={{ color: "#a855f7", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}><ShieldAlert size={13} /> Mesa {call.table_number} — GERENTE!</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>{new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <button onClick={async () => { await supabase.from("table_calls").update({ status: "resolved", acknowledged_by: "Gerente", acknowledged_at: new Date().toISOString(), resolved_at: new Date().toISOString(), resolved_by: "Gerente" }).eq("id", call.id); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(168,85,247,0.12)", color: "#a855f7", fontSize: 11, fontWeight: 700 }}>✓ Atender</button>
            </div>
          ))}
          {pendingCalls.filter(c => c.type === "waiter").map(call => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <div>
                <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}><BellRing size={13} /> Mesa {call.table_number} chamando!</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>{new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <button onClick={async () => { await supabase.from("table_calls").update({ status: "resolved", acknowledged_by: unitName, acknowledged_at: new Date().toISOString(), resolved_at: new Date().toISOString(), resolved_by: unitName }).eq("id", call.id); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 11, fontWeight: 700 }}>✓ Atender</button>
            </div>
          ))}
        </div>
      )}

      {pendingOrders.length > 0 && (
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "rgba(96,165,250,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#60a5fa", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <Shield size={12} /> Aguardando confirmação
            <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· cliente fez pedido pelo WhatsApp</span>
          </div>
          {pendingOrders.map((o) => (
            <PendingOrderCard
              key={o.id}
              order={o}
              busy={actionBusy === o.id}
              onConfirm={() => handleConfirmEarly(o.id)}
              onAskReject={() => { setRejectTarget(o); setRejectReason(""); }}
            />
          ))}
        </div>
      )}

      {noPrinterWarning && (
        <div style={{ padding: "10px 20px", background: "rgba(251,191,36,0.06)", borderBottom: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: 12, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <AlertTriangle size={14} /> Sem impressora ativa configurada. Configure em <strong>Painel → Impressoras</strong> pra cupons automáticos.
          <button onClick={() => setNoPrinterWarning(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "rgba(251,191,36,0.6)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Kanban */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>
        {/* NOVOS */}
        <HubColumn title="NOVOS" accentColor="rgba(248,113,113,0.5)" titleColor="#f87171" bg="rgba(248,113,113,0.015)">
          {novos.length === 0 && <HubEmptyState text="Nenhum pedido novo" />}
          {novos.map((o) => (
            <HubOrderCard key={o.id} order={o} tick={tick} onReprint={() => handleReprint(o.id)}>
              <button onClick={() => markKitchenStatus(o.id, "preparing")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontSize: 12, fontWeight: 700, marginTop: 10, boxShadow: "0 1px 0 rgba(251,191,36,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ChefHat size={14} /> Iniciar Preparo
              </button>
            </HubOrderCard>
          ))}
        </HubColumn>

        {/* EM PREPARO */}
        <HubColumn title="EM PREPARO" accentColor="rgba(251,191,36,0.5)" titleColor="#fbbf24" bg="rgba(251,191,36,0.015)">
          {preparando.length === 0 && <HubEmptyState text="Nenhum em preparo" />}
          {preparando.map((o) => (
            <HubOrderCard key={o.id} order={o} tick={tick} onReprint={() => handleReprint(o.id)}>
              <button onClick={() => markKitchenStatus(o.id, "ready")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 12, fontWeight: 700, marginTop: 10, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> Marcar Pronto
              </button>
            </HubOrderCard>
          ))}
        </HubColumn>

        {/* PRONTOS */}
        <HubColumn title="PRONTOS" accentColor="rgba(0,255,174,0.4)" titleColor="#00ffae" bg="rgba(0,255,174,0.01)">
          {prontos.length === 0 && <HubEmptyState text="Nenhum pronto ainda" />}
          {prontos.map((o) => (
            <HubOrderCard key={o.id} order={o} tick={tick} onReprint={() => handleReprint(o.id)}>
              <button
                onClick={() => { const link = `${window.location.origin}/entrega/${o.id}`; navigator.clipboard.writeText(link).then(() => { setCopiedId(o.id); setTimeout(() => setCopiedId(null), 2000); }); }}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer", background: "rgba(96,165,250,0.08)", color: "#60a5fa", fontSize: 12, fontWeight: 600, marginTop: 10 }}
              >
                {copiedId === o.id ? "✓ Link copiado!" : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Link2 size={12} /> Enviar pro entregador</span>}
              </button>
              <button onClick={() => markKitchenStatus(o.id, "delivered")} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Truck size={12} /> Entregue — Remover
              </button>
            </HubOrderCard>
          ))}
        </HubColumn>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 18px", borderRadius: 10, background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 12, fontWeight: 700, border: "1px solid rgba(0,255,174,0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Printer size={13} /> {toast}
        </div>
      )}

      {rejectTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}>
          <div style={{ maxWidth: 420, width: "100%", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171", fontSize: 14, fontWeight: 800 }}>
              <ShieldAlert size={16} /> Rejeitar pedido?
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              O pedido <strong style={{ color: "#fff" }}>#{rejectTarget.id.slice(0, 8).toUpperCase()}</strong>
              {rejectTarget.customer_name ? <> de <strong style={{ color: "#fff" }}>{rejectTarget.customer_name}</strong></> : null}
              {" "}será marcado como cancelado e <strong style={{ color: "#fff" }}>não vai pra Cozinha</strong>.
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setRejectTarget(null)} disabled={actionBusy != null} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700 }}>
                Cancelar
              </button>
              <button onClick={handleRejectConfirm} disabled={actionBusy != null} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(248,113,113,0.15)", color: "#f87171", fontSize: 12, fontWeight: 800, opacity: actionBusy != null ? 0.5 : 1 }}>
                {actionBusy ? "Rejeitando..." : "Rejeitar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptPrinter jobs={printJobs} onComplete={handlePrintComplete} />
    </div>
  );
}

function PendingOrderCard({ order, busy, onConfirm, onAskReject }: { order: HubOrder; busy: boolean; onConfirm: () => void; onAskReject: () => void }) {
  const deadlineMs = order.confirmation_deadline_at ? new Date(order.confirmation_deadline_at).getTime() : null;
  const remainingSec = deadlineMs != null ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)) : null;

  // Color tiers — green > 15s, amber 5–15s, red pulsing < 5s. The card itself
  // mirrors the timer accent so the urgency reads at a glance.
  let tone: { fg: string; bg: string; border: string; pulse: boolean };
  if (remainingSec == null) tone = { fg: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", pulse: false };
  else if (remainingSec > 15) tone = { fg: "#00ffae", bg: "rgba(0,255,174,0.05)", border: "rgba(0,255,174,0.2)", pulse: false };
  else if (remainingSec > 5) tone = { fg: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.25)", pulse: false };
  else tone = { fg: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", pulse: true };

  const tableLabel = order.table_number != null ? `Mesa ${order.table_number}` : (order.source === "whatsapp" ? "WhatsApp" : "Delivery");
  const shortId = order.id.slice(0, 8).toUpperCase();
  const itemsSummary = (order.items ?? []).slice(0, 3).map((i) => `${i.qty}× ${i.code_name ?? "Item"}`).join(", ")
    + ((order.items?.length ?? 0) > 3 ? `, +${(order.items?.length ?? 0) - 3}` : "");
  const totalFmt = `R$ ${(order.total / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div style={{
      padding: 12, borderRadius: 14,
      background: tone.bg,
      border: `1px solid ${tone.border}`,
      display: "flex", alignItems: "center", gap: 12,
      animation: tone.pulse ? "pulseCritical 1s ease-in-out infinite" : undefined,
    }}>
      <style>{`@keyframes pulseCritical { 0%,100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); } 50% { box-shadow: 0 0 0 6px rgba(248,113,113,0.18); } }`}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{tableLabel}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>#{shortId}</span>
          {order.customer_name && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>· {order.customer_name}</span>}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemsSummary || "(sem itens)"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{totalFmt}</span>
          {remainingSec != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: tone.fg, display: "inline-flex", alignItems: "center", gap: 4 }}>
              ⏱ {remainingSec}s pra auto-confirmar
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onConfirm} disabled={busy} style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: busy ? "not-allowed" : "pointer", background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 11, fontWeight: 700, opacity: busy ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CheckCircle2 size={12} /> Confirmar
        </button>
        <button onClick={onAskReject} disabled={busy} style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: busy ? "not-allowed" : "pointer", background: "rgba(248,113,113,0.12)", color: "#f87171", fontSize: 11, fontWeight: 700, opacity: busy ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <XIcon size={12} /> Rejeitar
        </button>
      </div>
    </div>
  );
}

function HubColumn({ title, accentColor, titleColor, bg, children }: { title: string; accentColor: string; titleColor: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRight: "1px solid rgba(255,255,255,0.04)", background: bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `2px solid ${accentColor}`, background: "rgba(5,5,5,0.6)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.5px", color: titleColor }}>{title}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function HubEmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: "rgba(255,255,255,0.15)", fontSize: 12 }}>{text}</div>
  );
}

function HubOrderCard({ order, tick, onReprint, children }: { order: HubOrder; tick: number; onReprint?: () => void; children: React.ReactNode }) {
  const label = order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";
  const since = order.waiter_confirmed_at ?? order.created_at;
  const secs = elapsedSeconds(since);
  const isLate = secs > 600;
  const printed = !!order.kitchen_printed_at;

  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: isLate ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isLate ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.05)"}`,
      boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{label}</span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {printed && (
            <span title="Cupom impresso" style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "rgba(0,255,174,0.06)", color: "#00ffae", border: "1px solid rgba(0,255,174,0.15)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Printer size={9} /> ✓
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: isLate ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.06)", color: isLate ? "#f87171" : "rgba(255,255,255,0.4)" }}>
            {elapsed(since)}
          </span>
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: "0 0 6px", padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {order.items?.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 4, fontSize: 13, alignItems: "baseline" }}>
            <span style={{ color: "#fff", fontWeight: 700, minWidth: 20 }}>{item.qty}×</span>
            <span style={{ color: "rgba(255,255,255,0.7)", flex: 1 }}>{item.code_name ?? `Item ${i + 1}`}</span>
            {item.notes && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>({item.notes})</span>}
          </li>
        ))}
      </ul>
      {order.notes && (
        <div style={{ marginBottom: 6, padding: "5px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 11, color: "#fbbf24", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={11} /> {order.notes}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{formatPrice(order.total)}</span>
      </div>
      {children}
      {onReprint && (
        <button onClick={onReprint} style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, marginTop: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Printer size={11} /> Reimprimir
        </button>
      )}
    </div>
  );
}
