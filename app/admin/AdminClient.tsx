"use client";

import { useState } from "react";

type Stats = {
  totalRestaurants: number;
  activeRestaurants: number;
  totalOrders: number;
  revenue30d: number;
};

type Restaurant = {
  id: string;
  name: string;
  plan: string | null;
  status: string;
  created_at: string;
};

type Payment = {
  id: string;
  amount: number;
  method: string | null;
  status: string | null;
  processed_at: string | null;
};

type TopProduct = { name: string; count: number };

interface Props {
  stats: Stats;
  restaurants: Restaurant[];
  payments: Payment[];
  topProducts: TopProduct[];
}

const TABS = ["Overview", "Usuários", "Billing", "Analytics"] as const;
type Tab = (typeof TABS)[number];

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const PLAN_BADGE: Record<string, string> = {
  basic: "bg-gray-700 text-gray-300",
  pro: "bg-blue-900/60 text-blue-300 border border-blue-700/50",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-900/40 text-green-300",
  trial: "bg-yellow-900/40 text-yellow-300",
  paused: "bg-orange-900/40 text-orange-300",
  canceled: "bg-red-900/40 text-red-300",
  confirmed: "bg-green-900/40 text-green-300",
  pending: "bg-yellow-900/40 text-yellow-300",
};

export default function AdminClient({ stats, restaurants, payments, topProducts }: Props) {
  const [tab, setTab] = useState<Tab>("Overview");

  const ticketMedio = stats.totalOrders > 0 ? stats.revenue30d / stats.totalOrders : 0;
  const taxaAtividade =
    stats.totalRestaurants > 0
      ? Math.round((stats.activeRestaurants / stats.totalRestaurants) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight">📊 Admin Dashboard</h1>
          <p className="text-gray-400 text-sm">Plataforma FyMenu — visão geral</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-bold uppercase tracking-widest">
          ADMIN
        </span>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW */}
        {tab === "Overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="👥"
                label="Total de Restaurantes"
                value={stats.totalRestaurants.toLocaleString("pt-BR")}
                sub="na plataforma"
                color="text-blue-400"
              />
              <StatCard
                icon="📈"
                label="Novos (7 dias)"
                value={stats.activeRestaurants.toLocaleString("pt-BR")}
                sub="trial ou ativos recentemente"
                color="text-green-400"
              />
              <StatCard
                icon="📊"
                label="Total de Pedidos"
                value={stats.totalOrders.toLocaleString("pt-BR")}
                sub="todos os confirmados"
                color="text-yellow-400"
              />
              <StatCard
                icon="💰"
                label="Receita (30d)"
                value={fmt(stats.revenue30d)}
                sub="via PDV registrado"
                color="text-purple-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon="🎯"
                label="Ticket Médio"
                value={fmt(ticketMedio)}
                sub="receita / pedidos"
                color="text-orange-400"
              />
              <StatCard
                icon="📊"
                label="Taxa de Atividade"
                value={`${taxaAtividade}%`}
                sub="novos / total nos últimos 7d"
                color="text-cyan-400"
              />
            </div>

            {/* Recent payments summary */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
              <h3 className="font-bold text-gray-200 mb-4">Últimos Pagamentos</h3>
              {payments.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div className="flex gap-2 items-center">
                        <span className="text-gray-400">{fmtDate(p.processed_at)}</span>
                        <span className="text-gray-500">
                          {p.method === "cash" ? "💵 Dinheiro" : p.method === "card" ? "💳 Cartão" : "📲 PIX"}
                        </span>
                      </div>
                      <span className="text-green-400 font-semibold">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* USUÁRIOS */}
        {tab === "Usuários" && (
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="font-bold text-gray-200">
                Restaurantes ({restaurants.length})
              </h3>
            </div>
            {restaurants.length === 0 ? (
              <p className="text-gray-600 text-sm p-6">
                Sem dados — adicione SUPABASE_SERVICE_ROLE_KEY ao .env.local para ver todos os restaurantes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Restaurante</th>
                      <th className="px-6 py-3 text-left">Plano</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((r) => (
                      <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-3 font-medium text-white">{r.name}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${PLAN_BADGE[r.plan ?? "basic"] ?? "bg-gray-700 text-gray-300"}`}>
                            {r.plan ?? "basic"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[r.status] ?? "bg-gray-700 text-gray-400"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-400">{fmtDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BILLING */}
        {tab === "Billing" && (
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-200">Pagamentos Registrados</h3>
              <span className="text-gray-500 text-sm">{payments.length} registros</span>
            </div>
            {payments.length === 0 ? (
              <p className="text-gray-600 text-sm p-6">Nenhum pagamento registrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Data</th>
                      <th className="px-6 py-3 text-left">Método</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-3 text-gray-400">{fmtDate(p.processed_at)}</td>
                        <td className="px-6 py-3 text-gray-300">
                          {p.method === "cash"
                            ? "💵 Dinheiro"
                            : p.method === "card"
                            ? "💳 Cartão"
                            : p.method === "pix"
                            ? "📲 PIX"
                            : p.method ?? "—"}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[p.status ?? "confirmed"] ?? "bg-gray-700 text-gray-400"}`}>
                            {p.status ?? "confirmed"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-green-400">
                          {fmt(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS */}
        {tab === "Analytics" && (
          <div className="space-y-6">
            {/* Charts placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPlaceholder title="📈 Crescimento de Restaurantes (30d)" />
              <ChartPlaceholder title="💰 Receita Mensal (6 meses)" />
            </div>

            {/* Top Products */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
              <h3 className="font-bold text-gray-200 mb-4">🏆 Produtos Mais Pedidos</h3>
              {topProducts.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum pedido registrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => {
                    const maxCount = topProducts[0]?.count ?? 1;
                    const pct = Math.round((p.count / maxCount) * 100);
                    return (
                      <div key={p.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">
                            <span className="text-gray-500 mr-2">#{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="text-gray-400 font-medium">{p.count} pedidos</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-gray-300 text-sm font-semibold mt-1">{label}</div>
      <div className="text-gray-600 text-xs mt-0.5">{sub}</div>
    </div>
  );
}

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
      <h3 className="font-bold text-gray-300 mb-4 text-sm">{title}</h3>
      <div className="h-32 flex items-end gap-2">
        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 bg-purple-900/40 border border-purple-800/50 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="text-gray-600 text-xs mt-3 text-center">
        Gráfico detalhado disponível com integração de analytics
      </p>
    </div>
  );
}
