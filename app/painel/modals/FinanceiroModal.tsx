"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Unit, Restaurant, ReportData, ReportProduct, ReportPayments, DayData } from "../types";

const supabase = createClient();

function formatBRL(cents: number) {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function pctOf(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function downloadReportCSV(data: ReportProduct[], filename: string) {
  const header = "Produto,Quantidade,Faturamento (R$)\n";
  const rows = data.map((p) => `"${p.name}",${p.qty},${(p.revenue / 100).toFixed(2)}`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportPaymentBars({ payments }: { payments: ReportPayments }) {
  const total = payments.cash + payments.card + payments.pix;
  const bars = [
    { label: "💵 Dinheiro", value: payments.cash, color: "rgb(22,163,74)" },
    { label: "💳 Cartão", value: payments.card, color: "rgb(37,99,235)" },
    { label: "📲 PIX", value: payments.pix, color: "rgb(124,58,237)" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bars.map((b) => (
        <div key={b.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: "var(--dash-text-secondary)" }}>{b.label}</span>
            <span style={{ color: "var(--dash-text-muted)" }}>{formatBRL(b.value)} <span style={{ color: "var(--dash-text-subtle)" }}>({pctOf(b.value, total)}%)</span></span>
          </div>
          <div style={{ height: 5, background: "var(--dash-card-border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctOf(b.value, total)}%`, background: b.color, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
        </div>
      ))}
      {total === 0 && <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>Nenhum pagamento registrado.</div>}
    </div>
  );
}

function ReportProductList({ products }: { products: ReportProduct[] }) {
  if (products.length === 0) return <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>Nenhum produto no período.</div>;
  const maxQty = products[0]?.qty ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {products.map((p, i) => (
        <div key={p.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: "var(--dash-text-secondary)" }}><span style={{ color: "var(--dash-text-subtle)", marginRight: 4 }}>#{i + 1}</span> {p.name}</span>
            <span style={{ color: "var(--dash-text-muted)" }}>{p.qty}×</span>
          </div>
          <div style={{ height: 4, background: "var(--dash-card-border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(p.qty / maxQty) * 100}%`, background: "rgb(124,58,237)", borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportBarChart({ data, valueKey, color, formatter }: {
  data: DayData[]; valueKey: "orders" | "revenue"; color: string; formatter: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
        {data.map((d) => {
          const h = Math.max((d[valueKey] / max) * 100, 3);
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              <div style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "3px 3px 0 0", transition: "height 0.3s ease", minHeight: 2 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
        {data.map((d) => {
          const [, m, dd] = d.date.split("-");
          return <div key={d.date} style={{ flex: 1, textAlign: "center", color: "var(--dash-text-subtle)", fontSize: 8 }}>{dd}/{m}</div>;
        })}
      </div>
    </div>
  );
}

function ReportGrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "var(--dash-text-subtle)", fontSize: 10 }}>—</span>;
  const up = value >= 0;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: up ? "rgba(0,255,174,0.1)" : "rgba(248,113,113,0.1)",
      color: up ? "#00ffae" : "#f87171",
    }}>
      {up ? "+" : ""}{value}%
    </span>
  );
}

const PLAN_FEATURES: Record<string, string[]> = {
  menu: ["whatsapp_revenue"],
  menupro: ["whatsapp_revenue", "delivery_revenue", "mesa_revenue", "split_view"],
  business: ["whatsapp_revenue", "delivery_revenue", "mesa_revenue", "split_view", "costs", "balance", "daily_goal", "ai_report", "import"],
};

function getSource(order: any): string {
  if (order.source) return order.source;
  if (order.table_number && order.table_number > 0) return "mesa";
  if (order.whatsapp_link) return "whatsapp";
  return "delivery";
}

export default function FinanceiroModal({ unit, analytics, reportData, restaurant, onOpenPlano }: {
  unit: Unit | null;
  analytics: { views: number; clicks: number; orders: number };
  reportData: ReportData;
  restaurant: Restaurant;
  onOpenPlano: () => void;
}) {
  const hasFeature = (feature: string) => {
    const plan = restaurant?.plan || "menu";
    return PLAN_FEATURES[plan]?.includes(feature) || false;
  };

  const ALL_TABS = [
    { key: "resumo" as const, label: "Resumo" },
    { key: "diario" as const, label: "Diário" },
    { key: "semanal" as const, label: "Semanal" },
    { key: "mensal" as const, label: "Mensal" },
    { key: "produtos" as const, label: "Produtos" },
    { key: "custos" as const, label: "Custos" },
    { key: "analise" as const, label: "Análise" },
  ];

  const TABS = ALL_TABS.filter((t) => {
    if (t.key === "custos") return hasFeature("costs");
    if (t.key === "analise") return hasFeature("ai_report");
    return true;
  });

  const [tab, setTab] = useState<typeof ALL_TABS[number]["key"]>("resumo");

  // Expenses state
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("geral");
  const [expenseRecurring, setExpenseRecurring] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [financeAI, setFinanceAI] = useState<string | null>(null);
  const [generatingFinanceAI, setGeneratingFinanceAI] = useState(false);

  // Resumo state
  const [revenueBySource, setRevenueBySource] = useState<Record<string, number>>({ whatsapp: 0, mesa: 0, delivery: 0, ifood: 0, comanda: 0, manual: 0 });
  const [ordersBySource, setOrdersBySource] = useState<Record<string, number>>({ whatsapp: 0, mesa: 0, delivery: 0, ifood: 0, comanda: 0, manual: 0 });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [employeeCosts, setEmployeeCosts] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [paymentMethodsMap, setPaymentMethodsMap] = useState<Record<string, number>>({});
  const [showImportFinance, setShowImportFinance] = useState(false);

  useEffect(() => {
    if (!unit?.id) return;

    // Load expenses
    supabase.from("business_expenses").select("*").eq("unit_id", unit.id).order("date", { ascending: false })
      .then(({ data }) => { if (data) setExpenses(data); });

    // Load resumo data
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    supabase
      .from("order_intents")
      .select("total, source, payment_method, table_number, whatsapp_link, created_at")
      .eq("unit_id", unit.id)
      .eq("status", "confirmed")
      .gte("created_at", monthStart)
      .then(({ data: orders }) => {
        const revBySrc: Record<string, number> = { whatsapp: 0, mesa: 0, delivery: 0, ifood: 0, comanda: 0, manual: 0 };
        const ordBySrc: Record<string, number> = { whatsapp: 0, mesa: 0, delivery: 0, ifood: 0, comanda: 0, manual: 0 };
        let totRev = 0;
        let totOrd = 0;
        let todayRev = 0;
        const pmMap: Record<string, number> = {};

        for (const o of orders || []) {
          const src = getSource(o);
          const val = Number(o.total || 0);
          revBySrc[src] = (revBySrc[src] || 0) + val;
          ordBySrc[src] = (ordBySrc[src] || 0) + 1;
          totRev += val;
          totOrd++;
          if (o.created_at >= todayStart) todayRev += val;
          const method = o.payment_method || "none";
          pmMap[method] = (pmMap[method] || 0) + val;
        }

        setRevenueBySource(revBySrc);
        setOrdersBySource(ordBySrc);
        setTotalRevenue(totRev);
        setTotalOrders(totOrd);
        setTodayRevenue(todayRev);
        setPaymentMethodsMap(pmMap);
      });

    // Load employees
    supabase
      .from("employees")
      .select("salary, extra_costs")
      .eq("unit_id", unit.id)
      .eq("is_active", true)
      .then(({ data: emps }) => {
        const cost = (emps || []).reduce((s, e) => s + (e.salary || 0) + (e.extra_costs || 0), 0);
        setEmployeeCosts(cost);
      });

    // Load daily goal from units
    supabase
      .from("units")
      .select("daily_revenue_goal")
      .eq("id", unit.id)
      .single()
      .then(({ data }) => {
        if (data?.daily_revenue_goal) setDailyGoal(data.daily_revenue_goal);
      });
  }, [unit?.id]);

  // Calculations
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalExpensesThisMonth = expenses
    .filter(e => e.date?.startsWith(thisMonth) || e.is_recurring)
    .reduce((s, e) => s + e.amount, 0);

  const totalCosts = totalExpensesThisMonth + employeeCosts;
  const totalRevenueThisMonth = reportData.monthly.revenue;
  const profit = totalRevenueThisMonth - totalCosts;

  const expensesByCategory = expenses.reduce((acc: Record<string, any[]>, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

  async function handleAddExpense() {
    if (!expenseName || !expenseAmount || !unit?.id) return;
    const { data, error } = await supabase.from("business_expenses").insert({
      unit_id: unit.id,
      name: expenseName,
      category: expenseCategory,
      amount: Math.round(parseFloat(expenseAmount) * 100),
      is_recurring: expenseRecurring,
      recurrence: expenseRecurring ? "monthly" : "one_time",
      date: expenseDate,
    }).select().single();
    if (!error && data) {
      setExpenses(prev => [data, ...prev]);
      setExpenseName(""); setExpenseAmount(""); setExpenseCategory("geral");
      setExpenseRecurring(false); setShowExpenseForm(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    await supabase.from("business_expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function handleFinanceAI() {
    setGeneratingFinanceAI(true);
    try {
      const res = await fetch("/api/ia/finance-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue: totalRevenueThisMonth,
          expenses: totalCosts,
          profit,
          expensesByCategory: Object.entries(expensesByCategory).map(([cat, items]) => ({
            category: cat,
            total: (items as any[]).reduce((s: number, e: any) => s + e.amount, 0),
            count: (items as any[]).length,
          })),
          totalOrders: reportData.monthly.orders,
        }),
      });
      const json = await res.json();
      if (res.ok) setFinanceAI(json.analysis);
    } catch (err) { console.error(err); }
    finally { setGeneratingFinanceAI(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>

      {/* ── Tab Bar ── */}
      <div style={{
        display: "flex", gap: 3, padding: 3,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        border: "1px solid var(--dash-card-border)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 11,
              border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: tab === t.key ? 700 : 500,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              minWidth: 0,
              color: tab === t.key ? "#000" : "var(--dash-text-muted)",
              background: tab === t.key ? "var(--dash-accent-gradient)" : "transparent",
              transition: "all 0.25s ease",
              textShadow: tab === t.key ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── RESUMO ── */}
      {tab === "resumo" && (
        <div>
          {/* Receita do mês */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Receita do mês</div>

          {/* Card receita total */}
          <div style={{ padding: 16, borderRadius: 14, background: "rgba(0,255,174,0.06)", marginBottom: 12, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Receita total</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--dash-accent)", marginTop: 4 }}>{formatBRL(totalRevenue)}</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 4 }}>{totalOrders} pedidos</div>
          </div>

          {/* Breakdown por fonte */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {/* WhatsApp — sempre visível */}
            <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{formatBRL(revenueBySource.whatsapp)}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>WhatsApp</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{ordersBySource.whatsapp} pedidos</div>
            </div>

            {/* Mesa — menupro+ */}
            {hasFeature("mesa_revenue") ? (
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🍽️</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{formatBRL(revenueBySource.mesa)}</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Mesa</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{ordersBySource.mesa} pedidos</div>
              </div>
            ) : (
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Mesa</div>
                <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>MenuPro</div>
              </div>
            )}

            {/* Delivery — menupro+ */}
            {hasFeature("delivery_revenue") ? (
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🛵</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{formatBRL(revenueBySource.delivery)}</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Delivery</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{ordersBySource.delivery} pedidos</div>
              </div>
            ) : (
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Delivery</div>
                <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>MenuPro</div>
              </div>
            )}
          </div>

          {/* Meta diária — business only */}
          {hasFeature("daily_goal") && (
            <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 16, boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>Meta de hoje</span>
                <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>{formatBRL(todayRevenue)} / {dailyGoal > 0 ? formatBRL(dailyGoal) : "—"}</span>
              </div>
              {dailyGoal > 0 && (
                <>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${Math.min((todayRevenue / dailyGoal) * 100, 100)}%`,
                      background: todayRevenue >= dailyGoal ? "var(--dash-accent)" : "linear-gradient(90deg, rgba(251,191,36,0.5), rgba(251,191,36,0.8))",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  {todayRevenue >= dailyGoal && (
                    <div style={{ fontSize: 11, color: "var(--dash-accent)", marginTop: 6, fontWeight: 700 }}>Meta atingida! 🎉</div>
                  )}
                </>
              )}
              {/* Campo para configurar meta */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Meta diária:</span>
                <input
                  type="number"
                  placeholder="Ex: 5000"
                  defaultValue={dailyGoal > 0 ? dailyGoal / 100 : ""}
                  onBlur={async (e) => {
                    const val = Math.round(parseFloat(e.target.value || "0") * 100);
                    await supabase.from("units").update({ daily_revenue_goal: val }).eq("id", unit!.id);
                    setDailyGoal(val);
                  }}
                  style={{
                    width: 100, padding: "6px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.04)", border: "none",
                    color: "var(--dash-text)", fontSize: 13, outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Balanço — business only */}
          {hasFeature("balance") && (
            <div style={{ padding: 16, borderRadius: 14, background: profit >= 0 ? "rgba(0,255,174,0.04)" : "rgba(248,113,113,0.04)", marginBottom: 16, boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Balanço do mês</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>{formatBRL(totalRevenue)}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Receita</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#f87171" }}>{formatBRL(totalCosts)}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Custos</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: profit >= 0 ? "var(--dash-accent)" : "#f87171" }}>
                    {profit >= 0 ? "+" : ""}{formatBRL(profit)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{profit >= 0 ? "Lucro" : "Prejuízo"}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${Math.min((totalRevenue / (totalCosts || 1)) * 100, 100)}%`,
                    background: totalRevenue >= totalCosts
                      ? "linear-gradient(90deg, rgba(0,255,174,0.4), rgba(0,255,174,0.7))"
                      : "linear-gradient(90deg, rgba(251,191,36,0.4), rgba(248,113,113,0.6))",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 4 }}>
                  {totalRevenue >= totalCosts ? "Break-even atingido" : `Faltam ${formatBRL(totalCosts - totalRevenue)} para break-even`}
                </div>
              </div>
            </div>
          )}

          {/* Métodos de pagamento */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)", marginBottom: 8 }}>Pagamentos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {Object.entries(paymentMethodsMap).length === 0 ? (
              <div style={{ gridColumn: "1/-1", color: "var(--dash-text-muted)", fontSize: 12 }}>Nenhum pagamento registrado.</div>
            ) : (
              Object.entries(paymentMethodsMap).map(([method, amount]) => (
                <div key={method} style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)" }}>{formatBRL(amount as number)}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>
                    {method === "pix" ? "PIX" : method === "card" ? "Cartão" : method === "cash" ? "Dinheiro" : method === "none" ? "N/I" : method}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Botão importar — business only */}
          {hasFeature("import") && (
            <button onClick={() => setShowImportFinance(true)} style={{
              width: "100%", padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.04)", color: "var(--dash-text-muted)", fontSize: 13,
              boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            }}>
              📥 Importar dados financeiros
            </button>
          )}
        </div>
      )}

      {/* ── DIÁRIO ── */}
      {tab === "diario" && (
        <>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
            ☀️ {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "📦", label: "Pedidos", value: String(reportData.today.orders), color: "#00ffae" },
              { icon: "✅", label: "Entregues", value: String(reportData.today.completed), color: "#60a5fa" },
              { icon: "💰", label: "Receita", value: formatBRL(reportData.today.revenue), color: "#fbbf24" },
              { icon: "🎯", label: "Ticket Médio", value: formatBRL(reportData.today.avgTicket), color: "#f472b6" },
            ].map((s) => (
              <div key={s.label} className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>💳 Pagamentos</div>
              <ReportPaymentBars payments={reportData.today.payments} />
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🏆 Top Produtos</div>
              <ReportProductList products={reportData.today.products.slice(0, 5)} />
            </div>
          </div>
          <button
            onClick={() => downloadReportCSV(reportData.today.products, `relatorio-diario-${new Date().toISOString().split("T")[0]}.csv`)}
            style={{ alignSelf: "flex-end", padding: "8px 16px", borderRadius: 10, border: "1px solid var(--dash-card-border)", background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            📥 Baixar CSV
          </button>
        </>
      )}

      {/* ── SEMANAL ── */}
      {tab === "semanal" && (
        <>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>📈 Últimos 7 Dias</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "📦", label: "Pedidos", value: String(reportData.weekly.orders), color: "#00ffae" },
              { icon: "✅", label: "Entregues", value: String(reportData.weekly.completed), color: "#60a5fa" },
              { icon: "💰", label: "Receita", value: formatBRL(reportData.weekly.revenue), color: "#fbbf24" },
              { icon: "🎯", label: "Ticket Médio", value: formatBRL(reportData.weekly.avgTicket), color: "#f472b6" },
            ].map((s) => (
              <div key={s.label} className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
            <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>📦 Pedidos por Dia</div>
            <ReportBarChart data={reportData.weekly.byDay} valueKey="orders" color="#60a5fa" formatter={String} />
          </div>
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
            <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>💰 Receita por Dia</div>
            <ReportBarChart data={reportData.weekly.byDay} valueKey="revenue" color="#22c55e" formatter={formatBRL} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>💳 Pagamentos</div>
              <ReportPaymentBars payments={reportData.weekly.payments} />
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🏆 Top 7d</div>
              <ReportProductList products={reportData.weekly.products.slice(0, 5)} />
            </div>
          </div>
          <button
            onClick={() => downloadReportCSV(reportData.weekly.products, `relatorio-semanal.csv`)}
            style={{ alignSelf: "flex-end", padding: "8px 16px", borderRadius: 10, border: "1px solid var(--dash-card-border)", background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            📥 Baixar CSV
          </button>
        </>
      )}

      {/* ── MENSAL ── */}
      {tab === "mensal" && (
        <>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>📅 Últimos 30 Dias</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>📦</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "#00ffae", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{reportData.monthly.orders}</span>
                <ReportGrowthBadge value={reportData.monthly.growthOrders} />
              </div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>Pedidos</div>
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>💰</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "#fbbf24", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{formatBRL(reportData.monthly.revenue)}</span>
                <ReportGrowthBadge value={reportData.monthly.growthRevenue} />
              </div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>Receita</div>
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>✅</div>
              <div style={{ color: "#60a5fa", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{reportData.monthly.completed}</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>Entregues</div>
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>🎯</div>
              <div style={{ color: "#f472b6", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{formatBRL(reportData.monthly.avgTicket)}</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>Ticket Médio</div>
            </div>
          </div>
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
            <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>📈 Pedidos — 30 Dias</div>
            <ReportBarChart data={reportData.monthly.byDay} valueKey="orders" color="rgb(124,58,237)" formatter={String} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>💳 Pagamentos</div>
              <ReportPaymentBars payments={reportData.monthly.payments} />
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🏆 Top 30d</div>
              <ReportProductList products={reportData.monthly.products.slice(0, 5)} />
            </div>
          </div>
          <button
            onClick={() => downloadReportCSV(reportData.monthly.products, `relatorio-mensal.csv`)}
            style={{ alignSelf: "flex-end", padding: "8px 16px", borderRadius: 10, border: "1px solid var(--dash-card-border)", background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            📥 Baixar CSV
          </button>
        </>
      )}

      {/* ── PRODUTOS ── */}
      {tab === "produtos" && (
        <>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>🍔 Análise de Produtos — últimos 30 dias</div>
          <div className="modal-neon-card" style={{ borderRadius: 14, overflow: "hidden", background: "var(--dash-card)" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--dash-card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>Ranking de Vendas</div>
              <button
                onClick={() => downloadReportCSV(reportData.monthly.products, "produtos.csv")}
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--dash-card-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              >
                📥 CSV
              </button>
            </div>
            {reportData.monthly.products.length === 0 ? (
              <div style={{ padding: 20, color: "var(--dash-text-subtle)", fontSize: 12 }}>Nenhum pedido no período.</div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {reportData.monthly.products.map((p, i) => {
                  const totalQty = reportData.monthly.products.reduce((s, x) => s + x.qty, 0);
                  const share = pctOf(p.qty, totalQty);
                  return (
                    <div key={p.name} style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ color: "var(--dash-text-subtle)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                          <span style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>{p.qty}×</span>
                          <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 600 }}>{formatBRL(p.revenue)}</span>
                          <div style={{ flex: 1, height: 3, background: "var(--dash-card-border)", borderRadius: 2, overflow: "hidden", maxWidth: 60 }}>
                            <div style={{ height: "100%", width: `${share}%`, background: "rgb(124,58,237)", borderRadius: 2 }} />
                          </div>
                          <span style={{ color: "var(--dash-text-subtle)", fontSize: 9 }}>{share}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {reportData.monthly.products.length > 5 && (
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ color: "var(--dash-text-dim)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>⚠️ Baixo Desempenho</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {reportData.monthly.products.slice(-3).reverse().map((p) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--dash-text-muted)" }}>{p.name}</span>
                    <span style={{ color: "var(--dash-text-subtle)" }}>{p.qty} pedidos</span>
                  </div>
                ))}
              </div>
              <div style={{ color: "var(--dash-text-subtle)", fontSize: 10, marginTop: 8 }}>Considere promoção ou desativação desses itens.</div>
            </div>
          )}
        </>
      )}

      {/* ── CUSTOS ── */}
      {tab === "custos" && (
        <div>
          {/* Resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ padding: 16, borderRadius: 14, background: "rgba(248,113,113,0.06)", boxShadow: "0 1px 0 rgba(248,113,113,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Custos este mês</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f87171", marginTop: 4 }}>{formatBRL(totalCosts)}</div>
              {employeeCosts > 0 && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                  Equipe: {formatBRL(employeeCosts)} · Despesas: {formatBRL(totalExpensesThisMonth)}
                </div>
              )}
            </div>
            <div style={{ padding: 16, borderRadius: 14, background: "rgba(0,255,174,0.06)", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Receita este mês</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#00ffae", marginTop: 4 }}>{formatBRL(totalRevenueThisMonth)}</div>
            </div>
          </div>

          {/* Resultado */}
          <div style={{
            padding: 16, borderRadius: 14, marginBottom: 20,
            background: profit >= 0 ? "rgba(0,255,174,0.04)" : "rgba(248,113,113,0.04)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Resultado do mês</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: profit >= 0 ? "#00ffae" : "#f87171", marginTop: 4 }}>
              {profit >= 0 ? "+" : ""}{formatBRL(profit)}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              {profit >= 0 ? "Lucro" : "Prejuízo"} · Margem: {totalRevenueThisMonth > 0 ? ((profit / totalRevenueThisMonth) * 100).toFixed(1) : 0}%
            </div>
          </div>

          {/* Formulário adicionar custo */}
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600,
              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            }}>
              + Adicionar custo
            </button>
          </div>

          {showExpenseForm && (
            <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="Nome do custo (ex: Aluguel)" value={expenseName} onChange={e => setExpenseName(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" placeholder="Valor (R$)" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none" }} />
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 13, outline: "none" }}>
                  <option value="aluguel">Aluguel</option>
                  <option value="salarios">Salários</option>
                  <option value="fornecedores">Fornecedores</option>
                  <option value="marketing">Marketing</option>
                  <option value="impostos">Impostos</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="delivery">Delivery</option>
                  <option value="geral">Geral</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={expenseRecurring} onChange={e => setExpenseRecurring(e.target.checked)} style={{ accentColor: "#00ffae" }} />
                  Recorrente (mensal)
                </label>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 12, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowExpenseForm(false)} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleAddExpense} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "rgba(0,255,174,0.1)", border: "none", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
              </div>
            </div>
          )}

          {/* Lista de custos por categoria */}
          {Object.entries(expensesByCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "capitalize" }}>
                {cat === "salarios" ? "Salários" : cat === "manutencao" ? "Manutenção" : cat}
              </div>
              {(items as any[]).map((exp: any) => (
                <div key={exp.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)",
                  marginBottom: 4,
                }}>
                  <div>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{exp.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                      {exp.is_recurring ? "🔄 Recorrente" : "📌 Avulso"} · {new Date(exp.date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#f87171", fontSize: 14, fontWeight: 700 }}>{formatBRL(exp.amount)}</span>
                    <button onClick={() => handleDeleteExpense(exp.id)} style={{
                      background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 14, cursor: "pointer",
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {expenses.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "center", padding: "24px 0" }}>
              Nenhum custo cadastrado ainda.
            </div>
          )}
        </div>
      )}

      {/* ── ANÁLISE ── */}
      {tab === "analise" && (
        <div>
          {/* Ponto de equilíbrio */}
          <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.03)", marginBottom: 20, boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Ponto de Equilíbrio</div>

            <div style={{ position: "relative", height: 24, borderRadius: 12, background: "rgba(255,255,255,0.04)", overflow: "hidden", marginBottom: 12 }}>
              <div style={{
                height: "100%", borderRadius: 12,
                width: `${Math.min((totalRevenueThisMonth / (totalCosts || 1)) * 100, 100)}%`,
                background: totalRevenueThisMonth >= totalCosts
                  ? "linear-gradient(90deg, rgba(0,255,174,0.3), rgba(0,255,174,0.5))"
                  : "linear-gradient(90deg, rgba(251,191,36,0.3), rgba(248,113,113,0.5))",
                transition: "width 0.5s ease",
              }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Faturado: {formatBRL(totalRevenueThisMonth)}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Custos: {formatBRL(totalCosts)}</span>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: totalRevenueThisMonth >= totalCosts ? "#00ffae" : "#fbbf24", fontWeight: 700 }}>
              {totalRevenueThisMonth >= totalCosts
                ? `Ponto de equilíbrio atingido! Lucro de ${formatBRL(profit)}`
                : `Faltam ${formatBRL(totalCosts - totalRevenueThisMonth)} para o ponto de equilíbrio`
              }
            </div>
          </div>

          {/* Análise com IA */}
          <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.03)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Análise Financeira com IA</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
              Análise baseada nos seus custos e receitas.
            </div>

            {!financeAI ? (
              <button onClick={handleFinanceAI} disabled={generatingFinanceAI} style={{
                padding: "12px 24px", borderRadius: 14, border: "none", cursor: "pointer",
                background: "rgba(0,255,174,0.1)", color: "#00ffae", fontSize: 14, fontWeight: 700,
                boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                opacity: generatingFinanceAI ? 0.5 : 1, width: "100%",
              }}>
                {generatingFinanceAI ? "Analisando..." : "✨ Gerar análise financeira"}
              </button>
            ) : (
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                {financeAI}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
