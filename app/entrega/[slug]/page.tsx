"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Order = {
  id: string;
  table_number: number | null;
  items: any[];
  total: number;
  status: string;
  delivery_status: string | null;
  notes: string | null;
  created_at: string;
  customer_name?: string;
  customer_address?: string;
};

export default function EntregaSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    const empName = localStorage.getItem("fy_employee_name") ?? "";
    if (!empId) { router.replace("/funcionario/login"); return; }
    setEmployeeName(empName);

    async function load() {
      const { data: unitData } = await supabase
        .from("units")
        .select("id, name, slug, restaurant_id")
        .eq("slug", slug)
        .single();

      if (!unitData) { setLoading(false); return; }
      setUnit(unitData);

      const { data: orderData } = await supabase
        .from("order_intents")
        .select("id, table_number, items, total, status, delivery_status, notes, created_at, customer_name, customer_address")
        .eq("unit_id", unitData.id)
        .eq("status", "confirmed")
        .neq("delivery_status", "delivered")
        .order("created_at", { ascending: true });

      setOrders(orderData ?? []);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  async function markDelivered(orderId: string) {
    await supabase
      .from("order_intents")
      .update({ delivery_status: "delivered" })
      .eq("id", orderId);
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)" }}>
      Carregando...
    </div>
  );

  if (!unit) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
      Unidade não encontrada
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>🛵 Entregas</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{unit.name} · {employeeName}</div>
        </div>
        <button
          onClick={() => { localStorage.removeItem("fy_employee_id"); localStorage.removeItem("fy_employee_name"); router.replace("/funcionario/login"); }}
          style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(248,113,113,0.06)", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer" }}
        >
          Sair
        </button>
      </div>

      {/* Orders */}
      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
            Nenhum pedido pendente para entrega
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {orders.map((order) => (
              <div key={order.id} style={{
                padding: 16, borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {order.customer_name || `Pedido #${order.id.slice(-4)}`}
                  </div>
                  <div style={{ fontSize: 13, color: "#00ffae", fontWeight: 700 }}>
                    R$ {(order.total / 100).toFixed(2)}
                  </div>
                </div>
                {order.customer_address && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                    📍 {order.customer_address}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
                  {(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? "s" : ""}
                  {order.notes && ` · ${order.notes}`}
                </div>
                <button
                  onClick={() => markDelivered(order.id)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 10, border: "none",
                    background: "rgba(0,255,174,0.08)", color: "#00ffae",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
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
