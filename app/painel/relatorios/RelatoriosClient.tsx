"use client";

import React, { useState } from "react";
import { Package, CheckCircle2, DollarSign, Target, CreditCard, Trophy, Download, Sun, TrendingUp, CalendarDays, ShoppingBag, AlertTriangle, Banknote } from "lucide-react";
import { formatCents } from "@/lib/money";

type DayData = { date: string; orders: number; revenue: number };
type Product = { name: string; qty: number; revenue: number };
type Payments = { cash: number; card: number; pix: number };

type PeriodStats = {
  orders: number;
  completed: number;
  revenue: number;
  avgTicket: number;
  payments: Payments;
  products: Product[];
};

type WeeklyData = PeriodStats & { byDay: DayData[] };
type MonthlyData = PeriodStats & {
  byDay: DayData[];
  growthOrders: number | null;
  growthRevenue: number | null;
};

interface Props {
  unitName: string;
  restaurantName: string;
  today: PeriodStats;
  weekly: WeeklyData;
  monthly: MonthlyData;
}

const TABS = ["Diário", "Semanal", "Mensal", "Produtos"] as const;
type Tab = (typeof TABS)[number];

const R = formatCents;

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600 text-xs">—</span>;
  const up = value >= 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${up ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
      {up ? "+" : ""}{value}%
    </span>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
      <div className="mb-2 text-gray-400">{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
      {sub && <div className="text-gray-600 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function BarChart({ data, valueKey, color = "bg-purple-500", formatter = String }: {
  data: DayData[];
  valueKey: "orders" | "revenue";
  color?: string;
  formatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const labels = data.map((d) => {
    const [, m, dd] = d.date.split("-");
    return `${dd}/${m}`;
  });
  return (
    <div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d, i) => {
          const h = Math.max((d[valueKey] / max) * 100, 2);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {formatter(d[valueKey])}
              </div>
              <div
                className={`w-full ${color} rounded-t transition-all`}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-gray-600 text-xs truncate">{l}</div>
        ))}
      </div>
    </div>
  );
}

