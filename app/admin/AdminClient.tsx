"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

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
  free_access: boolean | null;
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
  planCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  cities: { city: string; count: number }[];
  unitsByRestaurant: Record<string, string>;
  unitFeatures: { unit_id: string; feature: string; enabled: boolean }[];
  user: { email: string; id: string } | null;
}

const TABS = ["Visão Geral", "Usuários", "Faturamento", "Analytics", "Controle"] as const;
type Tab = (typeof TABS)[number];

const PLAN_PRICES: Record<string, number> = {
  menu: 9700,
  menupro: 19700,
  business: 39700,
};

const AVAILABLE_FEATURES = [
  "orders",
  "delivery",
  "pdv",
  "kitchen_display",
  "stock",
  "staff",
  "tv_menu",
  "reservations",
];

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const PLAN_BADGE: Record<string, string> = {
  basic: "bg-gray-700 text-gray-300",
  menu: "bg-gray-700 text-gray-300",
  menupro: "bg-blue-900/60 text-blue-300 border border-blue-700/50",
  pro: "bg-blue-900/60 text-blue-300 border border-blue-700/50",
  business: "bg-purple-900/60 text-purple-300 border border-purple-700/50",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-900/40 text-green-300",
  trial: "bg-yellow-900/40 text-yellow-300",
  paused: "bg-orange-900/40 text-orange-300",
  canceled: "bg-red-900/40 text-red-300",
  confirmed: "bg-green-900/40 text-green-300",
  pending: "bg-yellow-900/40 text-yellow-300",
};

