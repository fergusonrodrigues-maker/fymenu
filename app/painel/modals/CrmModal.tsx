"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function CrmMessagesTab({ unit, clients }: { unit: any; clients: any[] }) {
  const [messageText, setMessageText] = useState("");
  const [targetGroup, setTargetGroup] = useState("all");
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("crm_messages")
      .select("*")
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setSentMessages(data);
      });
  }, [unit.id]);

  const targetClients = clients.filter(c => {
    if (!c.phone) return false;
    if (targetGroup === "all") return true;
    if (targetGroup === "inactive") return c.daysSinceLastOrder > 30;
    if (targetGroup === "loyal") return c.orders >= 5;
    if (targetGroup === "new") return c.orders === 1;
    return true;
  });

  async function handleSendMessages() {
    if (!messageText.trim() || targetClients.length === 0) return;
    setSending(true);

    const inserts = targetClients.map(c => ({
      unit_id: unit.id,
      type: "whatsapp",
      recipient_phone: c.phone,
      recipient_name: c.name,
      message: messageText,
      status: "pending",
      campaign_name: `${targetGroup} — ${new Date().toLocaleDateString("pt-BR")}`,
    }));

    const { error } = await supabase.from("crm_messages").insert(inserts);
    if (!error) {
      setMessageText("");
      const { data } = await supabase
        .from("crm_messages")
        .select("*")
        .eq("unit_id", unit.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setSentMessages(data);
    }
    setSending(false);
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Disparo de mensagens</div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 6 }}>Público alvo</label>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "Todos" },
            { key: "inactive", label: "Inativos (30d+)" },
            { key: "loyal", label: "Fiéis (5+ pedidos)" },
            { key: "new", label: "Novos (1 pedido)" },
          ].map(g => (
            <button key={g.key} onClick={() => setTargetGroup(g.key)} style={{
              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: targetGroup === g.key ? "rgba(0,255,174,0.1)" : "var(--dash-card-hover)",
              color: targetGroup === g.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 11, fontWeight: 600,
            }}>{g.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 6 }}>
          {targetClients.length} clientes com telefone neste grupo
        </div>
      </div>

      <textarea
        placeholder="Escreva sua mensagem (ex: Oi {nome}! Sentimos sua falta...)"
        value={messageText}
        onChange={e => setMessageText(e.target.value)}
        style={{
          width: "100%", minHeight: 80, padding: 14, borderRadius: 14,
          background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)",
          fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
      />
      <div style={{ fontSize: 9, color: "var(--dash-text-muted)", marginTop: 4 }}>
        Use {"{nome}"} pra personalizar com o nome do cliente
      </div>

      <button
        onClick={handleSendMessages}
        disabled={sending || !messageText.trim() || targetClients.length === 0}
        style={{
          width: "100%", padding: 12, borderRadius: 14, marginTop: 10, border: "none", cursor: "pointer",
          background: "rgba(37,211,102,0.1)", color: "#25d366", fontSize: 13, fontWeight: 800,
          opacity: sending || !messageText.trim() ? 0.5 : 1,
        }}
      >
        {sending ? "Preparando..." : `📱 Preparar ${targetClients.length} mensagens`}
      </button>

      <div style={{ fontSize: 10, color: "rgba(251,191,36,0.6)", marginTop: 6 }}>
        ⚠️ As mensagens serão preparadas pra envio via WhatsApp Web. Integração direta com WhatsApp Business API em breve.
      </div>

      {sentMessages.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)", marginBottom: 8 }}>Histórico</div>
          {sentMessages.slice(0, 20).map(m => (
            <div key={m.id} style={{
              padding: "8px 12px", borderRadius: 10, background: "var(--dash-card)", marginBottom: 3,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ color: "var(--dash-text)", fontSize: 11, fontWeight: 600 }}>{m.recipient_name}</div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 9 }}>{m.message?.slice(0, 50)}...</div>
              </div>
              <span style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                background: m.status === "sent" ? "rgba(0,255,174,0.1)" : m.status === "failed" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                color: m.status === "sent" ? "var(--dash-accent)" : m.status === "failed" ? "#f87171" : "#fbbf24",
              }}>
                {m.status === "sent" ? "Enviado" : m.status === "failed" ? "Falhou" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CrmModal({ unit, restaurant }: { unit: any; restaurant: any }) {
  const [tab, setTab] = useState<"clientes" | "frequencia" | "delivery" | "mensagens">("clientes");
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "orders" | "recent">("total");

  const isBusiness = restaurant?.plan === "business";

  useEffect(() => { loadData(); }, [unit.id]);

  async function loadData() {
    setLoading(true);
    const [{ data: ord }, { data: _rev }] = await Promise.all([
      supabase
        .from("order_intents")
        .select("customer_name, customer_phone, total, items, source, table_number, delivery_neighborhood, created_at")
        .eq("unit_id", unit.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("reviews")
        .select("customer_name, restaurant_rating, waiter_rating, created_at")
        .eq("unit_id", unit.id),
    ]);

    if (ord) setOrders(ord);

    const map = new Map<string, any>();
    for (const o of ord || []) {
      const key = o.customer_phone || o.customer_name || "anon-" + o.created_at;
      const existing = map.get(key);
      const val = parseFloat(o.total || "0");
      const items = Array.isArray(o.items) ? o.items : [];

      if (existing) {
        existing.orders++;
        existing.total += val;
        existing.items.push(...items);
        if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
        if (o.created_at < existing.firstOrder) existing.firstOrder = o.created_at;
        if (o.source) existing.sources.add(o.source);
        if (o.delivery_neighborhood) existing.neighborhoods.add(o.delivery_neighborhood);
      } else {
        map.set(key, {
          name: o.customer_name || "Cliente anônimo",
          phone: o.customer_phone || "",
          orders: 1,
          total: val,
          items: [...items],
          lastOrder: o.created_at,
          firstOrder: o.created_at,
          sources: new Set(o.source ? [o.source] : []),
          neighborhoods: new Set(o.delivery_neighborhood ? [o.delivery_neighborhood] : []),
        });
      }
    }

    const clientList = Array.from(map.values()).map(c => {
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(c.lastOrder).getTime()) / (1000 * 60 * 60 * 24)
      );
      const ticketMedio = c.orders > 0 ? c.total / c.orders : 0;

      const itemCounts: Record<string, number> = {};
      for (const item of c.items) {
        const name = item.name || "?";
        itemCounts[name] = (itemCounts[name] || 0) + (item.qty || 1);
      }
      const topItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => ({ name, qty }));

      return {
        ...c,
        sources: Array.from(c.sources),
        neighborhoods: Array.from(c.neighborhoods),
        daysSinceLastOrder,
        ticketMedio,
        topItems,
      };
    });

    setClients(clientList);
    setLoading(false);
  }

  const filtered = clients
    .filter(c => {
      if (!searchQuery) return true;
      return (
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
      );
    })
    .sort((a, b) => {
      if (sortBy === "total") return b.total - a.total;
      if (sortBy === "orders") return b.orders - a.orders;
      return new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime();
    });

  const totalClients = clients.length;
  const totalRevenue = clients.reduce((s, c) => s + c.total, 0);
  const totalOrdersCount = clients.reduce((s, c) => s + c.orders, 0);
  const avgTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const returningClients = clients.filter(c => c.orders > 1).length;
  const returnRate = totalClients > 0 ? ((returningClients / totalClients) * 100).toFixed(1) : "0";
  const inactiveClients = clients.filter(c => c.daysSinceLastOrder > 30);

  const neighborhoodCounts: Record<string, { count: number; revenue: number }> = {};
  for (const c of clients) {
    for (const n of c.neighborhoods) {
      if (!neighborhoodCounts[n]) neighborhoodCounts[n] = { count: 0, revenue: 0 };
      neighborhoodCounts[n].count += c.orders;
      neighborhoodCounts[n].revenue += c.total;
    }
  }
  const topNeighborhoods = Object.entries(neighborhoodCounts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10);

  const globalItemCounts: Record<string, number> = {};
  for (const o of orders) {
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      const name = item.name || "?";
      globalItemCounts[name] = (globalItemCounts[name] || 0) + (item.qty || 1);
    }
  }
  const topGlobalItems = Object.entries(globalItemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const isCentavos = clients.some(c => c.total > 10000);
  function fmt(v: number) {
    if (isCentavos) return `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    return `R$ ${v.toFixed(2).replace(".", ",")}`;
  }

  const TABS = [
    { key: "clientes", label: "Clientes" },
    { key: "frequencia", label: "Frequência" },
    { key: "delivery", label: "Delivery" },
    ...(isBusiness ? [{ key: "mensagens", label: "Mensagens" }] : []),
  ];

  const cardStyle: React.CSSProperties = {
    padding: 12, borderRadius: 14, background: "var(--dash-card)", textAlign: "center",
    boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
  };

  return (
    <div>
      {/* Resumo cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-accent)" }}>{totalClients}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Clientes</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-text)" }}>{fmt(avgTicket)}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Ticket médio</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-accent)" }}>{returnRate}%</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Recorrência</div>
        </div>
        <div style={{
          ...cardStyle,
          background: inactiveClients.length > 0 ? "rgba(248,113,113,0.06)" : "var(--dash-card)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: inactiveClients.length > 0 ? "#f87171" : "var(--dash-text)" }}>
            {inactiveClients.length}
          </div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Inativos (30d+)</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--dash-card-hover)", borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "rgba(0,255,174,0.1)" : "transparent",
            color: tab === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
            fontSize: 12, fontWeight: 600,
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Carregando...</div>
      ) : (
        <>
          {/* === TAB CLIENTES === */}
          {tab === "clientes" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  placeholder="Buscar cliente..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10,
                    background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
                    color: "var(--dash-text)", fontSize: 12, outline: "none", transition: "border-color 0.2s",
                  }}
                />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  style={{
                    padding: "8px 10px", borderRadius: 10,
                    background: "var(--dash-card-hover)", border: "none",
                    color: "var(--dash-text)", fontSize: 11, outline: "none",
                  }}
                >
                  <option value="total">Maior gasto</option>
                  <option value="orders">Mais pedidos</option>
                  <option value="recent">Mais recente</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--dash-text-muted)", fontSize: 12 }}>
                  Nenhum cliente encontrado.
                </div>
              ) : (
                filtered.slice(0, 50).map((c, i) => (
                  <div key={i} style={{
                    padding: "12px 14px", borderRadius: 14, background: "var(--dash-card)", marginBottom: 6,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                          {c.sources.map((s: string) => (
                            <span key={s} style={{
                              padding: "1px 6px", borderRadius: 4, fontSize: 8,
                              background: s === "whatsapp" ? "rgba(37,211,102,0.1)" : s === "mesa" ? "rgba(96,165,250,0.1)" : "var(--dash-card-hover)",
                              color: s === "whatsapp" ? "#25d366" : s === "mesa" ? "#60a5fa" : "var(--dash-text-muted)",
                            }}>{s}</span>
                          ))}
                        </div>
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 3 }}>
                          {c.phone || "Sem telefone"} · {c.orders} pedido{c.orders > 1 ? "s" : ""} · último há {c.daysSinceLastOrder}d
                        </div>
                        {c.topItems.length > 0 && (
                          <div style={{ color: "var(--dash-text-subtle)", fontSize: 9, marginTop: 2 }}>
                            Favoritos: {c.topItems.map((it: any) => `${it.name} (${it.qty}x)`).join(", ")}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--dash-accent)", fontSize: 14, fontWeight: 800 }}>{fmt(c.total)}</div>
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>TM: {fmt(c.ticketMedio)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* === TAB FREQUÊNCIA === */}
          {tab === "frequencia" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Segmentação por frequência</div>
              {[
                { label: "Fiéis (5+ pedidos)", filter: (c: any) => c.orders >= 5, color: "var(--dash-accent)", icon: "💎" },
                { label: "Recorrentes (2-4 pedidos)", filter: (c: any) => c.orders >= 2 && c.orders < 5, color: "#60a5fa", icon: "🔄" },
                { label: "Novos (1 pedido)", filter: (c: any) => c.orders === 1, color: "#fbbf24", icon: "🆕" },
                { label: "Inativos (30d+ sem pedir)", filter: (c: any) => c.daysSinceLastOrder > 30, color: "#f87171", icon: "💤" },
                { label: "Perdidos (90d+ sem pedir)", filter: (c: any) => c.daysSinceLastOrder > 90, color: "var(--dash-text-muted)", icon: "👋" },
              ].map(segment => {
                const segClients = clients.filter(segment.filter);
                const segRevenue = segClients.reduce((s, c) => s + c.total, 0);
                return (
                  <div key={segment.label} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                    borderRadius: 14, background: "var(--dash-card)", marginBottom: 6,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                  }}>
                    <span style={{ fontSize: 20 }}>{segment.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{segment.label}</div>
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 2 }}>
                        {segClients.length} clientes · {fmt(segRevenue)} faturado
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: segment.color }}>{segClients.length}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* === TAB DELIVERY === */}
          {tab === "delivery" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Bairros com mais pedidos</div>
              {topNeighborhoods.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--dash-text-muted)", fontSize: 12 }}>
                  Sem dados de bairro nos pedidos.
                </div>
              ) : (
                topNeighborhoods.map(([name, data], i) => (
                  <div key={name} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderRadius: 12, background: "var(--dash-card)", marginBottom: 4,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: i < 3 ? "rgba(0,255,174,0.1)" : "var(--dash-card-hover)",
                      color: i < 3 ? "var(--dash-accent)" : "var(--dash-text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600 }}>{name}</div>
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>{data.count} pedidos</div>
                    </div>
                    <div style={{ color: "var(--dash-accent)", fontSize: 13, fontWeight: 700 }}>{fmt(data.revenue)}</div>
                  </div>
                ))
              )}

              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginTop: 20, marginBottom: 12 }}>Itens mais pedidos</div>
              {topGlobalItems.map(([name, qty], i) => (
                <div key={name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 10, background: "var(--dash-card)", marginBottom: 3,
                }}>
                  <span style={{ color: "var(--dash-text)", fontSize: 12 }}>{i + 1}. {name}</span>
                  <span style={{ color: "var(--dash-accent)", fontSize: 12, fontWeight: 700 }}>{qty}x</span>
                </div>
              ))}
            </div>
          )}

          {/* === TAB MENSAGENS (Business only) === */}
          {tab === "mensagens" && (
            <CrmMessagesTab unit={unit} clients={clients} />
          )}
        </>
      )}
    </div>
  );
}
