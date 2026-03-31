"use client";

import { useState } from "react";
import { Unit, ReportData, ReportProduct, ReportPayments, DayData } from "../types";

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--dash-input-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)", fontSize: 16, boxSizing: "border-box",
  outline: "none",
};

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

export default function FinanceiroModal({ unit, analytics, reportData }: {
  unit: Unit | null;
  analytics: { views: number; clicks: number; orders: number };
  reportData: ReportData;
}) {
  const [tab, setTab] = useState<"diario" | "semanal" | "mensal" | "produtos" | "delivery">("diario");
  const [waCopied, setWaCopied] = useState(false);
  const [deliveryPlatform, setDeliveryPlatform] = useState("");
  const [deliveryLink, setDeliveryLink] = useState(unit?.delivery_link ?? "");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);

  const waLink = unit?.whatsapp ? `https://wa.me/55${unit.whatsapp.replace(/\D/g, "")}` : null;

  async function saveDeliveryLink() {
    if (!unit || !deliveryLink.trim()) return;
    setDeliverySaving(true);
    const { createClient: cc } = await import("@/lib/supabase/client");
    await cc().from("units").update({ delivery_link: deliveryLink.trim() }).eq("id", unit.id);
    setDeliverySaving(false);
    setDeliverySaved(true);
    setTimeout(() => setDeliverySaved(false), 2000);
  }

  const TABS = [
    { key: "diario" as const, label: "Diário" },
    { key: "semanal" as const, label: "Semanal" },
    { key: "mensal" as const, label: "Mensal" },
    { key: "produtos" as const, label: "Produtos" },
    { key: "delivery" as const, label: "Delivery" },
  ];

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

      {/* ── DELIVERY ── */}
      {tab === "delivery" && (
        <>
          {/* WhatsApp */}
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "16px", background: "var(--dash-card)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>WhatsApp</div>
            </div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 10 }}>
              Pedidos enviados automaticamente com rastreamento
            </div>
            {waLink ? (
              <>
                <div style={{
                  padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--dash-card-border)", fontSize: 12, color: "var(--dash-text-muted)",
                  fontFamily: "monospace", marginBottom: 8, wordBreak: "break-all",
                }}>{waLink}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(waLink); setWaCopied(true); setTimeout(() => setWaCopied(false), 1800); }}
                    style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: waCopied ? "rgba(0,255,174,0.15)" : "rgba(22,163,74,0.15)", color: waCopied ? "#00ffae" : "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {waCopied ? "✓ Copiado!" : "Copiar link"}
                  </button>
                  <a href="/painel" style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                    ✎ Editar número
                  </a>
                </div>
              </>
            ) : (
              <div style={{ color: "#f87171", fontSize: 12 }}>WhatsApp não configurado — edite na seção Unidade.</div>
            )}
          </div>

          {/* iFood / Delivery */}
          <div className="modal-neon-card" style={{ borderRadius: 14, padding: "16px", background: "var(--dash-card)", border: "1px solid rgba(234,88,12,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🛵</span>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>iFood / Delivery</div>
            </div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 10 }}>
              Configure o link da sua loja nas plataformas de delivery
            </div>
            <select
              value={deliveryPlatform}
              onChange={(e) => setDeliveryPlatform(e.target.value)}
              style={inp}
            >
              <option value="">Selecionar plataforma...</option>
              <option value="ifood">iFood</option>
              <option value="rappi">Rappi</option>
              <option value="99food">99Food</option>
              <option value="outro">Outro</option>
            </select>
            <input
              type="url"
              value={deliveryLink}
              onChange={(e) => { setDeliveryLink(e.target.value); setDeliverySaved(false); }}
              placeholder="Cole o link da sua loja"
              style={{ ...inp, marginTop: 8 }}
            />
            <button
              onClick={saveDeliveryLink}
              disabled={deliverySaving || !deliveryLink.trim()}
              style={{
                width: "100%", padding: "10px", borderRadius: 9, border: "none", marginTop: 8,
                background: deliverySaved ? "rgba(0,255,174,0.15)" : "rgba(234,88,12,0.15)",
                color: deliverySaved ? "#00ffae" : "#fb923c",
                fontSize: 13, fontWeight: 700, cursor: deliverySaving ? "not-allowed" : "pointer",
                opacity: deliverySaving ? 0.6 : 1,
              }}
            >
              {deliverySaved ? "✓ Salvo!" : deliverySaving ? "Salvando..." : "Salvar link"}
            </button>
          </div>
        </>
      )}

    </div>
  );
}