// ─── Manage Panel ────────────────────────────────────────────────────────────
function ManagePanel({
  restaurant,
  unitId,
  features,
  onClose,
  onUpdated,
}: {
  restaurant: Restaurant;
  unitId: string | undefined;
  features: { feature: string; enabled: boolean }[];
  onClose: () => void;
  onUpdated: (id: string, updates: Partial<Restaurant>) => void;
}) {
  const [plan, setPlan] = useState(restaurant.plan ?? "menu");
  const [status, setStatus] = useState(restaurant.status);
  const [freeAccess, setFreeAccess] = useState(!!restaurant.free_access);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>(
    () => {
      const m: Record<string, boolean> = {};
      for (const f of AVAILABLE_FEATURES) {
        const found = features.find((x) => x.feature === f);
        m[f] = found ? found.enabled : true;
      }
      return m;
    }
  );

  async function call(endpoint: string, body: Record<string, unknown>) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function savePlan() {
    setSaving("plan");
    const r = await call("/api/admin/update-restaurant", { restaurantId: restaurant.id, plan });
    setSaving(null);
    if (r.success) { setMsg({ text: "Plano salvo!", ok: true }); onUpdated(restaurant.id, { plan }); }
    else setMsg({ text: r.error ?? "Erro", ok: false });
  }

  async function saveStatus() {
    setSaving("status");
    const r = await call("/api/admin/update-restaurant", { restaurantId: restaurant.id, status });
    setSaving(null);
    if (r.success) { setMsg({ text: "Status salvo!", ok: true }); onUpdated(restaurant.id, { status }); }
    else setMsg({ text: r.error ?? "Erro", ok: false });
  }

  async function toggleFreeAccess(val: boolean) {
    setFreeAccess(val);
    setSaving("free");
    const r = await call("/api/admin/update-restaurant", { restaurantId: restaurant.id, free_access: val });
    setSaving(null);
    if (r.success) {
      setMsg({ text: val ? "Acesso grátis ativado!" : "Acesso grátis removido", ok: true });
      onUpdated(restaurant.id, { free_access: val, status: val ? "active" : status });
      if (val) setStatus("active");
    } else setMsg({ text: r.error ?? "Erro", ok: false });
  }

  async function deactivate() {
    setSaving("deactivate");
    const r = await call("/api/admin/update-restaurant", { restaurantId: restaurant.id, status: "canceled" });
    setSaving(null);
    if (r.success) {
      setMsg({ text: "Conta desativada.", ok: true });
      onUpdated(restaurant.id, { status: "canceled" });
      setStatus("canceled");
      setConfirmDeactivate(false);
    } else setMsg({ text: r.error ?? "Erro", ok: false });
  }

  async function toggleFeature(feature: string, enabled: boolean) {
    if (!unitId) return;
    setLocalFeatures((prev) => ({ ...prev, [feature]: enabled }));
    await call("/api/admin/toggle-feature", { unitId, feature, enabled });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-950 border-l border-gray-800 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
          <div>
            <h2 className="font-black text-white text-lg">{restaurant.name}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{restaurant.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Feedback msg */}
          {msg && (
            <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${msg.ok ? "bg-green-900/40 text-green-300 border border-green-800/50" : "bg-red-900/40 text-red-300 border border-red-800/50"}`}>
              {msg.text}
            </div>
          )}

          {/* Plano */}
          <Section title="Plano">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
            >
              <option value="menu">menu</option>
              <option value="menupro">menupro</option>
              <option value="business">business</option>
              <option value="basic">basic (legado)</option>
              <option value="pro">pro (legado)</option>
            </select>
            <ActionBtn onClick={savePlan} loading={saving === "plan"} color="purple">
              Salvar plano
            </ActionBtn>
          </Section>

          {/* Status */}
          <Section title="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
            >
              <option value="active">active</option>
              <option value="trial">trial</option>
              <option value="paused">paused</option>
              <option value="canceled">canceled</option>
            </select>
            <ActionBtn onClick={saveStatus} loading={saving === "status"} color="purple">
              Salvar status
            </ActionBtn>
          </Section>

          {/* Acesso grátis */}
          <Section title="Acesso Grátis">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Login grátis (sem cobrança)</span>
              <button
                onClick={() => toggleFreeAccess(!freeAccess)}
                disabled={saving === "free"}
                className={`relative w-11 h-6 rounded-full transition-colors ${freeAccess ? "bg-green-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${freeAccess ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <p className="text-xs text-gray-600 mt-1">Quando ativado, seta status = active e marca free_access = true</p>
          </Section>

          {/* Ver detalhes */}
          <Section title="Detalhes">
            <a
              href={`/admin/${restaurant.id}`}
              className="block w-full text-center py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm font-semibold text-gray-200 transition-colors"
            >
              Ver página do restaurante →
            </a>
          </Section>

          {/* Feature flags */}
          {unitId && (
            <Section title="Feature Flags">
              <div className="space-y-2">
                {AVAILABLE_FEATURES.map((feat) => (
                  <label key={feat} className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-sm text-gray-300 font-mono">{feat}</span>
                    <button
                      onClick={() => toggleFeature(feat, !localFeatures[feat])}
                      className={`relative w-10 h-5 rounded-full transition-colors ${localFeatures[feat] ? "bg-purple-600" : "bg-gray-700"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${localFeatures[feat] ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                ))}
              </div>
              {!unitId && <p className="text-xs text-gray-600">Sem unidade cadastrada</p>}
            </Section>
          )}

          {/* Desativar */}
          <Section title="Zona de Perigo">
            {!confirmDeactivate ? (
              <button
                onClick={() => setConfirmDeactivate(true)}
                className="w-full py-2.5 rounded-xl bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-400 text-sm font-semibold transition-colors"
              >
                Desativar conta
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-400">Tem certeza? O cardápio ficará offline.</p>
                <div className="flex gap-2">
                  <button
                    onClick={deactivate}
                    disabled={saving === "deactivate"}
                    className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {saving === "deactivate" ? "..." : "Confirmar"}
                  </button>
                  <button
                    onClick={() => setConfirmDeactivate(false)}
                    className="flex-1 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
      <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, loading, color, children,
}: {
  onClick: () => void; loading: boolean; color: "purple" | "green" | "red"; children: React.ReactNode;
}) {
  const colors = {
    purple: "bg-purple-700 hover:bg-purple-600 text-white",
    green: "bg-green-700 hover:bg-green-600 text-white",
    red: "bg-red-700 hover:bg-red-600 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? "Salvando..." : children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminClient({
  stats, restaurants, payments, topProducts,
  planCounts, statusCounts, cities, unitsByRestaurant, unitFeatures, user,
}: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("Visão Geral");
  const [managingId, setManagingId] = useState<string | null>(null);
  const [localRestaurants, setLocalRestaurants] = useState(restaurants);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Minha Conta state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Controle tab state
  const [trialRestaurantId, setTrialRestaurantId] = useState("");
  const [trialDays, setTrialDays] = useState("7");
  const [trialMsg, setTrialMsg] = useState<string | null>(null);
  const [cacheUnitId, setCacheUnitId] = useState("");
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const ticketMedio = stats.totalOrders > 0 ? stats.revenue30d / stats.totalOrders : 0;
  const taxaAtividade =
    stats.totalRestaurants > 0
      ? Math.round((stats.activeRestaurants / stats.totalRestaurants) * 100)
      : 0;

  const managingRestaurant = managingId ? localRestaurants.find((r) => r.id === managingId) : null;

  const filteredRestaurants = useMemo(() => {
    return localRestaurants.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPlan !== "all" && (r.plan ?? "basic") !== filterPlan) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [localRestaurants, search, filterPlan, filterStatus]);

  function handleUpdated(id: string, updates: Partial<Restaurant>) {
    setLocalRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? "",
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError("Senha atual incorreta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }

      setPasswordSuccess("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Erro ao alterar senha.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function addTrialDays() {
    if (!trialRestaurantId.trim()) return;
    // Extend trial by updating trial_ends_at
    const days = parseInt(trialDays) || 7;
    const newDate = new Date(Date.now() + days * 86400000).toISOString();
    const res = await fetch("/api/admin/update-restaurant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: trialRestaurantId, status: "trial", trial_ends_at: newDate }),
    });
    const data = await res.json();
    setTrialMsg(data.success ? `+${days} dias adicionados!` : data.error ?? "Erro");
  }

  const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => {
    return sum + (PLAN_PRICES[plan] ?? 0) * count;
  }, 0);

  const uniquePlans = [...new Set(localRestaurants.map((r) => r.plan ?? "basic"))];
  const uniqueStatuses = [...new Set(localRestaurants.map((r) => r.status))];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight">📊 Painel Admin</h1>
          <p className="text-gray-400 text-sm">Plataforma FyMenu — painel administrativo</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-bold uppercase tracking-widest">
            ADMIN
          </span>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/admin/login";
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600 text-xs transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
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
        {tab === "Visão Geral" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="👥" label="Total de Restaurantes" value={stats.totalRestaurants.toLocaleString("pt-BR")} sub="na plataforma" color="text-blue-400" />
              <StatCard icon="📈" label="Novos (7 dias)" value={stats.activeRestaurants.toLocaleString("pt-BR")} sub="trial ou ativos recentemente" color="text-green-400" />
              <StatCard icon="📊" label="Total de Pedidos" value={stats.totalOrders.toLocaleString("pt-BR")} sub="todos os confirmados" color="text-yellow-400" />
              <StatCard icon="💰" label="Receita (30d)" value={fmt(stats.revenue30d)} sub="via PDV registrado" color="text-purple-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon="🎯" label="Ticket Médio" value={fmt(ticketMedio)} sub="receita / pedidos" color="text-orange-400" />
              <StatCard icon="📊" label="Taxa de Atividade" value={`${taxaAtividade}%`} sub="novos / total nos últimos 7d" color="text-cyan-400" />
            </div>
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
          <div className="space-y-4">
            {/* Search & filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Buscar restaurante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-48 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="all">Todos os Planos</option>
                {uniquePlans.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="all">Todos os Status</option>
                {uniqueStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-gray-500 text-sm whitespace-nowrap">
                {filteredRestaurants.length} de {localRestaurants.length} restaurantes
              </span>
            </div>

            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
              {localRestaurants.length === 0 ? (
                <p className="text-gray-600 text-sm p-6">
                  Nenhum restaurante encontrado.
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
                        <th className="px-6 py-3 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRestaurants.map((r) => (
                        <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-3 font-medium text-white">
                            {r.name}
                            {r.free_access && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-green-900/40 text-green-400 border border-green-800/50">grátis</span>
                            )}
                          </td>
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
                          <td className="px-6 py-3">
                            <button
                              onClick={() => setManagingId(r.id)}
                              className="px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/50 text-purple-300 text-xs font-semibold transition-colors"
                            >
                              Gerenciar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BILLING */}
        {tab === "Faturamento" && (
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
                          {p.method === "cash" ? "💵 Dinheiro" : p.method === "card" ? "💳 Cartão" : p.method === "pix" ? "📲 PIX" : p.method ?? "—"}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[p.status ?? "confirmed"] ?? "bg-gray-700 text-gray-400"}`}>
                            {p.status ?? "confirmed"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-green-400">{fmt(p.amount)}</td>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPlaceholder title="📈 Crescimento de Restaurantes (30d)" />
              <ChartPlaceholder title="💰 Receita Mensal (6 meses)" />
            </div>
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
                          <span className="text-gray-300"><span className="text-gray-500 mr-2">#{i + 1}</span>{p.name}</span>
                          <span className="text-gray-400 font-medium">{p.count} pedidos</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTROLE */}
        {tab === "Controle" && (
          <div className="space-y-6">
            {/* Minha Conta */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 mb-6">
              <h3 className="font-bold text-gray-200 mb-4">🔐 Minha Conta</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider">Email do admin</label>
                  <p className="text-gray-300 text-sm mt-1">{user?.email ?? "—"}</p>
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Alterar senha</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="password"
                      placeholder="Senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirmar nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                    {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
                    {passwordSuccess && <p className="text-green-400 text-xs">{passwordSuccess}</p>}
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {changingPassword ? "Salvando..." : "Alterar Senha"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trial */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 space-y-3">
                <h3 className="font-bold text-gray-200 text-sm">⏳ Adicionar Dias de Trial</h3>
                <input
                  placeholder="Restaurant ID (uuid)"
                  value={trialRestaurantId}
                  onChange={(e) => setTrialRestaurantId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    className="w-24 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <span className="text-gray-500 text-sm self-center">dias</span>
                  <button
                    onClick={addTrialDays}
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                {trialMsg && <p className="text-sm text-green-400">{trialMsg}</p>}
              </div>

              {/* Cache */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 space-y-3">
                <h3 className="font-bold text-gray-200 text-sm">🗑️ Limpar Cache de Cardápio</h3>
                <input
                  placeholder="Unit ID (uuid)"
                  value={cacheUnitId}
                  onChange={(e) => setCacheUnitId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none"
                />
                <button
                  onClick={async () => {
                    // Placeholder — implement cache clearing endpoint if needed
                    setCacheMsg("Cache limpo (simulado)");
                  }}
                  className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors"
                >
                  Limpar cache
                </button>
                {cacheMsg && <p className="text-sm text-green-400">{cacheMsg}</p>}
              </div>
            </div>

            {/* Resumo planos + MRR */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-200">📦 Distribuição por Plano</h3>
                <span className="text-purple-400 font-black text-lg">{fmt(mrr)} <span className="text-gray-500 text-sm font-normal">MRR est.</span></span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(planCounts).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                  <div key={plan} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className={`text-xs font-bold uppercase px-2 py-0.5 rounded inline-block mb-2 ${PLAN_BADGE[plan] ?? "bg-gray-700 text-gray-300"}`}>{plan}</div>
                    <div className="text-2xl font-black text-white">{count}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{PLAN_PRICES[plan] ? fmt(PLAN_PRICES[plan] * count) + "/mês" : "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status counts */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
              <h3 className="font-bold text-gray-200 mb-4">🔄 Distribuição por Status</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([st, count]) => (
                  <div key={st} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded inline-block mb-2 ${STATUS_BADGE[st] ?? "bg-gray-700 text-gray-300"}`}>{st}</div>
                    <div className="text-2xl font-black text-white">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cidades */}
            {cities.length > 0 && (
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">🏙️ Cidades ({cities.length})</h3>
                <div className="space-y-2">
                  {cities.map(({ city, count }) => {
                    const pct = Math.round((count / cities[0].count) * 100);
                    return (
                      <div key={city}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{city}</span>
                          <span className="text-gray-500">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manage slide-over */}
      {managingRestaurant && (
        <ManagePanel
          restaurant={managingRestaurant}
          unitId={unitsByRestaurant[managingRestaurant.id]}
          features={unitFeatures.filter((f) => f.unit_id === unitsByRestaurant[managingRestaurant.id])}
          onClose={() => setManagingId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
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
      <p className="text-gray-600 text-xs mt-3 text-center">Gráfico detalhado disponível com integração de analytics</p>
    </div>
  );
}
