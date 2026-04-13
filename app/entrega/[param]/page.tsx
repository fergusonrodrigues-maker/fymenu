"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type OrderItem = { qty: number; code_name?: string; unit_price: number; total: number; notes?: string };

type DriverOrder = {
  id: string;
  table_number: number | null;
  items: OrderItem[];
  total: number;
  notes: string | null;
  delivery_status: string | null;
  delivery_picked_at: string | null;
  delivery_completed_at: string | null;
  created_at: string;
  customer_name?: string;
  customer_address?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STEPS = [
  { status: "pending",    label: "Aguardando",         icon: "⏳", nextLabel: "Aceitar entrega",   nextIcon: "✋" },
  { status: "assigned",   label: "Atribuído",           icon: "✋", nextLabel: "Peguei o pedido",    nextIcon: "📦" },
  { status: "picked_up",  label: "Retirado",            icon: "📦", nextLabel: "Em trânsito",        nextIcon: "🛵" },
  { status: "in_transit", label: "Em trânsito",         icon: "🛵", nextLabel: "Entrega concluída", nextIcon: "✅" },
  { status: "delivered",  label: "Entregue ✓",          icon: "✅", nextLabel: "",                   nextIcon: "" },
  { status: "failed",     label: "Problema na entrega", icon: "❌", nextLabel: "",                   nextIcon: "" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#888", assigned: "#60a5fa", picked_up: "#a855f7",
  in_transit: "#fbbf24", delivered: "#00ffae", failed: "#f87171",
};

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// ── Order-detail view (UUID) ──────────────────────────────────────────────────

function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("order_intents")
      .select("id, table_number, items, total, notes, delivery_status, delivery_picked_at, delivery_completed_at, created_at, customer_name, customer_address")
      .eq("id", orderId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError("Pedido não encontrado");
        else setOrder(data as DriverOrder);
        setLoading(false);
      });

    const channel = supabase
      .channel(`driver-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_intents", filter: `id=eq.${orderId}` }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<DriverOrder>) } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  async function advanceStatus() {
    if (!order) return;
    const current = order.delivery_status ?? "pending";
    const currentIdx = STEPS.findIndex(s => s.status === current);
    if (currentIdx < 0 || currentIdx >= STEPS.length - 2) return;
    const next = STEPS[currentIdx + 1].status;
    const updates: Record<string, unknown> = { delivery_status: next };
    if (next === "picked_up") updates.delivery_picked_at = new Date().toISOString();
    if (next === "delivered") updates.delivery_completed_at = new Date().toISOString();
    setUpdating(true);
    const { error: err } = await supabase.from("order_intents").update(updates).eq("id", orderId);
    if (!err) setOrder(prev => prev ? { ...prev, delivery_status: next, ...updates } as DriverOrder : prev);
    else setError("Erro ao atualizar status");
    setUpdating(false);
  }

  async function markFailed() {
    if (!order) return;
    setUpdating(true);
    const { error: err } = await supabase.from("order_intents").update({ delivery_status: "failed" }).eq("id", orderId);
    if (!err) setOrder(prev => prev ? { ...prev, delivery_status: "failed" } : prev);
    else setError("Erro ao atualizar status");
    setUpdating(false);
  }

  const current = order?.delivery_status ?? "pending";
  const step = STEPS.find(s => s.status === current) ?? STEPS[0];
  const currentIdx = STEPS.findIndex(s => s.status === current);
  const canAdvance = currentIdx >= 0 && currentIdx < 4 && current !== "failed" && current !== "delivered";
  const color = STATUS_COLORS[current] ?? "#888";

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 16px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Portal do Entregador</div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>🛵 Pedido #{orderId.slice(-6).toUpperCase()}</div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 40px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 13 }}>Carregando pedido...</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
            <div style={{ color: "#f87171", fontWeight: 700 }}>{error}</div>
          </div>
        )}

        {order && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Status */}
            <div style={{ padding: "24px 20px", borderRadius: 18, textAlign: "center", background: `${color}0d`, border: `1px solid ${color}30` }}>
              <div style={{ fontSize: 48, marginBottom: 6 }}>{step.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{step.label}</div>
            </div>

            {/* Itens */}
            <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: 12 }}>Pedido</div>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{item.qty}× {item.code_name ?? `Item ${i + 1}`}{item.notes ? ` (${item.notes})` : ""}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{formatPrice(item.total)}</span>
                </div>
              ))}
              {order.notes && (
                <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", fontSize: 12, color: "#fbbf24" }}>⚠️ {order.notes}</div>
              )}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Total</span>
                <span style={{ color: "#fb923c", fontSize: 16 }}>{formatPrice(order.total)}</span>
              </div>
              {order.table_number != null && (
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Mesa {order.table_number}</div>
              )}
              {order.customer_address && (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>📍 {order.customer_address}</div>
              )}
            </div>

            {canAdvance && (
              <button
                disabled={updating}
                onClick={advanceStatus}
                style={{ width: "100%", padding: 18, borderRadius: 16, border: "none", background: color, color: "#000", fontSize: 16, fontWeight: 800, cursor: updating ? "not-allowed" : "pointer", opacity: updating ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <span>{step.nextIcon}</span>
                <span>{updating ? "Atualizando..." : step.nextLabel}</span>
              </button>
            )}

            {canAdvance && current !== "pending" && (
              <button
                disabled={updating}
                onClick={markFailed}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer" }}
              >
                ❌ Problema na entrega
              </button>
            )}

            {current === "delivered" && (
              <div style={{ textAlign: "center", padding: 12, color: "#00ffae", fontSize: 14, fontWeight: 700 }}>🎉 Entrega concluída! Obrigado.</div>
            )}
            {current === "failed" && (
              <div style={{ textAlign: "center", padding: 12, color: "#f87171", fontSize: 13, fontWeight: 600 }}>Entre em contato com o restaurante para resolver o problema.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slug portal (employee delivery hub) ──────────────────────────────────────

function SlugPortalView({ slug }: { slug: string }) {
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    const empName = localStorage.getItem("fy_employee_name") ?? "";
    if (!empId) { router.replace("/funcionario/login"); return; }
    setEmployeeName(empName);

    async function load() {
      const { data: unitData } = await supabase.from("units").select("id, name, slug, restaurant_id").eq("slug", slug).single();
      if (!unitData) { setLoading(false); return; }
      setUnit(unitData);
      const { data: orderData } = await supabase
        .from("order_intents")
        .select("id, table_number, items, total, status, delivery_status, notes, created_at, customer_name, customer_address")
        .eq("unit_id", unitData.id)
        .eq("status", "confirmed")
        .neq("delivery_status", "delivered")
        .order("created_at", { ascending: true });
      setOrders((orderData ?? []) as unknown as DriverOrder[]);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  async function markDelivered(orderId: string) {
    await supabase.from("order_intents").update({ delivery_status: "delivered" }).eq("id", orderId);
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      Carregando...
    </div>
  );

  if (!unit) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      Unidade não encontrada
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>🛵 Entregas</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{unit.name}{employeeName ? ` · ${employeeName}` : ""}</div>
        </div>
        <button
          onClick={() => { localStorage.removeItem("fy_employee_id"); localStorage.removeItem("fy_employee_name"); router.replace("/funcionario/login"); }}
          style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 10, fontWeight: 600 }}
        >
          Sair
        </button>
      </div>

      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛵</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma entrega pendente</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {orders.map((order) => (
              <div key={order.id} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{order.customer_name || `Pedido #${order.id.slice(-4).toUpperCase()}`}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fb923c" }}>{formatPrice(order.total)}</div>
                </div>
                {order.customer_address && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>📍 {order.customer_address}</div>
                )}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
                  {(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? "s" : ""}
                  {order.notes ? ` · ${order.notes}` : ""}
                </div>
                <button
                  onClick={() => markDelivered(order.id)}
                  style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", cursor: "pointer", background: "rgba(251,146,60,0.1)", color: "#fb923c", fontSize: 13, fontWeight: 700, boxShadow: "0 1px 0 rgba(251,146,60,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}
                >
                  ✅ Marcar como entregue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function EntregaParamPage() {
  const { param } = useParams<{ param: string }>();
  const paramValue = param as string;
  if (UUID_RE.test(paramValue)) return <OrderDetailView orderId={paramValue} />;
  return <SlugPortalView slug={paramValue} />;
}
