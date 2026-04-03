"use client";

import { useState, useEffect } from "react";
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
}: {
  analytics: { views: number; clicks: number; orders: number };
  unit: Unit | null;
  products?: any[];
  categories?: any[];
}) {
  const [tab, setTab] = useState<Tab>("Geral");
  const [topProducts, setTopProducts] = useState<{ name: string; thumb: string; count: number }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

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
        </div>
      )}

      {/* ── IA ── */}
      {tab === "IA" && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Análise com IA</div>
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
        </div>
      )}
    </div>
  );
}
