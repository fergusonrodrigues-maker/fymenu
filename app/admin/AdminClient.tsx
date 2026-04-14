"use client";

import React, { useState, useMemo } from "react";
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
  userRole: string;
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
  subscriptionData: {
    subscriptions: Array<{
      id: string; restaurant_id: string; asaas_subscription_id: string | null;
      plan: string; cycle: string | null; billing_type: string | null;
      value: number; status: string; started_at: string | null;
      next_due_date: string | null; created_at: string;
      restaurants: { name: string } | null;
    }>;
    payments: Array<{
      asaas_payment_id: string; subscription_id: string | null;
      amount: number; status: string | null; billing_type: string | null;
      due_date: string | null; paid_at: string | null; invoice_url: string | null;
    }>;
  };
  crmConsumers: Array<{
    id: string; name: string | null; phone: string | null; email: string | null;
    source: string | null; total_orders: number; total_spent: number;
    last_order_at: string | null; city: string | null; is_active: boolean;
    created_at: string; unit_id: string;
    units: { id: string; slug: string; city: string | null; restaurant_id: string; restaurants: { name: string } | null } | null;
  }>;
}

const TABS = ["Visão Geral", "Usuários", "FyMenu Financeiro", "Restaurantes Financeiro", "CRM FyMenu", "CRM Restaurantes", "Analytics", "Parceiros", "Fotos", "Controle", "Chats"] as const;
type Tab = (typeof TABS)[number];