function PaymentBars({ payments }: { payments: Payments }) {
  const total = payments.cash + payments.card + payments.pix;
  const bars = [
    { key: "cash", label: "Dinheiro", color: "bg-green-600", value: payments.cash },
    { key: "card", label: "Cartão", color: "bg-blue-600", value: payments.card },
    { key: "pix", label: "PIX", color: "bg-violet-600", value: payments.pix },
  ];
  return (
    <div className="space-y-3">
      {bars.map((b) => (
        <div key={b.key}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">{b.label}</span>
            <span className="text-gray-400">
              {R(b.value)} <span className="text-gray-600">({pct(b.value, total)}%)</span>
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${b.color} rounded-full`}
              style={{ width: `${pct(b.value, total)}%` }}
            />
          </div>
        </div>
      ))}
      {total === 0 && <p className="text-gray-600 text-sm">Nenhum pagamento registrado.</p>}
    </div>
  );
}

function downloadCSV(data: Product[], filename: string) {
  const header = "Produto,Quantidade,Faturamento (R$)\n";
  const rows = data
    .map((p) => `"${p.name}",${p.qty},${(p.revenue / 100).toFixed(2)}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosClient({ unitName, restaurantName, today, weekly, monthly }: Props) {
  const [tab, setTab] = useState<Tab>("Diário");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-black tracking-tight">Relatórios — {unitName}</h1>
        <p className="text-gray-400 text-sm">{restaurantName}</p>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/50 px-6 flex gap-1 sticky top-[73px] z-10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t
                ? "border-purple-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* DIÁRIO */}
        {tab === "Diário" && (
          <>
            <SectionTitle title="Hoje" sub={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Package size={22} />} label="Pedidos" value={String(today.orders)} />
              <StatCard icon={<CheckCircle2 size={22} />} label="Entregues" value={String(today.completed)} />
              <StatCard icon={<DollarSign size={22} />} label="Receita" value={R(today.revenue)} />
              <StatCard icon={<Target size={22} />} label="Ticket Médio" value={R(today.avgTicket)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Formas de Pagamento">
                <PaymentBars payments={today.payments} />
              </Card>
              <Card title="Produtos do Dia">
                <ProductList products={today.products.slice(0, 5)} />
              </Card>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => downloadCSV(today.products, `relatorio-diario-${new Date().toISOString().split("T")[0]}.csv`)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={13} /> Baixar CSV</span>
              </button>
            </div>
          </>
        )}

        {/* SEMANAL */}
        {tab === "Semanal" && (
          <>
            <SectionTitle title="Últimos 7 Dias" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Package size={22} />} label="Pedidos" value={String(weekly.orders)} />
              <StatCard icon={<CheckCircle2 size={22} />} label="Entregues" value={String(weekly.completed)} />
              <StatCard icon={<DollarSign size={22} />} label="Receita" value={R(weekly.revenue)} />
              <StatCard icon={<Target size={22} />} label="Ticket Médio" value={R(weekly.avgTicket)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Pedidos por Dia">
                <BarChart data={weekly.byDay} valueKey="orders" color="bg-blue-500" formatter={String} />
              </Card>
              <Card title="Receita por Dia">
                <BarChart data={weekly.byDay} valueKey="revenue" color="bg-green-500" formatter={R} />
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Formas de Pagamento">
                <PaymentBars payments={weekly.payments} />
              </Card>
              <Card title="Top Produtos (7d)">
                <ProductList products={weekly.products.slice(0, 5)} />
              </Card>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => downloadCSV(weekly.products, `relatorio-semanal.csv`)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={13} /> Baixar CSV</span>
              </button>
            </div>
          </>
        )}

        {/* MENSAL */}
        {tab === "Mensal" && (
          <>
            <SectionTitle title="Últimos 30 Dias" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                <div className="mb-2 text-gray-400"><Package size={22} /></div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{monthly.orders}</span>
                  <GrowthBadge value={monthly.growthOrders} />
                </div>
                <div className="text-gray-400 text-sm mt-1">Pedidos</div>
              </div>
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                <div className="mb-2 text-gray-400"><DollarSign size={22} /></div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-black text-white">{R(monthly.revenue)}</span>
                  <GrowthBadge value={monthly.growthRevenue} />
                </div>
                <div className="text-gray-400 text-sm mt-1">Receita</div>
              </div>
              <StatCard icon={<CheckCircle2 size={22} />} label="Entregues" value={String(monthly.completed)} />
              <StatCard icon={<Target size={22} />} label="Ticket Médio" value={R(monthly.avgTicket)} />
            </div>

            <Card title="Pedidos — 30 Dias">
              <BarChart data={monthly.byDay} valueKey="orders" color="bg-purple-500" formatter={String} />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Formas de Pagamento">
                <PaymentBars payments={monthly.payments} />
              </Card>
              <Card title="Top Produtos (30d)">
                <ProductList products={monthly.products.slice(0, 5)} />
              </Card>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => downloadCSV(monthly.products, `relatorio-mensal.csv`)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={13} /> Baixar CSV</span>
              </button>
            </div>
          </>
        )}

        {/* PRODUTOS */}
        {tab === "Produtos" && (
          <>
            <SectionTitle title="Análise de Produtos" sub="Baseado nos últimos 30 dias" />

            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-gray-200">Ranking de Vendas</h3>
                <button
                  onClick={() => downloadCSV(monthly.products, "produtos.csv")}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Download size={12} /> CSV</span>
                </button>
              </div>
              {monthly.products.length === 0 ? (
                <p className="text-gray-600 text-sm p-6">Nenhum pedido no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-3 text-left">#</th>
                        <th className="px-6 py-3 text-left">Produto</th>
                        <th className="px-6 py-3 text-right">Qtd</th>
                        <th className="px-6 py-3 text-right">Faturamento</th>
                        <th className="px-6 py-3 text-right">% do total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.products.map((p, i) => {
                        const totalQty = monthly.products.reduce((s, x) => s + x.qty, 0);
                        const share = pct(p.qty, totalQty);
                        return (
                          <tr key={p.name} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-3 text-gray-500">{i + 1}</td>
                            <td className="px-6 py-3 font-medium text-white">{p.name}</td>
                            <td className="px-6 py-3 text-right text-gray-300">{p.qty}</td>
                            <td className="px-6 py-3 text-right text-green-400 font-semibold">{R(p.revenue)}</td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${share}%` }} />
                                </div>
                                <span className="text-gray-500 text-xs w-8 text-right">{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom performers */}
            {monthly.products.length > 5 && (
              <Card title="Produtos com Baixo Desempenho">
                <div className="space-y-2">
                  {monthly.products.slice(-3).reverse().map((p) => (
                    <div key={p.name} className="flex justify-between text-sm">
                      <span className="text-gray-400">{p.name}</span>
                      <span className="text-gray-600">{p.qty} pedidos</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 text-xs mt-3">
                  Considere promoção ou desativação desses itens.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {sub && <p className="text-gray-500 text-sm mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
      <h3 className="font-bold text-gray-300 text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-gray-600 text-sm">Nenhum produto no período.</p>;
  }
  const maxQty = products[0]?.qty ?? 1;
  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">
              <span className="text-gray-600 mr-1">#{i + 1}</span> {p.name}
            </span>
            <span className="text-gray-500">{p.qty}×</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(p.qty / maxQty) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
