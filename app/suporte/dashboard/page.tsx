"use client";

import React from "react";
import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Truck, ClipboardList, Store, Package, UtensilsCrossed, MessageCircle, BarChart3, DollarSign, Settings, Tag, Users, X, Menu } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Staff = {
  id: string; name: string; email: string; role: string;
  permissions: Record<string, boolean>;
};

type Section =
  | "restaurantes" | "unidades" | "pedidos" | "cardapios"
  | "crm" | "analytics" | "financeiro" | "features"
  | "planos" | "equipe" | "chats";

// ── Client-side permission check (mirrors lib/suporte-auth.ts) ────────────────
const VIEWER_PERMS = ["ver_restaurantes", "ver_unidades", "ver_pedidos", "ver_cardapios"];
const SUPORTE_PERMS = [...VIEWER_PERMS, "ver_crm", "responder_tickets"];
const MODERADOR_PERMS = [...SUPORTE_PERMS, "editar_produtos", "gerenciar_features", "ver_analytics", "ver_financeiro_unidade"];
const GERENTE_PERMS = [...MODERADOR_PERMS, "gerenciar_planos", "ver_financeiro_global", "aprovar_solicitacoes"];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  viewer: VIEWER_PERMS, suporte: SUPORTE_PERMS, support: SUPORTE_PERMS,
  moderador: MODERADOR_PERMS, moderator: MODERADOR_PERMS,
  gerente: GERENTE_PERMS, manager: GERENTE_PERMS,
  admin: ["*"], super_admin: ["*"],
};

const PERM_ALIASES: Record<string, string> = {
  view_units: "ver_unidades", view_orders: "ver_pedidos", view_products: "ver_cardapios",
  edit_products: "editar_produtos", view_crm: "ver_crm", manage_features: "gerenciar_features",
  view_analytics: "ver_analytics", manage_staff: "gerenciar_staff",
};

function can(staff: Staff, perm: string): boolean {
  const rp = ROLE_PERMISSIONS[staff.role];
  if (rp?.includes("*")) return true;
  const np = PERM_ALIASES[perm] ?? perm;
  if (rp?.includes(perm) || rp?.includes(np)) return true;
  return !!(staff.permissions?.[perm] || staff.permissions?.[np]);
}

// ── Styling constants ─────────────────────────────────────────────────────────
const BG = "#080808";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.35)";
const SIDEBAR_W = 240;

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  viewer:    { bg: "rgba(156,163,175,0.15)", color: "#9ca3af", label: "Viewer" },
  suporte:   { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "Suporte" },
  support:   { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "Suporte" },
  moderador: { bg: "rgba(139,92,246,0.15)",  color: "#a78bfa", label: "Moderador" },
  moderator: { bg: "rgba(139,92,246,0.15)",  color: "#a78bfa", label: "Moderador" },
  gerente:   { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24", label: "Gerente" },
  manager:   { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24", label: "Gerente" },
  admin:     { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "Admin" },
  super_admin:{ bg: "rgba(239,68,68,0.15)",  color: "#f87171", label: "Super Admin" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(cents: number | null | undefined) {
  if (cents == null) return "—";
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function pill(ok: boolean, yes = "Sim", no = "Não") {
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: ok ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.1)",
      color: ok ? "#6ee7b7" : "#f87171",
      border: `1px solid ${ok ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.2)"}`,
    }}>{ok ? yes : no}</span>
  );
}

// ── Shared UI components ──────────────────────────────────────────────────────
function SectionHeader({ title, icon, sub }: { title: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", color: TEXT }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>{title}</h2>
      </div>
      {sub && <p style={{ margin: "4px 0 0 32px", fontSize: 13, color: MUTED }}>{sub}</p>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT, fontSize: 13, outline: "none", minWidth: 220 }} />
  );
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(15,15,20,0.95)", color: TEXT, fontSize: 13, outline: "none", cursor: "pointer" }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ onClick, children, variant = "ghost", disabled }: { onClick?: () => void; children: React.ReactNode; variant?: "ghost" | "primary" | "danger"; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    ghost:   { background: "rgba(255,255,255,0.06)", color: TEXT, border: `1px solid ${BORDER}` },
    primary: { background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: TEXT, border: "none" },
    danger:  { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s", ...styles[variant] }}>
      {children}
    </button>
  );
}

function Table({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${BORDER}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: MUTED, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty
            ? <tr><td colSpan={headers.length} style={{ padding: 32, textAlign: "center", color: MUTED }}>Nenhum resultado.</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
}

function TR({ children }: { children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 0.15s" }}>
      {children}
    </tr>
  );
}

function TD({ children, style, colSpan }: { children: React.ReactNode; style?: React.CSSProperties; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: "9px 14px", color: "rgba(255,255,255,0.75)", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle", ...style }}>{children}</td>;
}

function Pages({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: MUTED }}>
      <span>{total} resultado{total !== 1 ? "s" : ""} · página {page} de {pages}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "none", color: page === 1 ? MUTED : TEXT, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>← Anterior</button>
        <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages}
          style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "none", color: page === pages ? MUTED : TEXT, cursor: page === pages ? "not-allowed" : "pointer", fontSize: 12 }}>Próxima →</button>
      </div>
    </div>
  );
}

function Loading() {
  return <p style={{ color: MUTED, fontSize: 13 }}>Carregando...</p>;
}
function Err({ msg }: { msg: string }) {
  return <p style={{ color: "#f87171", fontSize: 13 }}>{msg}</p>;
}