const PLAN_PRICES: Record<string, number> = {
  menu: 19990,
  menupro: 39990,
  business: 159900,
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
  basic: "bg-white/10 text-white/70 border border-white/10",
  menu: "bg-white/10 text-white/70 border border-white/10",
  menupro: "bg-[#00ffae]/10 text-[#00ffae] border border-[#00ffae]/20",
  pro: "bg-[#00ffae]/10 text-[#00ffae] border border-[#00ffae]/20",
  business: "bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/25",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-[#00ffae]/10 text-[#00ffae] border border-[#00ffae]/20",
  trial: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  paused: "bg-white/8 text-white/50 border border-white/10",
  canceled: "bg-red-500/10 text-red-400 border border-red-500/20",
  confirmed: "bg-[#00ffae]/10 text-[#00ffae] border border-[#00ffae]/20",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

// ─── CSV Export ──────────────────────────────────────────────────────────────
function exportToCSV(data: Record<string, unknown>[], columns: { label: string; key: string }[], filename: string) {
  const header = columns.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key] ?? "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  ).join("\n");
  const csv = "\uFEFF" + header + "\n" + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CSVButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Exportar CSV"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{ background: "transparent", border: "1px solid rgba(0,255,174,0.3)", color: "#00ffae" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,255,174,0.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      ⬇ CSV
    </button>
  );
}

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
      <div className="w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col" style={{ background: "rgba(10,10,10,0.97)", borderLeft: "1px solid rgba(0,255,174,0.1)", backdropFilter: "blur(40px)" }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,10,10,0.98)", backdropFilter: "blur(20px)" }}>
          <div>
            <h2 className="font-black text-white text-lg">{restaurant.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{restaurant.id}</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(220,38,38,0.12)", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
          }}>✕</button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Feedback msg */}
          {msg && (
            <div className="px-4 py-2.5 rounded-xl text-sm font-medium" style={msg.ok ? { background: "rgba(0,255,174,0.08)", color: "#00ffae", border: "1px solid rgba(0,255,174,0.2)" } : { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              {msg.text}
            </div>
          )}

          {/* Plano */}
          <Section title="Plano">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
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
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
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
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: freeAccess ? "#00ffae" : "rgba(255,255,255,0.12)" }}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform ${freeAccess ? "translate-x-5" : "translate-x-0.5"}`} style={{ background: freeAccess ? "#050505" : "rgba(255,255,255,0.7)" }} />
              </button>
            </label>
            <p className="text-xs text-gray-600 mt-1">Quando ativado, seta status = active e marca free_access = true</p>
          </Section>

          {/* Ver detalhes */}
          <Section title="Detalhes">
            <a
              href={`/admin/${restaurant.id}`}
              className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: "1px solid rgba(0,255,174,0.25)", color: "#00ffae", background: "rgba(0,255,174,0.05)" }}
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
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{ background: localFeatures[feat] ? "#00ffae" : "rgba(255,255,255,0.12)" }}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform ${localFeatures[feat] ? "translate-x-5" : "translate-x-0.5"}`} style={{ background: localFeatures[feat] ? "#050505" : "rgba(255,255,255,0.7)" }} />
                    </button>
                  </label>
                ))}
              </div>
              {!unitId && <p className="text-xs text-gray-600">Sem unidade cadastrada</p>}
            </Section>
          )}

          {/* Desativar */}
          <Section title="Zona de Perigo" danger>
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

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: danger ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.3)" }}>{title}</h3>
      <div className="rounded-xl p-4 space-y-3" style={danger ? { background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
  const styles: Record<string, React.CSSProperties> = {
    purple: { background: "linear-gradient(135deg, #00ffae, #00d9ff)", color: "#050505", fontWeight: 800 },
    green: { background: "linear-gradient(135deg, #00ffae, #00d9ff)", color: "#050505", fontWeight: 800 },
    red: { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
      style={styles[color]}
    >
      {loading ? "Salvando..." : children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminClient({
  stats, restaurants, payments, topProducts,
  planCounts, statusCounts, cities, unitsByRestaurant, unitFeatures, user, analyticsData, crmData, consumerData, financeData, userRole, supportStaff: initialSupportStaff, photoData, partnerData,
  subscriptionData, crmConsumers,
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
  const [crmConsumerSearch, setCrmConsumerSearch] = useState("");
  const [crmConsumerRestaurantFilter, setCrmConsumerRestaurantFilter] = useState("all");

  // Financeiro state
  const [finRestaurantFilter, setFinRestaurantFilter] = useState("all");
  const [finPeriod, setFinPeriod] = useState("30");
  const [finPage, setFinPage] = useState(1);
  const FIN_PAGE_SIZE = 20;

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
  // Edit staff modal
  const [editingStaff, setEditingStaff] = useState<typeof initialSupportStaff[0] | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffRole, setEditStaffRole] = useState("");
  const [editStaffPerms, setEditStaffPerms] = useState<Record<string, boolean>>({});
  const [editStaffPassword, setEditStaffPassword] = useState("");
  const [editStaffPasswordConfirm, setEditStaffPasswordConfirm] = useState("");
  const [editStaffShowPw, setEditStaffShowPw] = useState(false);
  const [editStaffSaving, setEditStaffSaving] = useState(false);
  const [editStaffError, setEditStaffError] = useState<string | null>(null);
  const [editStaffSuccess, setEditStaffSuccess] = useState<string | null>(null);

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
  // Coupon / partner permission flags
  const canEditCouponCode = ["super_admin", "support"].includes(userRole);
  const canEditCommission  = ["super_admin", "manager"].includes(userRole);
  const canToggleCoupon    = ["super_admin", "manager"].includes(userRole);

  // Inline edit states — coupons
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);
  const [editCouponCodeValue, setEditCouponCodeValue] = useState("");
  // Inline edit states — partner commission
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [editPartnerCommission, setEditPartnerCommission] = useState("");

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

  function openEditStaff(s: typeof initialSupportStaff[0]) {
    setEditingStaff(s);
    setEditStaffName(s.name);
    setEditStaffEmail(s.email);
    setEditStaffRole(s.role);
    setEditStaffPerms(s.permissions ?? {});
    setEditStaffPassword("");
    setEditStaffPasswordConfirm("");
    setEditStaffError(null);
    setEditStaffSuccess(null);
  }

  async function handleSaveEditStaff() {
    if (!editingStaff) return;
    setEditStaffSaving(true);
    setEditStaffError(null);
    setEditStaffSuccess(null);
    try {
      const res = await fetch("/api/admin/support-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id: editingStaff.id,
          name: editStaffName,
          email: editStaffEmail,
          role: editStaffRole,
          permissions: editStaffPerms,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSupportStaff((prev) =>
        prev.map((s) => s.id === editingStaff.id
          ? { ...s, name: editStaffName, email: editStaffEmail, role: editStaffRole, permissions: editStaffPerms }
          : s)
      );
      setEditStaffSuccess("Alterações salvas.");
    } catch (err: any) { setEditStaffError(err.message); }
    finally { setEditStaffSaving(false); }
  }

  async function handleSetStaffPassword() {
    if (!editingStaff) return;
    if (editStaffPassword.length < 6) { setEditStaffError("Senha deve ter pelo menos 6 caracteres."); return; }
    if (editStaffPassword !== editStaffPasswordConfirm) { setEditStaffError("As senhas não coincidem."); return; }
    setEditStaffSaving(true);
    setEditStaffError(null);
    setEditStaffSuccess(null);
    try {
      const res = await fetch("/api/admin/support-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", id: editingStaff.id, password: editStaffPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEditStaffPassword("");
      setEditStaffPasswordConfirm("");
      setEditStaffSuccess("Senha definida com sucesso.");
    } catch (err: any) { setEditStaffError(err.message); }
    finally { setEditStaffSaving(false); }
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

  async function handleSaveCouponCode(id: string) {
    const code = editCouponCodeValue.toUpperCase().replace(/\s/g, "");
    if (!code) return;
    await partnerApi({ action: "update_coupon", id, code });
    setCouponsState((prev) => prev.map((c) => c.id === id ? { ...c, code } : c));
    setExpandedCouponId(null);
  }

  async function handleSavePartnerCommission(id: string) {
    const commission = parseFloat(editPartnerCommission);
    if (isNaN(commission) || commission < 0 || commission > 100) return;
    await partnerApi({ action: "update_partner", id, commission_percent: commission });
    setPartnersState((prev) => prev.map((p) => p.id === id ? { ...p, commission_percent: commission } : p));
    setExpandedPartnerId(null);
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
    <div className="min-h-screen text-white" style={{ background: "#050505" }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ background: "rgba(8,8,8,0.95)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight">📊 Painel Admin</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Plataforma FyMenu — painel administrativo</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: "rgba(0,255,174,0.12)", color: "#00ffae", border: "1px solid rgba(0,255,174,0.25)" }}>
            ADMIN
          </span>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/admin/login";
            }}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)" }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 flex gap-1 sticky top-[73px] z-10 overflow-x-auto scrollbar-none" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,8,8,0.8)", backdropFilter: "blur(20px)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-3 text-sm font-semibold transition-colors"
            style={tab === t
              ? { borderBottom: "2px solid #00ffae", color: "#00ffae", marginBottom: -1 }
              : { borderBottom: "2px solid transparent", color: "rgba(255,255,255,0.45)", marginBottom: -1 }}
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
              <StatCard icon="👥" label="Total de Restaurantes" value={stats.totalRestaurants.toLocaleString("pt-BR")} sub="na plataforma" color="text-[#00ffae]" />
              <StatCard icon="📈" label="Novos (7 dias)" value={stats.activeRestaurants.toLocaleString("pt-BR")} sub="trial ou ativos recentemente" color="text-[#00ffae]" />
              <StatCard icon="📊" label="Total de Pedidos" value={stats.totalOrders.toLocaleString("pt-BR")} sub="todos os confirmados" color="text-[#00ffae]" />
              <StatCard icon="💰" label="Receita (30d)" value={fmt(stats.revenue30d)} sub="via PDV registrado" color="text-[#00ffae]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon="🎯" label="Ticket Médio" value={fmt(ticketMedio)} sub="receita / pedidos" color="text-[#00ffae]" />
              <StatCard icon="📊" label="Taxa de Atividade" value={`${taxaAtividade}%`} sub="novos / total nos últimos 7d" color="text-[#00ffae]" />
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,255,174,0.1)" }}>
              <h3 className="font-bold mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>Últimos Pagamentos</h3>
              {payments.length === 0 ? (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div className="flex gap-2 items-center">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>{fmtDate(p.processed_at)}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={
                          p.method === "pix"
                            ? { background: "rgba(0,255,174,0.1)", color: "#00ffae", border: "1px solid rgba(0,255,174,0.2)" }
                            : p.method === "card"
                            ? { background: "rgba(0,217,255,0.1)", color: "#00d9ff", border: "1px solid rgba(0,217,255,0.2)" }
                            : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }
                        }>
                          {p.method === "cash" ? "💵 Dinheiro" : p.method === "card" ? "💳 Cartão" : "📲 PIX"}
                        </span>
                      </div>
                      <span className="font-semibold" style={{ color: "#00ffae" }}>{fmt(p.amount)}</span>
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
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(0,255,174,0.08)", color: "#00ffae", border: "1px solid rgba(0,255,174,0.18)" }}>grátis</span>
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
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{ background: "rgba(0,255,174,0.08)", border: "1px solid rgba(0,255,174,0.2)", color: "#00ffae" }}
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

        {/* FYMENU FINANCEIRO */}
        {tab === "FyMenu Financeiro" && (() => {
          const BILLING_PRICES: Record<string, number> = { menu: 19990, menupro: 39990, business: 159900 };

          const payingClients = financeData.plans.filter((p) => p.status === "active" && !p.free_access);
          const mrr = payingClients.reduce((sum, p) => sum + (BILLING_PRICES[p.plan] ?? 0), 0);
          const payingCount = payingClients.length;
          const ticketMedioMRR = payingCount > 0 ? Math.round(mrr / payingCount) : 0;

          const mrrByPlan: Record<string, { count: number; revenue: number }> = {};
          for (const p of payingClients) {
            if (!mrrByPlan[p.plan]) mrrByPlan[p.plan] = { count: 0, revenue: 0 };
            mrrByPlan[p.plan].count++;
            mrrByPlan[p.plan].revenue += BILLING_PRICES[p.plan] ?? 0;
          }
          const mrrPlanEntries = ["business", "menupro", "menu"].filter((k) => mrrByPlan[k]).map((k) => ({ plan: k, ...mrrByPlan[k] }));
          const maxMrrPlan = Math.max(...mrrPlanEntries.map((e) => e.revenue), 1);

          const churned = financeData.plans.filter((p) => p.status === "canceled" || p.status === "paused").length;
          const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const active30d = financeData.plans.filter((p) => ["active", "trial", "canceled", "paused"].includes(p.status)).length || 1;
          const churnRate = ((churned / active30d) * 100).toFixed(1);

          // Receita de assinaturas por mês (subscription_payments)
          const subPayByMonth: Record<string, number> = {};
          for (const sp of subscriptionData.payments) {
            if (!sp.due_date) continue;
            const month = sp.due_date.substring(0, 7);
            subPayByMonth[month] = (subPayByMonth[month] ?? 0) + (sp.amount ?? 0);
          }
          const subMonths = Object.keys(subPayByMonth).sort().slice(-12);
          const subChartData = subMonths.map((m) => ({
            label: new Date(m + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
            value: subPayByMonth[m],
          }));
          const maxSubVal = Math.max(...subChartData.map((d) => d.value), 1);

          // Receita confirmada 30d (subscription_payments pagas)
          const subRevenue30d = subscriptionData.payments
            .filter((sp) => sp.paid_at && new Date(sp.paid_at).getTime() >= cutoff30d)
            .reduce((s, sp) => s + (sp.amount ?? 0), 0);

          // Build sub lookup: asaas_subscription_id → subscription info
          const subLookup: Record<string, { plan: string; cycle: string | null; restaurant: string }> = {};
          for (const s of subscriptionData.subscriptions) {
            if (s.asaas_subscription_id) {
              subLookup[s.asaas_subscription_id] = {
                plan: s.plan,
                cycle: s.cycle,
                restaurant: s.restaurants?.name ?? "—",
              };
            }
          }

          // Assinaturas ativas
          const activeSubs = subscriptionData.subscriptions.filter((s) => s.status === "active" || s.status === "pending");

          const today = new Date().toISOString().split("T")[0];

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-200 mb-1">💎 FyMenu Financeiro — Receita da Plataforma</h2>
                <p className="text-gray-500 text-sm mb-4">Receita recorrente gerada pelos planos contratados pelos restaurantes.</p>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[
                  { icon: "💎", label: "MRR Estimado", value: fmt(mrr), sub: "planos ativos × preço", color: "text-[#00ffae]" },
                  { icon: "✅", label: "Receita 30d", value: fmt(subRevenue30d), sub: "assinaturas pagas", color: "text-green-400" },
                  { icon: "💳", label: "Clientes Pagantes", value: String(payingCount), sub: "ativos sem free access", color: "text-blue-400" },
                  { icon: "📉", label: "Churn Rate", value: `${churnRate}%`, sub: "cancelados + pausados", color: "text-red-400" },
                  { icon: "🎯", label: "Ticket Médio", value: fmt(ticketMedioMRR), sub: "MRR / clientes", color: "text-yellow-400" },
                ].map(({ icon, label, value, sub, color }) => (
                  <div key={label} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico receita assinaturas */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                <h3 className="font-bold text-gray-200 mb-4">📈 Receita de Assinaturas por Mês</h3>
                {subChartData.length === 0 ? (
                  <p className="text-gray-600 text-sm">Sem pagamentos de assinatura registrados ainda.</p>
                ) : (
                  <div className="flex items-end gap-1" style={{ height: 140 }}>
                    {subChartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-[#00ffae]/50 rounded-t" style={{ height: `${(d.value / maxSubVal) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }} />
                        <span className="text-gray-600 text-[9px] mt-1 truncate w-full text-center">{d.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Distribuição MRR por plano */}
              {mrrPlanEntries.length > 0 && (
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6">
                  <h3 className="font-bold text-gray-200 mb-4">💰 Distribuição MRR por Plano</h3>
                  <div className="space-y-4">
                    {mrrPlanEntries.map(({ plan, count, revenue }) => {
                      const pct = mrr > 0 ? Math.round((revenue / mrr) * 100) : 0;
                      const barColor = plan === "business" ? "bg-[#d4af37]/60" : plan === "menupro" ? "bg-[#00ffae]/60" : "bg-white/20";
                      return (
                        <div key={plan}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300 capitalize font-medium">{plan} <span className="text-gray-500 font-normal">({count} clientes)</span></span>
                            <span className="text-gray-300">{fmt(revenue)} <span className="text-gray-500">({pct}%)</span></span>
                          </div>
                          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(revenue / maxMrrPlan) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabela Assinaturas Ativas */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-200">Assinaturas Ativas</h3>
                  <CSVButton onClick={() => exportToCSV(
                    activeSubs.map((s) => ({
                      restaurante: s.restaurants?.name ?? "—",
                      plano: s.plan,
                      ciclo: s.cycle ?? "—",
                      valor: (s.value / 100).toFixed(2),
                      status: s.status,
                      inicio: s.started_at ? fmtDate(s.started_at) : "—",
                      proximo_vencimento: s.next_due_date ?? "—",
                    })),
                    [
                      { label: "Restaurante", key: "restaurante" },
                      { label: "Plano", key: "plano" },
                      { label: "Ciclo", key: "ciclo" },
                      { label: "Valor", key: "valor" },
                      { label: "Status", key: "status" },
                      { label: "Início", key: "inicio" },
                      { label: "Próximo Vencimento", key: "proximo_vencimento" },
                    ],
                    `fymenu_assinaturas_${today}.csv`
                  )} />
                </div>
                {activeSubs.length === 0 ? (
                  <p className="text-gray-600 text-sm p-6">Nenhuma assinatura ativa encontrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Restaurante</th>
                          <th className="px-4 py-3 text-left">Plano</th>
                          <th className="px-4 py-3 text-left">Ciclo</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Início</th>
                          <th className="px-4 py-3 text-left">Próx. Venc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSubs.map((s) => (
                          <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-4 py-2.5 text-gray-200 font-medium">{s.restaurants?.name ?? "—"}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[s.plan] ?? "bg-gray-700 text-gray-300"}`}>{s.plan}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{s.cycle ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right text-[#00ffae] font-semibold">{fmt(s.value)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_BADGE[s.status] ?? "bg-gray-700 text-gray-400"}`}>{s.status}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(s.started_at)}</td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{s.next_due_date ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Histórico de Pagamentos */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-200">Histórico de Pagamentos de Assinaturas</h3>
                  <CSVButton onClick={() => exportToCSV(
                    subscriptionData.payments.map((sp) => {
                      const info = sp.subscription_id ? subLookup[sp.subscription_id] : null;
                      return {
                        data: sp.due_date ?? "—",
                        restaurante: info?.restaurant ?? "—",
                        plano: info?.plan ?? "—",
                        metodo: sp.billing_type ?? "—",
                        valor: ((sp.amount ?? 0) / 100).toFixed(2),
                        status: sp.status ?? "—",
                      };
                    }),
                    [
                      { label: "Data", key: "data" },
                      { label: "Restaurante", key: "restaurante" },
                      { label: "Plano", key: "plano" },
                      { label: "Método", key: "metodo" },
                      { label: "Valor", key: "valor" },
                      { label: "Status", key: "status" },
                    ],
                    `fymenu_pagamentos_${today}.csv`
                  )} />
                </div>
                {subscriptionData.payments.length === 0 ? (
                  <p className="text-gray-600 text-sm p-6">Nenhum pagamento de assinatura registrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Data</th>
                          <th className="px-4 py-3 text-left">Restaurante</th>
                          <th className="px-4 py-3 text-left">Plano</th>
                          <th className="px-4 py-3 text-left">Método</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptionData.payments.slice(0, 100).map((sp, i) => {
                          const info = sp.subscription_id ? subLookup[sp.subscription_id] : null;
                          return (
                            <tr key={sp.asaas_payment_id ?? i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{sp.due_date ?? "—"}</td>
                              <td className="px-4 py-2.5 text-gray-300">{info?.restaurant ?? "—"}</td>
                              <td className="px-4 py-2.5">
                                {info?.plan ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[info.plan] ?? "bg-gray-700 text-gray-300"}`}>{info.plan}</span> : <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{sp.billing_type ?? "—"}</td>
                              <td className="px-4 py-2.5 text-right text-[#00ffae] font-semibold">{fmt(sp.amount ?? 0)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${sp.status === "paid" ? "bg-[#00ffae]/10 text-[#00ffae] border border-[#00ffae]/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                  {sp.status ?? "—"}
                                </span>
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
          );
        })()}

        {/* RESTAURANTES FINANCEIRO */}
        {tab === "Restaurantes Financeiro" && (() => {
          // Build unit→restaurant map
          const unitToRest: Record<string, { id: string; name: string }> = {};
          for (const u of crmData.unitMapping) {
            const owner = crmData.owners.find((o) => o.id === u.restaurant_id);
            if (owner) unitToRest[u.id] = { id: u.restaurant_id, name: owner.name };
          }

          // Period filter
          const periodDays = parseInt(finPeriod) || 30;
          const periodCutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;

          let filteredOrders = consumerData.orders.filter((o) => {
            const t = new Date(o.created_at).getTime();
            if (t < periodCutoff) return false;
            if (finRestaurantFilter !== "all") {
              const rest = unitToRest[o.unit_id];
              if (!rest || rest.id !== finRestaurantFilter) return false;
            }
            return true;
          });

          // Metrics
          const totalVendas = filteredOrders.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0);
          const totalPedidos = filteredOrders.length;
          const ticketMedioRest = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

          const metodosCount: Record<string, number> = {};
          for (const o of filteredOrders) {
            const m = o.payment_method ?? "Não informado";
            metodosCount[m] = (metodosCount[m] ?? 0) + 1;
          }

          // Summary by restaurant
          const restSummary: Record<string, { name: string; total: number; orders: number; lastOrder: string | null }> = {};
          for (const o of filteredOrders) {
            const rest = unitToRest[o.unit_id];
            if (!rest) continue;
            if (!restSummary[rest.id]) restSummary[rest.id] = { name: rest.name, total: 0, orders: 0, lastOrder: null };
            restSummary[rest.id].total += parseFloat(String(o.total)) || 0;
            restSummary[rest.id].orders++;
            if (!restSummary[rest.id].lastOrder || o.created_at > restSummary[rest.id].lastOrder!) {
              restSummary[rest.id].lastOrder = o.created_at;
            }
          }
          const restSummaryArr = Object.values(restSummary).sort((a, b) => b.total - a.total);

          // Pagination
          const totalPages = Math.ceil(filteredOrders.length / FIN_PAGE_SIZE);
          const pageOrders = filteredOrders.slice((finPage - 1) * FIN_PAGE_SIZE, finPage * FIN_PAGE_SIZE);

          const uniqueRests = [...new Map(
            Object.values(unitToRest).map((r) => [r.id, r])
          ).values()].sort((a, b) => a.name.localeCompare(b.name));

          const today = new Date().toISOString().split("T")[0];

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-200 mb-1">💰 Restaurantes Financeiro — Vendas dos Restaurantes</h2>
                <p className="text-gray-500 text-sm mb-4">Vendas realizadas pelos restaurantes aos seus clientes finais via PDV/delivery.</p>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">🧾</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total de Vendas</p>
                  <p className="text-2xl font-black mt-1 text-green-400">{fmt(Math.round(totalVendas))}</p>
                  <p className="text-gray-600 text-xs mt-0.5">pedidos confirmados</p>
                </div>
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">🎯</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-2xl font-black mt-1 text-yellow-400">{fmt(Math.round(ticketMedioRest))}</p>
                  <p className="text-gray-600 text-xs mt-0.5">por pedido</p>
                </div>
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">📦</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total de Pedidos</p>
                  <p className="text-2xl font-black mt-1 text-blue-400">{totalPedidos.toLocaleString("pt-BR")}</p>
                  <p className="text-gray-600 text-xs mt-0.5">confirmados</p>
                </div>
                <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                  <div className="text-2xl mb-2">💳</div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Métodos</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(metodosCount).slice(0, 3).map(([m, c]) => (
                      <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                        {m === "pix" ? "PIX" : m === "card" ? "Cartão" : m === "cash" ? "Dinheiro" : m} {totalPedidos > 0 ? Math.round((c / totalPedidos) * 100) : 0}%
                      </span>
                    ))}
                    {totalPedidos === 0 && <span className="text-gray-600 text-xs">Sem dados</span>}
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={finRestaurantFilter}
                  onChange={(e) => { setFinRestaurantFilter(e.target.value); setFinPage(1); }}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="all">Todos os Restaurantes</option>
                  {uniqueRests.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select
                  value={finPeriod}
                  onChange={(e) => { setFinPeriod(e.target.value); setFinPage(1); }}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="365">Último ano</option>
                  <option value="9999">Todos os períodos</option>
                </select>
                <span className="text-gray-500 text-sm">{filteredOrders.length} pedidos</span>
              </div>

              {/* Tabela Vendas */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-200">Vendas Registradas</h3>
                  <CSVButton onClick={() => exportToCSV(
                    filteredOrders.map((o) => ({
                      data: fmtDate(o.created_at),
                      restaurante: unitToRest[o.unit_id]?.name ?? "—",
                      unidade: o.unit_id,
                      metodo: o.payment_method ?? "—",
                      status: o.status,
                      valor: ((parseFloat(String(o.total)) || 0)).toFixed(2),
                    })),
                    [
                      { label: "Data", key: "data" },
                      { label: "Restaurante", key: "restaurante" },
                      { label: "Unidade", key: "unidade" },
                      { label: "Método", key: "metodo" },
                      { label: "Status", key: "status" },
                      { label: "Valor", key: "valor" },
                    ],
                    `restaurantes_vendas_${today}.csv`
                  )} />
                </div>
                {filteredOrders.length === 0 ? (
                  <p className="text-gray-600 text-sm p-6">Nenhuma venda no período selecionado.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-left">Restaurante</th>
                            <th className="px-4 py-3 text-left">Método</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageOrders.map((o) => (
                            <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{fmtDate(o.created_at)}</td>
                              <td className="px-4 py-2.5 text-gray-300">{unitToRest[o.unit_id]?.name ?? "—"}</td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs">
                                {o.payment_method === "pix" ? "📲 PIX" : o.payment_method === "card" ? "💳 Cartão" : o.payment_method === "cash" ? "💵 Dinheiro" : o.payment_method ?? "—"}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_BADGE[o.status] ?? "bg-gray-700 text-gray-400"}`}>{o.status}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-400">{fmt(Math.round(parseFloat(String(o.total)) * 100))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
                        <span className="text-gray-500 text-xs">Página {finPage} de {totalPages}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setFinPage((p) => Math.max(1, p - 1))} disabled={finPage === 1} className="px-3 py-1 rounded text-xs text-gray-400 border border-gray-700 disabled:opacity-40 hover:bg-gray-800">Anterior</button>
                          <button onClick={() => setFinPage((p) => Math.min(totalPages, p + 1))} disabled={finPage === totalPages} className="px-3 py-1 rounded text-xs text-gray-400 border border-gray-700 disabled:opacity-40 hover:bg-gray-800">Próxima</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Resumo por restaurante */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-200">Resumo por Restaurante</h3>
                  <CSVButton onClick={() => exportToCSV(
                    restSummaryArr.map((r) => ({
                      restaurante: r.name,
                      total_vendas: r.total.toFixed(2),
                      pedidos: r.orders,
                      ticket_medio: r.orders > 0 ? (r.total / r.orders).toFixed(2) : "0.00",
                      ultimo_pedido: r.lastOrder ? fmtDate(r.lastOrder) : "—",
                    })),
                    [
                      { label: "Restaurante", key: "restaurante" },
                      { label: "Total Vendas", key: "total_vendas" },
                      { label: "Pedidos", key: "pedidos" },
                      { label: "Ticket Médio", key: "ticket_medio" },
                      { label: "Último Pedido", key: "ultimo_pedido" },
                    ],
                    `restaurantes_resumo_${today}.csv`
                  )} />
                </div>
                {restSummaryArr.length === 0 ? (
                  <p className="text-gray-600 text-sm p-6">Nenhum dado no período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Restaurante</th>
                          <th className="px-4 py-3 text-right">Total Vendas</th>
                          <th className="px-4 py-3 text-right">Pedidos</th>
                          <th className="px-4 py-3 text-right">Ticket Médio</th>
                          <th className="px-4 py-3 text-left">Último Pedido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restSummaryArr.map((r) => (
                          <tr key={r.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-4 py-2.5 text-gray-200 font-medium">{r.name}</td>
                            <td className="px-4 py-2.5 text-right text-green-400 font-semibold">{fmt(Math.round(r.total))}</td>
                            <td className="px-4 py-2.5 text-right text-gray-300">{r.orders}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{fmt(Math.round(r.orders > 0 ? r.total / r.orders : 0))}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{r.lastOrder ? fmtDate(r.lastOrder) : "—"}</td>
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
                      <p className="text-2xl font-black text-[#00ffae]">{avg}</p>
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
                            <div className="h-full bg-[#00ffae]/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
                            <div className="h-full bg-[#00ffae]/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
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

        {/* CRM FYMENU */}
        {tab === "CRM FyMenu" && (() => {
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

          const cutoff30crm = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const newLast30 = crmData.owners.filter((o) => new Date(o.created_at).getTime() >= cutoff30crm).length;
          const active = crmData.owners.filter((o) => o.status === "active").length;
          const trial = crmData.owners.filter((o) => o.status === "trial").length;
          const canceled = crmData.owners.filter((o) => o.status === "canceled").length;
          const today = new Date().toISOString().split("T")[0];

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-200 mb-1">🏢 CRM FyMenu — Clientes da Plataforma</h2>
                <p className="text-gray-500 text-sm mb-4">Restaurantes que contrataram o FyMenu.</p>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "🏪", label: "Total Restaurantes", value: String(crmData.owners.length), sub: "cadastrados", color: "text-[#00ffae]" },
                  { icon: "✅", label: "Ativos / Trial", value: `${active} / ${trial}`, sub: `${canceled} cancelados`, color: "text-green-400" },
                  { icon: "📅", label: "Novos (30d)", value: String(newLast30), sub: "novos cadastros", color: "text-blue-400" },
                  { icon: "📞", label: "Com Telefone", value: String(withPhone), sub: `${uniqueCities} cidades`, color: "text-yellow-400" },
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
                className="w-full px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-[#00ffae]/50"
              />

              {/* Tabela */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold text-gray-200">Clientes FyMenu</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs">{filteredOwners.length} registros</span>
                    <CSVButton onClick={() => exportToCSV(
                      filteredOwners.map((o) => ({
                        restaurante: o.name,
                        dono: [o.owner_first_name, o.owner_last_name].filter(Boolean).join(" ") || "—",
                        telefone: o.owner_phone || o.whatsapp || "—",
                        plano: o.plan ?? "basic",
                        status: o.status,
                        cidade: cityByRestaurant[o.id] ?? "—",
                        faturamento: ((revenueByRestaurant[o.id] ?? 0) / 100).toFixed(2),
                        pedidos: String(orderCountByRestaurant[o.id] ?? 0),
                        desde: fmtDate(o.created_at),
                      })),
                      [
                        { label: "Restaurante", key: "restaurante" },
                        { label: "Dono", key: "dono" },
                        { label: "Telefone", key: "telefone" },
                        { label: "Plano", key: "plano" },
                        { label: "Status", key: "status" },
                        { label: "Cidade", key: "cidade" },
                        { label: "Faturamento", key: "faturamento" },
                        { label: "Pedidos", key: "pedidos" },
                        { label: "Desde", key: "desde" },
                      ],
                      `fymenu_clientes_${today}.csv`
                    )} />
                  </div>
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

            </div>
          );
        })()}

        {/* CRM RESTAURANTES */}
        {tab === "CRM Restaurantes" && (() => {
          const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

          // Unique restaurants from crmConsumers
          const restOptions = [...new Map(
            crmConsumers
              .filter((c) => c.units?.restaurants?.name)
              .map((c) => [c.units!.restaurant_id, c.units!.restaurants!.name])
          ).entries()].sort((a, b) => a[1].localeCompare(b[1]));

          const filteredConsumers = crmConsumers.filter((c) => {
            if (crmConsumerRestaurantFilter !== "all" && c.units?.restaurant_id !== crmConsumerRestaurantFilter) return false;
            if (!crmConsumerSearch) return true;
            const s = crmConsumerSearch.toLowerCase();
            return (
              (c.name ?? "").toLowerCase().includes(s) ||
              (c.phone ?? "").includes(s) ||
              (c.email ?? "").toLowerCase().includes(s) ||
              (c.city ?? "").toLowerCase().includes(s)
            );
          });

          // Metrics
          const totalConsumers = filteredConsumers.length;
          const recurring = filteredConsumers.filter((c) => c.total_orders > 1).length;
          const newLast30 = filteredConsumers.filter((c) => new Date(c.created_at).getTime() >= cutoff30).length;
          const totalSpentAll = filteredConsumers.reduce((s, c) => s + (c.total_spent ?? 0), 0);
          const totalOrdersAll = filteredConsumers.reduce((s, c) => s + (c.total_orders ?? 0), 0);
          const ticketMedioConsumer = totalOrdersAll > 0 ? totalSpentAll / totalOrdersAll : 0;

          const today = new Date().toISOString().split("T")[0];

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-200 mb-1">👥 CRM Restaurantes — Clientes dos Restaurantes</h2>
                <p className="text-gray-500 text-sm mb-4">Consumidores finais que fizeram pedidos/comandas nos restaurantes.</p>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "👥", label: "Total de Clientes", value: totalConsumers.toLocaleString("pt-BR"), sub: "no filtro atual", color: "text-[#00ffae]" },
                  { icon: "🔁", label: "Recorrentes", value: recurring.toLocaleString("pt-BR"), sub: "total_orders > 1", color: "text-green-400" },
                  { icon: "🎯", label: "Ticket Médio", value: fmt(Math.round(ticketMedioConsumer)), sub: "gasto / pedidos", color: "text-yellow-400" },
                  { icon: "📅", label: "Novos (30d)", value: newLast30.toLocaleString("pt-BR"), sub: "novos clientes", color: "text-blue-400" },
                ].map(({ icon, label, value, sub, color }) => (
                  <div key={label} className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={crmConsumerRestaurantFilter}
                  onChange={(e) => setCrmConsumerRestaurantFilter(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="all">Todos os Restaurantes</option>
                  {restOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone, email..."
                  value={crmConsumerSearch}
                  onChange={(e) => setCrmConsumerSearch(e.target.value)}
                  className="flex-1 min-w-48 px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-[#00ffae]/50"
                />
                <span className="text-gray-500 text-sm whitespace-nowrap">{filteredConsumers.length} clientes</span>
              </div>

              {/* Tabela */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-200">Clientes dos Restaurantes</h3>
                  <CSVButton onClick={() => exportToCSV(
                    filteredConsumers.map((c) => ({
                      nome: c.name ?? "—",
                      telefone: c.phone ?? "—",
                      email: c.email ?? "—",
                      restaurante: c.units?.restaurants?.name ?? "—",
                      cidade: c.city ?? c.units?.city ?? "—",
                      total_pedidos: String(c.total_orders ?? 0),
                      total_gasto: ((c.total_spent ?? 0) / 100).toFixed(2),
                      ultimo_pedido: c.last_order_at ? fmtDate(c.last_order_at) : "—",
                      source: c.source ?? "—",
                      cadastro: fmtDate(c.created_at),
                    })),
                    [
                      { label: "Nome", key: "nome" },
                      { label: "Telefone", key: "telefone" },
                      { label: "Email", key: "email" },
                      { label: "Restaurante", key: "restaurante" },
                      { label: "Cidade", key: "cidade" },
                      { label: "Total Pedidos", key: "total_pedidos" },
                      { label: "Total Gasto", key: "total_gasto" },
                      { label: "Último Pedido", key: "ultimo_pedido" },
                      { label: "Source", key: "source" },
                      { label: "Cadastro", key: "cadastro" },
                    ],
                    `restaurante_clientes_${today}.csv`
                  )} />
                </div>
                {filteredConsumers.length === 0 ? (
                  <p className="text-gray-600 text-sm p-6">Nenhum cliente encontrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Nome</th>
                          <th className="px-4 py-3 text-left">Telefone</th>
                          <th className="px-4 py-3 text-left">Restaurante</th>
                          <th className="px-4 py-3 text-right">Pedidos</th>
                          <th className="px-4 py-3 text-right">Total Gasto</th>
                          <th className="px-4 py-3 text-left">Último Pedido</th>
                          <th className="px-4 py-3 text-left">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConsumers.slice(0, 200).map((c) => (
                          <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-4 py-2.5 text-gray-200 font-medium">{c.name ?? "—"}</td>
                            <td className="px-4 py-2.5">
                              {c.phone ? (
                                <a href={`tel:${c.phone}`} className="text-green-400 hover:text-green-300 text-xs">{c.phone}</a>
                              ) : (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-[140px]">{c.units?.restaurants?.name ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right text-gray-300 font-medium">{c.total_orders ?? 0}</td>
                            <td className="px-4 py-2.5 text-right text-[#00ffae] font-semibold">{fmt(c.total_spent ?? 0)}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{c.last_order_at ? fmtDate(c.last_order_at) : "—"}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs">{c.source ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredConsumers.length > 200 && (
                      <p className="text-gray-600 text-xs p-4 text-center">Mostrando 200 de {filteredConsumers.length}. Use os filtros para refinar.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* PARCEIROS */}
        {tab === "Parceiros" && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="🤝" label="Parceiros Ativos" value={String(activePartners)} sub="total" color="text-[#00ffae]" />
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
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${partnerTab === t ? "border-[#00ffae] text-[#00ffae]" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
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
                  <button onClick={() => setShowAddPartner(true)} className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>+ Novo Parceiro</button>
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
                        <input type="checkbox" checked={partnerIsPhotographer} onChange={(e) => setPartnerIsPhotographer(e.target.checked)} className="accent-[#00ffae]" />
                        É fotógrafo
                      </label>
                    </div>
                    <textarea placeholder="Notas (opcional)" value={partnerNotes} onChange={(e) => setPartnerNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-white text-sm outline-none resize-none" />
                    {partnerError && <p className="text-red-400 text-xs">{partnerError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddPartner(false); setPartnerError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddPartner} className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Adicionar</button>
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
                              <React.Fragment key={p.id}>
                                <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                  <td className="px-4 py-3 text-gray-400 text-xs">{p.email}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-300">{p.commission_percent}%</span>
                                      {canEditCommission && (
                                        <button
                                          onClick={() => { setExpandedPartnerId(expandedPartnerId === p.id ? null : p.id); setEditPartnerCommission(String(p.commission_percent)); }}
                                          className="text-[#00ffae]/70 text-xs hover:text-[#00ffae]">
                                          ✎
                                        </button>
                                      )}
                                    </div>
                                  </td>
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
                                {expandedPartnerId === p.id && (
                                  <tr className="bg-gray-800/40">
                                    <td colSpan={8} className="px-4 py-3">
                                      <div className="flex flex-col gap-2 max-w-xs">
                                        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Editar comissão</div>
                                        <div className="flex gap-2 items-center">
                                          <div className="relative flex-1">
                                            <input
                                              type="number" min={0} max={100} step={0.5}
                                              value={editPartnerCommission}
                                              onChange={(e) => setEditPartnerCommission(e.target.value)}
                                              className="w-full px-3 py-2 pr-7 rounded-lg bg-gray-900/80 text-white font-bold text-sm outline-none" style={{ border: "1px solid rgba(0,255,174,0.25)", background: "rgba(255,255,255,0.05)" }}
                                              onKeyDown={(e) => e.key === "Enter" && handleSavePartnerCommission(p.id)}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                          </div>
                                          <button onClick={() => handleSavePartnerCommission(p.id)} className="px-3 py-2 rounded-lg text-[#050505] text-xs font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Salvar</button>
                                          <button onClick={() => setExpandedPartnerId(null)} className="px-3 py-2 rounded-lg border border-gray-700 text-gray-400 text-xs">Cancelar</button>
                                        </div>
                                        {!canEditCouponCode && (
                                          <div className="text-xs text-gray-500">O código do cupom só pode ser editado por Super Admin e Suporte.</div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
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
                  <button onClick={() => setShowAddCoupon(true)} className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>+ Novo Cupom</button>
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
                      <button onClick={handleAddCoupon} className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Criar Cupom</button>
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
                            <React.Fragment key={c.id}>
                              <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-4 py-3 text-white font-mono font-bold tracking-wider">{c.code}</td>
                                <td className="px-4 py-3 text-gray-300">{c.partners?.name ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs capitalize">{c.discount_type}</td>
                                <td className="px-4 py-3 text-gray-300">
                                  {c.discount_type === "trial_days" ? `+${c.trial_extra_days}d` : c.discount_type === "percent" ? `${c.discount_value}%` : fmtBRL(c.discount_value)}
                                </td>
                                <td className="px-4 py-3 text-gray-400">{c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.expires_at)}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => canToggleCoupon && handleToggleCoupon(c.id, !c.is_active)}
                                    disabled={!canToggleCoupon}
                                    title={!canToggleCoupon ? "Apenas Super Admin e Gerente podem alterar" : undefined}
                                    className={`px-2 py-0.5 rounded text-xs font-semibold ${c.is_active ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"} ${!canToggleCoupon ? "opacity-40 cursor-not-allowed" : ""}`}>
                                    {c.is_active ? "Ativo" : "Inativo"}
                                  </button>
                                </td>
                                <td className="px-4 py-3 flex items-center gap-2">
                                  {canEditCouponCode && (
                                    <button
                                      onClick={() => { setExpandedCouponId(expandedCouponId === c.id ? null : c.id); setEditCouponCodeValue(c.code); }}
                                      className="text-[#00ffae]/70 text-xs hover:text-[#00ffae]">
                                      {expandedCouponId === c.id ? "Fechar" : "Editar"}
                                    </button>
                                  )}
                                  <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 text-xs hover:text-red-300">Remover</button>
                                </td>
                              </tr>
                              {expandedCouponId === c.id && (
                                <tr className="bg-gray-800/40">
                                  <td colSpan={8} className="px-4 py-3">
                                    <div className="flex flex-col gap-2 max-w-sm">
                                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Editar código do cupom</div>
                                      <div className="flex gap-2 items-center">
                                        <input
                                          value={editCouponCodeValue}
                                          onChange={(e) => setEditCouponCodeValue(e.target.value.toUpperCase().replace(/\s/g, ""))}
                                          placeholder="CÓDIGO"
                                          className="px-3 py-2 rounded-lg text-white font-mono font-bold tracking-widest text-sm outline-none flex-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,255,174,0.25)", textTransform: "uppercase", letterSpacing: 3 }}
                                          onKeyDown={(e) => e.key === "Enter" && handleSaveCouponCode(c.id)}
                                        />
                                        <button onClick={() => handleSaveCouponCode(c.id)} className="px-3 py-2 rounded-lg text-[#050505] text-xs font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Salvar</button>
                                        <button onClick={() => setExpandedCouponId(null)} className="px-3 py-2 rounded-lg border border-gray-700 text-gray-400 text-xs">Cancelar</button>
                                      </div>
                                      {!canEditCommission && (
                                        <div className="text-xs text-gray-500">A % de comissão só pode ser editada por Super Admin e Gerente.</div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
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
                  <button onClick={() => setShowAddPayout(true)} className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>+ Registrar Pagamento</button>
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
                      <button onClick={handleAddPayout} className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Registrar</button>
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
              <StatCard icon="📸" label="Sessões Realizadas" value={String(photoSessionsState.filter((s) => s.status === "completed").length)} sub="total" color="text-[#00ffae]" />
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
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${photoTab === key ? "border-[#00ffae] text-[#00ffae]" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
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
                  <button onClick={() => setShowAddSession(true)} className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>+ Nova Sessão</button>
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
                      <button onClick={handleAddSession} className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Agendar</button>
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
                  <button onClick={() => setShowAddPackage(true)} className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>+ Adicionar Pacote</button>
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
                      <input type="checkbox" checked={pkgVideo} onChange={(e) => setPkgVideo(e.target.checked)} className="accent-[#00ffae]" />
                      Inclui vídeo
                    </label>
                    {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddPackage(false); setPhotoError(null); }} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
                      <button onClick={handleAddPackage} className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Adicionar</button>
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
                  <button onClick={() => setShowAddCity(true)} className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>+ Adicionar Cidade</button>
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
                      <button onClick={handleAddCity} className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>Adicionar</button>
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
                      className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-[#00ffae]/50"
                    />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-[#00ffae]/50"
                    />
                    <input
                      type="password"
                      placeholder="Confirmar nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm outline-none focus:border-[#00ffae]/50"
                    />
                    {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
                    {passwordSuccess && <p className="text-green-400 text-xs">{passwordSuccess}</p>}
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full py-2 rounded-lg text-[#050505] text-sm font-semibold disabled:opacity-50 transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}
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
                    className="flex-1 py-2.5 rounded-xl text-[#050505] text-sm font-bold transition-colors"
                    style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}
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
                <span className="text-[#00ffae] font-black text-lg">{fmt(mrr)} <span className="text-gray-500 text-sm font-normal">MRR est.</span></span>
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
                          <div className="h-full bg-[#00ffae]/50 rounded-full" style={{ width: `${pct}%` }} />
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
                  className="px-3 py-1.5 rounded-lg text-[#050505] text-xs font-semibold transition-colors" style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}
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
                          className="accent-[#00ffae]"
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
                      className="flex-1 py-2 rounded-lg text-[#050505] text-sm font-semibold disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>
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
                        <button onClick={() => openEditStaff(s)}
                          className="px-2 py-1 rounded text-xs border border-gray-700 text-gray-400 hover:text-white">
                          Editar
                        </button>
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

      {/* Edit Support Staff Modal */}
      {editingStaff && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            width: "100%", maxWidth: 480,
            background: "rgba(15,15,20,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.1)",
            padding: 28,
            display: "flex", flexDirection: "column", gap: 18,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0 }}>Editar Funcionário</h3>
              <button onClick={() => setEditingStaff(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 20, padding: 0 }}>×</button>
            </div>

            {/* Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Nome completo</label>
              <input
                value={editStaffName}
                onChange={(e) => setEditStaffName(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none" }}
              />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Email</label>
              <input
                type="email"
                value={editStaffEmail}
                onChange={(e) => setEditStaffEmail(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none" }}
              />
            </div>

            {/* Role */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Cargo / Role</label>
              <select
                value={editStaffRole}
                onChange={(e) => setEditStaffRole(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,15,20,0.95)", color: "#fff", fontSize: 14, outline: "none" }}
              >
                <option value="viewer">Viewer (somente leitura)</option>
                <option value="support">Suporte</option>
                <option value="moderator">Moderador</option>
                <option value="manager">Gerente</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Permissions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Permissões</label>
              {[
                { key: "view_orders", label: "Ver pedidos dos clientes" },
                { key: "view_products", label: "Ver produtos/cardápios" },
                { key: "view_units", label: "Ver unidades dos clientes" },
                { key: "view_crm", label: "Ver CRM (dados dos donos)" },
                { key: "view_financial", label: "Ver financeiro" },
                { key: "edit_products", label: "Editar produtos dos clientes" },
                { key: "manage_features", label: "Gerenciar feature flags" },
              ].map((perm) => (
                <label key={perm.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editStaffPerms[perm.key] ?? false}
                    onChange={(e) => setEditStaffPerms((prev) => ({ ...prev, [perm.key]: e.target.checked }))}
                    style={{ accentColor: "#7c3aed" }}
                  />
                  {perm.label}
                </label>
              ))}
            </div>

            {/* Save info button */}
            <button
              onClick={handleSaveEditStaff}
              disabled={editStaffSaving}
              style={{ padding: "12px", borderRadius: 12, border: "none", cursor: editStaffSaving ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 14, fontWeight: 700, opacity: editStaffSaving ? 0.6 : 1 }}
            >
              {editStaffSaving ? "Salvando..." : "Salvar alterações"}
            </button>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "4px 0" }} />

            {/* Password section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Definir / Resetar senha</label>
              <div style={{ position: "relative" }}>
                <input
                  type={editStaffShowPw ? "text" : "password"}
                  value={editStaffPassword}
                  onChange={(e) => setEditStaffPassword(e.target.value)}
                  placeholder="Nova senha"
                  style={{ width: "100%", padding: "10px 44px 10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setEditStaffShowPw((v) => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 15, padding: 0 }}
                >
                  {editStaffShowPw ? "🙈" : "👁️"}
                </button>
              </div>
              <input
                type={editStaffShowPw ? "text" : "password"}
                value={editStaffPasswordConfirm}
                onChange={(e) => setEditStaffPasswordConfirm(e.target.value)}
                placeholder="Confirmar nova senha"
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none" }}
              />
              <button
                onClick={handleSetStaffPassword}
                disabled={editStaffSaving || !editStaffPassword}
                style={{ padding: "10px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.1)", color: "#c4b5fd", fontSize: 13, fontWeight: 600, cursor: (editStaffSaving || !editStaffPassword) ? "not-allowed" : "pointer", opacity: (editStaffSaving || !editStaffPassword) ? 0.5 : 1 }}
              >
                Definir senha
              </button>
            </div>

            {editStaffError && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
                {editStaffError}
              </div>
            )}
            {editStaffSuccess && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#6ee7b7", fontSize: 13 }}>
                {editStaffSuccess}
              </div>
            )}
          </div>
        </div>
      )}

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

        {/* ── Chats tab ─────────────────────────────────────────────────── */}
        {tab === "Chats" && <AdminChatsTab />}
    </div>
  );
}

// ── Admin Chats Tab ───────────────────────────────────────────────────────────
function AdminChatsTab() {
  type Conv = {
    id: string; subject: string; status: string; priority: string;
    last_message_at: string; unread: number;
    restaurants: { id: string; name: string; plan: string } | null;
    support_staff: { id: string; name: string } | null;
  };
  type Msg = {
    id: string; sender_type: string; sender_name: string;
    sender_staff_id?: string; message: string; read_at: string | null; created_at: string;
  };

  const STATUS_L: Record<string, { label: string; color: string }> = {
    open:          { label: "Aberto",             color: "#60a5fa" },
    waiting_reply: { label: "Aguardando resposta", color: "#fbbf24" },
    resolved:      { label: "Resolvido",           color: "#6ee7b7" },
    closed:        { label: "Fechado",             color: "#9ca3af" },
  };
  const PRIO_L: Record<string, { label: string; color: string }> = {
    low:    { label: "Baixa",   color: "#9ca3af" },
    normal: { label: "Normal",  color: "#60a5fa" },
    high:   { label: "Alta",    color: "#fbbf24" },
    urgent: { label: "Urgente", color: "#f87171" },
  };

  const [convs, setConvs] = useState<Conv[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const supabase = React.useMemo(() => createClient(), []);

  // Get admin token (from supabase session — admin uses regular auth)
  // For admin, we call suporte APIs directly via fetch with session cookie (server handles it via ADMIN_EMAIL)
  // But suporte API uses x-suporte-token. For the admin tab we call a dedicated admin endpoint instead.
  // We'll use the /api/admin/chats/* pattern (fetched as admin via cookie auth).
  // Since those don't exist yet, we'll re-use the suporte API by reading from Supabase directly via client.

  async function loadConvs() {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, q, page: String(page) });
    const res = await fetch(`/api/admin/chats?${params}`);
    if (res.ok) {
      const json = await res.json();
      setConvs(json.data ?? []); setTotal(json.count ?? 0);
    }
    setLoading(false);
  }

  React.useEffect(() => { loadConvs(); }, [statusFilter, q, page]); // eslint-disable-line

  // Realtime
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-chats")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        loadConvs();
        if (active) {
          fetch(`/api/admin/chats/${active.id}/messages`)
            .then((r) => r.json())
            .then(({ data }) => { if (data) { setMessages(data); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50); } });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => { loadConvs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id]); // eslint-disable-line

  async function openConv(c: Conv) {
    setActive(c); setMsgLoading(true); setMessages([]);
    const res = await fetch(`/api/admin/chats/${c.id}/messages`);
    const json = await res.json();
    setMessages(json.data ?? []); setMsgLoading(false);
    setConvs((prev) => prev.map((cv) => cv.id === c.id ? { ...cv, unread: 0 } : cv));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 80);
  }

  async function sendReply() {
    if (!reply.trim() || !active || sending) return;
    setSending(true);
    const res = await fetch(`/api/admin/chats/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply.trim() }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) => [...prev, json.data]);
      setReply("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  async function patchConv(updates: Record<string, unknown>) {
    if (!active) return;
    await fetch(`/api/admin/chats/${active.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    loadConvs();
    const res = await fetch(`/api/admin/chats/${active.id}`);
    const { data } = await res.json();
    if (data) setActive(data);
  }

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-96 gap-0 rounded-2xl overflow-hidden border border-gray-800">
      {/* Left: list */}
      <div className="w-80 flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-200 flex items-center gap-2">
              💬 Chats
              {totalUnread > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-black">{totalUnread}</span>}
            </h3>
          </div>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar restaurante..."
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs placeholder-gray-600 outline-none mb-2" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 text-xs outline-none">
            <option value="all">Todos</option>
            <option value="open">Abertos</option>
            <option value="waiting_reply">Aguardando</option>
            <option value="resolved">Resolvidos</option>
            <option value="closed">Fechados</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-600 text-xs p-4">Carregando...</p>}
          {convs.map((c) => {
            const st = STATUS_L[c.status] ?? STATUS_L.open;
            return (
              <button key={c.id} onClick={() => openConv(c)}
                className={`w-full p-3 text-left border-b border-gray-900 transition-colors ${active?.id === c.id ? "border-l-2" : "hover:bg-gray-900/50"}`}
                style={active?.id === c.id ? { background: "rgba(0,255,174,0.06)", borderLeftColor: "#00ffae" } : {}}>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-bold text-gray-200 truncate flex-1 mr-2">{c.restaurants?.name ?? "—"}</span>
                  {c.unread > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">{c.unread}</span>}
                </div>
                <div className="text-gray-500 text-[11px] truncate mb-1">{c.subject}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold" style={{ color: st.color }}>{st.label}</span>
                  {c.support_staff && <span className="text-gray-600 text-[10px]">→ {(c.support_staff as any).name}</span>}
                </div>
              </button>
            );
          })}
          {!loading && convs.length === 0 && <p className="text-gray-600 text-xs p-4 text-center">Nenhuma conversa.</p>}
        </div>
      </div>

      {/* Right: conversation */}
      <div className="flex-1 min-w-0 flex flex-col bg-gray-950/50">
        {!active ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-600">
            <span className="text-4xl">💬</span>
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-bold text-gray-200 text-sm">{active.subject}</h4>
                  <p className="text-gray-500 text-xs">{active.restaurants?.name} · <span className="text-[#00ffae]">{active.restaurants?.plan}</span></p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${STATUS_L[active.status]?.color ?? "#fff"}18`, color: STATUS_L[active.status]?.color }}>{STATUS_L[active.status]?.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${PRIO_L[active.priority]?.color ?? "#fff"}18`, color: PRIO_L[active.priority]?.color }}>{PRIO_L[active.priority]?.label}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {active.status !== "resolved" && (
                  <button onClick={() => patchConv({ status: "resolved" })} className="px-3 py-1 rounded-lg bg-green-900/30 text-green-400 text-xs font-semibold border border-green-800/50">✓ Resolver</button>
                )}
                {(active.status === "resolved" || active.status === "closed") && (
                  <button onClick={() => patchConv({ status: "open" })} className="px-3 py-1 rounded-lg bg-blue-900/30 text-blue-400 text-xs font-semibold border border-blue-800/50">↩ Reabrir</button>
                )}
                {active.status !== "closed" && (
                  <button onClick={() => patchConv({ status: "closed" })} className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 text-xs font-semibold">Fechar</button>
                )}
                <select value={active.priority} onChange={(e) => patchConv({ priority: e.target.value })}
                  className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs outline-none cursor-pointer">
                  {Object.entries(PRIO_L).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {msgLoading ? <p className="text-gray-600 text-xs">Carregando...</p> : messages.map((m) => {
                const isClient = m.sender_type === "client";
                const isSystem = m.sender_type === "system";
                if (isSystem) return (
                  <div key={m.id} className="text-center">
                    <span className="text-gray-600 text-[11px] bg-gray-900 px-3 py-1 rounded-full">{m.message}</span>
                  </div>
                );
                return (
                  <div key={m.id} className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}>
                    <span className="text-gray-500 text-[11px] mb-1">{m.sender_name}</span>
                    <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${isClient ? "bg-gray-800 text-gray-100 rounded-tl-sm" : "text-gray-100 rounded-tr-sm"}`} style={isClient ? {} : { background: "rgba(0,255,174,0.12)", border: "1px solid rgba(0,255,174,0.2)" }}>
                      {m.message}
                    </div>
                    <span className="text-gray-700 text-[10px] mt-1">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {active.status !== "closed" && (
              <div className="p-3 border-t border-gray-800 flex gap-2 items-end">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Responder... (Enter para enviar)"
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-xl text-white text-sm resize-none outline-none font-inherit"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="px-4 py-2 rounded-xl text-[#050505] text-sm font-semibold disabled:opacity-40 transition-colors"
                  style={{ background: "linear-gradient(135deg, #00ffae, #00d9ff)" }}>
                  {sending ? "…" : "Enviar"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,255,174,0.1)" }}>
      <div className="text-2xl mb-3 w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: "rgba(0,255,174,0.08)" }}>{icon}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>{label}</div>
      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</div>
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
            className="w-full rounded-t"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0, background: "rgba(0,255,174,0.45)" }}
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
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "rgba(0,255,174,0.12)", border: "1px solid rgba(0,255,174,0.2)" }} />
        ))}
      </div>
      <p className="text-gray-600 text-xs mt-3 text-center">Gráfico detalhado disponível com integração de analytics</p>
    </div>
  );
}
