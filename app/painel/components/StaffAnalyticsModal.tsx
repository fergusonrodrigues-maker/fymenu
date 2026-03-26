"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  category_name: string | null;
}

interface WaiterStat {
  employee_id: string;
  employee_name: string;
  total_orders: number;
  avg_rating: number | null;
  rating_count: number;
}

interface DelivererStat {
  employee_id: string;
  employee_name: string;
  total_deliveries: number;
  avg_rating: number | null;
  rating_count: number;
}

const ROLES: Record<string, string> = {
  waiter: "Garçom",
  kitchen: "Cozinha",
  deliverer: "Entregador",
  cashier: "Caixa",
  manager: "Gerente",
};

function RatingStars({ value }: { value: number | null }) {
  if (!value) return <span style={{ color: "#666", fontSize: 12 }}>Sem avaliações</span>;
  const stars = Math.round(value);
  return (
    <span style={{ fontSize: 13 }}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      <span style={{ color: "#888", marginLeft: 4, fontSize: 11 }}>{value.toFixed(1)}</span>
    </span>
  );
}

export default function StaffAnalyticsModal({ unitId }: { unitId: string }) {
  const [tab, setTab] = useState<"equipe" | "garcons" | "entregadores">("equipe");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStat[]>([]);
  const [delivererStats, setDelivererStats] = useState<DelivererStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: "", role: "waiter", phone: "", category_id: "" });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    loadAll();
  }, [unitId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadEmployees(), loadWaiterStats(), loadDelivererStats(), loadCategories()]);
    setLoading(false);
  }

  async function loadEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("id, name, role, phone, is_active, employee_categories(name)")
      .eq("unit_id", unitId)
      .order("name");

    setEmployees(
      (data ?? []).map((e: any) => ({
        ...e,
        category_name: e.employee_categories?.name ?? null,
      }))
    );
  }

  async function loadWaiterStats() {
    const { data } = await supabase
      .from("waiter_analytics")
      .select("*")
      .eq("unit_id", unitId);
    setWaiterStats(data ?? []);
  }

  async function loadDelivererStats() {
    const { data } = await supabase
      .from("deliverer_analytics")
      .select("*")
      .eq("unit_id", unitId);
    setDelivererStats(data ?? []);
  }

  async function loadCategories() {
    const { data } = await supabase
      .from("employee_categories")
      .select("id, name")
      .eq("unit_id", unitId);
    setCategories(data ?? []);
  }

  async function toggleActive(emp: Employee) {
    await supabase
      .from("employees")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);
    loadEmployees();
  }

  async function saveEmployee() {
    if (!newEmployee.name.trim()) return;
    setSaving(true);
    await supabase.from("employees").insert({
      unit_id: unitId,
      name: newEmployee.name.trim(),
      role: newEmployee.role,
      phone: newEmployee.phone.trim() || null,
      category_id: newEmployee.category_id || null,
    });
    setNewEmployee({ name: "", role: "waiter", phone: "", category_id: "" });
    setShowAddForm(false);
    setSaving(false);
    loadEmployees();
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff", fontSize: 15, boxSizing: "border-box",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px 4px", borderRadius: 10, border: "none",
    background: active ? "rgba(0,255,174,0.12)" : "transparent",
    color: active ? "#00ffae" : "#888",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    transition: "all 0.15s",
  });

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>Carregando...</div>
  );

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <button style={tabStyle(tab === "equipe")} onClick={() => setTab("equipe")}>👥 Equipe</button>
        <button style={tabStyle(tab === "garcons")} onClick={() => setTab("garcons")}>🧑‍🍳 Garçons</button>
        <button style={tabStyle(tab === "entregadores")} onClick={() => setTab("entregadores")}>🚴 Entregadores</button>
      </div>

      {/* ── Equipe ── */}
      {tab === "equipe" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#888", fontSize: 13 }}>{employees.length} funcionário{employees.length !== 1 ? "s" : ""}</div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {showAddForm ? "Cancelar" : "+ Adicionar"}
            </button>
          </div>

          {showAddForm && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  style={inp} placeholder="Nome do funcionário"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, name: e.target.value }))}
                />
                <select
                  style={inp}
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, role: e.target.value }))}
                >
                  {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input
                  style={inp} placeholder="Telefone (opcional)"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, phone: e.target.value }))}
                />
                {categories.length > 0 && (
                  <select
                    style={inp}
                    value={newEmployee.category_id}
                    onChange={(e) => setNewEmployee((p) => ({ ...p, category_id: e.target.value }))}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button
                  onClick={saveEmployee}
                  disabled={saving || !newEmployee.name.trim()}
                  style={{ padding: "11px", borderRadius: 10, border: "none", background: saving ? "rgba(0,255,174,0.1)" : "linear-gradient(135deg, #00d9b8, #00ffae)", color: "#000", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? "Salvando..." : "Salvar funcionário"}
                </button>
              </div>
            </div>
          )}

          {employees.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#666" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 14 }}>Nenhum funcionário cadastrado</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {employees.map((emp) => (
                <div key={emp.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: emp.is_active ? "rgba(0,255,174,0.12)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {emp.role === "deliverer" ? "🚴" : emp.role === "kitchen" ? "👨‍🍳" : "🧑‍🍳"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: emp.is_active ? "#fff" : "#666", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.name}</div>
                    <div style={{ color: "#888", fontSize: 11, marginTop: 1 }}>
                      {ROLES[emp.role] ?? emp.role}
                      {emp.category_name && ` · ${emp.category_name}`}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(emp)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: emp.is_active ? "rgba(248,113,113,0.1)" : "rgba(0,255,174,0.1)", color: emp.is_active ? "#f87171" : "#00ffae", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {emp.is_active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Garçons ── */}
      {tab === "garcons" && (
        <div>
          {waiterStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#666" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14 }}>Nenhum dado de garçom ainda</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {waiterStats.map((stat, i) => (
                <div key={stat.employee_id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{stat.employee_name}</div>
                      <RatingStars value={stat.avg_rating} />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#00ffae", fontSize: 20, fontWeight: 900 }}>{stat.total_orders}</div>
                      <div style={{ color: "#888", fontSize: 11 }}>pedidos</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{stat.rating_count}</div>
                      <div style={{ color: "#888", fontSize: 10 }}>avaliações</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ color: stat.avg_rating && stat.avg_rating >= 4 ? "#00ffae" : stat.avg_rating && stat.avg_rating >= 3 ? "#fbbf24" : "#f87171", fontSize: 14, fontWeight: 700 }}>
                        {stat.avg_rating ? stat.avg_rating.toFixed(1) : "—"}
                      </div>
                      <div style={{ color: "#888", fontSize: 10 }}>média</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Entregadores ── */}
      {tab === "entregadores" && (
        <div>
          {delivererStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#666" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚴</div>
              <div style={{ fontSize: 14 }}>Nenhum dado de entrega ainda</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {delivererStats.map((stat) => (
                <div key={stat.employee_id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{stat.employee_name}</div>
                      <RatingStars value={stat.avg_rating} />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#60a5fa", fontSize: 20, fontWeight: 900 }}>{stat.total_deliveries}</div>
                      <div style={{ color: "#888", fontSize: 11 }}>entregas</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{stat.rating_count}</div>
                      <div style={{ color: "#888", fontSize: 10 }}>avaliações</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ color: stat.avg_rating && stat.avg_rating >= 4 ? "#00ffae" : stat.avg_rating && stat.avg_rating >= 3 ? "#fbbf24" : "#f87171", fontSize: 14, fontWeight: 700 }}>
                        {stat.avg_rating ? stat.avg_rating.toFixed(1) : "—"}
                      </div>
                      <div style={{ color: "#888", fontSize: 10 }}>média</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
