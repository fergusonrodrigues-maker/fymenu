"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock, ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import { listActivities, listActivityMembers, ActivityRecord, MemberOption } from "@/app/painel/historicoActions";

// ─── Module config ─────────────────────────────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  menu: "Cardápio",
  financial: "Financeiro",
  team: "Equipe",
  members: "Sócios",
  orders: "Pedidos",
  inventory: "Estoque",
  crm: "CRM",
  settings: "Configurações",
  import: "Importação",
  comanda: "Comandas",
  plan: "Plano",
  printers: "Impressoras",
  whatsapp: "WhatsApp",
  delivery: "Delivery",
  tv: "Modo TV",
  operations: "Operações",
};

const MODULE_COLORS: Record<string, string> = {
  menu: "#8b5cf6",
  financial: "#16a34a",
  team: "#3b82f6",
  members: "#f97316",
  settings: "#6b7280",
  inventory: "#ca8a04",
  crm: "#ec4899",
  import: "#4f46e5",
  comanda: "#06b6d4",
  orders: "#dc2626",
  plan: "#f59e0b",
  printers: "#64748b",
  whatsapp: "#25d366",
  delivery: "#0ea5e9",
  tv: "#a855f7",
  operations: "#14b8a6",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  base_price: "Preço",
  price: "Preço",
  amount: "Valor",
  category: "Categoria",
  is_recurring: "Recorrente",
  is_active: "Ativo",
  description: "Descrição",
  address: "Endereço",
  city: "Cidade",
  neighborhood: "Bairro",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  maps_url: "Maps",
  is_published: "Publicado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function avatar(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if ((field === "price" || field === "base_price" || field === "amount") && typeof value === "number") {
    return `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
  return String(value);
}

function formatActivity(a: ActivityRecord): string {
  const actor = a.actor_name || "Alguém";
  const name = a.entity_name || "";
  switch (`${a.module}/${a.action}`) {
    case "menu/create_product":    return `${actor} criou o produto "${name}"`;
    case "menu/update_product":    return `${actor} editou o produto "${name}"`;
    case "menu/delete_product":    return `${actor} excluiu o produto "${name}"`;
    case "menu/create_category":   return `${actor} criou a categoria "${name}"`;
    case "menu/update_category":   return `${actor} editou a categoria "${name}"`;
    case "menu/delete_category":   return `${actor} excluiu a categoria "${name}"`;
    case "financial/create_expense": return `${actor} lançou o custo "${name}"`;
    case "financial/delete_expense": return `${actor} excluiu o custo "${name}"`;
    case "members/invite_member":  return `${actor} convidou ${name} como sócio`;
    case "members/revoke_invite":  return `${actor} cancelou o convite de ${name}`;
    case "members/remove_member":  return `${actor} removeu o sócio ${name}`;
    case "settings/update_unit":   return `${actor} alterou configurações da unidade`;
    case "settings/update_unit_settings": return `${actor} alterou configurações da unidade`;
    default:
      return name
        ? `${actor} executou "${a.action}" em ${name}`
        : `${actor} executou "${a.action}"`;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ModuleBadge({ module }: { module: string }) {
  const color = MODULE_COLORS[module] ?? "#6b7280";
  const label = MODULE_LABELS[module] ?? module;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      background: `${color}22`, color, letterSpacing: "0.3px",
    }}>
      {label}
    </span>
  );
}

function ChangesBlock({ changes }: { changes: Record<string, { from: any; to: any }> }) {
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {Object.entries(changes).map(([field, diff]) => {
        const label = FIELD_LABELS[field] ?? field;
        const isPrice = field === "price" || field === "base_price" || field === "amount";
        const emoji = isPrice ? "💰" : field === "name" ? "📝" : field.includes("active") || field.includes("publish") ? "✅" : "•";
        return (
          <div key={field} style={{ fontSize: 11, color: "var(--dash-text-muted)", paddingLeft: 8, borderLeft: "2px solid var(--dash-border)" }}>
            {emoji} <strong style={{ color: "var(--dash-text-secondary)" }}>{label}:</strong>{" "}
            <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{formatFieldValue(field, diff.from)}</span>
            {" → "}
            <span style={{ color: "var(--dash-accent)" }}>{formatFieldValue(field, diff.to)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = activity.changes && Object.keys(activity.changes).length > 0;
  const text = formatActivity(activity);
  const initials = avatar(activity.actor_name);

  return (
    <div
      style={{
        display: "flex", gap: 12, padding: "12px 0",
        borderBottom: "1px solid var(--dash-border)",
        cursor: hasChanges ? "pointer" : "default",
      }}
      onClick={() => hasChanges && setExpanded(v => !v)}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #f472b6, #fb923c)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: "#fff",
      }}>
        {initials}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--dash-text)", lineHeight: 1.4, wordBreak: "break-word" }}>
            {text}
            {hasChanges && (
              <span style={{ marginLeft: 4, color: "var(--dash-text-muted)" }}>
                {expanded ? <ChevronDown size={12} style={{ display: "inline" }} /> : <ChevronRight size={12} style={{ display: "inline" }} />}
              </span>
            )}
          </p>
          <span style={{ fontSize: 11, color: "var(--dash-text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {formatRelative(activity.created_at)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <ModuleBadge module={activity.module} />
          <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }} title={formatDate(activity.created_at)}>
            {formatDate(activity.created_at)}
          </span>
        </div>

        {expanded && hasChanges && activity.changes && (
          <ChangesBlock changes={activity.changes} />
        )}
      </div>
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────
interface Filters {
  actorUserId: string;
  module: string;
  period: "today" | "7d" | "30d" | "custom";
  dateFrom: string;
  dateTo: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  actorUserId: "",
  module: "",
  period: "30d",
  dateFrom: "",
  dateTo: "",
  search: "",
};

function getDateRangeFromPreset(preset: Filters["period"]): { from: string; to: string } {
  if (preset === "custom") return { from: "", to: "" };
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();
  // end of today in local time → converts to UTC correctly via toISOString()
  const endOfToday = new Date(y, mo, d, 23, 59, 59, 999);
  let startDate: Date;
  switch (preset) {
    case "today": startDate = new Date(y, mo, d, 0, 0, 0, 0); break;
    case "7d":    startDate = new Date(y, mo, d - 6, 0, 0, 0, 0); break;
    case "30d":   startDate = new Date(y, mo, d - 29, 0, 0, 0, 0); break;
    default:      startDate = new Date(y, mo, d, 0, 0, 0, 0);
  }
  return { from: startDate.toISOString(), to: endOfToday.toISOString() };
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface HistoricoModalProps {
  restaurantId: string;
}

export default function HistoricoModal({ restaurantId }: HistoricoModalProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState("");

  // Load members once
  useEffect(() => {
    listActivityMembers(restaurantId).then(setMembers);
  }, [restaurantId]);

  const fetchActivities = useCallback(async (f: Filters, p: number, append: boolean) => {
    let dates: { from: string; to: string };
    if (f.period !== "custom") {
      dates = getDateRangeFromPreset(f.period);
    } else {
      dates = {
        from: f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`).toISOString() : "",
        to:   f.dateTo   ? new Date(`${f.dateTo}T23:59:59.999`).toISOString() : "",
      };
    }
    const setter = append ? setLoadingMore : setLoading;
    setter(true);
    try {
      const result = await listActivities({
        restaurantId,
        actorUserId: f.actorUserId || undefined,
        module: f.module || undefined,
        dateFrom: dates.from || undefined,
        dateTo: dates.to || undefined,
        search: f.search || undefined,
        page: p,
        pageSize: 50,
      });
      if (append) {
        setActivities(prev => [...prev, ...result.activities]);
      } else {
        setActivities(result.activities);
      }
      setHasMore(result.hasMore);
    } finally {
      setter(false);
    }
  }, [restaurantId]);

  // Reload on filter change
  useEffect(() => {
    setPage(0);
    fetchActivities(filters, 0, false);
  }, [filters, fetchActivities]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function handleSearchChange(v: string) {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilter("search", v), 300);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchActivities(filters, next, true);
  }

  const inp: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dash-border)",
    background: "var(--dash-card-hover)", color: "var(--dash-text)",
    fontSize: 13, outline: "none", width: "100%",
  };

  const sel: React.CSSProperties = { ...inp, cursor: "pointer", appearance: "none" as any };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Export button (future) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          disabled
          title="Em breve"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8, border: "1px solid var(--dash-border)",
            background: "transparent", color: "var(--dash-text-muted)",
            fontSize: 12, cursor: "not-allowed", opacity: 0.5,
          }}
        >
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16,
        padding: "12px", borderRadius: 12, background: "var(--dash-card)",
        border: "1px solid var(--dash-border)",
      }}>
        {/* Quem */}
        <div style={{ flex: "1 1 140px", minWidth: 120 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quem</div>
          <select value={filters.actorUserId} onChange={e => setFilter("actorUserId", e.target.value)} style={sel}>
            <option value="">Todos</option>
            {members.map(m => (
              <option key={m.userId} value={m.userId}>{m.displayName}</option>
            ))}
          </select>
        </div>

        {/* O que */}
        <div style={{ flex: "1 1 140px", minWidth: 120 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>O que</div>
          <select value={filters.module} onChange={e => setFilter("module", e.target.value)} style={sel}>
            <option value="">Todos</option>
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Quando */}
        <div style={{ flex: "1 1 140px", minWidth: 120 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quando</div>
          <select value={filters.period} onChange={e => setFilter("period", e.target.value as Filters["period"])} style={sel}>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {/* Custom date range */}
        {filters.period === "custom" && (
          <>
            <div style={{ flex: "1 1 120px", minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>De</div>
              <input type="date" value={filters.dateFrom} onChange={e => setFilter("dateFrom", e.target.value)} style={inp} />
            </div>
            <div style={{ flex: "1 1 120px", minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Até</div>
              <input type="date" value={filters.dateTo} onChange={e => setFilter("dateTo", e.target.value)} style={inp} />
            </div>
          </>
        )}

        {/* Search */}
        <div style={{ flex: "2 1 200px", minWidth: 160 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Buscar</div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--dash-text-muted)", pointerEvents: "none" }} />
            <input
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Nome do produto, custo..."
              style={{ ...inp, paddingLeft: 28 }}
            />
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--dash-text-muted)", fontSize: 14 }}>
            Carregando...
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <Clock size={40} style={{ color: "var(--dash-text-muted)", marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dash-text-secondary)", marginBottom: 4 }}>Nenhuma atividade registrada</div>
            <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>
              As ações que você e seus sócios fizerem aparecerão aqui
            </div>
          </div>
        ) : (
          <>
            {activities.map(a => (
              <ActivityItem key={a.id} activity={a} />
            ))}
            {hasMore && (
              <div style={{ paddingTop: 16, textAlign: "center" }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    padding: "9px 24px", borderRadius: 8,
                    border: "1px solid var(--dash-border)",
                    background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                    fontSize: 13, cursor: loadingMore ? "not-allowed" : "pointer",
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? "Carregando..." : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
