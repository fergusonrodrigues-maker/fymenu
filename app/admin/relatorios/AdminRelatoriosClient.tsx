"use client";

import React from "react";
import { BarChart2, Sun, CalendarDays, Calendar, Store, CheckCircle2, AlertTriangle, Target, Trophy } from "lucide-react";

type GlobalStats = {
  totalRestaurants: number;
  activeRestaurants: number;
  totalOrders: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  revenue30d: number;
  revenueToday: number;
  revenueWeek: number;
  avgTicket: number;
};

type Restaurant = {
  id: string;
  name: string;
  plan: string | null;
  status: string;
  created_at: string;
  revenue30d: number;
  orders30d: number;
};

interface Props {
  global: GlobalStats;
  topRestaurants: Restaurant[];
  lowActivity: Array<{ id: string; name: string; status: string; created_at: string }>;
}

function R(cents: number) {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

const PLAN_COLORS: Record<string, string> = {
  pro: "bg-blue-900/60 text-blue-300 border border-blue-700/40",
  basic: "bg-gray-700 text-gray-300",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900/40 text-green-300",
  trial: "bg-yellow-900/40 text-yellow-300",
  paused: "bg-orange-900/40 text-orange-300",
  canceled: "bg-red-900/40 text-red-300",
};

function Big({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
      <div className="mb-2 flex text-gray-400">{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
      {sub && <div className="text-gray-600 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminRelatoriosClient({ global: g, topRestaurants, lowActivity }: Props) {
  const churnPct =
    g.totalRestaurants > 0
      ? Math.round(((g.totalRestaurants - g.activeRestaurants) / g.totalRestaurants) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Admin Relatórios</h1>
          <p className="text-gray-400 text-sm">Visão global da plataforma</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
          >
            ← Dashboard
          </a>
          <span className="px-3 py-1.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-bold uppercase tracking-widest">
            ADMIN
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* PEDIDOS GLOBAIS */}
        <section>
          <h2 className="text-lg font-bold text-gray-200 mb-4">Pedidos Globais</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Big icon={<BarChart2 size={20} />} label="Total Histórico" value={g.totalOrders.toLocaleString("pt-BR")} />
            <Big icon={<Sun size={20} />} label="Hoje" value={String(g.todayOrders)} sub={`Receita: ${R(g.revenueToday)}`} />
            <Big icon={<CalendarDays size={20} />} label="Esta Semana" value={String(g.weekOrders)} sub={`Receita: ${R(g.revenueWeek)}`} />
            <Big icon={<Calendar size={20} />} label="Este Mês (30d)" value={String(g.monthOrders)} sub={`Receita: ${R(g.revenue30d)}`} />
          </div>
        </section>

        {/* RESTAURANTES */}
        <section>
          <h2 className="text-lg font-bold text-gray-200 mb-4">Restaurantes</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Big icon={<Store size={20} />} label="Total" value={g.totalRestaurants.toLocaleString("pt-BR")} />
            <Big icon={<CheckCircle2 size={20} />} label="Ativos (10d)" value={String(g.activeRestaurants)} />
            <Big
              icon={<AlertTriangle size={20} />}
              label="Churn"
              value={`${churnPct}%`}
              sub={churnPct > 30 ? "Acima do esperado" : "Dentro do esperado"}
            />
            <Big icon={<Target size={20} />} label="Ticket Médio (30d)" value={R(g.avgTicket)} />
          </div>
        </section>

        {/* TOP 10 RESTAURANTS */}
        <section>
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="font-bold text-gray-200 flex items-center gap-2"><Trophy size={16} /> Top Restaurantes — Receita (30d)</h3>
            </div>
            {topRestaurants.length === 0 ? (
              <p className="text-gray-600 text-sm p-6">
                Sem dados — adicione SUPABASE_SERVICE_ROLE_KEY para ver todos os restaurantes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">#</th>
                      <th className="px-6 py-3 text-left">Restaurante</th>
                      <th className="px-6 py-3 text-left">Plano</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Pedidos (30d)</th>
                      <th className="px-6 py-3 text-right">Receita (30d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRestaurants.map((r, i) => (
                      <tr
                        key={r.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-3 text-gray-500 font-bold">
                          <span style={{ color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : undefined }}>#{i + 1}</span>
                        </td>
                        <td className="px-6 py-3 font-medium text-white">{r.name}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${PLAN_COLORS[r.plan ?? "basic"] ?? "bg-gray-700 text-gray-300"}`}>
                            {r.plan ?? "basic"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-gray-700 text-gray-400"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-gray-300">{r.orders30d}</td>
                        <td className="px-6 py-3 text-right font-semibold text-green-400">
                          {R(r.revenue30d)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* LOW ACTIVITY ALERTS */}
        {lowActivity.length > 0 && (
          <section>
            <div className="bg-orange-950/20 rounded-2xl border border-orange-800/40 p-6">
              <h3 className="font-bold text-orange-300 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> Restaurantes com Baixa Atividade ({lowActivity.length})
              </h3>
              <p className="text-orange-400/70 text-sm mb-4">
                Sem pedidos nos últimos 10 dias — considere entrar em contato.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowActivity.slice(0, 9).map((r) => (
                  <div
                    key={r.id}
                    className="bg-gray-900/60 rounded-xl border border-gray-800 px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-gray-200 text-sm font-medium">{r.name}</p>
                      <p className="text-gray-600 text-xs">Desde {fmtDate(r.created_at)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-gray-700 text-gray-400"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
