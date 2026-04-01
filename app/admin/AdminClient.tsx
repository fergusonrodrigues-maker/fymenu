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
  consumerData: {
    orders: Array<{
      id: string; unit_id: string; items: any; table_number: number | null;
      total: string; payment_method: string | null; status: string;
      notes: string | null; created_at: string;
    }>;
    events: Array<{
      id: string; unit_id: string; event: string;
      product_id: string | null; created_at: string;
    }>;
  };
  financeData: {
    orders: Array<{ total: string; created_at: string; unit_id: string; status: string }>;
    plans: Array<{ plan: string; status: string; free_access: boolean }>;
  };
  supportStaff: Array<{ id: string; email: string; name: string; role: string; is_active: boolean; permissions: Record<string, boolean>; created_at?: string; last_login_at?: string | null }>;
  photoData: {
    cities: Array<{ id: string; city: string; state: string; is_active: boolean }>;
    packages: Array<{ id: string; name: string; description: string | null; num_photos: number; includes_video: boolean; price: number; duration_minutes: number; is_active: boolean }>;
    sessions: Array<{
      id: string; restaurant_id: string; unit_id: string | null; package_id: string; city_id: string;
      status: string; scheduled_at: string | null; completed_at: string | null;
      photographer_name: string | null; partner_id: string | null; price_charged: number; payment_status: string;
      payment_method: string | null; notes: string | null; photos_delivered: number;
      created_at: string;
      photo_session_packages: { name: string } | null;
      photo_session_cities: { city: string; state: string } | null;
      partners: { name: string } | null;
    }>;
  };
  partnerData: {
    partners: Array<{
      id: string; name: string; email: string; phone: string | null;
      document: string | null; commission_percent: number; is_photographer: boolean;
      is_active: boolean; total_earned: number; total_paid: number;
      notes: string | null; created_at: string;
    }>;
    coupons: Array<{
      id: string; partner_id: string; code: string; discount_percent: number;
      discount_type: string; discount_value: number; trial_extra_days: number;
      max_uses: number | null; current_uses: number; is_active: boolean;
      expires_at: string | null; created_at: string;
      partners: { name: string } | null;
    }>;
    referrals: Array<{
      id: string; partner_id: string; restaurant_id: string; coupon_id: string | null;
      coupon_code: string | null; commission_percent: number; status: string; created_at: string;
      partners: { name: string } | null;
      restaurants: { name: string; plan: string; status: string } | null;
    }>;
    payouts: Array<{
      id: string; partner_id: string; amount: number; period_start: string;
      period_end: string; status: string; payment_method: string | null;
      paid_at: string | null; notes: string | null; created_at: string;
      partners: { name: string } | null;
    }>;
  };
}

const TABS = ["Visão Geral", "Usuários", "Faturamento", "Analytics", "CRM", "Parceiros", "Fotos", "Controle"] as const;
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

function fmtBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
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
  planCounts, statusCounts, cities, unitsByRestaurant, unitFeatures, user, analyticsData, crmData, consumerData, financeData, supportStaff: initialSupportStaff, photoData, partnerData,
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

  // Support staff state
  const [supportStaff, setSupportStaff] = useState(initialSupportStaff);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("support");
  const [staffPermissions, setStaffPermissions] = useState<Record<string, boolean>>({
    view_orders: true, view_products: true, view_units: true,
    view_crm: false, view_financial: false, edit_products: false, manage_features: false,
  });
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Photo sessions state
  const [photoTab, setPhotoTab] = useState<"sessoes" | "pacotes" | "cidades">("sessoes");
  const [photoCitiesState, setPhotoCitiesState] = useState(photoData.cities);
  const [photoPackagesState, setPhotoPackagesState] = useState(photoData.packages);
  const [photoSessionsState, setPhotoSessionsState] = useState(photoData.sessions);
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("GO");
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgPhotos, setPkgPhotos] = useState(20);
  const [pkgVideo, setPkgVideo] = useState(false);
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgDuration, setPkgDuration] = useState(60);
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessPartnerId, setSessPartnerId] = useState("");
  const [sessRestaurantId, setSessRestaurantId] = useState("");
  const [sessPackageId, setSessPackageId] = useState("");
  const [sessCityId, setSessCityId] = useState("");
  const [sessDate, setSessDate] = useState("");
  const [sessPhotographer, setSessPhotographer] = useState("");
  const [sessNotes, setSessNotes] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Partners state
  const [partnerTab, setPartnerTab] = useState<"parceiros" | "cupons" | "indicacoes" | "comissoes">("parceiros");
  const [partnersState, setPartnersState] = useState(partnerData.partners);
  const [couponsState, setCouponsState] = useState(partnerData.coupons);
  const [referralsState] = useState(partnerData.referrals);
  const [payoutsState, setPayoutsState] = useState(partnerData.payouts);
  // Add partner form
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerDocument, setPartnerDocument] = useState("");
  const [partnerCommission, setPartnerCommission] = useState(10);
  const [partnerIsPhotographer, setPartnerIsPhotographer] = useState(false);
  const [partnerNotes, setPartnerNotes] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");
  const [partnerError, setPartnerError] = useState<string | null>(null);
  // Add coupon form
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [couponPartnerId, setCouponPartnerId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountType, setCouponDiscountType] = useState("percent");
  const [couponValue, setCouponValue] = useState("");
  const [couponTrialDays, setCouponTrialDays] = useState(0);
  const [couponMaxUses, setCouponMaxUses] = useState("");
  const [couponExpiresAt, setCouponExpiresAt] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  // Add payout form
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [payoutPartnerId, setPayoutPartnerId] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutStart, setPayoutStart] = useState("");
  const [payoutEnd, setPayoutEnd] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutError, setPayoutError] = useState<string | null>(null);
  // Referrals filter
  const [referralFilterPartner, setReferralFilterPartner] = useState("all");

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

  async function photoApi(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/photo-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function handleAddSession() {
    if (!sessRestaurantId || !sessPackageId || !sessCityId) {
      setPhotoError("Restaurante, pacote e cidade são obrigatórios."); return;
    }
    setPhotoError(null);
    const res = await photoApi({ action: "add_session", restaurant_id: sessRestaurantId, package_id: sessPackageId, city_id: sessCityId, scheduled_at: sessDate || null, photographer_name: sessPhotographer || null, partner_id: sessPartnerId || null, notes: sessNotes || null });
    const json = await res.json();
    if (!res.ok) { setPhotoError(json.error); return; }
    setPhotoSessionsState((prev) => [json.session, ...prev]);
    setSessRestaurantId(""); setSessPackageId(""); setSessCityId(""); setSessDate(""); setSessPhotographer(""); setSessPartnerId(""); setSessNotes("");
    setShowAddSession(false);
  }

  async function handleUpdateSession(id: string, updates: Record<string, unknown>) {
    await photoApi({ action: "update_session", id, ...updates });
    setPhotoSessionsState((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
  }

  async function handleDeleteSession(id: string) {
    if (!confirm("Remover sessão?")) return;
    const res = await photoApi({ action: "delete_session", id });
    if (res.ok) setPhotoSessionsState((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddPackage() {
    if (!pkgName || !pkgPrice) { setPhotoError("Nome e preço são obrigatórios."); return; }
    setPhotoError(null);
    const res = await photoApi({ action: "add_package", name: pkgName, description: pkgDesc || null, num_photos: pkgPhotos, includes_video: pkgVideo, price: parseInt(pkgPrice), duration_minutes: pkgDuration });
    const json = await res.json();
    if (!res.ok) { setPhotoError(json.error); return; }
    setPhotoPackagesState((prev) => [...prev, json.package]);
    setPkgName(""); setPkgDesc(""); setPkgPhotos(20); setPkgVideo(false); setPkgPrice(""); setPkgDuration(60);
    setShowAddPackage(false);
  }

  async function handleTogglePackage(id: string, active: boolean) {
    await photoApi({ action: "update_package", id, is_active: active });
    setPhotoPackagesState((prev) => prev.map((p) => p.id === id ? { ...p, is_active: active } : p));
  }

  async function handleDeletePackage(id: string) {
    if (!confirm("Remover pacote?")) return;
    const res = await photoApi({ action: "delete_package", id });
    if (res.ok) setPhotoPackagesState((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAddCity() {
    if (!newCityName) { setPhotoError("Nome da cidade é obrigatório."); return; }
    setPhotoError(null);
    const res = await photoApi({ action: "add_city", city: newCityName, state: newCityState });
    const json = await res.json();
    if (!res.ok) { setPhotoError(json.error); return; }
    setPhotoCitiesState((prev) => [...prev, json.city]);
    setNewCityName(""); setShowAddCity(false);
  }

  async function handleToggleCity(id: string, active: boolean) {
    await photoApi({ action: "toggle_city", id, is_active: active });
    setPhotoCitiesState((prev) => prev.map((c) => c.id === id ? { ...c, is_active: active } : c));
  }

  async function handleDeleteCity(id: string) {
    if (!confirm("Remover cidade?")) return;
    const res = await photoApi({ action: "delete_city", id });
    if (res.ok) setPhotoCitiesState((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleAddStaff() {
    if (!staffName || !staffEmail) { setStaffError("Nome e email são obrigatórios."); return; }
    setAddingStaff(true);
    setStaffError(null);
    try {
      const res = await fetch("/api/admin/support-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", name: staffName, email: staffEmail, role: staffRole, permissions: staffPermissions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSupportStaff((prev) => [...prev, json.staff]);
      setStaffName(""); setStaffEmail(""); setStaffRole("support");
      setStaffPermissions({ view_orders: true, view_products: true, view_units: true, view_crm: false, view_financial: false, edit_products: false, manage_features: false });
      setShowAddStaff(false);
    } catch (err: any) { setStaffError(err.message); }
    finally { setAddingStaff(false); }
  }

  async function handleToggleStaff(id: string, active: boolean) {
    const res = await fetch("/api/admin/support-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id, is_active: active }),
    });
    if (res.ok) setSupportStaff((prev) => prev.map((s) => s.id === id ? { ...s, is_active: active } : s));
  }

  async function handleRemoveStaff(id: string) {
    if (!confirm("Remover este funcionário de suporte?")) return;
    const res = await fetch("/api/admin/support-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    });
    if (res.ok) setSupportStaff((prev) => prev.filter((s) => s.id !== id));
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

  // Partner computed values
  const activePartners = partnersState.filter((p) => p.is_active).length;
  const activeCoupons = couponsState.filter((c) => c.is_active).length;
  const totalReferrals = referralsState.length;
  const pendingCommissions = payoutsState
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  async function partnerApi(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function handleAddPartner() {
    if (!partnerName || !partnerEmail) { setPartnerError("Nome e email são obrigatórios."); return; }
    setPartnerError(null);
    const res = await partnerApi({ action: "add_partner", name: partnerName, email: partnerEmail, phone: partnerPhone || null, document: partnerDocument || null, commission_percent: partnerCommission, is_photographer: partnerIsPhotographer, notes: partnerNotes || null, password: partnerPassword || null });
    const json = await res.json();
    if (!res.ok) { setPartnerError(json.error); return; }
    setPartnersState((prev) => [json.partner, ...prev]);
    setPartnerName(""); setPartnerEmail(""); setPartnerPhone(""); setPartnerDocument(""); setPartnerCommission(10); setPartnerIsPhotographer(false); setPartnerNotes(""); setPartnerPassword("");
    setShowAddPartner(false);
  }

  async function handleTogglePartner(id: string, active: boolean) {
    await partnerApi({ action: "update_partner", id, is_active: active });
    setPartnersState((prev) => prev.map((p) => p.id === id ? { ...p, is_active: active } : p));
  }

  async function handleDeletePartner(id: string) {
    if (!confirm("Remover este parceiro?")) return;
    const res = await partnerApi({ action: "delete_partner", id });
    if (res.ok) setPartnersState((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAddCoupon() {
    if (!couponPartnerId || !couponCode) { setCouponError("Parceiro e código são obrigatórios."); return; }
    const code = couponCode.toUpperCase().replace(/\s/g, "");
    setCouponError(null);
    const res = await partnerApi({ action: "add_coupon", partner_id: couponPartnerId, code, discount_type: couponDiscountType, discount_value: parseFloat(couponValue) || 0, trial_extra_days: couponTrialDays, max_uses: couponMaxUses ? parseInt(couponMaxUses) : null, expires_at: couponExpiresAt || null });
    const json = await res.json();
    if (!res.ok) { setCouponError(json.error); return; }
    setCouponsState((prev) => [json.coupon, ...prev]);
    setCouponPartnerId(""); setCouponCode(""); setCouponDiscountType("percent"); setCouponValue(""); setCouponTrialDays(0); setCouponMaxUses(""); setCouponExpiresAt("");
    setShowAddCoupon(false);
  }

  async function handleToggleCoupon(id: string, active: boolean) {
    await partnerApi({ action: "update_coupon", id, is_active: active });
    setCouponsState((prev) => prev.map((c) => c.id === id ? { ...c, is_active: active } : c));
  }

  async function handleDeleteCoupon(id: string) {
    if (!confirm("Remover este cupom?")) return;
    const res = await partnerApi({ action: "delete_coupon", id });
    if (res.ok) setCouponsState((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleAddPayout() {
    if (!payoutPartnerId || !payoutAmount || !payoutStart || !payoutEnd) { setPayoutError("Preencha todos os campos obrigatórios."); return; }
    setPayoutError(null);
    const res = await partnerApi({ action: "add_payout", partner_id: payoutPartnerId, amount: parseFloat(payoutAmount), period_start: payoutStart, period_end: payoutEnd, payment_method: payoutMethod || null, notes: payoutNotes || null });
    const json = await res.json();
    if (!res.ok) { setPayoutError(json.error); return; }
    setPayoutsState((prev) => [json.payout, ...prev]);
    setPayoutPartnerId(""); setPayoutAmount(""); setPayoutStart(""); setPayoutEnd(""); setPayoutMethod(""); setPayoutNotes("");
    setShowAddPayout(false);
  }

  async function handleMarkPaid(id: string) {
    await partnerApi({ action: "mark_paid", id });
    setPayoutsState((prev) => prev.map((p) => p.id === id ? { ...p, status: "paid", paid_at: new Date().toISOString() } : p));
  }

  async function handleDeletePayout(id: string) {
    if (!confirm("Remover este pagamento?")) return;
    const res = await partnerApi({ action: "delete_payout", id });
    if (res.ok) setPayoutsState((prev) => prev.filter((p) => p.id !== id));
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
        {tab === "Faturamento" && (() => {
          const BILLING_PRICES: Record<string, number> = {
            menu: 12900,
            menupro: 24900,
            business: 109000,
          };

          // MRR
          const payingClients = financeData.plans.filter((p) => p.status === "active" && !p.free_access);
          const mrr = payingClients.reduce((sum, p) => sum + (BILLING_PRICES[p.plan] ?? 0), 0);
          const payingCount = payingClients.length;

          // MRR por plano
          const mrrByPlan: Record<string, { count: number; revenue: number }> = {};
          for (const p of payingClients) {
            if (!mrrByPlan[p.plan]) mrrByPlan[p.plan] = { count: 0, revenue: 0 };
            mrrByPlan[p.plan].count++;
            mrrByPlan[p.plan].revenue += BILLING_PRICES[p.plan] ?? 0;
          }
          const mrrPlanEntries = ["business", "menupro", "menu"]
            .filter((k) => mrrByPlan[k])
            .map((k) => ({ plan: k, ...mrrByPlan[k] }));
          const maxMrrPlan = Math.max(...mrrPlanEntries.map((e) => e.revenue), 1);

          // Receita dos clientes por mês
          const revenueByMonth: Record<string, number> = {};
          for (const o of financeData.orders) {
            const month = o.created_at.substring(0, 7);
            revenueByMonth[month] = (revenueByMonth[month] ?? 0) + parseFloat(String(o.total));
          }
          const sortedMonths = Object.keys(revenueByMonth).sort().slice(-12);
          const monthChartData = sortedMonths.map((m) => ({
            label: new Date(m + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
            value: revenueByMonth[m],
          }));
          const maxMonthVal = Math.max(...monthChartData.map((d) => d.value), 1);

          // Receita 30d e total
          const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const revenue30dFin = financeData.orders
            .filter((o) => new Date(o.created_at).getTime() >= cutoff30)
            .reduce((s, o) => s + parseFloat(String(o.total)), 0);
          const totalClientRevenue = financeData.orders.reduce((s, o) => s + parseFloat(String(o.total)), 0);

          // Projeção (taxa crescimento baseada nos 2 últimos meses disponíveis)
          let growthRate = 0.10;
          if (sortedMonths.length >= 2) {
            const last = revenueByMonth[sortedMonths[sortedMonths.length - 1]] ?? 0;
            const prev = revenueByMonth[sortedMonths[sortedMonths.length - 2]] ?? 0;
            if (prev > 0) growthRate = (last - prev) / prev;
            growthRate = Math.max(-0.5, Math.min(growthRate, 1));
          }
          const projections = [1, 2, 3].map((m) => ({
            month: m,
            mrr: Math.round(mrr * Math.pow(1 + growthRate, m)),
          }));
          const projMonthNames = [1, 2, 3].map((offset) => {
            const d = new Date();
            d.setMonth(d.getMonth() + offset);
            return d.toLocaleDateString("pt-BR", { month: "long" });
          });

          // Churn: canceled + paused
          const churned = financeData.plans.filter((p) => p.status === "canceled" || p.status === "paused").length;
          const totalPlans = financeData.plans.length || 1;
          const churnRate = ((churned / totalPlans) * 100).toFixed(1);

          const planColors: Record<string, string> = {
            menu: "bg-gray-500",
            menupro: "bg-blue-500",
            business: "bg-purple-500",
          };

          // PDV stats
          const pdvTotal = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
          const pdvCount = payments.length;
          const pdvTicket = pdvCount > 0 ? Math.round(pdvTotal / pdvCount) : 0;
          const pdvPix = payments.filter((p) => p.method === "pix").length;
          const pdvCard = payments.filter((p) => p.method === "card").length;
          const pdvCash = payments.filter((p) => p.method === "cash").length;

          return (
            <div className="space-y-6">
              {/* ── SEÇÃO 1: FyMenu Assinaturas ─────────────────── */}
              <div>
                <h2 className="text-lg font-bold text-gray-200 mb-1">💎 Faturamento FyMenu (Assinaturas)</h2>
                <p className="text-gray-500 text-sm mb-4">Receita recorrente gerada pelos planos contratados pelos restaurantes.</p>
              </div>

              {/* A. Resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "💎", label: "MRR Estimado", value: fmt(mrr), sub: "receita recorrente mensal", color: "text-purple-400" },
                  { icon: "📦", label: "Receita Clientes 30d", value: fmt(Math.round(revenue30dFin)), sub: "pedidos confirmados", color: "text-green-400" },
                  { icon: "📊", label: "Receita Clientes Total", value: fmt(Math.round(totalClientRevenue)), sub: "todos os pedidos", color: "text-blue-400" },
                  { icon: "💳", label: "Clientes Pagantes", value: String(payingCount), sub: "ativos sem free access", color: "text-yellow-400" },
                ].map(({ icon, label, value, sub, color }) => (
                  <div key={label} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-xs -mt-4">
                ⚠️ MRR estimado baseado nos planos ativos. Faturamento real será calculado após integração com gateway de pagamento.
              </p>

              {/* B. Gráfico mensal */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">📈 Receita dos Restaurantes por Mês</h3>
                {monthChartData.length === 0 ? (
                  <p className="text-gray-600 text-sm">Sem dados suficientes.</p>
                ) : (
                  <div className="flex items-end gap-1" style={{ height: 140 }}>
                    {monthChartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-purple-500/70 rounded-t"
                          style={{ height: `${(d.value / maxMonthVal) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
                        />
                        <span className="text-gray-600 text-[9px] mt-1 truncate w-full text-center">{d.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* C. Distribuição MRR por plano */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">💰 Distribuição MRR por Plano</h3>
                {mrrPlanEntries.length === 0 ? (
                  <p className="text-gray-600 text-sm">Sem clientes pagantes.</p>
                ) : (
                  <div className="space-y-4">
                    {mrrPlanEntries.map(({ plan, count, revenue }) => {
                      const pct = mrr > 0 ? Math.round((revenue / mrr) * 100) : 0;
                      return (
                        <div key={plan}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300 capitalize font-medium">{plan} <span className="text-gray-500 font-normal">({count} clientes)</span></span>
                            <span className="text-gray-300">{fmt(revenue)} <span className="text-gray-500">({pct}%)</span></span>
                          </div>
                          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${planColors[plan] ?? "bg-gray-500"}`} style={{ width: `${(revenue / maxMrrPlan) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* D. Projeção */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-1">🔮 Projeção de MRR (próximos 3 meses)</h3>
                <p className="text-gray-600 text-xs mb-4">
                  Taxa de crescimento aplicada: {growthRate >= 0 ? "+" : ""}{(growthRate * 100).toFixed(1)}% ao mês.
                  Baseado na taxa de crescimento atual. Não considera churn.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {projections.map(({ month, mrr: proj }, i) => (
                    <div key={month} className="rounded-2xl border border-dashed border-gray-700 p-4 text-center">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{projMonthNames[i]}</p>
                      <p className="text-xl font-black text-purple-300">{fmt(proj)}</p>
                      <p className="text-gray-600 text-xs mt-0.5">MRR projetado</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* E. Churn */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">📉 Análise de Churn</h3>
                {churned === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhum cancelamento ou pausa registrada.</p>
                ) : (
                  <div className="flex gap-6 flex-wrap">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Churned</p>
                      <p className="text-2xl font-black text-red-400 mt-1">{churned}</p>
                      <p className="text-gray-600 text-xs">cancelados + pausados</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Taxa de Churn</p>
                      <p className="text-2xl font-black text-orange-400 mt-1">{churnRate}%</p>
                      <p className="text-gray-600 text-xs">do total de contas</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SEPARADOR: Vendas dos Restaurantes ───────────── */}
              <div className="border-t border-gray-800 pt-6 mt-6">
                <h2 className="text-lg font-bold text-gray-200 mb-1">💰 Vendas dos Restaurantes (PDV)</h2>
                <p className="text-gray-500 text-sm mb-4">Pagamentos registrados pelos restaurantes aos seus clientes finais via PDV.</p>
              </div>

              {/* PDV metric cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">🧾</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total de Vendas</p>
                  <p className="text-2xl font-black mt-1 text-green-400">{fmt(pdvTotal)}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{pdvCount} registros</p>
                </div>
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">🎯</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-2xl font-black mt-1 text-yellow-400">{fmt(pdvTicket)}</p>
                  <p className="text-gray-600 text-xs mt-0.5">por venda</p>
                </div>
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">💳</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Métodos</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {pdvCount > 0 && [
                      { label: "📲 PIX", count: pdvPix, color: "bg-blue-900/40 text-blue-300" },
                      { label: "💳 Cartão", count: pdvCard, color: "bg-purple-900/40 text-purple-300" },
                      { label: "💵 Dinheiro", count: pdvCash, color: "bg-green-900/40 text-green-300" },
                    ].filter((m) => m.count > 0).map((m) => (
                      <span key={m.label} className={`px-2 py-0.5 rounded text-xs font-semibold ${m.color}`}>
                        {m.label} {Math.round((m.count / pdvCount) * 100)}%
                      </span>
                    ))}
                    {pdvCount === 0 && <span className="text-gray-600 text-xs">Sem dados</span>}
                  </div>
                </div>
              </div>

              {/* F. Tabela de vendas */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-200">Vendas Registradas no PDV</h3>
                  <span className="text-gray-500 text-sm">{payments.length} registros</span>
                </div>
                {payments.length === 0 ? (
                  <p className="text-gray-600 text-sm p-6">Nenhuma venda registrada ainda.</p>
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
            </div>
          );
        })()}

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

              {/* ── DADOS DE CONSUMO ─────────────────────────────────── */}
              {(() => {
                const orders = consumerData.orders;
                const events = consumerData.events;

                // A. Resumo
                const totalPedidos = orders.length;
                const totalFat = orders.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0);
                const ticketMedioConsumer = totalPedidos > 0 ? totalFat / totalPedidos : 0;
                const pedidosMesa = orders.filter((o) => o.table_number && o.table_number > 0).length;
                const pedidosDelivery = totalPedidos - pedidosMesa;

                // B. Horários de pico
                const hourCount = new Array(24).fill(0);
                for (const o of orders) hourCount[new Date(o.created_at).getHours()]++;
                const maxHour = Math.max(...hourCount, 1);
                const peakHour = hourCount.indexOf(Math.max(...hourCount));

                // C. Dias da semana
                const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const dayCount = new Array(7).fill(0);
                for (const o of orders) dayCount[new Date(o.created_at).getDay()]++;
                const maxDay = Math.max(...dayCount, 1);
                const peakDay = dayCount.indexOf(Math.max(...dayCount));

                // D. Top 20 produtos
                const productCount: Record<string, number> = {};
                for (const o of orders) {
                  const items = Array.isArray(o.items) ? o.items : [];
                  for (const item of items) {
                    const name: string = item.name ?? item.code_name ?? "Sem nome";
                    productCount[name] = (productCount[name] ?? 0) + (item.qty ?? 1);
                  }
                }
                const topConsumerProducts = Object.entries(productCount)
                  .map(([name, count]) => ({ name, count }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 20);
                const maxProd = topConsumerProducts[0]?.count ?? 1;

                // E. Métodos de pagamento
                const payMap: Record<string, number> = {};
                for (const o of orders) {
                  const m = o.payment_method ?? "Não informado";
                  payMap[m] = (payMap[m] ?? 0) + 1;
                }
                const payEntries = Object.entries(payMap).sort((a, b) => b[1] - a[1]);
                const maxPay = payEntries[0]?.[1] ?? 1;

                // F. Comportamento no cardápio
                const menuViews = events.filter((e) => e.event === "menu_view").length;
                const productClicks = events.filter((e) => e.event === "product_click").length;
                const waClicks = events.filter((e) => e.event === "whatsapp_click").length;
                const convRate = menuViews > 0 ? ((totalPedidos / menuViews) * 100).toFixed(1) : "0.0";

                // G. Pedidos por restaurante
                const unitToRestName: Record<string, string> = {};
                const unitToRestId: Record<string, string> = {};
                for (const u of crmData.unitMapping) {
                  unitToRestId[u.id] = u.restaurant_id;
                }
                for (const o of crmData.owners) unitToRestName[o.id] = o.name;
                const restOrderCount: Record<string, number> = {};
                const restRevenue: Record<string, number> = {};
                for (const o of orders) {
                  const rid = unitToRestId[o.unit_id];
                  if (!rid) continue;
                  restOrderCount[rid] = (restOrderCount[rid] ?? 0) + 1;
                  restRevenue[rid] = (restRevenue[rid] ?? 0) + (parseFloat(String(o.total)) || 0);
                }
                const restActivity = Object.entries(restRevenue)
                  .map(([id, rev]) => ({
                    name: unitToRestName[id] ?? id.slice(0, 8),
                    orders: restOrderCount[id] ?? 0,
                    revenue: rev,
                    ticket: restOrderCount[id] ? rev / restOrderCount[id] : 0,
                  }))
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 20);

                return (
                  <>
                    <div className="border-t border-gray-800 pt-2">
                      <h2 className="text-lg font-bold text-gray-200 mb-4">📊 Dados de Consumo (clientes dos restaurantes)</h2>
                    </div>

                    {/* A. Resumo */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon: "🛒", label: "Total de Pedidos", value: String(totalPedidos), sub: "confirmados", color: "text-purple-400" },
                        { icon: "💰", label: "Ticket Médio", value: fmt(Math.round(ticketMedioConsumer)), sub: "por pedido", color: "text-yellow-400" },
                        { icon: "🚚", label: "Delivery", value: String(pedidosDelivery), sub: "sem mesa", color: "text-blue-400" },
                        { icon: "🪑", label: "Mesa", value: String(pedidosMesa), sub: "com mesa", color: "text-green-400" },
                      ].map(({ icon, label, value, sub, color }) => (
                        <div key={label} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                          <div className="text-2xl mb-2">{icon}</div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                          <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* B. Horários de pico */}
                    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                      <h3 className="font-bold text-gray-200 mb-1">⏰ Horários de Pico</h3>
                      <p className="text-gray-500 text-xs mb-4">Pico: {peakHour}h ({hourCount[peakHour]} pedidos)</p>
                      <div className="flex items-end gap-0.5" style={{ height: 100 }}>
                        {hourCount.map((count, h) => (
                          <div key={h} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full rounded-t transition-all"
                              style={{
                                height: `${(count / maxHour) * 100}%`,
                                minHeight: count > 0 ? 2 : 0,
                                backgroundColor: h === peakHour ? "#a855f7" : "#6b21a8",
                              }}
                            />
                            {h % 3 === 0 && (
                              <span className="text-gray-600 text-[8px] mt-0.5">{h}h</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* C. Dias da semana */}
                    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                      <h3 className="font-bold text-gray-200 mb-4">📅 Pedidos por Dia da Semana</h3>
                      <div className="space-y-2">
                        {dayNames.map((day, i) => (
                          <div key={day} className="flex items-center gap-3">
                            <span className={`text-xs w-7 ${i === peakDay ? "text-purple-300 font-bold" : "text-gray-500"}`}>{day}</span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(dayCount[i] / maxDay) * 100}%`,
                                  backgroundColor: i === peakDay ? "#a855f7" : "#6b21a8",
                                }}
                              />
                            </div>
                            <span className="text-gray-400 text-xs w-8 text-right">{dayCount[i]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* D. Top 20 produtos */}
                    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                      <h3 className="font-bold text-gray-200 mb-4">🏆 Top 20 Produtos Mais Pedidos</h3>
                      {topConsumerProducts.length === 0 ? (
                        <p className="text-gray-600 text-sm">Sem dados.</p>
                      ) : (
                        <div className="space-y-2">
                          {topConsumerProducts.map((p, i) => (
                            <div key={p.name}>
                              <div className="flex justify-between text-sm mb-0.5">
                                <span className="text-gray-300 truncate"><span className="text-gray-500 mr-2">#{i + 1}</span>{p.name}</span>
                                <span className="text-gray-400 font-medium ml-2 shrink-0">{p.count}</span>
                              </div>
                              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500/70 rounded-full" style={{ width: `${(p.count / maxProd) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E. Métodos de pagamento */}
                    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                      <h3 className="font-bold text-gray-200 mb-4">💳 Métodos de Pagamento</h3>
                      {payEntries.length === 0 ? (
                        <p className="text-gray-600 text-sm">Sem dados.</p>
                      ) : (
                        <div className="space-y-3">
                          {payEntries.map(([method, count]) => {
                            const pct = Math.round((count / (totalPedidos || 1)) * 100);
                            return (
                              <div key={method}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-300 capitalize">{method}</span>
                                  <span className="text-gray-400">{count} <span className="text-gray-600">({pct}%)</span></span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${(count / maxPay) * 100}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* F. Comportamento no cardápio */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon: "👁️", label: "Visualizações", value: String(menuViews), sub: "menu_view", color: "text-blue-400" },
                        { icon: "👆", label: "Cliques Produto", value: String(productClicks), sub: "product_click", color: "text-purple-400" },
                        { icon: "💬", label: "Cliques WhatsApp", value: String(waClicks), sub: "whatsapp_click", color: "text-green-400" },
                        { icon: "📈", label: "Taxa Conversão", value: `${convRate}%`, sub: "pedidos / views", color: "text-yellow-400" },
                      ].map(({ icon, label, value, sub, color }) => (
                        <div key={label} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                          <div className="text-2xl mb-2">{icon}</div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                          <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* G. Pedidos por restaurante */}
                    <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-800">
                        <h3 className="font-bold text-gray-200">📦 Pedidos por Restaurante</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                              <th className="px-4 py-3 text-left">Restaurante</th>
                              <th className="px-4 py-3 text-right">Pedidos</th>
                              <th className="px-4 py-3 text-right">Faturamento</th>
                              <th className="px-4 py-3 text-right">Ticket Médio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {restActivity.map((r) => (
                              <tr key={r.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-4 py-2.5 text-gray-300 truncate max-w-[200px]">{r.name}</td>
                                <td className="px-4 py-2.5 text-right text-gray-300 font-medium">{r.orders}</td>
                                <td className="px-4 py-2.5 text-right text-gray-300">{fmt(Math.round(r.revenue))}</td>
                                <td className="px-4 py-2.5 text-right text-gray-400">{fmt(Math.round(r.ticket))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* PARCEIROS */}
        {tab === "Parceiros" && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="🤝" label="Parceiros Ativos" value={String(activePartners)} sub="total" color="text-purple-400" />
              <StatCard icon="🎟️" label="Cupons Ativos" value={String(activeCoupons)} sub="em circulação" color="text-blue-400" />
              <StatCard icon="👥" label="Clientes Indicados" value={String(totalReferrals)} sub="restaurantes" color="text-green-400" />
              <StatCard icon="💰" label="Comissões Pendentes" value={fmtBRL(pendingCommissions)} sub="a pagar" color="text-yellow-400" />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-gray-800 pb-1">
              {(["parceiros", "cupons", "indicacoes", "comissoes"] as const).map((t) => {
                const labels = { parceiros: "Parceiros", cupons: "Cupons", indicacoes: "Indicações", comissoes: "Comissões" };
                return (
                  <button key={t} onClick={() => setPartnerTab(t)}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${partnerTab === t ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Sub-tab: Parceiros */}
            {partnerTab === "parceiros" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Parceiros</h3>
                  <button onClick={() => setShowAddPartner(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">+ Novo Parceiro</button>
                </div>

                {showAddPartner && (
                  <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Nome *" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      <input type="email" placeholder="Email *" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      <input type="text" placeholder="Telefone" value={partnerPhone} onChange={(e) => setPartnerPhone(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      <input type="text" placeholder="CPF/CNPJ" value={partnerDocument} onChange={(e) => setPartnerDocument(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      <input type="text" placeholder="Senha inicial do parceiro" value={partnerPassword} onChange={(e) => setPartnerPassword(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none col-span-2" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-gray-400 text-xs">Comissão %</label>
                        <input type="number" min={0} max={100} value={partnerCommission} onChange={(e) => setPartnerCommission(Number(e.target.value))} className="w-20 px-2 py-1.5 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={partnerIsPhotographer} onChange={(e) => setPartnerIsPhotographer(e.target.checked)} className="accent-purple-500" />
                        É fotógrafo
                      </label>
                    </div>
                    <textarea placeholder="Notas (opcional)" value={partnerNotes} onChange={(e) => setPartnerNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none resize-none" />
                    {partnerError && <p className="text-red-400 text-xs">{partnerError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddPartner(false); setPartnerError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddPartner} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Adicionar</button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                  {partnersState.length === 0 ? (
                    <p className="text-gray-600 text-sm p-6">Nenhum parceiro cadastrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Nome</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Comissão</th>
                            <th className="px-4 py-3 text-right">Indicações</th>
                            <th className="px-4 py-3 text-right">Faturado</th>
                            <th className="px-4 py-3 text-left">Tipo</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnersState.map((p) => {
                            const partnerReferralCount = referralsState.filter((r) => r.partner_id === p.id).length;
                            return (
                              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{p.email}</td>
                                <td className="px-4 py-3 text-gray-300">{p.commission_percent}%</td>
                                <td className="px-4 py-3 text-right text-gray-300">{partnerReferralCount}</td>
                                <td className="px-4 py-3 text-right text-green-400 font-semibold">{fmtBRL(p.total_earned)}</td>
                                <td className="px-4 py-3">
                                  {p.is_photographer && <span className="px-2 py-0.5 rounded text-xs bg-blue-900/40 text-blue-300 border border-blue-700/50">📸 Fotógrafo</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => handleTogglePartner(p.id, !p.is_active)}
                                    className={`px-2 py-0.5 rounded text-xs font-semibold ${p.is_active ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
                                    {p.is_active ? "Ativo" : "Inativo"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => handleDeletePartner(p.id)} className="text-red-400 text-xs hover:text-red-300">Remover</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab: Cupons */}
            {partnerTab === "cupons" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Cupons de Indicação</h3>
                  <button onClick={() => setShowAddCoupon(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">+ Novo Cupom</button>
                </div>

                {showAddCoupon && (
                  <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                    <select value={couponPartnerId} onChange={(e) => setCouponPartnerId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="">Selecionar parceiro *</option>
                      {partnersState.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="text" placeholder="CÓDIGO DO CUPOM *" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ""))} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none font-mono tracking-wider" />
                    <select value={couponDiscountType} onChange={(e) => setCouponDiscountType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="percent">% de desconto</option>
                      <option value="fixed">Desconto fixo (R$)</option>
                      <option value="trial_days">Dias extras de trial</option>
                    </select>
                    {couponDiscountType === "trial_days" ? (
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Dias extras de trial</label>
                        <input type="number" min={1} value={couponTrialDays} onChange={(e) => setCouponTrialDays(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                    ) : (
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">{couponDiscountType === "percent" ? "Desconto (%)" : "Desconto (R$)"}</label>
                        <input type="number" min={0} value={couponValue} onChange={(e) => setCouponValue(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Máximo de usos</label>
                        <input type="number" min={1} placeholder="Ilimitado" value={couponMaxUses} onChange={(e) => setCouponMaxUses(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Expira em</label>
                        <input type="date" value={couponExpiresAt} onChange={(e) => setCouponExpiresAt(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                    </div>
                    {couponError && <p className="text-red-400 text-xs">{couponError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddCoupon(false); setCouponError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddCoupon} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Criar Cupom</button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                  {couponsState.length === 0 ? (
                    <p className="text-gray-600 text-sm p-6">Nenhum cupom cadastrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Código</th>
                            <th className="px-4 py-3 text-left">Parceiro</th>
                            <th className="px-4 py-3 text-left">Tipo</th>
                            <th className="px-4 py-3 text-left">Valor</th>
                            <th className="px-4 py-3 text-left">Usos</th>
                            <th className="px-4 py-3 text-left">Expira</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {couponsState.map((c) => (
                            <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="px-4 py-3 text-white font-mono font-bold tracking-wider">{c.code}</td>
                              <td className="px-4 py-3 text-gray-300">{c.partners?.name ?? "—"}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs capitalize">{c.discount_type}</td>
                              <td className="px-4 py-3 text-gray-300">
                                {c.discount_type === "trial_days" ? `+${c.trial_extra_days}d` : c.discount_type === "percent" ? `${c.discount_value}%` : fmtBRL(c.discount_value)}
                              </td>
                              <td className="px-4 py-3 text-gray-400">{c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.expires_at)}</td>
                              <td className="px-4 py-3">
                                <button onClick={() => handleToggleCoupon(c.id, !c.is_active)}
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${c.is_active ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
                                  {c.is_active ? "Ativo" : "Inativo"}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 text-xs hover:text-red-300">Remover</button>
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

            {/* Sub-tab: Indicações */}
            {partnerTab === "indicacoes" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-200">Indicações</h3>
                  <select value={referralFilterPartner} onChange={(e) => setReferralFilterPartner(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
                    <option value="all">Todos os parceiros</option>
                    {partnersState.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                  {referralsState.length === 0 ? (
                    <p className="text-gray-600 text-sm p-6">Nenhuma indicação registrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Parceiro</th>
                            <th className="px-4 py-3 text-left">Restaurante</th>
                            <th className="px-4 py-3 text-left">Plano</th>
                            <th className="px-4 py-3 text-left">Conta</th>
                            <th className="px-4 py-3 text-left">Cupom</th>
                            <th className="px-4 py-3 text-left">Comissão</th>
                            <th className="px-4 py-3 text-left">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referralsState
                            .filter((r) => referralFilterPartner === "all" || r.partner_id === referralFilterPartner)
                            .map((r) => (
                              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-4 py-3 text-gray-300">{r.partners?.name ?? "—"}</td>
                                <td className="px-4 py-3 text-white max-w-[160px] truncate">{r.restaurants?.name ?? "—"}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLAN_BADGE[r.restaurants?.plan ?? ""] ?? "bg-gray-700 text-gray-300"}`}>{r.restaurants?.plan ?? "—"}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_BADGE[r.restaurants?.status ?? ""] ?? "bg-gray-700 text-gray-400"}`}>{r.restaurants?.status ?? "—"}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.coupon_code ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-300">{r.commission_percent}%</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(r.created_at)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab: Comissões */}
            {partnerTab === "comissoes" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Comissões e Pagamentos</h3>
                  <button onClick={() => setShowAddPayout(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">+ Registrar Pagamento</button>
                </div>

                {showAddPayout && (
                  <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                    <select value={payoutPartnerId} onChange={(e) => setPayoutPartnerId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="">Selecionar parceiro *</option>
                      {partnersState.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Valor (R$) *</label>
                      <input type="number" min={0} step="0.01" placeholder="0.00" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Período início *</label>
                        <input type="date" value={payoutStart} onChange={(e) => setPayoutStart(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Período fim *</label>
                        <input type="date" value={payoutEnd} onChange={(e) => setPayoutEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                    </div>
                    <input type="text" placeholder="Método de pagamento (ex: PIX, Transferência)" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    <textarea placeholder="Notas" value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none resize-none" />
                    {payoutError && <p className="text-red-400 text-xs">{payoutError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddPayout(false); setPayoutError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddPayout} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Registrar</button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                  {payoutsState.length === 0 ? (
                    <p className="text-gray-600 text-sm p-6">Nenhum pagamento registrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Parceiro</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-left">Período</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Método</th>
                            <th className="px-4 py-3 text-left">Pago em</th>
                            <th className="px-4 py-3 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payoutsState.map((p) => (
                            <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="px-4 py-3 text-gray-300">{p.partners?.name ?? "—"}</td>
                              <td className="px-4 py-3 text-right text-green-400 font-semibold">{fmtBRL(p.amount)}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.status === "paid" ? "bg-green-900/40 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}>
                                  {p.status === "paid" ? "Pago" : "Pendente"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{p.payment_method ?? "—"}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(p.paid_at)}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  {p.status === "pending" && (
                                    <button onClick={() => handleMarkPaid(p.id)} className="text-green-400 text-xs hover:text-green-300">Marcar pago</button>
                                  )}
                                  <button onClick={() => handleDeletePayout(p.id)} className="text-red-400 text-xs hover:text-red-300">Remover</button>
                                </div>
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
          </div>
        )}

        {/* FOTOS */}
        {tab === "Fotos" && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="📸" label="Sessões Realizadas" value={String(photoSessionsState.filter((s) => s.status === "completed").length)} sub="total" color="text-purple-400" />
              <StatCard icon="⏳" label="Pendentes" value={String(photoSessionsState.filter((s) => s.status === "pending" || s.status === "confirmed").length)} sub="agendadas" color="text-yellow-400" />
              <StatCard icon="💰" label="Faturamento Fotos" value={fmt(photoSessionsState.filter((s) => s.payment_status === "paid").reduce((acc, x) => acc + x.price_charged, 0))} sub="recebido" color="text-green-400" />
              <StatCard icon="🏙️" label="Cidades Ativas" value={String(photoCitiesState.filter((c) => c.is_active).length)} sub="cobertura" color="text-blue-400" />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-gray-800 pb-1">
              {(["sessoes", "pacotes", "cidades"] as const).map((key) => {
                const labels = { sessoes: "Sessões", pacotes: "Pacotes", cidades: "Cidades" };
                return (
                  <button key={key} onClick={() => setPhotoTab(key)}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${photoTab === key ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
                    {labels[key]}
                  </button>
                );
              })}
            </div>

            {/* Sub-tab: Sessões */}
            {photoTab === "sessoes" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Sessões de Fotos</h3>
                  <button onClick={() => setShowAddSession(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">+ Nova Sessão</button>
                </div>

                {showAddSession && (
                  <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                    <select value={sessRestaurantId} onChange={(e) => setSessRestaurantId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="">Selecionar restaurante...</option>
                      {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <select value={sessPackageId} onChange={(e) => setSessPackageId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="">Selecionar pacote...</option>
                      {photoPackagesState.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
                    </select>
                    <select value={sessCityId} onChange={(e) => setSessCityId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="">Selecionar cidade...</option>
                      {photoCitiesState.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.city} — {c.state}</option>)}
                    </select>
                    <input type="datetime-local" value={sessDate} onChange={(e) => setSessDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    <input type="text" placeholder="Nome do fotógrafo" value={sessPhotographer} onChange={(e) => setSessPhotographer(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    <select value={sessPartnerId} onChange={(e) => setSessPartnerId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      <option value="">Fotógrafo parceiro (opcional)</option>
                      {partnerData.partners.filter((p) => p.is_photographer && p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <textarea placeholder="Observações" value={sessNotes} onChange={(e) => setSessNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none resize-none" />
                    {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddSession(false); setPhotoError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddSession} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Agendar</button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                  {photoSessionsState.length === 0 ? (
                    <p className="text-gray-600 text-sm p-6">Nenhuma sessão cadastrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Restaurante</th>
                            <th className="px-4 py-3 text-left">Pacote</th>
                            <th className="px-4 py-3 text-left">Cidade</th>
                            <th className="px-4 py-3 text-left">Fotógrafo</th>
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Pagamento</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {photoSessionsState.map((s) => {
                            const rest = restaurants.find((r) => r.id === s.restaurant_id);
                            return (
                              <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-4 py-3 text-white max-w-[140px] truncate">{rest?.name ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-300">{s.photo_session_packages?.name ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-300">{s.photo_session_cities ? `${s.photo_session_cities.city}/${s.photo_session_cities.state}` : "—"}</td>
                                <td className="px-4 py-3 text-gray-300 text-xs">{s.partners?.name ?? s.photographer_name ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-400">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString("pt-BR") : "—"}</td>
                                <td className="px-4 py-3">
                                  <select value={s.status} onChange={(e) => handleUpdateSession(s.id, { status: e.target.value })}
                                    className="px-2 py-0.5 rounded text-xs bg-gray-800 border border-gray-700 text-gray-300 outline-none">
                                    <option value="pending">Pendente</option>
                                    <option value="confirmed">Confirmada</option>
                                    <option value="completed">Concluída</option>
                                    <option value="canceled">Cancelada</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select value={s.payment_status} onChange={(e) => handleUpdateSession(s.id, { payment_status: e.target.value })}
                                    className="px-2 py-0.5 rounded text-xs bg-gray-800 border border-gray-700 text-gray-300 outline-none">
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago</option>
                                    <option value="refunded">Reembolsado</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-right text-green-400 font-semibold">{fmt(s.price_charged)}</td>
                                <td className="px-4 py-3">
                                  <button onClick={() => handleDeleteSession(s.id)} className="text-red-400 text-xs hover:text-red-300">Remover</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab: Pacotes */}
            {photoTab === "pacotes" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Pacotes de Foto</h3>
                  <button onClick={() => setShowAddPackage(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">+ Adicionar Pacote</button>
                </div>

                {showAddPackage && (
                  <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                    <input type="text" placeholder="Nome do pacote" value={pkgName} onChange={(e) => setPkgName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    <input type="text" placeholder="Descrição (opcional)" value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs block mb-1">Nº de fotos</label>
                        <input type="number" min={1} value={pkgPhotos} onChange={(e) => setPkgPhotos(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs block mb-1">Duração (min)</label>
                        <input type="number" min={1} value={pkgDuration} onChange={(e) => setPkgDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Preço (em centavos, ex: 29900 = R$299)</label>
                      <input type="number" min={0} placeholder="29900" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={pkgVideo} onChange={(e) => setPkgVideo(e.target.checked)} className="accent-purple-500" />
                      Inclui vídeo
                    </label>
                    {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddPackage(false); setPhotoError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddPackage} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Adicionar</button>
                    </div>
                  </div>
                )}

                {photoPackagesState.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhum pacote cadastrado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {photoPackagesState.map((p) => (
                      <div key={p.id} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-white">{p.name}</h4>
                            {p.description && <p className="text-gray-500 text-xs mt-0.5">{p.description}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.is_active ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
                            {p.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Fotos</span>
                            <p className="text-gray-200 font-semibold">{p.num_photos}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Duração</span>
                            <p className="text-gray-200 font-semibold">{p.duration_minutes} min</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Vídeo</span>
                            <p className="text-gray-200 font-semibold">{p.includes_video ? "Sim" : "Não"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Preço</span>
                            <p className="text-green-400 font-bold">{fmt(p.price)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleTogglePackage(p.id, !p.is_active)} className="flex-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs hover:text-white transition-colors">
                            {p.is_active ? "Desativar" : "Ativar"}
                          </button>
                          <button onClick={() => handleDeletePackage(p.id)} className="px-3 py-1.5 rounded-lg border border-red-900/50 text-red-400 text-xs hover:text-red-300 transition-colors">
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab: Cidades */}
            {photoTab === "cidades" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Cidades Disponíveis</h3>
                  <button onClick={() => setShowAddCity(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">+ Adicionar Cidade</button>
                </div>

                {showAddCity && (
                  <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                    <input type="text" placeholder="Nome da cidade" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                    <select value={newCityState} onChange={(e) => setNewCityState(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                      {["GO", "SP", "MG", "RJ", "BA", "PR", "SC", "RS", "CE", "PE", "DF", "MT", "MS", "PA", "AM", "ES", "PB", "RN", "AL", "SE", "PI", "MA", "TO", "RO", "AC", "RR", "AP"].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                    {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddCity(false); setPhotoError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddCity} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Adicionar</button>
                    </div>
                  </div>
                )}

                {photoCitiesState.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhuma cidade cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {photoCitiesState.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/30 border border-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-white text-sm font-semibold">{c.city}</span>
                          <span className="text-gray-500 text-xs">{c.state}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.is_active ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
                            {c.is_active ? "Ativa" : "Inativa"}
                          </span>
                          <button onClick={() => handleToggleCity(c.id, !c.is_active)} className="px-2 py-1 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">
                            {c.is_active ? "Desativar" : "Ativar"}
                          </button>
                          <button onClick={() => handleDeleteCity(c.id)} className="px-2 py-1 rounded text-xs border border-red-900/50 text-red-400 hover:text-red-300 transition-colors">
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

            {/* Funcionários de Suporte */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-200">👨‍💼 Funcionários de Suporte</h3>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                >
                  + Adicionar
                </button>
              </div>

              {showAddStaff && (
                <div className="mb-4 p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
                  <input type="text" placeholder="Nome completo" value={staffName} onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                  <input type="email" placeholder="Email do funcionário" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none" />
                  <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none">
                    <option value="support">Suporte</option>
                    <option value="moderator">Moderador</option>
                    <option value="manager">Gerente</option>
                  </select>

                  <div className="space-y-2">
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Permissões:</p>
                    {[
                      { key: "view_orders", label: "Ver pedidos dos clientes" },
                      { key: "view_products", label: "Ver produtos/cardápios" },
                      { key: "view_units", label: "Ver unidades dos clientes" },
                      { key: "view_crm", label: "Ver CRM (dados dos donos)" },
                      { key: "view_financial", label: "Ver financeiro" },
                      { key: "edit_products", label: "Editar produtos dos clientes" },
                      { key: "manage_features", label: "Gerenciar feature flags" },
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPermissions[perm.key] ?? false}
                          onChange={(e) => setStaffPermissions((prev) => ({ ...prev, [perm.key]: e.target.checked }))}
                          className="accent-purple-500"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>

                  {staffError && <p className="text-red-400 text-xs">{staffError}</p>}

                  <div className="flex gap-2">
                    <button onClick={() => setShowAddStaff(false)}
                      className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                    <button onClick={handleAddStaff} disabled={addingStaff}
                      className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50">
                      {addingStaff ? "Salvando..." : "Adicionar"}
                    </button>
                  </div>
                </div>
              )}

              {supportStaff.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum funcionário de suporte cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {supportStaff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/30 border border-gray-800">
                      <div>
                        <div className="text-white text-sm font-semibold">{s.name}</div>
                        <div className="text-gray-500 text-xs">{s.email} · {s.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.is_active ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
                          {s.is_active ? "Ativo" : "Inativo"}
                        </span>
                        <button onClick={() => handleToggleStaff(s.id, !s.is_active)}
                          className="px-2 py-1 rounded text-xs border border-gray-700 text-gray-400 hover:text-white">
                          {s.is_active ? "Desativar" : "Ativar"}
                        </button>
                        <button onClick={() => handleRemoveStaff(s.id)}
                          className="px-2 py-1 rounded text-xs border border-red-900/50 text-red-400 hover:text-red-300">
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
