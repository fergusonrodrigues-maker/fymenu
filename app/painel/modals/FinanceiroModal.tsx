"use client";

import { useState, useEffect, useRef } from "react";
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
      background: up ? "var(--dash-accent-soft)" : "var(--dash-danger-soft)",
      color: up ? "var(--dash-accent)" : "var(--dash-danger)",
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
  const [employeeCount, setEmployeeCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [paymentMethodsMap, setPaymentMethodsMap] = useState<Record<string, number>>({});
  const [showImportFinance, setShowImportFinance] = useState(false);
  const [importFinanceStep, setImportFinanceStep] = useState<"upload" | "processing" | "preview" | "done">("upload");
  const [importFinanceData, setImportFinanceData] = useState<any>(null);
  const [importingFinance, setImportingFinance] = useState(false);
  const [financeText, setFinanceText] = useState("");
  const financeFileRef = useRef<HTMLInputElement>(null);

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
        setEmployeeCount(emps?.length ?? 0);
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

  async function handleFullFinanceAI() {
    setGeneratingFinanceAI(true);
    try {
      const res = await fetch("/api/ia/finance-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue: totalRevenue,
          revenueBySource,
          expenses: totalExpensesThisMonth,
          employeeCosts,
          totalCosts,
          profit,
          margin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : "0",
          ticketMedio: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          totalOrders,
          ordersBySource,
          expensesByCategory: Object.entries(expensesByCategory).map(([cat, items]) => ({
            category: cat,
            total: (items as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0),
            count: (items as any[]).length,
          })),
          employeeCount,
          dailyGoal,
          todayRevenue,
          paymentMethods: paymentMethodsMap,
        }),
      });
      const json = await res.json();
      if (res.ok) setFinanceAI(json.analysis);
      else console.error(json.error);
    } catch (err) { console.error(err); }
    finally { setGeneratingFinanceAI(false); }
  }

  async function handleFinanceFile(file: File | undefined) {
    if (!file) return;
    setImportFinanceStep("processing");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/ia/import-finance", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) { setImportFinanceData(json.importData); setImportFinanceStep("preview"); }
      else { alert(json.error || "Erro ao processar"); setImportFinanceStep("upload"); }
    } catch { setImportFinanceStep("upload"); }
  }

  async function handleFinanceText(text: string) {
    setImportFinanceStep("processing");
    const formData = new FormData();
    formData.append("text", text);
    try {
      const res = await fetch("/api/ia/import-finance", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) { setImportFinanceData(json.importData); setImportFinanceStep("preview"); }
      else { alert(json.error || "Erro ao processar"); setImportFinanceStep("upload"); }
    } catch { setImportFinanceStep("upload"); }
  }

  async function handleConfirmFinanceImport() {
    if (!unit?.id) return;
    setImportingFinance(true);
    try {
      const inserts = importFinanceData.items.map((item: any) => ({
        unit_id: unit.id,
        name: item.name,
        category: item.category || "geral",
        amount: Math.round((item.amount || 0) * 100),
        is_recurring: item.recurring || false,
        recurrence: item.recurring ? "monthly" : "one_time",
        date: item.date || new Date().toISOString().split("T")[0],
        notes: `Importado via IA (${importFinanceData.source || "arquivo"})`,
      }));
      const { error } = await supabase.from("business_expenses").insert(inserts);
      if (error) throw error;
      const { data: newExpenses } = await supabase.from("business_expenses").select("*").eq("unit_id", unit.id).order("date", { ascending: false });
      if (newExpenses) setExpenses(newExpenses);
      setImportFinanceStep("done");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar custos");
    } finally {
      setImportingFinance(false);
    }
  }

  // ── Import Finance flow (overlay) ──
  if (showImportFinance) {
    const CATS = ["aluguel","salarios","fornecedores","marketing","impostos","manutencao","delivery","geral"];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>

        {/* UPLOAD */}
        {importFinanceStep === "upload" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>Importar dados financeiros</div>
              <button onClick={() => setShowImportFinance(false)} style={{
                width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                background: "rgba(220,38,38,0.12)", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
              }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { icon: "🧾", label: "Nota fiscal", desc: "PDF ou foto da NF" },
                { icon: "📊", label: "Planilha de custos", desc: "CSV ou Excel" },
                { icon: "🏦", label: "Extrato bancário", desc: "CSV do banco" },
                { icon: "📝", label: "Texto livre", desc: "Cole ou digite" },
              ].map((t, i) => (
                <div key={i} onClick={() => financeFileRef.current?.click()} style={{
                  padding: "16px 14px", borderRadius: 14, cursor: "pointer",
                  background: "var(--dash-card)",
                  boxShadow: "var(--dash-shadow)",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            <div
              onClick={() => financeFileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-accent)"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--dash-border)"; }}
              onDrop={(e) => { e.preventDefault(); handleFinanceFile(e.dataTransfer.files[0]); }}
              style={{
                border: "2px dashed var(--dash-border)", borderRadius: 16,
                padding: "30px 20px", textAlign: "center", cursor: "pointer",
                transition: "border-color 0.3s",
              }}
            >
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>
                Arraste um arquivo aqui ou clique para selecionar
              </div>
              <div style={{ color: "var(--dash-text-subtle)", fontSize: 11, marginTop: 6 }}>
                CSV, Excel, PDF, JPG, PNG
              </div>
            </div>
            <input ref={financeFileRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => handleFinanceFile(e.target.files?.[0])} />

            <div style={{ marginTop: 16 }}>
              <textarea
                placeholder="Ou cole aqui os dados financeiros (lista de compras, custos, etc)..."
                value={financeText}
                onChange={(e) => setFinanceText(e.target.value)}
                style={{
                  width: "100%", minHeight: 80, padding: 14, borderRadius: 14,
                  background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)",
                  fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
              {financeText.trim() && (
                <button onClick={() => handleFinanceText(financeText)} style={{
                  marginTop: 8, padding: "10px 20px", borderRadius: 12,
                  background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>✨ Analisar com IA</button>
              )}
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {importFinanceStep === "processing" && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
            <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 700 }}>Analisando documento...</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 6 }}>A IA está extraindo os dados financeiros</div>
          </div>
        )}

        {/* PREVIEW */}
        {importFinanceStep === "preview" && importFinanceData && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>Revisar custos</div>
                <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginTop: 2 }}>
                  {importFinanceData.items?.length} itens · Total: R$ {importFinanceData.total?.toFixed(2).replace(".", ",")}
                </div>
              </div>
              <button onClick={() => setImportFinanceStep("upload")} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer" }}>← Voltar</button>
            </div>

            {importFinanceData.items?.map((item: any, i: number) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                borderRadius: 12, background: "var(--dash-card)", marginBottom: 6,
              }}>
                <select value={item.category} onChange={(e) => {
                  const updated = { ...importFinanceData, items: [...importFinanceData.items] };
                  updated.items[i] = { ...updated.items[i], category: e.target.value };
                  setImportFinanceData(updated);
                }} style={{ padding: "4px 8px", borderRadius: 6, backgroundColor: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)", fontSize: 11, outline: "none" }}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={item.name} onChange={(e) => {
                  const updated = { ...importFinanceData, items: [...importFinanceData.items] };
                  updated.items[i] = { ...updated.items[i], name: e.target.value };
                  setImportFinanceData(updated);
                }} style={{ flex: 1, padding: "4px 8px", borderRadius: 6, background: "transparent", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none" }} />
                <input type="number" value={item.amount} onChange={(e) => {
                  const updated = { ...importFinanceData, items: [...importFinanceData.items] };
                  updated.items[i] = { ...updated.items[i], amount: parseFloat(e.target.value) || 0 };
                  updated.total = updated.items.reduce((s: number, it: any) => s + (it.amount || 0), 0);
                  setImportFinanceData(updated);
                }} style={{ width: 80, padding: "4px 8px", borderRadius: 6, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-danger)", fontSize: 13, fontWeight: 700, outline: "none", textAlign: "right" }} />
                <button onClick={() => {
                  const items = importFinanceData.items.filter((_: any, idx: number) => idx !== i);
                  setImportFinanceData({ ...importFinanceData, items, total: items.reduce((s: number, it: any) => s + (it.amount || 0), 0) });
                }} style={{
                  width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                  background: "rgba(220,38,38,0.10)", color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, transition: "all 0.2s",
                }}>✕</button>
              </div>
            ))}

            <button onClick={handleConfirmFinanceImport} disabled={importingFinance} style={{
              width: "100%", padding: 14, borderRadius: 14, marginTop: 16,
              background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
              fontSize: 14, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
              opacity: importingFinance ? 0.5 : 1,
            }}>
              {importingFinance ? "Salvando..." : `✅ Importar ${importFinanceData.items?.length} custos`}
            </button>
          </div>
        )}

        {/* DONE */}
        {importFinanceStep === "done" && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 800 }}>Custos importados!</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 6 }}>Os custos foram adicionados ao financeiro.</div>
            <button onClick={() => { setShowImportFinance(false); setImportFinanceStep("upload"); setImportFinanceData(null); setFinanceText(""); }} style={{
              marginTop: 16, padding: "10px 20px", borderRadius: 12,
              background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Fechar</button>
          </div>
        )}

      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>

      {/* ── Tab Bar ── */}
      <div className="tabs-scroll" style={{ display: "flex", gap: 2, padding: 3, background: "var(--dash-card)", borderRadius: 12, marginBottom: 0, overflowX: "auto", scrollbarWidth: "none" as any }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
              color: tab === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
              background: tab === t.key ? "var(--dash-accent-soft)" : "transparent",
              transition: "all 0.2s",
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
          <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-accent-soft)", marginBottom: 12, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Receita total</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--dash-accent)", marginTop: 4 }}>{formatBRL(totalRevenue)}</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 4 }}>{totalOrders} pedidos</div>
          </div>

          {/* Breakdown por fonte */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {/* WhatsApp — sempre visível */}
            <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{formatBRL(revenueBySource.whatsapp)}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>WhatsApp</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{ordersBySource.whatsapp} pedidos</div>
            </div>

            {/* Mesa — menupro+ */}
            {hasFeature("mesa_revenue") ? (
              <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🍽️</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{formatBRL(revenueBySource.mesa)}</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Mesa</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{ordersBySource.mesa} pedidos</div>
              </div>
            ) : (
              <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Mesa</div>
                <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>MenuPro</div>
              </div>
            )}

            {/* Delivery — menupro+ */}
            {hasFeature("delivery_revenue") ? (
              <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🛵</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{formatBRL(revenueBySource.delivery)}</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Delivery</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{ordersBySource.delivery} pedidos</div>
              </div>
            ) : (
              <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Delivery</div>
                <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>MenuPro</div>
              </div>
            )}
          </div>

          {/* Meta diária — business only */}
          {hasFeature("daily_goal") && (
            <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>Meta de hoje</span>
                <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>{formatBRL(todayRevenue)} / {dailyGoal > 0 ? formatBRL(dailyGoal) : "—"}</span>
              </div>
              {dailyGoal > 0 && (
                <>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--dash-card-hover)", overflow: "hidden" }}>
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
                    background: "var(--dash-card-hover)", border: "none",
                    color: "var(--dash-text)", fontSize: 13, outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Balanço — business only */}
          {hasFeature("balance") && (
            <div style={{ padding: 16, borderRadius: 14, background: profit >= 0 ? "var(--dash-accent-soft)" : "var(--dash-danger-soft)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Balanço do mês</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>{formatBRL(totalRevenue)}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Receita</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-danger)" }}>{formatBRL(totalCosts)}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Custos</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: profit >= 0 ? "var(--dash-accent)" : "var(--dash-danger)" }}>
                    {profit >= 0 ? "+" : ""}{formatBRL(profit)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{profit >= 0 ? "Lucro" : "Prejuízo"}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 6, borderRadius: 3, background: "var(--dash-separator)", overflow: "hidden" }}>
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
                <div key={method} style={{ padding: 10, borderRadius: 10, background: "var(--dash-card)", textAlign: "center" }}>
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
              background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 13,
              boxShadow: "var(--dash-shadow)",
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
              { icon: "📦", label: "Pedidos", value: String(reportData.today.orders), color: "var(--dash-accent)" },
              { icon: "✅", label: "Entregues", value: String(reportData.today.completed), color: "var(--dash-info)" },
              { icon: "💰", label: "Receita", value: formatBRL(reportData.today.revenue), color: "var(--dash-warning)" },
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
              { icon: "📦", label: "Pedidos", value: String(reportData.weekly.orders), color: "var(--dash-accent)" },
              { icon: "✅", label: "Entregues", value: String(reportData.weekly.completed), color: "var(--dash-info)" },
              { icon: "💰", label: "Receita", value: formatBRL(reportData.weekly.revenue), color: "var(--dash-warning)" },
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
            <ReportBarChart data={reportData.weekly.byDay} valueKey="orders" color="var(--dash-info)" formatter={String} />
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
                <span style={{ color: "var(--dash-accent)", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{reportData.monthly.orders}</span>
                <ReportGrowthBadge value={reportData.monthly.growthOrders} />
              </div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>Pedidos</div>
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>💰</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "var(--dash-warning)", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{formatBRL(reportData.monthly.revenue)}</span>
                <ReportGrowthBadge value={reportData.monthly.growthRevenue} />
              </div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>Receita</div>
            </div>
            <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>✅</div>
              <div style={{ color: "var(--dash-info)", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{reportData.monthly.completed}</div>
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
                      borderBottom: "1px solid var(--dash-separator)",
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
            <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-danger-soft)", boxShadow: "0 1px 0 rgba(248,113,113,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Custos este mês</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dash-danger)", marginTop: 4 }}>{formatBRL(totalCosts)}</div>
              {employeeCosts > 0 && (
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 4 }}>
                  Equipe: {formatBRL(employeeCosts)} · Despesas: {formatBRL(totalExpensesThisMonth)}
                </div>
              )}
            </div>
            <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-accent-soft)", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Receita este mês</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dash-accent)", marginTop: 4 }}>{formatBRL(totalRevenueThisMonth)}</div>
            </div>
          </div>

          {/* Resultado */}
          <div style={{
            padding: 16, borderRadius: 14, marginBottom: 20,
            background: profit >= 0 ? "var(--dash-accent-soft)" : "var(--dash-danger-soft)",
            boxShadow: "var(--dash-shadow)",
          }}>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Resultado do mês</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: profit >= 0 ? "var(--dash-accent)" : "var(--dash-danger)", marginTop: 4 }}>
              {profit >= 0 ? "+" : ""}{formatBRL(profit)}
            </div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 4 }}>
              {profit >= 0 ? "Lucro" : "Prejuízo"} · Margem: {totalRevenueThisMonth > 0 ? ((profit / totalRevenueThisMonth) * 100).toFixed(1) : 0}%
            </div>
          </div>

          {/* Formulário adicionar custo */}
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-card-hover)", color: "var(--dash-text-secondary)", fontSize: 13, fontWeight: 600,
              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            }}>
              + Adicionar custo
            </button>
          </div>

          {showExpenseForm && (
            <div style={{ padding: 16, borderRadius: 16, background: "var(--dash-card)", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="Nome do custo (ex: Aluguel)" value={expenseName} onChange={e => setExpenseName(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, fontWeight: 500, outline: "none", transition: "border-color 0.2s" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" placeholder="Valor (R$)" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none" }} />
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: 10, backgroundColor: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none" }}>
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
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--dash-text-dim)", fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={expenseRecurring} onChange={e => setExpenseRecurring(e.target.checked)} style={{ accentColor: "var(--dash-accent)" }} />
                  Recorrente (mensal)
                </label>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 12, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowExpenseForm(false)} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleAddExpense} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>Salvar</button>
              </div>
            </div>
          )}

          {/* Lista de custos por categoria */}
          {Object.entries(expensesByCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text-dim)", marginBottom: 8, textTransform: "capitalize" }}>
                {cat === "salarios" ? "Salários" : cat === "manutencao" ? "Manutenção" : cat}
              </div>
              {(items as any[]).map((exp: any) => (
                <div key={exp.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderRadius: 12, background: "var(--dash-card)",
                  marginBottom: 4,
                }}>
                  <div>
                    <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{exp.name}</div>
                    <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
                      {exp.is_recurring ? "🔄 Recorrente" : "📌 Avulso"} · {new Date(exp.date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--dash-danger)", fontSize: 14, fontWeight: 700 }}>{formatBRL(exp.amount)}</span>
                    <button onClick={() => handleDeleteExpense(exp.id)} style={{
                      width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                      background: "rgba(220,38,38,0.10)", color: "#ffffff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, transition: "all 0.2s",
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {expenses.length === 0 && (
            <div style={{ color: "var(--dash-text-subtle)", fontSize: 12, textAlign: "center", padding: "24px 0" }}>
              Nenhum custo cadastrado ainda.
            </div>
          )}
        </div>
      )}

      {/* ── ANÁLISE ── */}
      {tab === "analise" && (
        <div>
          {/* Seção 1: Break-even */}
          <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Ponto de Equilíbrio</div>
            <div style={{ position: "relative", height: 20, borderRadius: 10, background: "var(--dash-card-hover)", overflow: "hidden", marginBottom: 8 }}>
              <div style={{
                height: "100%", borderRadius: 10,
                width: `${Math.min((totalRevenue / (totalCosts || 1)) * 100, 100)}%`,
                background: totalRevenue >= totalCosts
                  ? "linear-gradient(90deg, rgba(0,255,174,0.4), rgba(0,255,174,0.7))"
                  : "linear-gradient(90deg, rgba(251,191,36,0.4), rgba(248,113,113,0.6))",
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dash-text-muted)" }}>
              <span>Faturado: {formatBRL(totalRevenue)}</span>
              <span>Custos: {formatBRL(totalCosts)}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: totalRevenue >= totalCosts ? "var(--dash-accent)" : "var(--dash-warning)" }}>
              {totalRevenue >= totalCosts
                ? `Break-even atingido! Lucro: ${formatBRL(profit)}`
                : `Faltam ${formatBRL(totalCosts - totalRevenue)} para break-even`}
            </div>
          </div>

          {/* Seção 2: Composição dos custos */}
          <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Composição dos custos</div>
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10, background: "var(--dash-card-hover)" }}>
              {totalCosts > 0 && employeeCosts > 0 && (
                <div style={{ width: `${(employeeCosts / totalCosts) * 100}%`, background: "var(--dash-purple-soft)", transition: "width 0.3s" }} />
              )}
              {totalCosts > 0 && totalExpensesThisMonth > 0 && (
                <div style={{ width: `${(totalExpensesThisMonth / totalCosts) * 100}%`, background: "var(--dash-danger-soft)", transition: "width 0.3s" }} />
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--dash-purple-soft)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Equipe: {formatBRL(employeeCosts)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--dash-danger-soft)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Despesas: {formatBRL(totalExpensesThisMonth)}</span>
              </div>
            </div>
            <div>
              {Object.entries(expensesByCategory).map(([cat, items]) => {
                const catTotal = (items as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0);
                return (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--dash-separator)" }}>
                    <span style={{ fontSize: 11, color: "var(--dash-text-muted)", textTransform: "capitalize" }}>
                      {cat === "salarios" ? "Salários" : cat === "manutencao" ? "Manutenção" : cat}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--dash-danger)", fontWeight: 600 }}>{formatBRL(catTotal)}</span>
                  </div>
                );
              })}
              {employeeCosts > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Equipe ({employeeCount} funcionários)</span>
                  <span style={{ fontSize: 11, color: "var(--dash-purple)", fontWeight: 600 }}>{formatBRL(employeeCosts)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Seção 3: Indicadores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
                {totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0}%
              </div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Margem líquida</div>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
                {formatBRL(totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0)}
              </div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Ticket médio</div>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
                {formatBRL(Math.round(totalCosts / 30))}
              </div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Custo/dia</div>
            </div>
          </div>

          {/* Seção 4: Sugestão de pró-labore */}
          {profit > 0 && (
            <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-accent-soft)", marginBottom: 16, boxShadow: "0 1px 0 rgba(0,255,174,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 8 }}>Sugestão de pró-labore</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dash-accent)" }}>{formatBRL(Math.round(profit * 0.3))}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Conservador (30%)</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dash-accent)" }}>{formatBRL(Math.round(profit * 0.5))}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Moderado (50%)</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dash-warning)" }}>{formatBRL(Math.round(profit * 0.7))}</div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Agressivo (70%)</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 8 }}>
                Baseado no lucro líquido de {formatBRL(profit)}. Reservar o restante para capital de giro e reinvestimento.
              </div>
            </div>
          )}

          {/* Seção 5: Relatório IA completo */}
          <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", boxShadow: "var(--dash-shadow)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Relatório Financeiro com IA</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 14 }}>
              Análise completa cruzando receita, custos, equipe e desempenho.
            </div>
            {!financeAI ? (
              <button onClick={handleFullFinanceAI} disabled={generatingFinanceAI} style={{
                width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer",
                background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
                fontSize: 14, fontWeight: 800,
                boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                opacity: generatingFinanceAI ? 0.5 : 1,
              }}>
                {generatingFinanceAI ? "Gerando relatório..." : "✨ Gerar relatório completo com IA"}
              </button>
            ) : (
              <>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--dash-text-secondary)", lineHeight: 1.7 }}>
                  {financeAI}
                </div>
                <button onClick={() => setFinanceAI(null)} style={{
                  marginTop: 12, padding: "8px 16px", borderRadius: 10, border: "none",
                  background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                  fontSize: 12, cursor: "pointer",
                }}>
                  🔄 Gerar novamente
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
