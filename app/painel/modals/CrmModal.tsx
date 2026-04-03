"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function CrmModal({ unit, restaurant }: { unit: any; restaurant: any }) {
  const [tab, setTab] = useState<"clientes" | "pedidos" | "frequencia">("clientes");
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Buscar clientes únicos dos pedidos
      const { data: orders } = await supabase
        .from("order_intents")
        .select("customer_name, customer_phone, total, created_at, status")
        .eq("unit_id", unit.id)
        .order("created_at", { ascending: false });

      if (orders) {
        // Agrupar por telefone/nome
        const map = new Map<string, { name: string; phone: string; orders: number; total: number; lastOrder: string }>();
        for (const o of orders) {
          const key = o.customer_phone || o.customer_name || "anon";
          const existing = map.get(key);
          if (existing) {
            existing.orders++;
            existing.total += parseFloat(o.total || "0");
          } else {
            map.set(key, {
              name: o.customer_name || "Cliente anônimo",
              phone: o.customer_phone || "",
              orders: 1,
              total: parseFloat(o.total || "0"),
              lastOrder: o.created_at,
            });
          }
        }
        setClients(Array.from(map.values()).sort((a, b) => b.orders - a.orders));
      }
      setLoading(false);
    }
    load();
  }, [unit.id]);

  function fmtBRL(val: number) {
    return `R$ ${(val / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "clientes", label: "Clientes" },
          { key: "pedidos", label: "Top Clientes" },
          { key: "frequencia", label: "Frequência" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "rgba(0,255,174,0.1)" : "transparent",
            color: tab === t.key ? "#00ffae" : "rgba(255,255,255,0.4)",
            fontSize: 13, fontWeight: 600, transition: "all 0.2s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>Carregando...</div>
      ) : (
        <>
          {/* Tab Clientes */}
          {tab === "clientes" && (
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{clients.length} cliente{clients.length !== 1 ? "s" : ""}</div>
              {clients.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.2)" }}>
                  Nenhum cliente registrado ainda. Os clientes aparecem aqui quando fazem pedidos.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {clients.slice(0, 50).map((c, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px", borderRadius: 14,
                      background: "rgba(255,255,255,0.03)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                    }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>
                          {c.phone || "Sem telefone"} · {c.orders} pedido{c.orders !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#00ffae", fontSize: 14, fontWeight: 700 }}>{fmtBRL(c.total)}</div>
                        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
                          {new Date(c.lastOrder).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Top Clientes */}
          {tab === "pedidos" && (
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Clientes que mais compraram</div>
              {clients.slice(0, 10).map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: i < 3 ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                    color: i < 3 ? "#00ffae" : "rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{c.orders} pedidos</div>
                  </div>
                  <div style={{ color: "#00ffae", fontSize: 14, fontWeight: 700 }}>{fmtBRL(c.total)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Frequência */}
          {tab === "frequencia" && (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.2)" }}>
              Análise de frequência será implementada com mais dados.
            </div>
          )}
        </>
      )}
    </div>
  );
}