// ── API hook ──────────────────────────────────────────────────────────────────
function useApi(path: string, params: Record<string, string>, token: string | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({ path, params });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/suporte/${path}?${qs}`, { headers: { "x-suporte-token": token } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── Unit selector (used by multiple sections) ─────────────────────────────────
function UnitSelector({ token, value, onChange, placeholder = "Selecione uma unidade..." }:
  { token: string; value: string; onChange: (id: string) => void; placeholder?: string }) {
  const { data } = useApi("units", { page: "1" }, token);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(15,15,20,0.95)", color: value ? TEXT : MUTED, fontSize: 13, outline: "none", cursor: "pointer", minWidth: 220 }}>
      <option value="">{placeholder}</option>
      {data?.data?.map((u: any) => (
        <option key={u.id} value={u.id}>{u.restaurants?.name ? `${u.restaurants.name} — ${u.slug}` : u.slug}</option>
      ))}
    </select>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Restaurantes ──────────────────────────────────────────────────────────────
function RestaurantesSection({ token, staff }: { token: string; staff: Staff }) {
  const [q, setQ] = useState(""); const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all"); const [page, setPage] = useState(1);
  const { data, loading, error } = useApi("restaurantes", { q: search, plan, page: String(page) }, token);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSearch(v: string) { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400); }

  return (
    <div>
      <SectionHeader title="Restaurantes" icon={<ClipboardList size={22} />} sub="Todos os restaurantes cadastrados na plataforma" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar por nome..." />
        <Sel value={plan} onChange={(v) => { setPlan(v); setPage(1); }} options={[
          { value: "all", label: "Todos os planos" }, { value: "free", label: "Free" },
          { value: "basic", label: "Basic" }, { value: "pro", label: "Pro" }, { value: "enterprise", label: "Enterprise" },
        ]} />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <>
          <Table headers={["Restaurante", "Plano", "Status", "Acesso Grátis", "Trial Até", "Criado em"]} empty={!data.data?.length}>
            {data.data?.map((r: any) => (
              <TR key={r.id}>
                <TD style={{ fontWeight: 600 }}>{r.name}</TD>
                <TD><span style={{ fontSize: 11, textTransform: "uppercase", color: "#a78bfa", fontWeight: 700 }}>{r.plan || "—"}</span></TD>
                <TD>{pill(r.status === "active", "Ativo", "Inativo")}</TD>
                <TD>{pill(!!r.free_access, "Sim", "Não")}</TD>
                <TD style={{ fontSize: 12 }}>{r.trial_ends_at ? fmtDate(r.trial_ends_at) : "—"}</TD>
                <TD style={{ fontSize: 12 }}>{fmtDate(r.created_at)}</TD>
              </TR>
            ))}
          </Table>
          <Pages page={page} total={data.count ?? 0} limit={25} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Delivery Config Panel (inline, suporte) ───────────────────────────────────
function DeliveryPanel({ unitId, token }: { unitId: string; token: string }) {
  const GN = "#22c55e";
  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
    borderRadius: 6, color: TEXT, fontSize: 12, padding: "6px 8px",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  interface DZone { id?: string; min_km: string; max_km: string; fee: string; _new?: boolean; _dirty?: boolean; }
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [maxKm, setMaxKm] = useState("10");
  const [minOrder, setMinOrder] = useState("0,00");
  const [zones, setZones] = useState<DZone[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(null), 3000); }
  const h = { "Content-Type": "application/json", "x-suporte-token": token };

  useEffect(() => {
    Promise.all([
      fetch(`/api/delivery/settings?unit_id=${unitId}`, { headers: h }).then(r => r.json()),
      fetch(`/api/delivery/zones?unit_id=${unitId}`, { headers: h }).then(r => r.json()),
    ]).then(([s, z]) => {
      setEnabled(s.delivery_enabled ?? false);
      setLat(s.delivery_latitude != null ? String(s.delivery_latitude) : "");
      setLon(s.delivery_longitude != null ? String(s.delivery_longitude) : "");
      setMaxKm(s.delivery_max_km != null ? String(s.delivery_max_km) : "10");
      setMinOrder(s.delivery_min_order != null ? (s.delivery_min_order / 100).toFixed(2).replace(".", ",") : "0,00");
      setZones((z as any[]).map((row: any) => ({ id: row.id, min_km: String(row.min_km), max_km: String(row.max_km), fee: (row.fee / 100).toFixed(2).replace(".", ",") })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/delivery/settings", {
      method: "PATCH", headers: h,
      body: JSON.stringify({ unit_id: unitId, delivery_enabled: enabled, delivery_latitude: lat !== "" ? Number(lat) : null, delivery_longitude: lon !== "" ? Number(lon) : null, delivery_max_km: Number(maxKm) || 10, delivery_min_order: Math.round(parseFloat(minOrder.replace(",", ".")) * 100) || 0 }),
    });
    setSaving(false);
    flash("Salvo!");
  }

  async function saveZone(idx: number) {
    const z = zones[idx];
    if (!z._dirty) return;
    setSaving(true);
    const body = { unit_id: unitId, min_km: Number(z.min_km), max_km: Number(z.max_km), fee: Math.round(parseFloat(z.fee.replace(",", ".")) * 100) || 0 };
    if (z._new || !z.id) {
      const res = await fetch("/api/delivery/zones", { method: "POST", headers: h, body: JSON.stringify(body) });
      if (res.ok) { const d = await res.json(); setZones(p => p.map((item, i) => i === idx ? { ...item, id: d.id, _new: false, _dirty: false } : item)); }
    } else {
      await fetch(`/api/delivery/zones/${z.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ min_km: body.min_km, max_km: body.max_km, fee: body.fee }) });
      setZones(p => p.map((item, i) => i === idx ? { ...item, _dirty: false } : item));
    }
    setSaving(false);
  }

  async function deleteZone(idx: number) {
    const z = zones[idx];
    if (z._new || !z.id) { setZones(p => p.filter((_, i) => i !== idx)); return; }
    await fetch(`/api/delivery/zones/${z.id}`, { method: "DELETE", headers: h });
    setZones(p => p.filter((_, i) => i !== idx));
  }

  if (enabled === null) return <div style={{ color: MUTED, fontSize: 12, padding: "8px 0" }}>Carregando...</div>;

  return (
    <div style={{ padding: "12px 0 4px", borderTop: `1px solid ${BORDER}` }}>
      {msg && <div style={{ fontSize: 11, color: GN, marginBottom: 8 }}>{msg}</div>}

      {/* Toggle + coords */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: TEXT }}>
          <input type="checkbox" checked={!!enabled} onChange={e => setEnabled(e.target.checked)} />
          Delivery ativo
        </label>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          <input style={{ ...inp, width: 120 }} placeholder="Latitude" value={lat} onChange={e => setLat(e.target.value)} />
          <input style={{ ...inp, width: 120 }} placeholder="Longitude" value={lon} onChange={e => setLon(e.target.value)} />
          <input style={{ ...inp, width: 60 }} placeholder="Raio km" value={maxKm} onChange={e => setMaxKm(e.target.value)} />
          <input style={{ ...inp, width: 70 }} placeholder="Mín R$" value={minOrder} onChange={e => setMinOrder(e.target.value)} />
        </div>
        <button onClick={saveSettings} disabled={saving} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: GN, color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          Salvar
        </button>
      </div>

      {/* Zones */}
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {["De", "Até", "R$", ""].map(h2 => <div key={h2} style={{ flex: h2 === "" ? "0 0 24px" : 1, fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" }}>{h2}</div>)}
      </div>
      {zones.map((z, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, borderColor: z._dirty ? `${GN}55` : undefined }} type="number" step="0.1" value={z.min_km} onChange={e => setZones(p => p.map((item, i) => i === idx ? { ...item, min_km: e.target.value, _dirty: true } : item))} onBlur={() => saveZone(idx)} />
          <input style={{ ...inp, flex: 1, borderColor: z._dirty ? `${GN}55` : undefined }} type="number" step="0.1" value={z.max_km} onChange={e => setZones(p => p.map((item, i) => i === idx ? { ...item, max_km: e.target.value, _dirty: true } : item))} onBlur={() => saveZone(idx)} />
          <input style={{ ...inp, flex: 1, borderColor: z._dirty ? `${GN}55` : undefined }} value={z.fee} onChange={e => setZones(p => p.map((item, i) => i === idx ? { ...item, fee: e.target.value, _dirty: true } : item))} onBlur={() => saveZone(idx)} />
          <button onClick={() => deleteZone(idx)} style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: "rgba(239,68,68,0.12)", color: "#f87171", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={10} /></button>
        </div>
      ))}
      <button onClick={() => { const last = zones[zones.length - 1]; setZones(p => [...p, { min_km: last?.max_km ?? "0", max_km: "", fee: "0,00", _new: true, _dirty: true }]); }} style={{ fontSize: 11, color: GN, background: "none", border: `1px solid ${GN}33`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>+ Faixa</button>
    </div>
  );
}

// ── Unidades ──────────────────────────────────────────────────────────────────
function UnidadesSection({ token, staff }: { token: string; staff: Staff }) {
  const [q, setQ] = useState(""); const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); const [page, setPage] = useState(1);
  const [deliveryUnit, setDeliveryUnit] = useState<string | null>(null);
  const { data, loading, error } = useApi("units", { q: search, status, page: String(page) }, token);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSearch(v: string) { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400); }

  const canDelivery = can(staff, "gerenciar_planos");

  return (
    <div>
      <SectionHeader title="Unidades" icon={<Store size={22} />} sub="Todas as unidades agrupadas por restaurante" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar por nome, slug ou cidade..." />
        <Sel value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
          { value: "all", label: "Todas" }, { value: "published", label: "Publicadas" }, { value: "unpublished", label: "Não publicadas" },
        ]} />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <>
          <Table headers={["Unidade", "Slug", "Restaurante", "Plano", "Cidade", "Status", "Criada em", canDelivery ? "Entrega" : ""]} empty={!data.data?.length}>
            {data.data?.map((u: any) => (
              <Fragment key={u.id}>
                <TR>
                  <TD>{u.name || <span style={{ color: MUTED }}>sem nome</span>}</TD>
                  <TD><code style={{ fontSize: 11, color: "#a78bfa" }}>{u.slug}</code></TD>
                  <TD>{u.restaurants?.name || "—"}</TD>
                  <TD><span style={{ fontSize: 11, textTransform: "uppercase", color: MUTED }}>{u.restaurants?.plan || "—"}</span></TD>
                  <TD>{u.city || "—"}</TD>
                  <TD>{pill(u.is_published, "Publicada", "Rascunho")}</TD>
                  <TD style={{ fontSize: 12 }}>{fmtDate(u.created_at)}</TD>
                  <TD>
                    {canDelivery && (
                      <button
                        onClick={() => setDeliveryUnit(deliveryUnit === u.id ? null : u.id)}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.25)", background: deliveryUnit === u.id ? "rgba(34,197,94,0.15)" : "transparent", color: "#22c55e", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                      >
                        <Truck size={13} />
                      </button>
                    )}
                  </TD>
                </TR>
                {deliveryUnit === u.id && (
                  <TR>
                    <TD colSpan={8} style={{ padding: "0 12px 8px" }}>
                      <DeliveryPanel unitId={u.id} token={token} />
                    </TD>
                  </TR>
                )}
              </Fragment>
            ))}
          </Table>
          <Pages page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
