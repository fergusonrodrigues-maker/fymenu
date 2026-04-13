"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Unit } from "../types";
import FyLoader from "@/components/FyLoader";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const supabase = createClient();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
      <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
          <span style={{ color: "var(--dash-text-secondary)" }}>{p.name}:</span>
          <span style={{ color: "var(--dash-text)", fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

type Tab = "Geral" | "Produtos" | "IA" | "Avaliações";

export default function AnalyticsModal({
  analytics,
  unit,
  products,
  categories,
  restaurant,
}: {
  analytics: { views: number; clicks: number; orders: number };
  unit: Unit | null;
  products?: any[];
  categories?: any[];
  restaurant?: { plan: string } | null;
}) {
  const [tab, setTab] = useState<Tab>("Geral");
  const [topProducts, setTopProducts] = useState<{ name: string; thumb: string; count: number }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [ifoodClicks, setIfoodClicks] = useState<number | null>(null);
  const [attentionRanking, setAttentionRanking] = useState<{ productId: string; name: string; avgSeconds: number; totalViews: number }[]>([]);
  const [loadingAttention, setLoadingAttention] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsAI, setReviewsAI] = useState<string | null>(null);
  const [generatingReviewsAI, setGeneratingReviewsAI] = useState(false);
  const [showImportAnalytics, setShowImportAnalytics] = useState(false);
  const [importAnalyticsStep, setImportAnalyticsStep] = useState<"upload" | "processing" | "preview" | "done">("upload");
  const [importAnalyticsData, setImportAnalyticsData] = useState<any>(null);
  const [importingAnalytics, setImportingAnalytics] = useState(false);
  const [analyticsText, setAnalyticsText] = useState("");
  const analyticsFileRef = useRef<HTMLInputElement>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [period, setPeriod] = useState<"7d" | "15d" | "30d" | "90d" | "custom">("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  function getPeriodStart(p: string): string {
    const now = new Date();
    if (p === "7d") now.setDate(now.getDate() - 7);
    else if (p === "15d") now.setDate(now.getDate() - 15);
    else if (p === "30d") now.setDate(now.getDate() - 30);
    else if (p === "90d") now.setDate(now.getDate() - 90);
    else if (p === "custom" && customStart) return new Date(customStart).toISOString();
    else now.setDate(now.getDate() - 7);
    return now.toISOString();
  }

  function getPeriodEnd(): string {
    if (period === "custom" && customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    return new Date().toISOString();
  }

  useEffect(() => {
    if (!unit) return;
    supabase
      .from("menu_events")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unit.id)
      .eq("event", "ifood_click")
      .gte("created_at", getPeriodStart(period))
      .lte("created_at", getPeriodEnd())
      .then(({ count }) => setIfoodClicks(count ?? 0));
  }, [unit, period]);

  async function loadChartData() {
    if (!unit) return;
    const startDate = new Date(getPeriodStart(period));

    const { data: events } = await supabase
      .from("menu_events")
      .select("event, created_at, product_id")
      .eq("unit_id", unit.id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", getPeriodEnd())
      .order("created_at");

    if (!events || events.length === 0) { setChartData([]); return; }

    const grouped: Record<string, { date: string; visitas: number; cliques: number; pedidos: number }> = {};
    for (const e of events) {
      const day = e.created_at.slice(0, 10);
      if (!grouped[day]) grouped[day] = { date: day, visitas: 0, cliques: 0, pedidos: 0 };
      if (e.event === "menu_view") grouped[day].visitas++;
      else if (e.event === "product_click") grouped[day].cliques++;
      else if (e.event === "whatsapp_click" || e.event === "product_order_click") grouped[day].pedidos++;
    }

    const result = [];
    const current = new Date(startDate);
    const today = new Date();
    while (current <= today) {
      const dayStr = current.toISOString().slice(0, 10);
      result.push(grouped[dayStr] || { date: dayStr, visitas: 0, cliques: 0, pedidos: 0 });
      current.setDate(current.getDate() + 1);
    }

    setChartData(result.map(d => ({
      ...d,
      label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
    })));
  }

  useEffect(() => {
    if (tab !== "Geral" || !unit) return;
    loadChartData();
  }, [tab, unit, period]);

  const stats = [
    { label: "Visitas ao cardápio", value: analytics.views, icon: "👁", color: "var(--dash-accent)", desc: "últimos 7 dias" },
    { label: "Cliques em produtos", value: analytics.clicks, icon: "👆", color: "var(--dash-info)", desc: "últimos 7 dias" },
    { label: "Pedidos enviados", value: analytics.orders, icon: "✅", color: "#f472b6", desc: "últimos 7 dias" },
  ];
  const conversion = analytics.views > 0 ? ((analytics.orders / analytics.views) * 100).toFixed(1) : "0.0";

  useEffect(() => {
    if (tab !== "Produtos" || !unit) return;
    if (topProducts.length > 0) return;
    setLoadingProducts(true);
    supabase
      .from("menu_events")
      .select("product_id, products(name, thumbnail_url)")
      .eq("unit_id", unit.id)
      .eq("event", "product_click")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const counts: Record<string, { name: string; thumb: string; count: number }> = {};
        for (const e of data || []) {
          const pid = e.product_id;
          if (!pid) continue;
          const p = (e as any).products;
          if (!counts[pid]) counts[pid] = { name: p?.name || "?", thumb: p?.thumbnail_url || "", count: 0 };
          counts[pid].count++;
        }
        setTopProducts(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10));
        setLoadingProducts(false);
      });
  }, [tab, unit]);

  useEffect(() => {
    if (tab !== "Produtos" || !unit) return;
    if (attentionRanking.length > 0 || loadingAttention) return;
    const plan = restaurant?.plan ?? "";
    if (plan !== "menupro" && plan !== "business") return;
    setLoadingAttention(true);
    supabase
      .from("menu_events")
      .select("product_id, meta")
      .eq("unit_id", unit.id)
      .eq("event", "product_view")
      .not("meta", "is", null)
      .gte("created_at", getPeriodStart(period))
      .lte("created_at", getPeriodEnd())
      .then(({ data }) => {
        const byProduct: Record<string, { name: string; totalMs: number; count: number }> = {};
        for (const e of data || []) {
          if (!e.product_id || !(e.meta as any)?.duration_ms) continue;
          if (!byProduct[e.product_id]) {
            byProduct[e.product_id] = { name: (e.meta as any).product_name || "?", totalMs: 0, count: 0 };
          }
          byProduct[e.product_id].totalMs += (e.meta as any).duration_ms;
          byProduct[e.product_id].count++;
        }
        const ranking = Object.entries(byProduct)
          .map(([id, d]) => ({
            productId: id,
            name: d.name,
            avgSeconds: Math.round(d.totalMs / d.count / 1000),
            totalViews: d.count,
          }))
          .sort((a, b) => b.avgSeconds - a.avgSeconds);
        setAttentionRanking(ranking);
        setLoadingAttention(false);
      });
  }, [tab, unit, restaurant]);

  useEffect(() => {
    if (tab !== "Avaliações" || !unit) return;
    if (reviews.length > 0) return;
    supabase
      .from("reviews")
      .select("*")
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { if (data) setReviews(data); });
  }, [tab, unit]);

  async function loadData() {
    await loadChartData();
  }

  async function handleDownloadPDF() {
    if (!unit) return;
    setGeneratingPDF(true);
    try {
      const res = await fetch("/api/analytics/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unit.id,
          unitName: unit.name,
          period: "últimos 7 dias",
          stats: {
            views: analytics.views,
            clicks: analytics.clicks,
            orders: analytics.orders,
            conversionRate:
              analytics.views > 0
                ? ((analytics.orders / analytics.views) * 100).toFixed(1)
                : "0",
          },
          topProducts: topProducts.slice(0, 10),
          attentionRanking: attentionRanking.slice(0, 10),
          revenueData: { total: 0, bySource: {}, ticketMedio: 0 },
        }),
      });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${(unit.name || "analytics").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar relatório PDF");
    } finally {
      setGeneratingPDF(false);
    }
  }

  function resetImport() {
    setShowImportAnalytics(false);
    setImportAnalyticsStep("upload");
    setImportAnalyticsData(null);
    setAnalyticsText("");
  }

  async function handleAnalyticsFile(file: File | undefined) {
    if (!file) return;
    setImportAnalyticsStep("processing");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/ia/import-analytics", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) {
        setImportAnalyticsData(json.importData);
        setImportAnalyticsStep("preview");
      } else {
        alert(json.error || "Erro ao processar arquivo");
        setImportAnalyticsStep("upload");
      }
    } catch {
      setImportAnalyticsStep("upload");
    }
  }

  async function handleAnalyticsText(text: string) {
    setImportAnalyticsStep("processing");
    const formData = new FormData();
    formData.append("text", text);
    try {
      const res = await fetch("/api/ia/import-analytics", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) {
        setImportAnalyticsData(json.importData);
        setImportAnalyticsStep("preview");
      } else {
        alert(json.error || "Erro ao processar dados");
        setImportAnalyticsStep("upload");
      }
    } catch {
      setImportAnalyticsStep("upload");
    }
  }

  async function handleConfirmAnalyticsImport() {
    if (!importAnalyticsData?.events || !unit) return;
    setImportingAnalytics(true);
    try {
      const events = importAnalyticsData.events;
      for (let i = 0; i < events.length; i += 50) {
        const batch = events.slice(i, i + 50).map((e: any) => ({
          unit_id: unit.id,
          event: e.event,
          product_id: e.product_id || null,
          meta: { imported: true, source: "ai_import" },
          created_at: e.date || new Date().toISOString(),
        }));
        await supabase.from("menu_events").insert(batch);
      }
      setImportAnalyticsStep("done");
    } catch (err) {
      console.error(err);
      alert("Erro ao importar");
    } finally {
      setImportingAnalytics(false);
    }
  }

  async function handleReviewsAI(
    totalReviews: number,
    avgRestaurant: string,
    avgWaiter: string,
    starDist: number[],
    googleRedirects: number,
    waiterRanking: any[],
    withComments: any[],
    reviewsLast7: any[],
    reviewsLast30: any[]
  ) {
    setGeneratingReviewsAI(true);
    try {
      const res = await fetch("/api/ia/analyze-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalReviews,
          avgRestaurant,
          avgWaiter,
          starDist,
          googleRedirects,
          waiterRanking: waiterRanking.slice(0, 5),
          comments: withComments.slice(0, 15).map((r: any) => ({
            rating: r.restaurant_rating,
            waiterRating: r.waiter_rating,
            comment: r.comment,
            waiter: r.waiter_name,
          })),
          reviewsLast7: reviewsLast7.length,
          reviewsLast30: reviewsLast30.length,
        }),
      });
      const json = await res.json();
      if (res.ok) setReviewsAI(json.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReviewsAI(false);
    }
  }

  async function handleGenerateAISuggestions() {
    if (!unit) return;
    setGeneratingAI(true);
    try {
      const res = await fetch("/api/ia/analytics-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unit.id,
          totalProducts: products?.length || 0,
          totalCategories: categories?.length || 0,
          totalOrders: analytics?.orders || 0,
          totalViews: analytics?.views || 0,
          totalClicks: analytics?.clicks || 0,
          topProducts: topProducts.slice(0, 5).map(p => p.name),
        }),
      });
      const json = await res.json();
      if (res.ok) setAiSuggestions(json.suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAI(false);
    }
  }

  const hasMenuProFeature = restaurant?.plan === "menupro" || restaurant?.plan === "business";
  const visibleTabs: Tab[] = [
    "Geral",
    "Produtos",
    ...(hasMenuProFeature ? (["Avaliações", "IA"] as Tab[]) : (["IA"] as Tab[])),
  ];

  // ── Derived review data (computed here so available to both render and handleReviewsAI call) ──
  const totalReviews = reviews.length;
  const avgRestaurant = totalReviews > 0
    ? (reviews.reduce((s, r) => s + (r.restaurant_rating || 0), 0) / totalReviews).toFixed(1)
    : "0";
  const avgWaiter = totalReviews > 0
    ? (reviews.reduce((s, r) => s + (r.waiter_rating || 0), 0) / totalReviews).toFixed(1)
    : "0";
  const starDist = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.restaurant_rating >= 1 && r.restaurant_rating <= 5) starDist[r.restaurant_rating - 1]++;
  }
  const googleRedirects = reviews.filter(r => r.redirected_to_google).length;
  const withComments = reviews.filter(r => r.comment?.trim());
  const waiterRatingsMap: Record<string, { name: string; total: number; count: number }> = {};
  for (const r of reviews) {
    if (!r.waiter_name) continue;
    const key = r.waiter_id || r.waiter_name;
    if (!waiterRatingsMap[key]) waiterRatingsMap[key] = { name: r.waiter_name, total: 0, count: 0 };
    waiterRatingsMap[key].total += r.waiter_rating || 0;
    waiterRatingsMap[key].count++;
  }
  const waiterRanking = Object.values(waiterRatingsMap)
    .map(w => ({ ...w, avg: (w.total / w.count).toFixed(1) }))
    .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
  const now = new Date();
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const reviewsLast7 = reviews.filter(r => new Date(r.created_at) >= sevenDaysAgoDate);
  const reviewsLast30 = reviews.filter(r => new Date(r.created_at) >= thirtyDaysAgoDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Tab bar */}
      <div className="tabs-scroll" style={{ display: "flex", gap: 2, padding: 3, background: "var(--dash-card)", borderRadius: 12, marginBottom: 0, overflowX: "auto", scrollbarWidth: "none" as any }}>
        {visibleTabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
              color: tab === t ? "var(--dash-accent)" : "var(--dash-text-muted)",
              background: tab === t ? "var(--dash-accent-soft)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 0, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { key: "7d", label: "7 dias" },
          { key: "15d", label: "15 dias" },
          { key: "30d", label: "30 dias" },
          { key: "90d", label: "90 dias" },
          { key: "custom", label: "Personalizado" },
        ].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key as any)} style={{
            padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: period === p.key ? "var(--dash-accent-soft)" : "var(--dash-card)",
            color: period === p.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
            fontSize: 11, fontWeight: 600, transition: "all 0.15s",
          }}>{p.label}</button>
        ))}
      </div>

      {period === "custom" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 0, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 10,
              background: "var(--dash-input-bg, var(--dash-card))", border: "1px solid var(--dash-input-border, var(--dash-border))",
              color: "var(--dash-text)", fontSize: 12, outline: "none",
            }} />
          <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>até</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 10,
              background: "var(--dash-input-bg, var(--dash-card))", border: "1px solid var(--dash-input-border, var(--dash-border))",
              color: "var(--dash-text)", fontSize: 12, outline: "none",
            }} />
          <button onClick={() => loadData()} style={{
            padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
            fontSize: 11, fontWeight: 700,
          }}>Filtrar</button>
        </div>
      )}

      {/* PDF download — MenuPro/Business only */}
      {(restaurant?.plan === "menupro" || restaurant?.plan === "business") && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 12,
              boxShadow: "var(--dash-shadow)",
              opacity: generatingPDF ? 0.5 : 1,
            }}
          >
            {generatingPDF ? "Gerando..." : "📄 Baixar PDF"}
          </button>
        </div>
      )}

      {/* ── GERAL ── */}
      {tab === "Geral" && (
        <>
          {stats.map((s) => (
            <div key={s.label} className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--dash-text-dim)", fontSize: 12 }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>{s.desc}</div>
              </div>
            </div>
          ))}
          <div className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)" }}>
            <div style={{ color: "var(--dash-text-dim)", fontSize: 12, marginBottom: 4 }}>Taxa de conversão</div>
            <div style={{ color: "var(--dash-text)", fontSize: 32, fontWeight: 900 }}>{conversion}%</div>
            <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>visitas → pedidos</div>
          </div>
          {ifoodClicks !== null && ifoodClicks > 0 && unit?.ifood_url && (
            <div className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 28 }}>🛵</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--dash-text-dim)", fontSize: 12 }}>Cliques plataforma delivery</div>
                <div style={{ color: "#f59e0b", fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{ifoodClicks}</div>
                <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>últimos 7 dias · só cliques</div>
              </div>
            </div>
          )}
          {/* Gráfico de evolução */}
          {chartData.length > 1 ? (
            <>
              <div style={{ padding: 16, borderRadius: 16, background: "var(--dash-card)", border: "1px solid var(--dash-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Evolução (últimos 30 dias)</div>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradVisitas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--dash-accent)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--dash-accent)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradCliques" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-section-border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--dash-text-muted)" }} axisLine={{ stroke: "var(--dash-section-border)" }} tickLine={false} interval={"preserveStartEnd"} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--dash-text-muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="visitas" name="Visitas" stroke="var(--dash-accent)" strokeWidth={2} fill="url(#gradVisitas)" />
                      <Area type="monotone" dataKey="cliques" name="Cliques" stroke="#60a5fa" strokeWidth={2} fill="url(#gradCliques)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--dash-accent)" }} />
                    <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Visitas</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa" }} />
                    <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Cliques</span>
                  </div>
                </div>
              </div>

              {chartData.some(d => d.pedidos > 0) && (
                <div style={{ padding: 16, borderRadius: 16, background: "var(--dash-card)", border: "1px solid var(--dash-border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Pedidos por dia</div>
                  <div style={{ width: "100%", height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-section-border)" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--dash-text-muted)" }} axisLine={{ stroke: "var(--dash-section-border)" }} tickLine={false} interval={"preserveStartEnd"} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--dash-text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="pedidos" name="Pedidos" fill="var(--dash-accent)" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 30, borderRadius: 16, background: "var(--dash-card)", border: "1px solid var(--dash-border)", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-text-secondary)" }}>Dados insuficientes</div>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 4 }}>
                Os gráficos aparecerão conforme clientes interagirem com o cardápio.
              </div>
            </div>
          )}

          {unit && (
            <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 14, background: "var(--dash-link-bg)", border: "1px solid var(--dash-card-border)", color: "var(--dash-text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>
              Ver cardápio público ↗
            </a>
          )}
        </>
      )}

      {/* ── PRODUTOS ── */}
      {tab === "Produtos" && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Top Produtos (mais clicados)</div>
          {topProducts.length > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: "var(--dash-card)", border: "1px solid var(--dash-border)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Distribuição de cliques</div>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts.slice(0, 6).map(p => ({ name: p.name, value: p.count }))}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value"
                    >
                      {topProducts.slice(0, 6).map((_, i) => {
                        const colors = ["#00ffae", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#34d399"];
                        return <Cell key={i} fill={colors[i % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {topProducts.slice(0, 6).map((p, i) => {
                  const colors = ["#00ffae", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#34d399"];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors[i % colors.length] }} />
                      <span style={{ fontSize: 9, color: "var(--dash-text-muted)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loadingProducts ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><FyLoader size="sm" /></div>
          ) : topProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)", fontSize: 13 }}>
              Nenhum dado de cliques ainda. Os produtos aparecem aqui conforme os clientes interagem com o cardápio.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {topProducts.map((p, i) => {
                const maxClicks = topProducts[0]?.count || 1;
                const barWidth = (p.count / maxClicks) * 100;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 12,
                    background: "var(--dash-card)",
                    border: "1px solid var(--dash-card-border)",
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${barWidth}%`,
                      background: i < 3 ? "var(--dash-accent-soft)" : "var(--dash-card-subtle)",
                      transition: "width 0.5s ease",
                    }} />
                    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: i < 3 ? "var(--dash-accent-soft)" : "var(--dash-card)",
                        color: i < 3 ? "var(--dash-accent)" : "var(--dash-text-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800,
                      }}>{i + 1}</span>
                      {p.thumb && <img src={p.thumb} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: i < 3 ? "var(--dash-accent)" : "var(--dash-text)" }}>{p.count}</div>
                        <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>cliques</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Product Attention Time */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>⏱️ Product Attention Time</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 12 }}>
              Tempo médio que cada cliente fica vendo o produto
            </div>

            {(restaurant?.plan === "menupro" || restaurant?.plan === "business") ? (
              loadingAttention ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><FyLoader size="sm" /></div>
              ) : attentionRanking.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--dash-text-muted)", fontSize: 12 }}>
                  Ainda sem dados de atenção. Os dados aparecem conforme clientes visualizam produtos.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {attentionRanking.slice(0, 15).map((p, i) => {
                    const maxTime = attentionRanking[0]?.avgSeconds || 1;
                    const barWidth = (p.avgSeconds / maxTime) * 100;
                    return (
                      <div key={p.productId} style={{
                        padding: "10px 14px", borderRadius: 12,
                        background: "var(--dash-card)",
                        boxShadow: "var(--dash-shadow)",
                        position: "relative", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${barWidth}%`,
                          background: i < 3 ? "var(--dash-accent-soft)" : "var(--dash-card)",
                          transition: "width 0.5s ease",
                        }} />
                        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: i < 3 ? "var(--dash-accent-soft)" : "var(--dash-card-hover)",
                              color: i < 3 ? "var(--dash-accent)" : "var(--dash-text-muted)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 800,
                            }}>{i + 1}</span>
                            <div>
                              <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                              <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>{p.totalViews} views</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: i < 3 ? "var(--dash-accent)" : "var(--dash-text)" }}>
                              {p.avgSeconds}s
                            </div>
                            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>média</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ textAlign: "center", padding: 20 }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 6 }}>Disponível no plano MenuPro</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AVALIAÇÕES ── */}
      {tab === "Avaliações" && (
        <div>
          {totalReviews === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)" }}>Nenhuma avaliação ainda</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>As avaliações aparecem quando clientes fecham comandas.</div>
            </div>
          ) : (
            <>
              {/* Resumo */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { value: avgRestaurant, label: "Restaurante ⭐", color: "var(--dash-accent)" },
                  { value: avgWaiter, label: "Garçons ⭐", color: "var(--dash-accent)" },
                  { value: String(totalReviews), label: "Avaliações", color: "var(--dash-text)" },
                  { value: String(googleRedirects), label: "→ Google", color: "#4285f4" },
                ].map((card) => (
                  <div key={card.label} style={{ padding: 14, borderRadius: 14, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                    <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Distribuição de estrelas */}
              <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Distribuição (Restaurante)</div>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = starDist[star - 1];
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--dash-text-muted)", width: 30 }}>{star} ⭐</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--dash-card-hover)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4, width: `${pct}%`,
                          background: star >= 4 ? "var(--dash-accent)" : star === 3 ? "var(--dash-warning)" : "var(--dash-danger)",
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--dash-text-muted)", width: 28, textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Ranking de garçons */}
              {waiterRanking.length > 0 && (
                <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Ranking de Garçons</div>
                  {waiterRanking.map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < waiterRanking.length - 1 ? "1px solid var(--dash-separator)" : "none" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: i === 0 ? "var(--dash-accent-soft)" : "var(--dash-card-hover)", color: i === 0 ? "var(--dash-accent)" : "var(--dash-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>{w.count} avaliações</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: parseFloat(w.avg) >= 4 ? "var(--dash-accent)" : parseFloat(w.avg) >= 3 ? "var(--dash-warning)" : "var(--dash-danger)" }}>
                        {w.avg} ⭐
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedbacks com comentário */}
              {withComments.length > 0 && (
                <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, boxShadow: "var(--dash-shadow)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>
                    Feedbacks dos clientes ({withComments.length})
                  </div>
                  {withComments.slice(0, 20).map((r: any) => (
                    <div key={r.id} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--dash-card)", marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: r.restaurant_rating >= 4 ? "var(--dash-accent)" : r.restaurant_rating >= 3 ? "var(--dash-warning)" : "var(--dash-danger)" }}>
                            {r.restaurant_rating}⭐
                          </span>
                          {r.waiter_name && <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Garçom: {r.waiter_name}</span>}
                        </div>
                        <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--dash-text-secondary)", lineHeight: 1.5 }}>"{r.comment}"</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tendência 7d vs 30d */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ padding: 14, borderRadius: 14, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
                    {reviewsLast7.length > 0 ? (reviewsLast7.reduce((s, r) => s + (r.restaurant_rating || 0), 0) / reviewsLast7.length).toFixed(1) : "-"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Média 7 dias ({reviewsLast7.length})</div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
                    {reviewsLast30.length > 0 ? (reviewsLast30.reduce((s, r) => s + (r.restaurant_rating || 0), 0) / reviewsLast30.length).toFixed(1) : "-"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Média 30 dias ({reviewsLast30.length})</div>
                </div>
              </div>

              {/* Análise IA */}
              <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", boxShadow: "var(--dash-shadow)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Análise das avaliações com IA</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 14 }}>
                  Padrões, pontos de melhoria e insights dos feedbacks.
                </div>
                {!reviewsAI ? (
                  <button
                    onClick={() => handleReviewsAI(totalReviews, avgRestaurant, avgWaiter, starDist, googleRedirects, waiterRanking, withComments, reviewsLast7, reviewsLast30)}
                    disabled={generatingReviewsAI}
                    style={{ width: "100%", padding: 12, borderRadius: 14, border: "none", cursor: "pointer", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 13, fontWeight: 800, boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset", opacity: generatingReviewsAI ? 0.5 : 1 }}
                  >
                    {generatingReviewsAI ? "Analisando..." : "✨ Analisar avaliações com IA"}
                  </button>
                ) : (
                  <>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--dash-text-secondary)", lineHeight: 1.7 }}>{reviewsAI}</div>
                    <button onClick={() => setReviewsAI(null)} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 8, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text-muted)", fontSize: 11, cursor: "pointer" }}>
                      🔄 Gerar novamente
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── IA ── */}
      {tab === "IA" && (
        <div>
          {!showImportAnalytics ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)" }}>Análise com IA</div>
                {(restaurant?.plan === "menupro" || restaurant?.plan === "business") && (
                  <button onClick={() => setShowImportAnalytics(true)} style={{
                    padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 12,
                    boxShadow: "var(--dash-shadow)",
                  }}>📥 Importar dados</button>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 16 }}>
                Sugestões baseadas nos dados do seu cardápio e vendas.
              </div>
              {!aiSuggestions ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <button
                    onClick={handleGenerateAISuggestions}
                    disabled={generatingAI}
                    style={{
                      padding: "12px 24px", borderRadius: 14, border: "none", cursor: "pointer",
                      background: "var(--dash-accent-soft)",
                      boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                      color: "var(--dash-accent)", fontSize: 14, fontWeight: 700,
                      opacity: generatingAI ? 0.5 : 1,
                    }}
                  >
                    {generatingAI ? "Analisando..." : "✨ Gerar análise com IA"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{
                    padding: 20, borderRadius: 16,
                    background: "var(--dash-card)",
                    boxShadow: "var(--dash-shadow)",
                    whiteSpace: "pre-wrap", fontSize: 13, color: "var(--dash-text-secondary)", lineHeight: 1.7,
                  }}>
                    {aiSuggestions}
                  </div>
                  <button
                    onClick={() => setAiSuggestions(null)}
                    style={{
                      marginTop: 12, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Gerar novamente
                  </button>
                </>
              )}
            </>
          ) : (
            /* ── IMPORT FLOW ── */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>Importar dados de analytics</div>
                <button onClick={resetImport} style={{
                  width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                  background: "rgba(220,38,38,0.12)", color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
                }}>✕</button>
              </div>

              {/* UPLOAD */}
              {importAnalyticsStep === "upload" && (
                <>
                  <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 16 }}>
                    Importe dados históricos de outro sistema. A IA converte pro formato do FyMenu.
                  </div>

                  <div
                    onClick={() => analyticsFileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-accent)"; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--dash-border)"; }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-border)"; handleAnalyticsFile(e.dataTransfer.files[0]); }}
                    style={{
                      border: "2px dashed var(--dash-border)", borderRadius: 16,
                      padding: "30px 20px", textAlign: "center", cursor: "pointer",
                      transition: "border-color 0.3s", marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Arraste o arquivo aqui</div>
                    <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>CSV, Excel, ou dados exportados de outro sistema</div>
                  </div>
                  <input ref={analyticsFileRef} type="file" accept=".csv,.xlsx,.xls,.json,.txt" style={{ display: "none" }}
                    onChange={(e) => handleAnalyticsFile(e.target.files?.[0])} />

                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--dash-separator)" }} />
                    <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>ou cole os dados</span>
                    <div style={{ flex: 1, height: 1, background: "var(--dash-separator)" }} />
                  </div>

                  <textarea
                    placeholder={"Cole dados de analytics, ex:\n\nData, Visualizações, Cliques, Pedidos\n01/03/2026, 150, 45, 12\n02/03/2026, 180, 62, 18\n..."}
                    value={analyticsText}
                    onChange={(e) => setAnalyticsText(e.target.value)}
                    style={{
                      width: "100%", minHeight: 100, padding: 14, borderRadius: 14,
                      background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)",
                      fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6,
                    }}
                  />
                  {analyticsText.trim() && (
                    <button onClick={() => handleAnalyticsText(analyticsText)} style={{
                      marginTop: 10, width: "100%", padding: 12, borderRadius: 14,
                      background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                      fontSize: 13, fontWeight: 800, cursor: "pointer",
                      boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                    }}>✨ Analisar com IA</button>
                  )}
                </>
              )}

              {/* PROCESSING */}
              {importAnalyticsStep === "processing" && (
                <div style={{ textAlign: "center", padding: "50px 20px" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                  <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 700 }}>Analisando dados...</div>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 6 }}>Convertendo pro formato FyMenu</div>
                </div>
              )}

              {/* PREVIEW */}
              {importAnalyticsStep === "preview" && importAnalyticsData && (
                <>
                  <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 12 }}>
                    {importAnalyticsData.events?.length} eventos extraídos. Período: {importAnalyticsData.period || "N/A"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>
                        {importAnalyticsData.events?.filter((e: any) => e.event === "menu_view").length || 0}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Visualizações</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>
                        {importAnalyticsData.events?.filter((e: any) => e.event === "product_click").length || 0}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Cliques</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: "var(--dash-card)", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>
                        {importAnalyticsData.events?.filter((e: any) => e.event === "whatsapp_click").length || 0}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Pedidos</div>
                    </div>
                  </div>

                  <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
                    {importAnalyticsData.daily_summary?.map((day: any, i: number) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", padding: "6px 10px",
                        borderBottom: "1px solid var(--dash-separator)", fontSize: 12,
                      }}>
                        <span style={{ color: "var(--dash-text-muted)" }}>{day.date}</span>
                        <span style={{ color: "var(--dash-text)" }}>{day.views} views · {day.clicks} cliques · {day.orders} pedidos</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleConfirmAnalyticsImport} disabled={importingAnalytics} style={{
                    width: "100%", padding: 14, borderRadius: 14,
                    background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                    fontSize: 14, fontWeight: 800, cursor: "pointer",
                    boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                    opacity: importingAnalytics ? 0.5 : 1,
                  }}>
                    {importingAnalytics ? "Importando..." : `✅ Importar ${importAnalyticsData.events?.length} eventos`}
                  </button>
                </>
              )}

              {/* DONE */}
              {importAnalyticsStep === "done" && (
                <div style={{ textAlign: "center", padding: "50px 20px" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 800 }}>Dados importados!</div>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 6 }}>Os dados históricos já aparecem nos gráficos.</div>
                  <button onClick={resetImport} style={{
                    marginTop: 16, padding: "10px 20px", borderRadius: 12,
                    background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>Fechar</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
