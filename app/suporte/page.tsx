"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type Staff = {
  id: string; name: string; email: string; role: string;
  permissions: Record<string, boolean>;
};

type Section = "home" | "crm" | "units" | "orders" | "products" | "features";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  moderator: "Moderador", admin: "Admin", viewer: "Viewer",
  support: "Suporte", manager: "Gerente", super_admin: "Super Admin",
};

const SECTION_META: Record<string, { label: string; icon: string; perm: string }> = {
  crm:      { label: "Clientes",  icon: "👥", perm: "view_crm" },
  units:    { label: "Unidades",  icon: "🏪", perm: "view_units" },
  orders:   { label: "Pedidos",   icon: "📋", perm: "view_orders" },
  products: { label: "Produtos",  icon: "🍔", perm: "view_products" },
  features: { label: "Features",  icon: "⚙️", perm: "manage_features" },
};

function fmt(n: number | null | undefined, prefix = "R$ ") {
  if (n == null) return "—";
  return prefix + (n / 100).toFixed(2).replace(".", ",");
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

// ── Shared UI ─────────────────────────────────────────────────────────────────
function SectionHeader({ title, icon, sub }: { title: string; icon: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>{title}</h2>
      </div>
      {sub && <p style={{ margin: "4px 0 0 32px", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{sub}</p>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, outline: "none",
        minWidth: 240,
      }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(15,15,20,0.95)", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer",
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Table({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty
            ? <tr><td colSpan={headers.length} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.25)" }}>Nenhum resultado.</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
}

function TR({ children }: { children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 0.15s" }}
    >
      {children}
    </tr>
  );
}

function TD({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "9px 14px", color: "rgba(255,255,255,0.75)", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle" }}>{children}</td>;
}

function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
      <span>{total} resultado{total !== 1 ? "s" : ""} · página {page} de {pages}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: page === 1 ? "rgba(255,255,255,0.2)" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>
          ← Anterior
        </button>
        <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages}
          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: page === pages ? "rgba(255,255,255,0.2)" : "#fff", cursor: page === pages ? "not-allowed" : "pointer", fontSize: 12 }}>
          Próxima →
        </button>
      </div>
    </div>
  );
}

function useSuporteApi(path: string, params: Record<string, string>, token: string | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsStr = JSON.stringify(params);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/suporte/${path}?${qs}`, { headers: { "x-suporte-token": token } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsStr, token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── CRM Section ───────────────────────────────────────────────────────────────
function CRMSection({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error } = useSuporteApi("crm", { q: search, page: String(page) }, token);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function handleSearch(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  }

  return (
    <div>
      <SectionHeader title="Clientes (CRM)" icon="👥" sub="Todos os clientes de todos os restaurantes — somente leitura" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar por nome, telefone ou email..." />
      </div>
      {loading && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</p>}
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      {data && (
        <>
          <Table
            headers={["Nome", "Telefone", "Email", "Restaurante", "Unidade", "Pedidos", "Total Gasto", "Última Interação", "Ativo"]}
            empty={!data.data?.length}
          >
            {data.data?.map((c: any) => (
              <TR key={c.id}>
                <TD>{c.name || "—"}</TD>
                <TD>{c.phone || "—"}</TD>
                <TD>{c.email || "—"}</TD>
                <TD>{c.units?.restaurants?.name || "—"}</TD>
                <TD><span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{c.units?.slug || "—"}</span></TD>
                <TD>{c.total_orders ?? 0}</TD>
                <TD>{fmt(c.total_spent ? Number(c.total_spent) * 100 : 0)}</TD>
                <TD>{fmtDate(c.last_order_at ?? c.last_visit_at)}</TD>
                <TD>{pill(c.is_active)}</TD>
              </TR>
            ))}
          </Table>
          <Pagination page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Units Section ─────────────────────────────────────────────────────────────
function UnitsSection({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { data, loading, error } = useSuporteApi("units", { q: search, status, page: String(page) }, token);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function handleSearch(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  }

  return (
    <div>
      <SectionHeader title="Unidades" icon="🏪" sub="Todas as unidades de todos os restaurantes — somente leitura" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar por nome, slug ou cidade..." />
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
          { value: "all", label: "Todos" },
          { value: "published", label: "Publicadas" },
          { value: "unpublished", label: "Não publicadas" },
        ]} />
      </div>
      {loading && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</p>}
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      {data && (
        <>
          <Table
            headers={["Unidade", "Slug", "Restaurante", "Plano", "Cidade", "Status", "Criada em"]}
            empty={!data.data?.length}
          >
            {data.data?.map((u: any) => (
              <TR key={u.id}>
                <TD>{u.name || <span style={{ color: "rgba(255,255,255,0.3)" }}>sem nome</span>}</TD>
                <TD><code style={{ fontSize: 11, color: "#a78bfa" }}>{u.slug}</code></TD>
                <TD>{u.restaurants?.name || "—"}</TD>
                <TD><span style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{u.restaurants?.plan || "—"}</span></TD>
                <TD>{u.city || "—"}</TD>
                <TD>{pill(u.is_published, "Publicada", "Rascunho")}</TD>
                <TD>{fmtDate(u.created_at)}</TD>
              </TR>
            ))}
          </Table>
          <Pagination page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Orders Section ────────────────────────────────────────────────────────────
function OrdersSection({ token }: { token: string }) {
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("7d");
  const [page, setPage] = useState(1);
  const { data, loading, error } = useSuporteApi("orders", { status, range, page: String(page) }, token);

  const STATUS_COLOR: Record<string, string> = {
    confirmed: "#6ee7b7", pending: "#fbbf24", cancelled: "#f87171", preparing: "#a78bfa",
  };

  return (
    <div>
      <SectionHeader title="Pedidos" icon="📋" sub="Pedidos de todos os restaurantes — somente leitura" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Select value={range} onChange={(v) => { setRange(v); setPage(1); }} options={[
          { value: "today", label: "Hoje" },
          { value: "7d", label: "Últimos 7 dias" },
          { value: "30d", label: "Últimos 30 dias" },
        ]} />
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
          { value: "all", label: "Todos os status" },
          { value: "confirmed", label: "Confirmados" },
          { value: "pending", label: "Pendentes" },
          { value: "cancelled", label: "Cancelados" },
        ]} />
      </div>
      {loading && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</p>}
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      {data && (
        <>
          <Table
            headers={["Restaurante", "Unidade", "Mesa", "Total", "Pagamento", "Status", "Data"]}
            empty={!data.data?.length}
          >
            {data.data?.map((o: any) => (
              <TR key={o.id}>
                <TD>{o.units?.restaurants?.name || "—"}</TD>
                <TD><code style={{ fontSize: 11, color: "#a78bfa" }}>{o.units?.slug || "—"}</code></TD>
                <TD>{o.table_number ?? "—"}</TD>
                <TD style={{ fontWeight: 600 }}>{fmt(o.total ? Number(o.total) * 100 : 0)}</TD>
                <TD>{o.payment_method || "—"}</TD>
                <TD>
                  <span style={{ color: STATUS_COLOR[o.status] ?? "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 12 }}>
                    {o.status}
                  </span>
                </TD>
                <TD>{fmtDate(o.created_at)}</TD>
              </TR>
            ))}
          </Table>
          <Pagination page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Products Section ──────────────────────────────────────────────────────────
function ProductsSection({ token, canEdit }: { token: string; canEdit: boolean }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useSuporteApi("products", { q: search, active: activeFilter, page: String(page) }, token);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function handleSearch(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  }

  function openEdit(p: any) {
    setEditId(p.id);
    setEditForm({ name: p.name, description: p.description ?? "", base_price: p.base_price, is_active: p.is_active });
    setSaveError(null);
  }

  async function handleSave() {
    if (!editId) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch("/api/suporte/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-suporte-token": token },
        body: JSON.stringify({ id: editId, ...editForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEditId(null);
      reload();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <SectionHeader title="Produtos" icon="🍔" sub={canEdit ? "Pode editar nome, descrição, preço e status" : "Somente leitura"} />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar produto..." />
        <Select value={activeFilter} onChange={(v) => { setActiveFilter(v); setPage(1); }} options={[
          { value: "all", label: "Todos" },
          { value: "active", label: "Ativos" },
          { value: "inactive", label: "Inativos" },
        ]} />
      </div>
      {loading && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</p>}
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      {data && (
        <>
          <Table
            headers={canEdit ? ["Nome", "Preço", "Categoria", "Restaurante", "Unidade", "Status", ""] : ["Nome", "Preço", "Categoria", "Restaurante", "Unidade", "Status"]}
            empty={!data.data?.length}
          >
            {data.data?.map((p: any) => (
              <TR key={p.id}>
                <TD>
                  {editId === p.id
                    ? <input value={editForm.name} onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                        style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, width: 200 }} />
                    : p.name}
                </TD>
                <TD>
                  {editId === p.id
                    ? <input type="number" value={editForm.base_price} onChange={(e) => setEditForm((f: any) => ({ ...f, base_price: e.target.value }))}
                        style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, width: 90 }} />
                    : fmt(p.base_price ? Number(p.base_price) * 100 : 0)}
                </TD>
                <TD>{p.categories?.name || "—"}</TD>
                <TD>{p.units?.restaurants?.name || "—"}</TD>
                <TD><code style={{ fontSize: 11, color: "#a78bfa" }}>{p.units?.slug || "—"}</code></TD>
                <TD>
                  {editId === p.id
                    ? <select value={editForm.is_active ? "1" : "0"} onChange={(e) => setEditForm((f: any) => ({ ...f, is_active: e.target.value === "1" }))}
                        style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(15,15,20,0.95)", color: "#fff", fontSize: 12 }}>
                        <option value="1">Ativo</option>
                        <option value="0">Inativo</option>
                      </select>
                    : pill(p.is_active, "Ativo", "Inativo")}
                </TD>
                {canEdit && (
                  <TD>
                    {editId === p.id
                      ? <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={handleSave} disabled={saving}
                            style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                            {saving ? "..." : "Salvar"}
                          </button>
                          <button onClick={() => setEditId(null)}
                            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>
                            ✕
                          </button>
                        </div>
                      : <button onClick={() => openEdit(p)}
                          style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer" }}>
                          Editar
                        </button>}
                  </TD>
                )}
              </TR>
            ))}
          </Table>
          {saveError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{saveError}</p>}
          <Pagination page={page} total={data.count ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Features Section ──────────────────────────────────────────────────────────
function FeaturesSection({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useSuporteApi("features", { q: search }, token);
  const [toggling, setToggling] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function handleSearch(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearch(v), 400);
  }

  async function handleToggle(id: string, enabled: boolean) {
    setToggling(id);
    try {
      await fetch("/api/suporte/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-suporte-token": token },
        body: JSON.stringify({ id, enabled }),
      });
      reload();
    } finally { setToggling(null); }
  }

  return (
    <div>
      <SectionHeader title="Feature Flags" icon="⚙️" sub="Ativar ou desativar funcionalidades por unidade" />
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={q} onChange={handleSearch} placeholder="Buscar por feature..." />
      </div>
      {loading && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</p>}
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      {data && (
        <Table
          headers={["Feature", "Restaurante", "Unidade", "Status", "Ação"]}
          empty={!data.data?.length}
        >
          {data.data?.map((f: any) => (
            <TR key={f.id}>
              <TD><code style={{ color: "#a78bfa", fontSize: 12 }}>{f.feature}</code></TD>
              <TD>{f.units?.restaurants?.name || "—"}</TD>
              <TD><code style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{f.units?.slug || "—"}</code></TD>
              <TD>{pill(f.enabled, "Ativo", "Inativo")}</TD>
              <TD>
                <button
                  onClick={() => handleToggle(f.id, !f.enabled)}
                  disabled={toggling === f.id}
                  style={{
                    padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: toggling === f.id ? "not-allowed" : "pointer",
                    background: f.enabled ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)",
                    color: f.enabled ? "#f87171" : "#6ee7b7",
                    opacity: toggling === f.id ? 0.5 : 1,
                  }}
                >
                  {toggling === f.id ? "..." : f.enabled ? "Desativar" : "Ativar"}
                </button>
              </TD>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Home Section ──────────────────────────────────────────────────────────────
function HomeSection({ staff, onNavigate }: { staff: Staff; onNavigate: (s: Section) => void }) {
  const sections = Object.entries(SECTION_META).filter(([key, meta]) => {
    if (key === "products") return staff.permissions?.view_products || staff.permissions?.edit_products || ["admin", "super_admin"].includes(staff.role);
    return staff.permissions?.[meta.perm] || ["admin", "super_admin"].includes(staff.role);
  });

  return (
    <div>
      <SectionHeader title={`Olá, ${staff.name.split(" ")[0]} 👋`} icon="🛡️" sub={`${ROLE_LABELS[staff.role] ?? staff.role} · ${staff.email}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {sections.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => onNavigate(key as Section)}
            style={{
              padding: "20px 16px", borderRadius: 14,
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.2)",
              cursor: "pointer", textAlign: "left",
              transition: "background 0.2s, border-color 0.2s",
              display: "flex", flexDirection: "column", gap: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.14)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.07)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.2)"; }}
          >
            <span style={{ fontSize: 28 }}>{meta.icon}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{meta.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function SuportePage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("suporte_token");
    if (!t) { router.replace("/suporte/login"); return; }
    fetch("/api/suporte/me", { headers: { "x-suporte-token": t } })
      .then((r) => r.json())
      .then((json) => {
        if (json.staff) { setStaff(json.staff); setToken(t); }
        else router.replace("/suporte/login");
      })
      .catch(() => router.replace("/suporte/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    localStorage.removeItem("suporte_token");
    localStorage.removeItem("suporte_staff");
    router.replace("/suporte/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        Carregando...
      </div>
    );
  }
  if (!staff || !token) return null;

  const hasPerm = (perm: string) =>
    staff.permissions?.[perm] || ["admin", "super_admin"].includes(staff.role);

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "home",     label: "Início",    icon: "🏠" },
    ...(hasPerm("view_crm")      ? [{ key: "crm"      as Section, label: "Clientes",  icon: "👥" }] : []),
    ...(hasPerm("view_units")    ? [{ key: "units"    as Section, label: "Unidades",  icon: "🏪" }] : []),
    ...(hasPerm("view_orders")   ? [{ key: "orders"   as Section, label: "Pedidos",   icon: "📋" }] : []),
    ...(hasPerm("view_products") || hasPerm("edit_products") ? [{ key: "products" as Section, label: "Produtos",  icon: "🍔" }] : []),
    ...(hasPerm("manage_features") ? [{ key: "features" as Section, label: "Features",  icon: "⚙️" }] : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", color: "#fff" }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 220 : 56, flexShrink: 0,
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column",
        transition: "width 0.2s ease",
        overflow: "hidden",
        position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "18px 14px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🛡️</div>
          {sidebarOpen && <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>Portal Suporte</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => {
            const active = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 10, border: "none",
                  background: active ? "rgba(124,58,237,0.2)" : "none",
                  color: active ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                  cursor: "pointer", fontWeight: active ? 700 : 400, fontSize: 13,
                  textAlign: "left", whiteSpace: "nowrap",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 6 }}>
          {sidebarOpen && (
            <div style={{ padding: "0 6px 6px", fontSize: 11, color: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
              <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{staff.name}</div>
              <div>{ROLE_LABELS[staff.role] ?? staff.role}</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, textAlign: "center" }}
          >
            {sidebarOpen ? "◀ Recolher" : "▶"}
          </button>
          <button
            onClick={logout}
            style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            {sidebarOpen ? "Sair" : "↩"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 28, overflowX: "hidden", maxWidth: "calc(100vw - 56px)" }}>
        {activeSection === "home"     && <HomeSection staff={staff} onNavigate={setActiveSection} />}
        {activeSection === "crm"      && hasPerm("view_crm")      && <CRMSection token={token} />}
        {activeSection === "units"    && hasPerm("view_units")     && <UnitsSection token={token} />}
        {activeSection === "orders"   && hasPerm("view_orders")    && <OrdersSection token={token} />}
        {activeSection === "products" && (hasPerm("view_products") || hasPerm("edit_products")) && <ProductsSection token={token} canEdit={hasPerm("edit_products")} />}
        {activeSection === "features" && hasPerm("manage_features") && <FeaturesSection token={token} />}
      </div>
    </div>
  );
}