function PedidosSection({ token }: { token: string }) {
  const [status, setStatus] = useState("all"); const [range, setRange] = useState("7d"); const [page, setPage] = useState(1);
  const { data, loading, error } = useApi("orders", { status, range, page: String(page) }, token);
  const STATUS_COLOR: Record<string, string> = {
    confirmed: "#6ee7b7", pending: "#fbbf24", cancelled: "#f87171", preparing: "#a78bfa",
  };

  return (
    <div>
      <SectionHeader title="Pedidos" icon={<Package size={22} />} sub="Pedidos de todas as unidades — somente leitura" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Sel value={range} onChange={(v) => { setRange(v); setPage(1); }} options={[
          { value: "today", label: "Hoje" }, { value: "7d", label: "Últimos 7 dias" }, { value: "30d", label: "Últimos 30 dias" },
        ]} />
        <Sel value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
          { value: "all", label: "Todos os status" }, { value: "confirmed", label: "Confirmados" },
          { value: "pending", label: "Pendentes" }, { value: "cancelled", label: "Cancelados" }, { value: "preparing", label: "Preparando" },
        ]} />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <>
          <Table headers={["ID", "Restaurante / Unidade", "Total", "Pagamento", "Status", "Data"]} empty={!data.data?.length}>
            {data.data?.map((o: any) => (
              <TR key={o.id}>
                <TD style={{ fontSize: 11, color: MUTED }}>{o.id.slice(0, 8)}…</TD>
                <TD>
                  <div style={{ fontSize: 12 }}>{o.units?.restaurants?.name || "—"}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{o.units?.slug || "—"}</div>
                </TD>
                <TD style={{ fontWeight: 600 }}>{fmt(o.total)}</TD>
                <TD style={{ fontSize: 12 }}>{o.payment_method || "—"}</TD>
                <TD>
                  <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${STATUS_COLOR[o.status] ?? "#fff"}18`, color: STATUS_COLOR[o.status] ?? TEXT }}>
                    {o.status}
                  </span>
                </TD>
                <TD style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</TD>
              </TR>
            ))}
          </Table>
          <Pages page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Cardápios ─────────────────────────────────────────────────────────────────
function CardapiosSection({ token, staff }: { token: string; staff: Staff }) {
  const canEdit = can(staff, "editar_produtos");
  const [unitId, setUnitId] = useState("");
  const [q, setQ] = useState(""); const [search, setSearch] = useState("");
  const [active, setActive] = useState("all"); const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi("products", unitId ? { unit_id: unitId, q: search, active, page: String(page) } : { q: search, active, page: String(page) }, token);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSearch(v: string) { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400); }

  async function saveEdit() {
    setSaving(true);
    await fetch("/api/suporte/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
      body: JSON.stringify(editing),
    });
    setSaving(false); setEditing(null); reload();
  }

  return (
    <div>
      <SectionHeader title="Cardápios" icon={<UtensilsCrossed size={22} />} sub={canEdit ? "Selecione uma unidade para ver e editar produtos" : "Somente leitura"} />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <UnitSelector token={token} value={unitId} onChange={(v) => { setUnitId(v); setPage(1); }} />
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar produto..." />
        <Sel value={active} onChange={(v) => { setActive(v); setPage(1); }} options={[
          { value: "all", label: "Todos" }, { value: "active", label: "Ativos" }, { value: "inactive", label: "Inativos" },
        ]} />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <>
          <Table headers={canEdit ? ["Produto", "Categoria", "Unidade", "Preço", "Status", "Ações"] : ["Produto", "Categoria", "Unidade", "Preço", "Status"]} empty={!data.data?.length}>
            {data.data?.map((p: any) => (
              <TR key={p.id}>
                <TD style={{ fontWeight: 600 }}>{p.name}</TD>
                <TD style={{ fontSize: 12 }}>{p.categories?.name || "—"}</TD>
                <TD style={{ fontSize: 12 }}>{p.units?.restaurants?.name} / <span style={{ color: "#a78bfa" }}>{p.units?.slug}</span></TD>
                <TD>{fmt(p.base_price)}</TD>
                <TD>{pill(p.is_active, "Ativo", "Inativo")}</TD>
                {canEdit && <TD><Btn onClick={() => setEditing({ ...p })}>Editar</Btn></TD>}
              </TR>
            ))}
          </Table>
          <Pages page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, width: 420, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 20px", color: TEXT, fontSize: 16, fontWeight: 700 }}>Editar produto</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Nome", "name", "text"], ["Preço (centavos)", "base_price", "number"]].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>{label}</label>
                  <input type={type} value={editing[field] ?? ""} onChange={(e) => setEditing({ ...editing, [field]: type === "number" ? Number(e.target.value) : e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>Descrição</label>
                <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="isActive" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                <label htmlFor="isActive" style={{ fontSize: 13, color: TEXT }}>Ativo</label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <Btn onClick={() => setEditing(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CRM ───────────────────────────────────────────────────────────────────────
function CRMSection({ token }: { token: string }) {
  const [q, setQ] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const { data, loading, error } = useApi("crm", { q: search, page: String(page) }, token);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSearch(v: string) { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400); }

  return (
    <div>
      <SectionHeader title="CRM — Clientes" icon={<MessageCircle size={22} />} sub="Todos os clientes cadastrados" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar por nome, telefone ou email..." />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <>
          <Table headers={["Nome", "Telefone", "Email", "Restaurante", "Unidade", "Pedidos", "Gasto", "Última interação"]} empty={!data.data?.length}>
            {data.data?.map((c: any) => (
              <TR key={c.id}>
                <TD style={{ fontWeight: 600 }}>{c.name || "—"}</TD>
                <TD>{c.phone || "—"}</TD>
                <TD style={{ fontSize: 12 }}>{c.email || "—"}</TD>
                <TD style={{ fontSize: 12 }}>{c.units?.restaurants?.name || "—"}</TD>
                <TD><code style={{ fontSize: 11, color: "#a78bfa" }}>{c.units?.slug || "—"}</code></TD>
                <TD>{c.total_orders ?? 0}</TD>
                <TD>{fmt(c.total_spent ? Number(c.total_spent) * 100 : 0)}</TD>
                <TD style={{ fontSize: 12 }}>{fmtDate(c.last_order_at ?? c.last_visit_at)}</TD>
              </TR>
            ))}
          </Table>
          <Pages page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function AnalyticsSection({ token }: { token: string }) {
  const [unitId, setUnitId] = useState("");
  const [range, setRange] = useState("7d");
  const { data, loading, error } = useApi("analytics", unitId ? { unit_id: unitId, range } : {}, unitId ? token : null);

  return (
    <div>
      <SectionHeader title="Analytics" icon={<BarChart3 size={22} />} sub="Métricas de engajamento por unidade" />
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <UnitSelector token={token} value={unitId} onChange={setUnitId} />
        <Sel value={range} onChange={setRange} options={[{ value: "7d", label: "Últimos 7 dias" }, { value: "30d", label: "Últimos 30 dias" }]} />
      </div>

      {!unitId && <p style={{ color: MUTED, fontSize: 13 }}>Selecione uma unidade para ver as métricas.</p>}
      {unitId && loading && <Loading />}
      {unitId && error && <Err msg={error} />}
      {data && (
        <>
          <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>Unidade</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{(data.unit?.restaurants as any)?.name} — <span style={{ color: "#a78bfa" }}>{data.unit?.slug}</span></div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {Object.entries(data.totals ?? {}).map(([event, count]: [string, any]) => (
              <div key={event} style={{ flex: "1 1 140px", padding: "16px 20px", borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{event.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: TEXT }}>{count}</div>
              </div>
            ))}
            <div style={{ flex: "1 1 140px", padding: "16px 20px", borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Total de eventos</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#a78bfa" }}>{data.total_events}</div>
            </div>
          </div>
          {Object.keys(data.byDay ?? {}).length > 0 && (
            <>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: TEXT }}>Eventos por dia</h3>
              <Table headers={["Data", ...Object.keys(data.totals ?? {})]} empty={false}>
                {Object.entries(data.byDay ?? {}).sort(([a], [b]) => b.localeCompare(a)).map(([day, counts]: [string, any]) => (
                  <TR key={day}>
                    <TD style={{ fontWeight: 600 }}>{day}</TD>
                    {Object.keys(data.totals ?? {}).map((ev) => <TD key={ev}>{counts[ev] ?? 0}</TD>)}
                  </TR>
                ))}
              </Table>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Financeiro ────────────────────────────────────────────────────────────────
function FinanceiroSection({ token, staff }: { token: string; staff: Staff }) {
  const isGerente = can(staff, "ver_financeiro_global");
  const [mode, setMode] = useState<"unit" | "global">("unit");
  const [unitId, setUnitId] = useState("");
  const [range, setRange] = useState("30d");

  const params: Record<string, string> = { range };
  if (mode === "unit" && unitId) params.unit_id = unitId;

  const ready = mode === "global" || (mode === "unit" && !!unitId);
  const { data, loading, error } = useApi("financeiro", params, ready ? token : null);

  return (
    <div>
      <SectionHeader title="Financeiro" icon={<DollarSign size={22} />} sub={isGerente ? "Visão por unidade ou global" : "Receita por unidade"} />
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {isGerente && (
          <Sel value={mode} onChange={(v) => setMode(v as any)} options={[{ value: "unit", label: "Por unidade" }, { value: "global", label: "Visão global" }]} />
        )}
        {mode === "unit" && <UnitSelector token={token} value={unitId} onChange={setUnitId} />}
        <Sel value={range} onChange={setRange} options={[{ value: "7d", label: "Últimos 7 dias" }, { value: "30d", label: "Últimos 30 dias" }]} />
      </div>

      {!ready && <p style={{ color: MUTED, fontSize: 13 }}>Selecione uma unidade para ver os dados financeiros.</p>}
      {ready && loading && <Loading />}
      {ready && error && <Err msg={error} />}

      {data?.mode === "unit" && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { label: "Receita total", value: fmt(data.total_revenue), color: "#6ee7b7" },
              { label: "Pedidos confirmados", value: data.total_orders, color: TEXT },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: "1 1 160px", padding: "16px 20px", borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          {Object.keys(data.byDay ?? {}).length > 0 && (
            <Table headers={["Data", "Receita", "Pedidos"]} empty={false}>
              {Object.entries(data.byDay ?? {}).sort(([a], [b]) => b.localeCompare(a)).map(([day, v]: [string, any]) => (
                <TR key={day}><TD style={{ fontWeight: 600 }}>{day}</TD><TD>{fmt(v.revenue)}</TD><TD>{v.orders}</TD></TR>
              ))}
            </Table>
          )}
        </>
      )}

      {data?.mode === "global" && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { label: "Receita total", value: fmt(data.total_revenue), color: "#6ee7b7" },
              { label: "Assinaturas ativas", value: data.active_subscriptions, color: "#60a5fa" },
              { label: "Assinaturas canceladas", value: data.churned_subscriptions, color: "#f87171" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: "1 1 160px", padding: "16px 20px", borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: TEXT }}>Receita por restaurante</h3>
          <Table headers={["Restaurante", "Receita", "Pedidos"]} empty={!data.revenue_by_restaurant?.length}>
            {data.revenue_by_restaurant?.map((r: any) => (
              <TR key={r.id}><TD style={{ fontWeight: 600 }}>{r.name}</TD><TD style={{ color: "#6ee7b7" }}>{fmt(r.revenue)}</TD><TD>{r.orders}</TD></TR>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection({ token }: { token: string }) {
  const [unitId, setUnitId] = useState("");
  const [q, setQ] = useState(""); const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi("features", unitId ? { unit_id: unitId, q: search } : { q: search }, token);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSearch(v: string) { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); }, 400); }
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggle(id: string, enabled: boolean) {
    setToggling(id);
    await fetch("/api/suporte/features", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
      body: JSON.stringify({ id, enabled }),
    });
    setToggling(null); reload();
  }

  return (
    <div>
      <SectionHeader title="Features" icon={<Settings size={22} />} sub="Ativar e desativar funcionalidades por unidade" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <UnitSelector token={token} value={unitId} onChange={setUnitId} placeholder="Todas as unidades" />
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar feature..." />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <Table headers={["Feature", "Restaurante", "Unidade", "Status", "Ação"]} empty={!data.data?.length}>
          {data.data?.map((f: any) => (
            <TR key={f.id}>
              <TD style={{ fontWeight: 600 }}><code style={{ fontSize: 12, color: "#a78bfa" }}>{f.feature}</code></TD>
              <TD style={{ fontSize: 12 }}>{f.units?.restaurants?.name || "—"}</TD>
              <TD><code style={{ fontSize: 11 }}>{f.units?.slug}</code></TD>
              <TD>{pill(f.enabled, "Ativo", "Inativo")}</TD>
              <TD>
                <button onClick={() => toggle(f.id, !f.enabled)} disabled={toggling === f.id}
                  style={{ padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: toggling === f.id ? "not-allowed" : "pointer",
                    background: f.enabled ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)",
                    color: f.enabled ? "#f87171" : "#6ee7b7", opacity: toggling === f.id ? 0.5 : 1 }}>
                  {toggling === f.id ? "…" : f.enabled ? "Desativar" : "Ativar"}
                </button>
              </TD>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Planos ────────────────────────────────────────────────────────────────────
function PlanosSection({ token }: { token: string }) {
  const [q, setQ] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi("restaurantes", { q: search, page: String(page) }, token);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSearch(v: string) { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400); }
  const [editing, setEditing] = useState<{ id: string; name: string; plan: string } | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [saving, setSaving] = useState(false);

  async function savePlan() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/suporte/planos/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
      body: JSON.stringify({ plan: newPlan }),
    });
    setSaving(false); setEditing(null); reload();
  }

  return (
    <div>
      <SectionHeader title="Planos" icon={<Tag size={22} />} sub="Gerenciar plano de assinatura dos restaurantes" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar restaurante..." />
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <>
          <Table headers={["Restaurante", "Plano atual", "Status", "Trial até", "Ação"]} empty={!data.data?.length}>
            {data.data?.map((r: any) => (
              <TR key={r.id}>
                <TD style={{ fontWeight: 600 }}>{r.name}</TD>
                <TD><span style={{ fontSize: 11, textTransform: "uppercase", color: "#a78bfa", fontWeight: 700 }}>{r.plan || "—"}</span></TD>
                <TD>{pill(r.status === "active", "Ativo", "Inativo")}</TD>
                <TD style={{ fontSize: 12 }}>{r.trial_ends_at ? fmtDate(r.trial_ends_at) : "—"}</TD>
                <TD>
                  <Btn onClick={() => { setEditing({ id: r.id, name: r.name, plan: r.plan }); setNewPlan(r.plan); }}>
                    Alterar plano
                  </Btn>
                </TD>
              </TR>
            ))}
          </Table>
          <Pages page={page} total={data.count ?? 0} limit={25} onChange={setPage} />
        </>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, width: 360, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 8px", color: TEXT, fontSize: 16, fontWeight: 700 }}>Alterar plano</h3>
            <p style={{ margin: "0 0 20px", color: MUTED, fontSize: 13 }}>{editing.name}</p>
            <Sel value={newPlan} onChange={setNewPlan} options={[
              { value: "free", label: "Free" }, { value: "basic", label: "Basic" },
              { value: "pro", label: "Pro" }, { value: "enterprise", label: "Enterprise" },
            ]} />
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <Btn onClick={() => setEditing(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={savePlan} disabled={saving || newPlan === editing.plan}>{saving ? "Salvando..." : "Confirmar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Equipe ────────────────────────────────────────────────────────────────────
function EquipeSection({ token, currentStaff }: { token: string; currentStaff: Staff }) {
  const { data, loading, error, reload } = useApi("equipe", {}, token);
  const [modal, setModal] = useState<"create" | { id: string; name: string; role: string; is_active: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "suporte", password: "" });
  const [editForm, setEditForm] = useState({ name: "", role: "suporte", is_active: true, password: "" });
  const [saving, setSaving] = useState(false);

  const ROLES = ["viewer", "suporte", "moderador", "gerente", "admin"];

  async function createStaff() {
    setSaving(true);
    await fetch("/api/suporte/equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
      body: JSON.stringify(form),
    });
    setSaving(false); setModal(null); setForm({ name: "", email: "", role: "suporte", password: "" }); reload();
  }

  async function updateStaff(id: string) {
    setSaving(true);
    const payload: Record<string, any> = { name: editForm.name, role: editForm.role, is_active: editForm.is_active };
    if (editForm.password) payload.password = editForm.password;
    await fetch(`/api/suporte/equipe/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
      body: JSON.stringify(payload),
    });
    setSaving(false); setModal(null); reload();
  }

  function openEdit(m: any) {
    setModal(m);
    setEditForm({ name: m.name, role: m.role, is_active: m.is_active, password: "" });
  }

  return (
    <div>
      <SectionHeader title="Equipe de Suporte" icon={<Users size={22} />} sub="Gerenciar funcionários do portal de suporte" />
      <div style={{ marginBottom: 16 }}>
        <Btn variant="primary" onClick={() => setModal("create")}>+ Novo funcionário</Btn>
      </div>
      {loading && <Loading />}
      {error && <Err msg={error} />}
      {data && (
        <Table headers={["Nome", "Email", "Role", "Status", "Último login", "Ações"]} empty={!data.data?.length}>
          {data.data?.map((m: any) => {
            const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE["viewer"];
            return (
              <TR key={m.id}>
                <TD style={{ fontWeight: 600 }}>{m.name}</TD>
                <TD style={{ fontSize: 12 }}>{m.email}</TD>
                <TD>
                  <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </TD>
                <TD>{pill(m.is_active, "Ativo", "Inativo")}</TD>
                <TD style={{ fontSize: 12 }}>{fmtDate(m.last_login)}</TD>
                <TD>
                  <Btn onClick={() => openEdit(m)}>Editar</Btn>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {/* Create modal */}
      {modal === "create" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, width: 420, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 20px", color: TEXT, fontSize: 16, fontWeight: 700 }}>Novo funcionário</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Nome", "name", "text"], ["Email", "email", "email"], ["Senha", "password", "password"]].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>{label}</label>
                  <input type={type} value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>Role</label>
                <Sel value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ value: r, label: ROLE_BADGE[r]?.label ?? r }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={createStaff} disabled={saving}>{saving ? "Criando..." : "Criar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal && modal !== "create" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, width: 420, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 20px", color: TEXT, fontSize: 16, fontWeight: 700 }}>Editar funcionário</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>Nome</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>Nova senha (deixe em branco para não alterar)</label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>Role</label>
                <Sel value={editForm.role} onChange={(v) => setEditForm({ ...editForm, role: v })} options={ROLES.map((r) => ({ value: r, label: ROLE_BADGE[r]?.label ?? r }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="isActiveEdit" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                <label htmlFor="isActiveEdit" style={{ fontSize: 13, color: TEXT }}>Conta ativa</label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={() => updateStaff((modal as any).id)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chats / Tickets ───────────────────────────────────────────────────────────
type Conversation = {
  id: string; subject: string; status: string; priority: string;
  last_message_at: string; unread: number; assigned_staff_id?: string | null;
  restaurants: { id: string; name: string; plan: string } | null;
  support_staff: { id: string; name: string } | null;
};
type ChatMessage = {
  id: string; conversation_id?: string; sender_type: string; sender_name: string;
  sender_staff_id?: string; message: string; read_at: string | null; created_at: string;
};

const CHAT_STATUS: Record<string, { label: string; color: string }> = {
  open:          { label: "Aberto",             color: "#60a5fa" },
  waiting_reply: { label: "Aguardando resposta", color: "#fbbf24" },
  resolved:      { label: "Resolvido",           color: "#6ee7b7" },
  closed:        { label: "Fechado",             color: "#9ca3af" },
};
const CHAT_PRIORITY: Record<string, { label: string; color: string }> = {
  low:    { label: "Baixa",   color: "#9ca3af" },
  normal: { label: "Normal",  color: "#60a5fa" },
  high:   { label: "Alta",    color: "#fbbf24" },
  urgent: { label: "Urgente", color: "#f87171" },
};

function fmtRel(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
  return new Date(s).toLocaleDateString("pt-BR");
}

function ChatsSection({ token, staff }: { token: string; staff: Staff }) {
  const canSeeStaffNames = ["gerente", "manager", "admin", "super_admin"].includes(staff.role);

  // List state
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [mineOnly, setMineOnly] = useState(false);
  const [q, setQ] = useState(""); const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Active conversation
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [patchLoading, setPatchLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    setConvLoading(true); setConvError(null);
    const params = new URLSearchParams({ status: statusFilter, mine: mineOnly ? "1" : "0", q: search, page: String(page) });
    const res = await fetch(`/api/suporte/chats?${params}`, { headers: { "x-suporte-token": token } });
    const json = await res.json();
    if (!res.ok) { setConvError(json.error); setConvLoading(false); return; }
    setConvs(json.data ?? []); setTotal(json.count ?? 0); setConvLoading(false);
  }, [token, statusFilter, mineOnly, search, page]);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // Realtime: listen for new messages across all conversations
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("suporte-chat-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (activeConv?.id === msg.conversation_id) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        loadConvs();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_conversations" }, () => {
        loadConvs();
        if (activeConv) {
          fetch(`/api/suporte/chats/${activeConv.id}`, { headers: { "x-suporte-token": token } })
            .then((r) => r.json())
            .then(({ data }) => { if (data) setActiveConv(data); });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id, token]);

  async function openConv(c: Conversation) {
    setActiveConv(c);
    setMsgLoading(true); setMessages([]);
    const res = await fetch(`/api/suporte/chats/${c.id}/messages`, { headers: { "x-suporte-token": token } });
    const json = await res.json();
    setMessages(json.data ?? []); setMsgLoading(false);
    // Mark as read
    fetch(`/api/suporte/chats/${c.id}/read`, { method: "POST", headers: { "x-suporte-token": token } });
    setConvs((prev) => prev.map((cv) => cv.id === c.id ? { ...cv, unread: 0 } : cv));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 80);
  }

  async function sendReply() {
    if (!reply.trim() || !activeConv || sending) return;
    setSending(true);
    const res = await fetch(`/api/suporte/chats/${activeConv.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
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
    if (!activeConv) return;
    setPatchLoading(true);
    await fetch(`/api/suporte/chats/${activeConv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-suporte-token": token },
      body: JSON.stringify(updates),
    });
    setPatchLoading(false);
    // Refresh this conversation
    const res = await fetch(`/api/suporte/chats/${activeConv.id}`, { headers: { "x-suporte-token": token } });
    const { data } = await res.json();
    if (data) setActiveConv(data);
    loadConvs();
  }

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", minHeight: 500, gap: 0 }}>
      {/* ── Left: conversation list ────────────────────────────────────── */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${BORDER}`, overflowY: "auto" }}>
        <div style={{ padding: "0 0 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", color: TEXT }}><MessageCircle size={18} /></span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>Chats</h2>
              {totalUnread > 0 && <span style={{ padding: "1px 8px", borderRadius: 20, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800 }}>{totalUnread}</span>}
            </div>
          </div>
          <input value={q} onChange={(e) => { setQ(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => { setSearch(e.target.value); setPage(1); }, 400); }}
            placeholder="Buscar restaurante ou assunto..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT, fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(15,15,20,0.95)", color: TEXT, fontSize: 11, outline: "none" }}>
              <option value="all">Todos</option>
              <option value="open">Abertos</option>
              <option value="waiting_reply">Aguardando</option>
              <option value="resolved">Resolvidos</option>
              <option value="closed">Fechados</option>
            </select>
            <button onClick={() => setMineOnly((v) => !v)}
              style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${mineOnly ? "rgba(124,58,237,0.5)" : BORDER}`, background: mineOnly ? "rgba(124,58,237,0.15)" : "transparent", color: mineOnly ? "#a78bfa" : MUTED, fontSize: 11, cursor: "pointer" }}>
              Meus
            </button>
          </div>
        </div>

        {convLoading && <p style={{ fontSize: 12, color: MUTED, padding: "8px 0" }}>Carregando...</p>}
        {convError && <p style={{ fontSize: 12, color: "#f87171" }}>{convError}</p>}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.map((c) => {
            const st = CHAT_STATUS[c.status] ?? CHAT_STATUS.open;
            const pr = CHAT_PRIORITY[c.priority] ?? CHAT_PRIORITY.normal;
            const isActive = activeConv?.id === c.id;
            return (
              <button key={c.id} onClick={() => openConv(c)}
                style={{ width: "100%", padding: "12px 8px", background: isActive ? "rgba(124,58,237,0.12)" : "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left", transition: "background 0.15s", borderLeft: isActive ? "3px solid #7c3aed" : "3px solid transparent" }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, flex: 1, marginRight: 6 }}>{c.restaurants?.name ?? "—"}</span>
                  <span style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>{fmtRel(c.last_message_at)}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: st.color, fontWeight: 600 }}>{st.label}</span>
                  <span style={{ fontSize: 10, color: pr.color }}>· {pr.label}</span>
                  {c.unread > 0 && <span style={{ marginLeft: "auto", width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</span>}
                </div>
              </button>
            );
          })}
          {!convLoading && convs.length === 0 && <p style={{ fontSize: 12, color: MUTED, padding: "20px 8px", textAlign: "center" }}>Nenhuma conversa.</p>}
        </div>
        {/* Pagination */}
        {total > 25 && (
          <div style={{ display: "flex", gap: 6, padding: "8px 0", justifyContent: "center" }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "none", color: page === 1 ? MUTED : TEXT, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 11 }}>←</button>
            <span style={{ fontSize: 11, color: MUTED, alignSelf: "center" }}>{page}</span>
            <button disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "none", color: page * 25 >= total ? MUTED : TEXT, cursor: page * 25 >= total ? "not-allowed" : "pointer", fontSize: 11 }}>→</button>
          </div>
        )}
      </div>

      {/* ── Right: active conversation ─────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <span style={{ color: MUTED }}><MessageCircle size={48} /></span>
            <p style={{ color: MUTED, fontSize: 14 }}>Selecione uma conversa para ver as mensagens</p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 3 }}>{activeConv.subject}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{activeConv.restaurants?.name} · <span style={{ fontSize: 11, textTransform: "uppercase", color: "#a78bfa" }}>{activeConv.restaurants?.plan}</span></div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${CHAT_STATUS[activeConv.status]?.color ?? "#fff"}18`, color: CHAT_STATUS[activeConv.status]?.color ?? TEXT }}>
                    {CHAT_STATUS[activeConv.status]?.label ?? activeConv.status}
                  </span>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${CHAT_PRIORITY[activeConv.priority]?.color ?? "#fff"}18`, color: CHAT_PRIORITY[activeConv.priority]?.color ?? TEXT }}>
                    {CHAT_PRIORITY[activeConv.priority]?.label ?? activeConv.priority}
                  </span>
                </div>
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <Btn onClick={() => patchConv({ assign_to_me: true })} disabled={patchLoading || activeConv.assigned_staff_id === staff.id}>
                  {activeConv.assigned_staff_id === staff.id ? "✓ Atribuído a mim" : "Atribuir a mim"}
                </Btn>
                {activeConv.status !== "resolved" && (
                  <Btn variant="primary" onClick={() => patchConv({ status: "resolved" })} disabled={patchLoading}>Marcar resolvido</Btn>
                )}
                {(activeConv.status === "resolved" || activeConv.status === "closed") && (
                  <Btn onClick={() => patchConv({ status: "open" })} disabled={patchLoading}>Reabrir</Btn>
                )}
                <select value={activeConv.priority} onChange={(e) => patchConv({ priority: e.target.value })}
                  style={{ padding: "7px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(15,15,20,0.95)", color: TEXT, fontSize: 12, outline: "none", cursor: "pointer" }}>
                  {Object.entries(CHAT_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {activeConv.support_staff && (
                <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Atribuído a: {(activeConv.support_staff as any).name}</div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {msgLoading ? <p style={{ color: MUTED, fontSize: 13 }}>Carregando...</p> : messages.length === 0 ? (
                <p style={{ color: MUTED, fontSize: 13 }}>Nenhuma mensagem.</p>
              ) : messages.map((m) => {
                const isClient = m.sender_type === "client";
                const isSystem = m.sender_type === "system";
                if (isSystem) return (
                  <div key={m.id} style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 11, color: MUTED, background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 20 }}>{m.message}</span>
                  </div>
                );
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isClient ? "flex-start" : "flex-end" }}>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>
                      {isClient ? m.sender_name : (canSeeStaffNames ? m.sender_name : "Suporte")}
                      <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{
                      maxWidth: "75%", padding: "9px 14px",
                      borderRadius: isClient ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                      background: isClient ? CARD : "rgba(124,58,237,0.18)",
                      color: TEXT, fontSize: 13, lineHeight: 1.5, wordBreak: "break-word",
                      border: `1px solid ${isClient ? BORDER : "rgba(124,58,237,0.3)"}`,
                    }}>{m.message}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {activeConv.status !== "closed" && (
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Escreva uma resposta... (Enter para enviar, Shift+Enter nova linha)"
                  rows={2}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT, fontSize: 13, resize: "none", fontFamily: "inherit", outline: "none" }} />
                <Btn variant="primary" onClick={sendReply} disabled={sending || !reply.trim()}>{sending ? "…" : "Enviar"}</Btn>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function SuporteDashboard() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("restaurantes");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    const t = sessionStorage.getItem("suporte_token");
    const s = sessionStorage.getItem("suporte_staff");
    if (!t) { router.replace("/suporte/login"); return; }
    setToken(t);
    if (s) { try { setStaff(JSON.parse(s)); } catch {} }
    // Verify token with server
    fetch("/api/suporte/me", { headers: { "x-suporte-token": t } })
      .then((r) => r.json())
      .then(({ staff: srv }) => {
        if (!srv) { sessionStorage.removeItem("suporte_token"); sessionStorage.removeItem("suporte_staff"); router.replace("/suporte/login"); return; }
        setStaff(srv);
        sessionStorage.setItem("suporte_staff", JSON.stringify(srv));
        setAuthReady(true);
        // Load initial unread chat count
        fetch("/api/suporte/chats?status=open&page=1", { headers: { "x-suporte-token": t } })
          .then((r) => r.json())
          .then(({ data }) => { setChatUnread((data ?? []).reduce((s: number, c: any) => s + (c.unread ?? 0), 0)); })
          .catch(() => {});
      })
      .catch(() => { router.replace("/suporte/login"); });
  }, [router]);

  function logout() {
    sessionStorage.removeItem("suporte_token");
    sessionStorage.removeItem("suporte_staff");
    router.replace("/suporte/login");
  }

  if (!staff || !token) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const badge = ROLE_BADGE[staff.role] ?? ROLE_BADGE["viewer"];

  const MENU_ITEMS: { id: Section; icon: React.ReactNode; label: string; perm: string }[] = [
    { id: "restaurantes", icon: <ClipboardList size={16} />, label: "Restaurantes", perm: "ver_restaurantes" },
    { id: "unidades",     icon: <Store size={16} />,         label: "Unidades",     perm: "ver_unidades" },
    { id: "pedidos",      icon: <Package size={16} />,       label: "Pedidos",      perm: "ver_pedidos" },
    { id: "cardapios",    icon: <UtensilsCrossed size={16} />, label: "Cardápios",  perm: "ver_cardapios" },
    { id: "crm",          icon: <MessageCircle size={16} />, label: "CRM",          perm: "ver_crm" },
    { id: "analytics",    icon: <BarChart3 size={16} />,     label: "Analytics",    perm: "ver_analytics" },
    { id: "financeiro",   icon: <DollarSign size={16} />,    label: "Financeiro",   perm: "ver_financeiro_unidade" },
    { id: "features",     icon: <Settings size={16} />,      label: "Features",     perm: "gerenciar_features" },
    { id: "planos",       icon: <Tag size={16} />,           label: "Planos",       perm: "gerenciar_planos" },
    { id: "equipe",       icon: <Users size={16} />,         label: "Equipe",       perm: "gerenciar_staff" },
    { id: "chats",        icon: <MessageCircle size={16} />, label: "Chats",        perm: "responder_tickets" },
  ];

  const visibleItems = MENU_ITEMS.filter((m) => can(staff, m.perm));

  // Set to first available section if current is not accessible
  const currentItem = visibleItems.find((m) => m.id === section);
  const activeSection = currentItem ? section : visibleItems[0]?.id ?? "restaurantes";

  function renderSection() {
    if (!authReady && !staff) return null;
    switch (activeSection) {
      case "restaurantes": return <RestaurantesSection token={token!} staff={staff!} />;
      case "unidades":     return <UnidadesSection token={token!} staff={staff!} />;
      case "pedidos":      return <PedidosSection token={token!} />;
      case "cardapios":    return <CardapiosSection token={token!} staff={staff!} />;
      case "crm":          return <CRMSection token={token!} />;
      case "analytics":    return <AnalyticsSection token={token!} />;
      case "financeiro":   return <FinanceiroSection token={token!} staff={staff!} />;
      case "features":     return <FeaturesSection token={token!} />;
      case "planos":       return <PlanosSection token={token!} />;
      case "equipe":       return <EquipeSection token={token!} currentStaff={staff!} />;
      case "chats":        return <ChatsSection token={token!} staff={staff!} />;
      default:             return null;
    }
  }

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Shield size={18} /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Portal de Suporte</div>
            <div style={{ fontSize: 11, color: MUTED }}>FyMenu</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {visibleItems.map((item) => {
          const active = item.id === activeSection;
          return (
            <button key={item.id} onClick={() => { setSection(item.id); setMobileSidebar(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "background 0.15s",
                background: active ? "rgba(124,58,237,0.18)" : "transparent",
                color: active ? "#c4b5fd" : "rgba(255,255,255,0.55)" }}>
              <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{item.label}</span>
              {item.id === "chats" && chatUnread > 0 && !active && (
                <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: 20, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800 }}>{chatUnread}</span>
              )}
              {active && <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#7c3aed" }} />}
            </button>
          );
        })}
      </nav>

      {/* Staff info + logout */}
      <div style={{ padding: "16px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{staff.name}</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{staff.email}</div>
          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
        </div>
        <button onClick={logout} style={{ width: "100%", padding: "8px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; (e.target as HTMLButtonElement).style.color = "#f87171"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "transparent"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}>
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .main-content { padding: 16px !important; }
        }
        @media (min-width: 769px) {
          .mobile-topbar { display: none !important; }
          .mobile-sidebar-overlay { display: none !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ width: SIDEBAR_W, background: "rgba(255,255,255,0.025)", borderRight: `1px solid ${BORDER}`, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {sidebarContent}
      </div>

      {/* Mobile overlay sidebar */}
      {mobileSidebar && (
        <div className="mobile-sidebar-overlay" style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMobileSidebar(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: SIDEBAR_W, background: "#0e0e14", borderRight: `1px solid ${BORDER}` }}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{ display: "none", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)", position: "sticky", top: 0, zIndex: 10 }}>
          <button onClick={() => setMobileSidebar(true)} style={{ background: "none", border: "none", color: TEXT, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}><Menu size={22} /></button>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Portal de Suporte</div>
          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
        </div>

        {/* Page content */}
        <div className="main-content" style={{ flex: 1, padding: 28, maxWidth: 1200, width: "100%" }}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
