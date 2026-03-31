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
  analyticsData: {
    restaurants: Array<{ id: string; name: string; plan: string; status: string; created_at: string; trial_ends_at: string | null; free_access: boolean }>;
    units: Array<{ id: string; restaurant_id: string; slug: string; city: string | null; is_published: boolean; created_at: string }>;
    orders: Array<{ id: string; unit_id: string; created_at: string; status: string; total: number }>;
    events: Array<{ id: string; unit_id: string; event: string; created_at: string }>;
  };
  crmData: {
    owners: Array<{
      id: string; name: string; plan: string; status: string;
      created_at: string; trial_ends_at: string | null; free_access: boolean;
      owner_id: string | null; owner_first_name: string | null; owner_last_name: string | null;
      owner_phone: string | null; owner_document: string | null; owner_address: string | null;
      whatsapp: string | null; instagram: string | null;
    }>;
    ordersByUnit: Array<{ unit_id: string; total: number; status: string }>;
    unitMapping: Array<{ id: string; restaurant_id: string; city: string | null; slug: string }>;
  };
}

const TABS = ["Visão Geral", "Usuários", "Faturamento", "Analytics", "CRM", "Controle"] as const;
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
  planCounts, statusCounts, cities, unitsByRestaurant, unitFeatures, user, analyticsData, crmData,
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

  // CRM state
  const [crmSearch, setCrmSearch] = useState("");

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
        {tab === "Analytics" && (() => {
          const now = Date.now();
          const MS_DAY = 86400000;

          // 1. Tempo médio no plano
          const planTenure: Record<string, number[]> = {};
          for (const r of analyticsData.restaurants) {
            const plan = r.plan ?? "basic";
            const days = Math.floor((now - new Date(r.created_at).getTime()) / MS_DAY);
            if (!planTenure[plan]) planTenure[plan] = [];
            planTenure[plan].push(days);
          }
          const planTenureAvg = Object.entries(planTenure).map(([plan, vals]) => ({
            plan,
            avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          })).sort((a, b) => b.avg - a.avg);

          // 2. Status counts
          const statusMap: Record<string, number> = {};
          for (const r of analyticsData.restaurants) {
            statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
          }
          const totalR = analyticsData.restaurants.length || 1;
          const statusColors: Record<string, string> = {
            active: "bg-green-500",
            trial: "bg-yellow-500",
            paused: "bg-orange-500",
            canceled: "bg-red-500",
          };
          const statusLabels: Record<string, string> = {
            active: "Ativo",
            trial: "Trial",
            paused: "Pausado",
            canceled: "Cancelado",
          };

          // 3. Crescimento últimos 30 dias
          const growthMap: Record<string, number> = {};
          const cutoff = now - 30 * MS_DAY;
          for (const r of analyticsData.restaurants) {
            const t = new Date(r.created_at).getTime();
            if (t >= cutoff) {
              const day = new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              growthMap[day] = (growthMap[day] ?? 0) + 1;
            }
          }
          const growthData: Array<{ label: string; value: number }> = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now - i * MS_DAY);
            const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            growthData.push({ label, value: growthMap[label] ?? 0 });
          }

          // 4. Clientes por cidade
          const cityMap: Record<string, number> = {};
          for (const u of analyticsData.units) {
            const c = u.city?.trim() || "Não informado";
            cityMap[c] = (cityMap[c] ?? 0) + 1;
          }
          const cityData = Object.entries(cityMap)
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          const maxCity = cityData[0]?.count || 1;

          // 5. Atividade por restaurante
          const unitToRestaurant: Record<string, string> = {};
          for (const u of analyticsData.units) unitToRestaurant[u.id] = u.restaurant_id;
          const ordersByRestaurant: Record<string, number> = {};
          for (const o of analyticsData.orders) {
            const rid = unitToRestaurant[o.unit_id];
            if (rid) ordersByRestaurant[rid] = (ordersByRestaurant[rid] ?? 0) + 1;
          }
          const eventsByRestaurant: Record<string, number> = {};
          for (const e of analyticsData.events) {
            const rid = unitToRestaurant[e.unit_id];
            if (rid) eventsByRestaurant[rid] = (eventsByRestaurant[rid] ?? 0) + 1;
          }
          const activityTable = analyticsData.restaurants.map((r) => ({
            id: r.id,
            name: r.name,
            plan: r.plan ?? "basic",
            status: r.status,
            orders: ordersByRestaurant[r.id] ?? 0,
            events: eventsByRestaurant[r.id] ?? 0,
            daysActive: Math.floor((now - new Date(r.created_at).getTime()) / MS_DAY),
          })).sort((a, b) => b.orders - a.orders).slice(0, 20);

          return (
            <div className="space-y-6">
              {/* Tempo Médio no Plano */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">📅 Tempo Médio no Plano</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {planTenureAvg.map(({ plan, avg }) => (
                    <div key={plan} className="bg-gray-800/60 rounded-xl p-4 text-center">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{plan}</p>
                      <p className="text-2xl font-black text-purple-300">{avg}</p>
                      <p className="text-gray-500 text-xs">dias</p>
                    </div>
                  ))}
                  {planTenureAvg.length === 0 && <p className="text-gray-600 text-sm col-span-3">Sem dados.</p>}
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">⚡ Tempo Ativo vs Inativo</h3>
                <div className="space-y-3">
                  {["active", "trial", "paused", "canceled"].map((s) => {
                    const count = statusMap[s] ?? 0;
                    const pct = Math.round((count / totalR) * 100);
                    return (
                      <div key={s}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{statusLabels[s] ?? s}</span>
                          <span className="text-gray-400">{count} <span className="text-gray-600">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${statusColors[s] ?? "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Crescimento 30d */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">📈 Crescimento de Cadastros (últimos 30 dias)</h3>
                <BarChart data={growthData} />
              </div>

              {/* Clientes por Cidade */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">🌆 Clientes por Cidade (top 10)</h3>
                {cityData.length === 0 ? (
                  <p className="text-gray-600 text-sm">Sem dados de cidade.</p>
                ) : (
                  <div className="space-y-3">
                    {cityData.map(({ city, count }) => {
                      const pct = Math.round((count / maxCity) * 100);
                      return (
                        <div key={city}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{city}</span>
                            <span className="text-gray-400 font-medium">{count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Atividade por Restaurante */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">🏃 Atividade por Restaurante (top 20)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                        <th className="text-left pb-3 pr-4">Nome</th>
                        <th className="text-left pb-3 pr-4">Plano</th>
                        <th className="text-right pb-3 pr-4">Pedidos</th>
                        <th className="text-right pb-3 pr-4">Eventos</th>
                        <th className="text-right pb-3 pr-4">Dias ativo</th>
                        <th className="text-left pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityTable.map((r) => (
                        <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-2.5 pr-4 text-gray-300 truncate max-w-[160px]">{r.name}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[r.plan] ?? "bg-gray-700 text-gray-300"}`}>{r.plan}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-right text-gray-300 font-medium">{r.orders}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-400">{r.events}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-400">{r.daysActive}</td>
                          <td className="py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] ?? "bg-gray-700 text-gray-300"}`}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Produtos */}
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
          );
        })()}

        {/* CRM */}
        {tab === "CRM" && (() => {
          const unitToRestaurant: Record<string, string> = {};
          for (const u of crmData.unitMapping) unitToRestaurant[u.id] = u.restaurant_id;

          const revenueByRestaurant: Record<string, number> = {};
          const orderCountByRestaurant: Record<string, number> = {};
          for (const order of crmData.ordersByUnit) {
            const restId = unitToRestaurant[order.unit_id];
            if (restId) {
              revenueByRestaurant[restId] = (revenueByRestaurant[restId] ?? 0) + order.total;
              orderCountByRestaurant[restId] = (orderCountByRestaurant[restId] ?? 0) + 1;
            }
          }

          const cityByRestaurant: Record<string, string> = {};
          for (const u of crmData.unitMapping) {
            if (u.city) cityByRestaurant[u.restaurant_id] = u.city;
          }

          const filteredOwners = crmData.owners.filter((o) => {
            if (!crmSearch) return true;
            const s = crmSearch.toLowerCase();
            const ownerName = [o.owner_first_name, o.owner_last_name].filter(Boolean).join(" ").toLowerCase();
            const city = (cityByRestaurant[o.id] ?? "").toLowerCase();
            return (
              ownerName.includes(s) ||
              o.name.toLowerCase().includes(s) ||
              city.includes(s) ||
              (o.owner_phone ?? "").includes(s) ||
              (o.whatsapp ?? "").includes(s)
            );
          });

          const totalOwners = crmData.owners.filter((o) => o.owner_id).length;
          const withPhone = crmData.owners.filter((o) => o.owner_phone || o.whatsapp).length;
          const uniqueCities = new Set(Object.values(cityByRestaurant).filter(Boolean)).size;
          const totalRevenue = Object.values(revenueByRestaurant).reduce((s, v) => s + v, 0);

          return (
            <div className="space-y-6">
              {/* Resumo rápido */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "👤", label: "Total de Donos", value: String(totalOwners), sub: "com cadastro", color: "text-purple-400" },
                  { icon: "📞", label: "Com Telefone", value: String(withPhone), sub: "contato disponível", color: "text-green-400" },
                  { icon: "🏙️", label: "Cidades", value: String(uniqueCities), sub: "cobertura", color: "text-blue-400" },
                  { icon: "💵", label: "Faturamento Total", value: fmt(totalRevenue), sub: "pedidos confirmados", color: "text-yellow-400" },
                ].map(({ icon, label, value, sub, color }) => (
                  <div key={label} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Busca */}
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou cidade..."
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-purple-500"
              />

              {/* Tabela */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Clientes FyMenu</h3>
                  <span className="text-gray-500 text-xs">{filteredOwners.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Dono</th>
                        <th className="px-4 py-3 text-left">Restaurante</th>
                        <th className="px-4 py-3 text-left">Cidade</th>
                        <th className="px-4 py-3 text-left">Plano</th>
                        <th className="px-4 py-3 text-left">Telefone</th>
                        <th className="px-4 py-3 text-right">Faturamento</th>
                        <th className="px-4 py-3 text-right">Pedidos</th>
                        <th className="px-4 py-3 text-left">Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOwners.map((o) => {
                        const ownerName = [o.owner_first_name, o.owner_last_name].filter(Boolean).join(" ") || "—";
                        const city = cityByRestaurant[o.id] ?? "—";
                        const phone = o.owner_phone || o.whatsapp;
                        const revenue = revenueByRestaurant[o.id] ?? 0;
                        const orders = orderCountByRestaurant[o.id] ?? 0;
                        return (
                          <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-4 py-2.5 text-gray-300">{ownerName}</td>
                            <td className="px-4 py-2.5 text-gray-300 max-w-[160px] truncate">{o.name}</td>
                            <td className="px-4 py-2.5 text-gray-400">{city}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[o.plan] ?? "bg-gray-700 text-gray-300"}`}>{o.plan ?? "basic"}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              {phone ? (
                                <a href={`tel:${phone}`} className="text-green-400 hover:text-green-300 text-xs">{phone}</a>
                              ) : (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-300 font-medium">{fmt(revenue)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{orders}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Produtos */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">🏆 Top 20 Produtos (geral)</h3>
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
          );
        })()}

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

function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: 120 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-purple-500/60 rounded-t"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
          />
          <span className="text-gray-500 text-[9px] mt-1 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
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
