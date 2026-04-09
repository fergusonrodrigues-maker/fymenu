"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Unit } from "../types";

const supabase = createClient();

const TABS = ["Geral", "Produtos", "IA"] as const;
type Tab = typeof TABS[number];

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
  const [showImportAnalytics, setShowImportAnalytics] = useState(false);
  const [importAnalyticsStep, setImportAnalyticsStep] = useState<"upload" | "processing" | "preview" | "done">("upload");
  const [importAnalyticsData, setImportAnalyticsData] = useState<any>(null);
  const [importingAnalytics, setImportingAnalytics] = useState(false);
  const [analyticsText, setAnalyticsText] = useState("");
  const analyticsFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unit) return;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("menu_events")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unit.id)
      .eq("event", "ifood_click")
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => setIfoodClicks(count ?? 0));
  }, [unit]);

  const stats = [
    { label: "Visitas ao cardápio", value: analytics.views, icon: "👁", color: "#00ffae", desc: "últimos 7 dias" },
    { label: "Cliques em produtos", value: analytics.clicks, icon: "👆", color: "#60a5fa", desc: "últimos 7 dias" },
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
      .eq("event_type", "product_click")
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("menu_events")
      .select("product_id, meta")
      .eq("unit_id", unit.id)
      .eq("event", "product_view")
      .not("meta", "is", null)
      .gte("created_at", sevenDaysAgo)
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 3, padding: 3,
        background: "rgba(255,255,255,0.03)", borderRadius: 14,
        border: "1px solid var(--dash-card-border)",
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 11, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: tab === t ? 700 : 500,
              fontFamily: "inherit",
              color: tab === t ? "#000" : "var(--dash-text-muted)",
              background: tab === t ? "var(--dash-accent-gradient)" : "transparent",
              transition: "all 0.25s ease",
              textShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* PDF download — MenuPro/Business only */}
      {(restaurant?.plan === "menupro" || restaurant?.plan === "business") && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.04)", color: "var(--dash-text-muted)", fontSize: 12,
              boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
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
          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Carregando...</div>
          ) : topProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)", fontSize: 13 }}>
              Nenhum dado de cliques ainda. Os produtos aparecem aqui conforme os clientes interagem com o cardápio.
            </div>
          ) : (
            topProducts.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: "1px solid var(--dash-card-border)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: i < 3 ? "rgba(0,255,174,0.1)" : "var(--dash-card)",
                  color: i < 3 ? "#00ffae" : "var(--dash-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800,
                }}>{i + 1}</div>
                {p.thumb && <img src={p.thumb} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                </div>
                <div style={{ color: "#00ffae", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{p.count}</div>
              </div>
            ))
          )}

          {/* Product Attention Time */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>⏱️ Product Attention Time</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 12 }}>
              Tempo médio que cada cliente fica vendo o produto
            </div>

            {(restaurant?.plan === "menupro" || restaurant?.plan === "business") ? (
              loadingAttention ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--dash-text-muted)", fontSize: 12 }}>Carregando...</div>
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
                        background: "rgba(255,255,255,0.03)",
                        boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                        position: "relative", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${barWidth}%`,
                          background: i < 3 ? "rgba(0,255,174,0.04)" : "rgba(255,255,255,0.02)",
                          transition: "width 0.5s ease",
                        }} />
                        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: i < 3 ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
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
                    background: "rgba(255,255,255,0.04)", color: "var(--dash-text-muted)", fontSize: 12,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
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
                      background: "rgba(0,255,174,0.1)",
                      boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                      color: "#00ffae", fontSize: 14, fontWeight: 700,
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
                    boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
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
                <button onClick={resetImport}
                  style={{ background: "transparent", border: "none", color: "var(--dash-text-muted)", fontSize: 16, cursor: "pointer" }}>✕</button>
              </div>

              {/* UPLOAD */}
              {importAnalyticsStep === "upload" && (
                <>
                  <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 16 }}>
                    Importe dados históricos de outro sistema. A IA converte pro formato do FyMenu.
                  </div>

                  <div
                    onClick={() => analyticsFileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(0,255,174,0.3)"; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; handleAnalyticsFile(e.dataTransfer.files[0]); }}
                    style={{
                      border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 16,
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
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>ou cole os dados</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>

                  <textarea
                    placeholder={"Cole dados de analytics, ex:\n\nData, Visualizações, Cliques, Pedidos\n01/03/2026, 150, 45, 12\n02/03/2026, 180, 62, 18\n..."}
                    value={analyticsText}
                    onChange={(e) => setAnalyticsText(e.target.value)}
                    style={{
                      width: "100%", minHeight: 100, padding: 14, borderRadius: 14,
                      background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)",
                      fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6,
                    }}
                  />
                  {analyticsText.trim() && (
                    <button onClick={() => handleAnalyticsText(analyticsText)} style={{
                      marginTop: 10, width: "100%", padding: 12, borderRadius: 14,
                      background: "rgba(0,255,174,0.1)", border: "none", color: "var(--dash-accent)",
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
                    <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>
                        {importAnalyticsData.events?.filter((e: any) => e.event === "menu_view").length || 0}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Visualizações</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>
                        {importAnalyticsData.events?.filter((e: any) => e.event === "product_click").length || 0}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Cliques</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
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
                        borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 12,
                      }}>
                        <span style={{ color: "var(--dash-text-muted)" }}>{day.date}</span>
                        <span style={{ color: "var(--dash-text)" }}>{day.views} views · {day.clicks} cliques · {day.orders} pedidos</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleConfirmAnalyticsImport} disabled={importingAnalytics} style={{
                    width: "100%", padding: 14, borderRadius: 14,
                    background: "rgba(0,255,174,0.1)", border: "none", color: "var(--dash-accent)",
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
                    background: "rgba(0,255,174,0.1)", border: "none", color: "var(--dash-accent)",
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
