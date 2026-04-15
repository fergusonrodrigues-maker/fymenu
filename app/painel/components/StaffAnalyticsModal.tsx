"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import FyLoader from "@/components/FyLoader";

interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  cpf: string | null;
  is_active: boolean;
  category_name: string | null;
  category_names: string[];
  category_ids: string[];
  salary: number;
  work_days: string[] | null;
  shift_start: string | null;
  shift_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  extra_costs: number;
  extra_costs_description: string | null;
  current_status: string | null;
  last_clock_in: string | null;
  team: string | null;
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
  freelancer: "Freelancer",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  working: { label: "Trabalhando", color: "#00ffae", icon: "🟢" },
  break: { label: "Descanso", color: "#fbbf24", icon: "🟡" },
  lunch: { label: "Almoço", color: "#60a5fa", icon: "🔵" },
  off: { label: "Folga", color: "rgba(255,255,255,0.3)", icon: "⚪" },
  absent: { label: "Ausente", color: "#f87171", icon: "🔴" },
  vacation: { label: "Férias", color: "#a855f7", icon: "🟣" },
};

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

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

export default function StaffAnalyticsModal({ unitId, plan }: { unitId: string; plan?: string }) {
  const [tab, setTab] = useState<"equipe" | "garcons" | "entregadores" | "ponto">("equipe");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStat[]>([]);
  const [delivererStats, setDelivererStats] = useState<DelivererStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: "", role: "waiter", phone: "", category_id: "", cpf: "", username: "", password: "", freelancer_service: "", freelancer_date: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // New salary/schedule states
  const [salary, setSalary] = useState("");
  const [workDays, setWorkDays] = useState<string[]>(["seg", "ter", "qua", "qui", "sex"]);
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [extraCosts, setExtraCosts] = useState("");
  const [extraCostsDesc, setExtraCostsDesc] = useState("");
  const [formTeam, setFormTeam] = useState("geral");

  // Filter state
  const [filterTeam, setFilterTeam] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [inactiveEmployees, setInactiveEmployees] = useState<Employee[]>([]);

  // Edit modal state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("waiter");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([]);
  const [editSalary, setEditSalary] = useState("");
  const [editExtraCosts, setEditExtraCosts] = useState("");
  const [editWorkDays, setEditWorkDays] = useState<string[]>([]);
  const [editShiftStart, setEditShiftStart] = useState("08:00");
  const [editShiftEnd, setEditShiftEnd] = useState("18:00");
  const [editTeam, setEditTeam] = useState("geral");
  const [editCpf, setEditCpf] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [reactivateCandidate, setReactivateCandidate] = useState<{ id: string; name: string } | null>(null);

  // Ponto state
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [pontoView, setPontoView] = useState<"registro" | "historico" | "resumo">("registro");

  const supabase = createClient();
  const isBusiness = plan === "business";

  useEffect(() => {
    loadAll();
  }, [unitId]);

  // Realtime: sync employee changes (status, active) sem precisar recarregar
  useEffect(() => {
    if (!unitId) return;
    const channel = supabase
      .channel(`employees-rt-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "employees", filter: `unit_id=eq.${unitId}` }, (payload: any) => {
        if (payload.eventType === "UPDATE") {
          if (payload.new.is_active === false) {
            // Employee deactivated externally — move out of active list
            setEmployees(prev => prev.filter(e => e.id !== payload.new.id));
          } else {
            setEmployees(prev => prev.map(e =>
              e.id === payload.new.id
                ? { ...e, current_status: payload.new.current_status, is_active: payload.new.is_active, name: payload.new.name }
                : e
            ));
          }
        } else {
          loadEmployees();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  async function loadAll() {
    setLoading(true);
    const tasks = [loadEmployees(), loadWaiterStats(), loadDelivererStats(), loadCategories()];
    if (plan === "business") tasks.push(loadTimeEntries());
    await Promise.all(tasks);
    setLoading(false);
  }

  function mapEmployee(e: any): Employee {
    const links: any[] = e.employee_category_links ?? [];
    const catNames = links.map((l: any) => l.employee_categories?.name).filter(Boolean) as string[];
    const catIds = links.map((l: any) => l.category_id).filter(Boolean) as string[];
    return {
      ...e,
      category_name: e.employee_categories?.name ?? catNames[0] ?? null,
      category_names: catNames,
      category_ids: catIds,
      salary: e.salary ?? 0,
      extra_costs: e.extra_costs ?? 0,
    };
  }

  async function loadEmployees() {
    const sel = "*, employee_categories(name), employee_category_links(category_id, employee_categories(name))";

    const [{ data: active }, { data: inactive }] = await Promise.all([
      supabase.from("employees").select(sel).eq("unit_id", unitId).eq("is_active", true).order("name"),
      supabase.from("employees").select(sel).eq("unit_id", unitId).eq("is_active", false).order("name"),
    ]);

    setEmployees((active ?? []).map(mapEmployee));
    setInactiveEmployees((inactive ?? []).map(mapEmployee));
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

  async function loadTimeEntries() {
    const { data: entries } = await supabase
      .from("time_entries")
      .select("*, employees(name, role, team)")
      .eq("unit_id", unitId)
      .gte("timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("timestamp", { ascending: false })
      .limit(500);
    if (entries) setTimeEntries(entries);
  }

  async function handlePonto(employeeId: string, type: string, nextStatus: string) {
    const now = new Date().toISOString();

    await supabase.from("time_entries").insert({
      employee_id: employeeId,
      unit_id: unitId,
      type,
      timestamp: now,
    });

    const updatePayload: any = { current_status: nextStatus };
    if (type === "clock_in") updatePayload.last_clock_in = now;

    await supabase.from("employees").update(updatePayload).eq("id", employeeId);

    setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, ...updatePayload } : e));
    await loadTimeEntries();
  }

  async function toggleActive(emp: Employee) {
    if (!emp.id) return;
    const newActive = !emp.is_active;
    await supabase.from("employees").update({ is_active: newActive }).eq("id", emp.id);
    const updated = { ...emp, is_active: newActive };
    if (newActive) {
      // Reactivating: move from inactive list to active list
      setInactiveEmployees(prev => prev.filter(e => e.id !== emp.id));
      setEmployees(prev => [...prev, updated].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      // Deactivating: remove from active list, add to inactive list
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      setInactiveEmployees(prev => [...prev, updated].sort((a, b) => a.name.localeCompare(b.name)));
    }
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditRole(emp.role);
    setEditCategoryIds(emp.category_ids?.length ? emp.category_ids : ((emp as any).category_id ? [(emp as any).category_id] : []));
    setEditSalary(emp.salary > 0 ? (emp.salary / 100).toString() : "");
    setEditExtraCosts(emp.extra_costs > 0 ? (emp.extra_costs / 100).toString() : "");
    setEditWorkDays(emp.work_days ?? ["seg", "ter", "qua", "qui", "sex"]);
    setEditShiftStart(emp.shift_start?.slice(0, 5) ?? "08:00");
    setEditShiftEnd(emp.shift_end?.slice(0, 5) ?? "18:00");
    setEditTeam(emp.team ?? "geral");
    setEditCpf(formatCpf((emp as any).cpf ?? ""));
    setEditPassword("");
    setEditShowPassword(false);
    setConfirmDelete(false);
  }

  async function saveEditEmployee() {
    if (!editingEmployee || !editName.trim()) return;
    setEditSaving(true);
    const updates: any = {
      name: editName.trim(),
      role: editRole,
      category_id: editCategoryIds[0] || null, // backward compat: primeira categoria
      salary: editSalary ? Math.round(parseFloat(editSalary) * 100) : 0,
      extra_costs: editExtraCosts ? Math.round(parseFloat(editExtraCosts) * 100) : 0,
      work_days: editWorkDays,
      shift_start: editShiftStart,
      shift_end: editShiftEnd,
      team: editTeam,
      cpf: editCpf.replace(/\D/g, "") || null,
    };
    if (editPassword.trim()) {
      updates.password_hash = await sha256(editPassword.trim());
    }
    await supabase.from("employees").update(updates).eq("id", editingEmployee.id);

    // Sincronizar employee_category_links (delete + insert)
    await supabase.from("employee_category_links").delete().eq("employee_id", editingEmployee.id);
    if (editCategoryIds.length > 0) {
      await supabase.from("employee_category_links").insert(
        editCategoryIds.map(cid => ({ employee_id: editingEmployee.id, category_id: cid }))
      );
    }

    const catNames = editCategoryIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean) as string[];
    setEmployees(prev => prev.map(e => e.id === editingEmployee.id
      ? { ...e, ...updates, category_name: catNames[0] ?? null, category_names: catNames, category_ids: editCategoryIds }
      : e
    ));
    setEditSaving(false);
    setEditingEmployee(null);
  }

  async function deleteEmployee() {
    if (!editingEmployee?.id) return;
    await supabase.from("employees").update({ is_active: false }).eq("id", editingEmployee.id);
    const deactivated = { ...editingEmployee, is_active: false };
    setEmployees(prev => prev.filter(e => e.id !== editingEmployee.id));
    setInactiveEmployees(prev => [...prev, deactivated].sort((a, b) => a.name.localeCompare(b.name)));
    setEditingEmployee(null);
    setConfirmDelete(false);
  }

  async function saveCategory() {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    const { error } = await supabase.from("employee_categories").insert({ unit_id: unitId, name: newCategoryName.trim() });
    setSavingCategory(false);
    if (!error) {
      setNewCategoryName("");
      setShowCategoryForm(false);
      loadCategories();
    }
  }

  async function saveEmployee() {
    if (!newEmployee.name.trim()) return;
    setSaving(true);
    setSaveError(null);

    const res = await fetch("/api/employees/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit_id: unitId,
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        phone: newEmployee.phone.trim() || undefined,
        cpf: newEmployee.cpf.trim() || undefined,
        username: newEmployee.username.trim() || undefined,
        password: newEmployee.password || undefined,
        category_id: formCategoryIds[0] || newEmployee.category_id || undefined,
        salary: salary ? Math.round(parseFloat(salary) * 100) : 0,
        work_days: workDays,
        shift_start: shiftStart || "08:00",
        shift_end: shiftEnd || "18:00",
        lunch_start: lunchStart || null,
        lunch_end: lunchEnd || null,
        extra_costs: extraCosts ? Math.round(parseFloat(extraCosts) * 100) : 0,
        extra_costs_description: extraCostsDesc || null,
        team: formTeam,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      if (json.error === "INACTIVE_DUPLICATE") {
        setReactivateCandidate({ id: json.inactive_id, name: json.inactive_name });
        setSaving(false);
        return;
      }
      setSaveError(json.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }

    // Insert employee_category_links for all selected categories
    if (formCategoryIds.length > 0 && json.employee?.id) {
      await supabase.from("employee_category_links").insert(
        formCategoryIds.map((cid: string) => ({ employee_id: json.employee.id, category_id: cid }))
      );
    }

    setNewEmployee({ name: "", role: "waiter", phone: "", category_id: "", cpf: "", username: "", password: "", freelancer_service: "", freelancer_date: "" });
    setSalary("");
    setWorkDays(["seg", "ter", "qua", "qui", "sex"]);
    setShiftStart("08:00");
    setShiftEnd("18:00");
    setLunchStart("12:00");
    setLunchEnd("13:00");
    setExtraCosts("");
    setExtraCostsDesc("");
    setFormTeam("geral");
    setFormCategoryIds([]);
    setShowAddForm(false);
    setSaving(false);
    loadEmployees();
  }

  async function handleReactivate() {
    if (!reactivateCandidate) return;
    setSaving(true);
    await supabase.from("employees").update({ is_active: true }).eq("id", reactivateCandidate.id);
    setReactivateCandidate(null);
    setSaving(false);
    await loadEmployees();
    setShowAddForm(false);
  }

  function calculateHours(entries: any[]): { weekHours: number; monthHours: number } {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let weekMs = 0;
    let monthMs = 0;

    const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let clockInTime: Date | null = null;
    let pauseTime: Date | null = null;

    for (const entry of sorted) {
      const ts = new Date(entry.timestamp);
      if (entry.type === "clock_in") {
        clockInTime = ts;
        pauseTime = null;
      } else if (entry.type === "break_start" || entry.type === "lunch_start") {
        if (clockInTime && !pauseTime) {
          const worked = ts.getTime() - clockInTime.getTime();
          if (ts >= weekStart) weekMs += worked;
          if (ts >= monthStart) monthMs += worked;
          pauseTime = ts;
        }
      } else if (entry.type === "break_end" || entry.type === "lunch_end") {
        if (pauseTime) {
          clockInTime = ts;
          pauseTime = null;
        }
      } else if (entry.type === "clock_out") {
        if (clockInTime && !pauseTime) {
          const worked = ts.getTime() - clockInTime.getTime();
          if (ts >= weekStart) weekMs += worked;
          if (ts >= monthStart) monthMs += worked;
        }
        clockInTime = null;
        pauseTime = null;
      }
    }

    if (clockInTime && !pauseTime) {
      const worked = now.getTime() - clockInTime.getTime();
      if (clockInTime >= weekStart) weekMs += worked;
      if (clockInTime >= monthStart) monthMs += worked;
    }

    return {
      weekHours: Math.round((weekMs / 3600000) * 10) / 10,
      monthHours: Math.round((monthMs / 3600000) * 10) / 10,
    };
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff", fontSize: 15, boxSizing: "border-box",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px 4px", borderRadius: 10, border: "none",
    background: active ? "var(--dash-accent-soft)" : "transparent",
    color: active ? "var(--dash-accent)" : "var(--dash-text-muted)",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    transition: "all 0.15s",
  });

  // Team cost summary
  const totalSalaries = employees.reduce((s, e) => s + (e.salary || 0), 0);
  const totalExtraCosts = employees.reduce((s, e) => s + (e.extra_costs || 0), 0);
  const totalTeamCost = totalSalaries + totalExtraCosts;

  // Filtered list — match by team OR any category name
  const filteredEmployees = employees.filter(e => {
    if (filterTeam === "all") return true;
    if ((e.team || "geral") === filterTeam) return true;
    const catNames = e.category_names?.length > 0 ? e.category_names : (e.category_name ? [e.category_name] : []);
    return catNames.some(n => n === filterTeam);
  });

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><FyLoader size="sm" /></div>
  );

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--dash-input-bg)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <button style={tabStyle(tab === "equipe")} onClick={() => setTab("equipe")}>👥 Equipe</button>
        <button style={tabStyle(tab === "garcons")} onClick={() => setTab("garcons")}>🧑‍🍳 Garçons</button>
        <button style={tabStyle(tab === "entregadores")} onClick={() => setTab("entregadores")}>🛵 Entregadores</button>
        {isBusiness && (
          <button style={tabStyle(tab === "ponto")} onClick={() => setTab("ponto")}>⏱️ Ponto</button>
        )}
      </div>

      {/* ── Equipe ── */}
      {tab === "equipe" && (
        <div>
          {/* Team cost summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{employees.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Funcionários</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171" }}>R$ {(totalSalaries / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Salários</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>R$ {(totalTeamCost / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Custo total equipe</div>
            </div>
          </div>

          {/* Status table — Business only */}
          {isBusiness && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Status da equipe agora</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "working", label: "Trabalhando", color: "#00ffae", icon: "🟢" },
                  { key: "break", label: "Descanso", color: "#fbbf24", icon: "🟡" },
                  { key: "lunch", label: "Almoço", color: "#60a5fa", icon: "🔵" },
                  { key: "off", label: "Folga", color: "rgba(255,255,255,0.3)", icon: "⚪" },
                  { key: "absent", label: "Ausente", color: "#f87171", icon: "🔴" },
                  { key: "vacation", label: "Férias", color: "#a855f7", icon: "🟣" },
                ].map(s => {
                  const count = employees.filter(e => (e.current_status || "off") === s.key).length;
                  return (
                    <div key={s.key} style={{
                      padding: "8px 14px", borderRadius: 12,
                      background: count > 0 ? `${s.color}10` : "rgba(255,255,255,0.02)",
                      display: "flex", alignItems: "center", gap: 6,
                      minWidth: 100,
                    }}>
                      <span style={{ fontSize: 12 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: count > 0 ? s.color : "var(--dash-text-muted)" }}>{count}</div>
                        <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>{s.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: "#888", fontSize: 13 }}>{employees.length} funcionário{employees.length !== 1 ? "s" : ""}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => { setShowCategoryForm((v) => !v); setShowAddForm(false); }}
                style={{ padding: "7px 12px", borderRadius: 10, border: "none", background: "rgba(168,85,247,0.12)", color: "#c084fc", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                {showCategoryForm ? "Cancelar" : "+ Categoria"}
              </button>
              <button
                onClick={() => { setShowAddForm((v) => !v); setShowCategoryForm(false); setReactivateCandidate(null); setSaveError(null); }}
                style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {showAddForm ? "Cancelar" : "+ Funcionário"}
              </button>
            </div>
          </div>

          {showCategoryForm && (
            <div style={{ background: "rgba(168,85,247,0.06)", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid rgba(168,85,247,0.2)", display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...inp, flex: 1, fontSize: 14 }}
                placeholder="Nome da categoria (ex: Cozinha Norte)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCategory()}
              />
              <button
                onClick={saveCategory}
                disabled={savingCategory || !newCategoryName.trim()}
                style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "rgba(168,85,247,0.2)", color: "#c084fc", fontSize: 13, fontWeight: 700, cursor: savingCategory ? "not-allowed" : "pointer", flexShrink: 0, opacity: savingCategory ? 0.6 : 1 }}
              >
                {savingCategory ? "..." : "Criar"}
              </button>
            </div>
          )}

          {showAddForm && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  style={inp} placeholder="Nome do funcionário"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, name: e.target.value }))}
                />
                <select
                  style={{ ...inp, background: undefined as any, backgroundColor: "rgba(255,255,255,0.05)" }}
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, role: e.target.value }))}
                >
                  {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {newEmployee.role === "freelancer" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.25)" }}>
                    <div style={{ color: "#c084fc", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>🤝 Dados do freelancer</div>
                    <input
                      style={inp} placeholder="Tipo de serviço (ex: Bartender, Fotógrafo)"
                      value={newEmployee.freelancer_service}
                      onChange={(e) => setNewEmployee((p) => ({ ...p, freelancer_service: e.target.value }))}
                    />
                    <input
                      style={inp} type="date" placeholder="Data do serviço"
                      value={newEmployee.freelancer_date}
                      onChange={(e) => setNewEmployee((p) => ({ ...p, freelancer_date: e.target.value }))}
                    />
                  </div>
                )}

                {/* Equipe */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ color: "var(--dash-text-muted)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Equipe</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["cozinha", "salao", "bar", "delivery", "gerencia", "limpeza", "geral"].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormTeam(t)}
                        style={{
                          padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: formTeam === t ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                          color: formTeam === t ? "var(--dash-accent)" : "var(--dash-text-muted)",
                          fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                        }}
                      >{t}</button>
                    ))}
                  </div>
                </div>

                <input
                  style={inp} placeholder="Telefone (opcional)"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, phone: e.target.value }))}
                />
                <div>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>CPF (acesso ao portal)</label>
                  <input
                    style={inp}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={newEmployee.cpf}
                    onChange={(e) => setNewEmployee((p) => ({ ...p, cpf: formatCpf(e.target.value) }))}
                    autoComplete="off"
                  />
                </div>
                <div style={{ color: "#888", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4 }}>Acesso ao portal (opcional)</div>
                <input
                  style={inp} placeholder="Usuário (ex: joao.silva)"
                  value={newEmployee.username}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, username: e.target.value }))}
                  autoComplete="off"
                />
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...inp, paddingRight: 40 }}
                    type={showAddPassword ? "text" : "password"}
                    placeholder="Senha do portal"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14, padding: 4 }}
                    tabIndex={-1}
                  >
                    {showAddPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {categories.length > 0 && (
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Categorias</label>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {categories.map((c) => {
                        const selected = formCategoryIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setFormCategoryIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                            style={{
                              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: selected ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                              color: selected ? "#c084fc" : "rgba(255,255,255,0.4)",
                              fontSize: 11, fontWeight: 600,
                            }}
                          >{c.name}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Salário */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Salário mensal (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 1800"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Dias de trabalho */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Dias de trabalho</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setWorkDays(prev =>
                            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                          );
                        }}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: workDays.includes(day) ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                          color: workDays.includes(day) ? "#00ffae" : "rgba(255,255,255,0.3)",
                          fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horários */}
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Entrada</label>
                    <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Saída</label>
                    <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>

                {/* Almoço */}
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Almoço início</label>
                    <input type="time" value={lunchStart} onChange={e => setLunchStart(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Almoço fim</label>
                    <input type="time" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>

                {/* Custos extras */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Custos extras mensais (R$) — VT, VA, etc</label>
                  <input type="number" placeholder="Ex: 500" value={extraCosts} onChange={e => setExtraCosts(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  <input type="text" placeholder="Descrição (VT + VA + uniforme)" value={extraCostsDesc} onChange={e => setExtraCostsDesc(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 6 }} />
                </div>

                {saveError && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 12 }}>
                    {saveError}
                  </div>
                )}

                {/* Reactivate conflict prompt */}
                {reactivateCandidate && (
                  <div style={{ padding: 14, borderRadius: 12, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                      "{reactivateCandidate.name}" foi desativado anteriormente.
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 12 }}>
                      Deseja reativar o cadastro existente ou criar um novo funcionário?
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={handleReactivate}
                        disabled={saving}
                        style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "rgba(0,255,174,0.12)", color: "#00ffae", fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}
                      >
                        {saving ? "..." : "Reativar"}
                      </button>
                      <button
                        onClick={() => setReactivateCandidate(null)}
                        style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!reactivateCandidate && (
                  <button
                    onClick={saveEmployee}
                    disabled={saving || !newEmployee.name.trim()}
                    style={{ padding: "11px", borderRadius: 10, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", marginTop: 8, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "all 0.2s" }}
                  >
                    {saving ? "Salvando..." : "Salvar funcionário"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter by team or category */}
          {(() => {
            const teamFilters = [...new Set(employees.map(e => e.team || "geral"))];
            const catFilters = [...new Set(employees.flatMap(e => e.category_names?.length > 0 ? e.category_names : (e.category_name ? [e.category_name] : [])))];
            const allFilters = [...teamFilters, ...catFilters.filter(c => !teamFilters.includes(c))];
            return (
              <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
                <button onClick={() => setFilterTeam("all")} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  background: filterTeam === "all" ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                  color: filterTeam === "all" ? "var(--dash-accent)" : "var(--dash-text-muted)",
                  fontSize: 11, fontWeight: 600,
                }}>Todos ({employees.length})</button>
                {allFilters.map(t => {
                  const count = employees.filter(e => {
                    if ((e.team || "geral") === t) return true;
                    const cats = e.category_names?.length > 0 ? e.category_names : (e.category_name ? [e.category_name] : []);
                    return cats.some(n => n === t);
                  }).length;
                  const isCat = catFilters.includes(t) && !teamFilters.includes(t);
                  return (
                    <button key={t} onClick={() => setFilterTeam(t)} style={{
                      padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                      background: filterTeam === t ? (isCat ? "rgba(168,85,247,0.15)" : "rgba(0,255,174,0.1)") : "rgba(255,255,255,0.04)",
                      color: filterTeam === t ? (isCat ? "#c084fc" : "var(--dash-accent)") : "var(--dash-text-muted)",
                      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                    }}>{t} ({count})</button>
                  );
                })}
              </div>
            );
          })()}

          {filteredEmployees.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#666" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 14 }}>{employees.length === 0 ? "Nenhum funcionário cadastrado" : "Nenhum funcionário nessa equipe"}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredEmployees.map((emp) => {
                const status = STATUS_CONFIG[emp.current_status || "off"];
                return (
                  <div key={emp.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: emp.is_active ? "rgba(0,255,174,0.12)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {emp.role === "deliverer" ? "🚴" : emp.role === "kitchen" ? "👨‍🍳" : emp.role === "freelancer" ? "🤝" : "🧑‍🍳"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ color: emp.is_active ? "#fff" : "#666", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.name}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                          background: `${status.color}15`,
                          color: status.color,
                        }}>
                          {status.icon} {status.label}
                        </span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 9,
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--dash-text-muted)",
                          textTransform: "capitalize",
                        }}>
                          {emp.team || "geral"}
                        </span>
                      </div>
                      <div style={{ color: "#888", fontSize: 11, marginTop: 1, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                        <span>{ROLES[emp.role] ?? emp.role}</span>
                        {(emp.category_names?.length > 0 ? emp.category_names : emp.category_name ? [emp.category_name] : []).map(cat => (
                          <span key={cat} style={{ padding: "1px 6px", borderRadius: 5, background: "rgba(168,85,247,0.12)", color: "#c084fc", fontSize: 10, fontWeight: 600 }}>{cat}</span>
                        ))}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>
                        {emp.salary > 0 && <span>R$ {(emp.salary / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · </span>}
                        {emp.work_days && emp.work_days.length > 0 && <span>{emp.work_days.join(", ")} · </span>}
                        {emp.shift_start && emp.shift_end && <span>{emp.shift_start.slice(0, 5)} às {emp.shift_end.slice(0, 5)}</span>}
                      </div>
                      {emp.extra_costs > 0 && (
                        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 2 }}>
                          Custos extras: R$ {(emp.extra_costs / 100).toFixed(2)}{emp.extra_costs_description ? ` (${emp.extra_costs_description})` : ""}
                        </div>
                      )}
                      {/* Manual status change */}
                      <select
                        value={emp.current_status || "off"}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          setEmployees(prev => prev.map(em => em.id === emp.id ? { ...em, current_status: newStatus } : em));
                          await supabase.from("employees").update({ current_status: newStatus }).eq("id", emp.id);
                        }}
                        style={{
                          marginTop: 6, padding: "3px 8px", borderRadius: 6,
                          backgroundColor: "var(--dash-card)", border: "none",
                          color: "var(--dash-text)", fontSize: 10, outline: "none",
                        }}
                      >
                        <option value="working">🟢 Trabalhando</option>
                        <option value="break">🟡 Descanso</option>
                        <option value="lunch">🔵 Almoço</option>
                        <option value="off">⚪ Folga</option>
                        <option value="absent">🔴 Ausente</option>
                        <option value="vacation">🟣 Férias</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => openEditModal(emp)}
                        style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--dash-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => toggleActive(emp)}
                        style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: emp.is_active ? "rgba(248,113,113,0.1)" : "rgba(0,255,174,0.1)", color: emp.is_active ? "#f87171" : "#00ffae", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {emp.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inactive employees toggle */}
          {inactiveEmployees.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowInactive(v => !v)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 10, border: "none",
                  background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <span>Inativos ({inactiveEmployees.length})</span>
                <span style={{ fontSize: 10 }}>{showInactive ? "▲ Ocultar" : "▼ Mostrar"}</span>
              </button>
              {showInactive && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {inactiveEmployees.map(emp => (
                    <div key={emp.id} style={{
                      background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 14px",
                      border: "1px solid rgba(255,255,255,0.04)",
                      display: "flex", alignItems: "center", gap: 10, opacity: 0.5,
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                        {emp.role === "deliverer" ? "🚴" : emp.role === "kitchen" ? "👨‍🍳" : emp.role === "freelancer" ? "🤝" : "🧑‍🍳"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#666", fontSize: 13, fontWeight: 700 }}>{emp.name}</div>
                        <div style={{ color: "#555", fontSize: 11 }}>{ROLES[emp.role] ?? emp.role}</div>
                      </div>
                      <button
                        onClick={() => toggleActive(emp)}
                        style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "rgba(0,255,174,0.08)", color: "#00ffae", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                      >
                        Reativar
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              {waiterStats.map((stat) => (
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

      {/* ── Ponto ── */}
      {tab === "ponto" && isBusiness && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--dash-input-bg)", borderRadius: 12, padding: 4 }}>
            {[
              { key: "registro", label: "Registrar" },
              { key: "historico", label: "Histórico" },
              { key: "resumo", label: "Horas" },
            ].map(t => (
              <button key={t.key} onClick={() => setPontoView(t.key as any)} style={{
                flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: pontoView === t.key ? "var(--dash-accent-soft)" : "transparent",
                color: pontoView === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
                fontSize: 12, fontWeight: 600, transition: "all 0.2s",
              }}>{t.label}</button>
            ))}
          </div>

          {/* SUB-TAB: REGISTRO */}
          {pontoView === "registro" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Registrar ponto</div>
              {employees.filter(e => e.is_active).map(emp => {
                const status = emp.current_status || "off";
                const statusConfig: Record<string, { label: string; color: string; actions: { type: string; label: string; icon: string; nextStatus: string }[] }> = {
                  off: {
                    label: "Fora", color: "rgba(255,255,255,0.3)",
                    actions: [{ type: "clock_in", label: "Entrada", icon: "▶️", nextStatus: "working" }],
                  },
                  working: {
                    label: "Trabalhando", color: "#00ffae",
                    actions: [
                      { type: "break_start", label: "Descanso", icon: "☕", nextStatus: "break" },
                      { type: "lunch_start", label: "Almoço", icon: "🍽️", nextStatus: "lunch" },
                      { type: "clock_out", label: "Saída", icon: "⏹️", nextStatus: "off" },
                    ],
                  },
                  break: {
                    label: "Descanso", color: "#fbbf24",
                    actions: [{ type: "break_end", label: "Retornar", icon: "▶️", nextStatus: "working" }],
                  },
                  lunch: {
                    label: "Almoço", color: "#60a5fa",
                    actions: [{ type: "lunch_end", label: "Retornar", icon: "▶️", nextStatus: "working" }],
                  },
                  absent: {
                    label: "Ausente", color: "#f87171",
                    actions: [{ type: "clock_in", label: "Entrada", icon: "▶️", nextStatus: "working" }],
                  },
                  vacation: {
                    label: "Férias", color: "#a855f7",
                    actions: [],
                  },
                };
                const config = statusConfig[status] || statusConfig.off;
                return (
                  <div key={emp.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                    marginBottom: 6,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>{emp.name}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                          background: `${config.color}15`, color: config.color,
                        }}>{config.label}</span>
                      </div>
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 2 }}>
                        {ROLES[emp.role] ?? emp.role} · {emp.team || "geral"}
                        {emp.last_clock_in && status === "working" && (
                          <span> · desde {new Date(emp.last_clock_in).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {config.actions.map(action => (
                        <button
                          key={action.type}
                          onClick={() => handlePonto(emp.id, action.type, action.nextStatus)}
                          style={{
                            padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: action.type === "clock_out" ? "rgba(248,113,113,0.08)" : "rgba(0,255,174,0.08)",
                            color: action.type === "clock_out" ? "#f87171" : "var(--dash-accent)",
                            fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                          }}
                        >
                          {action.icon} {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SUB-TAB: HISTÓRICO */}
          {pontoView === "historico" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Últimos registros</div>
              {timeEntries.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--dash-text-muted)", fontSize: 12 }}>Nenhum registro de ponto.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {timeEntries.slice(0, 50).map(entry => {
                    const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
                      clock_in: { label: "Entrada", icon: "▶️", color: "#00ffae" },
                      clock_out: { label: "Saída", icon: "⏹️", color: "#f87171" },
                      break_start: { label: "Início descanso", icon: "☕", color: "#fbbf24" },
                      break_end: { label: "Fim descanso", icon: "▶️", color: "#00ffae" },
                      lunch_start: { label: "Início almoço", icon: "🍽️", color: "#60a5fa" },
                      lunch_end: { label: "Fim almoço", icon: "▶️", color: "#00ffae" },
                    };
                    const tc = typeConfig[entry.type] || { label: entry.type, icon: "📌", color: "var(--dash-text-muted)" };
                    return (
                      <div key={entry.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)",
                      }}>
                        <span style={{ fontSize: 12 }}>{tc.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600 }}>
                            {entry.employees?.name || "?"} — <span style={{ color: tc.color }}>{tc.label}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
                            {new Date(entry.timestamp).toLocaleDateString("pt-BR")}
                          </div>
                          <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600 }}>
                            {new Date(entry.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB: RESUMO DE HORAS */}
          {pontoView === "resumo" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Horas trabalhadas</div>
              {employees.filter(e => e.is_active).map(emp => {
                const empEntries = timeEntries.filter(e => e.employee_id === emp.id);
                const { weekHours, monthHours } = calculateHours(empEntries);
                return (
                  <div key={emp.id} style={{
                    padding: "12px 14px", borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                    marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <span style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>{emp.name}</span>
                        <span style={{ color: "var(--dash-text-muted)", fontSize: 10, marginLeft: 6 }}>{ROLES[emp.role] ?? emp.role}</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div style={{ textAlign: "center", padding: "6px 0" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-accent)" }}>{weekHours}h</div>
                        <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Esta semana</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "6px 0" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{monthHours}h</div>
                        <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Este mês</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "6px 0" }}>
                        {(() => {
                          const dailyHours = emp.shift_start && emp.shift_end
                            ? (parseInt(emp.shift_end.split(":")[0]) + parseInt(emp.shift_end.split(":")[1]) / 60)
                            - (parseInt(emp.shift_start.split(":")[0]) + parseInt(emp.shift_start.split(":")[1]) / 60)
                            - (emp.lunch_start && emp.lunch_end
                              ? (parseInt(emp.lunch_end.split(":")[0]) + parseInt(emp.lunch_end.split(":")[1]) / 60)
                              - (parseInt(emp.lunch_start.split(":")[0]) + parseInt(emp.lunch_start.split(":")[1]) / 60)
                              : 0)
                            : 0;
                          const weekTarget = (emp.work_days?.length || 5) * dailyHours;
                          const costPerHour = emp.salary > 0 && weekTarget > 0
                            ? (emp.salary / 100) / (weekTarget * 4)
                            : 0;
                          return (
                            <>
                              <div style={{ fontSize: 16, fontWeight: 800, color: costPerHour > 0 ? "#fbbf24" : "var(--dash-text-muted)" }}>
                                {costPerHour > 0 ? `R$ ${costPerHour.toFixed(0)}/h` : "—"}
                              </div>
                              <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Custo/hora</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {emp.shift_start && emp.shift_end && (
                      <div style={{ marginTop: 6 }}>
                        {(() => {
                          const dailyHours = (parseInt(emp.shift_end.split(":")[0]) + parseInt(emp.shift_end.split(":")[1]) / 60)
                            - (parseInt(emp.shift_start.split(":")[0]) + parseInt(emp.shift_start.split(":")[1]) / 60)
                            - (emp.lunch_start && emp.lunch_end
                              ? (parseInt(emp.lunch_end.split(":")[0]) + parseInt(emp.lunch_end.split(":")[1]) / 60)
                              - (parseInt(emp.lunch_start.split(":")[0]) + parseInt(emp.lunch_start.split(":")[1]) / 60)
                              : 0);
                          const weekTarget = (emp.work_days?.length || 5) * dailyHours;
                          const pct = weekTarget > 0 ? Math.min((weekHours / weekTarget) * 100, 100) : 0;
                          return (
                            <>
                              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: "var(--dash-accent)", transition: "width 0.5s" }} />
                              </div>
                              <div style={{ fontSize: 9, color: "var(--dash-text-muted)", marginTop: 3 }}>
                                {weekHours}h / {weekTarget.toFixed(0)}h meta semanal ({pct.toFixed(0)}%)
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit employee portal — renderiza no body para não quebrar o layout do modal pai */}
      {editingEmployee && typeof document !== "undefined" && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingEmployee(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <div style={{
            width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
            background: "var(--dash-card, #1a1a1a)",
            borderRadius: 20, padding: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text, #fff)" }}>Editar funcionário</div>
              <button onClick={() => setEditingEmployee(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Nome */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Nome</label>
                <input style={inp} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome do funcionário" />
              </div>

              {/* Cargo */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Cargo</label>
                <select style={{ ...inp, backgroundColor: "rgba(255,255,255,0.05)" }} value={editRole} onChange={e => setEditRole(e.target.value)}>
                  {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {/* CPF portal */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>CPF (acesso ao portal)</label>
                <input
                  style={inp}
                  inputMode="numeric"
                  value={editCpf}
                  onChange={e => setEditCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  autoComplete="off"
                />
              </div>

              {/* Senha portal */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Senha do portal</label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...inp, paddingRight: 40 }}
                    type={editShowPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Deixe vazio para manter atual"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14, padding: 4 }}
                    tabIndex={-1}
                  >
                    {editShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Categorias — multi-select */}
              {categories.length > 0 && (
                <div>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Categorias</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {categories.map(c => {
                      const selected = editCategoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditCategoryIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          style={{
                            padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: selected ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                            color: selected ? "#c084fc" : "rgba(255,255,255,0.4)",
                            fontSize: 11, fontWeight: 600,
                          }}
                        >{c.name}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Equipe */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Equipe</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["cozinha", "salao", "bar", "delivery", "gerencia", "limpeza", "geral"].map(t => (
                    <button key={t} type="button" onClick={() => setEditTeam(t)} style={{
                      padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: editTeam === t ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                      color: editTeam === t ? "var(--dash-accent, #00ffae)" : "rgba(255,255,255,0.4)",
                      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Salário e custos extras */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Salário (R$)</label>
                  <input type="number" style={inp} value={editSalary} onChange={e => setEditSalary(e.target.value)} placeholder="Ex: 1800" />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Custos extras (R$)</label>
                  <input type="number" style={inp} value={editExtraCosts} onChange={e => setEditExtraCosts(e.target.value)} placeholder="Ex: 300" />
                </div>
              </div>

              {/* Dias de trabalho */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Dias de trabalho</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map(day => (
                    <button key={day} type="button"
                      onClick={() => setEditWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: editWorkDays.includes(day) ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                        color: editWorkDays.includes(day) ? "var(--dash-accent, #00ffae)" : "rgba(255,255,255,0.3)",
                        fontSize: 12, fontWeight: 600,
                      }}>{day}</button>
                  ))}
                </div>
              </div>

              {/* Horário */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Entrada</label>
                  <input type="time" style={inp} value={editShiftStart} onChange={e => setEditShiftStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>Saída</label>
                  <input type="time" style={inp} value={editShiftEnd} onChange={e => setEditShiftEnd(e.target.value)} />
                </div>
              </div>

              {/* Botão salvar */}
              <button
                onClick={saveEditEmployee}
                disabled={editSaving || !editName.trim()}
                style={{
                  marginTop: 4, padding: "12px", borderRadius: 10, border: "none",
                  background: "var(--dash-accent-soft, rgba(0,255,174,0.12))",
                  color: "var(--dash-accent, #00ffae)",
                  fontSize: 14, fontWeight: 800, cursor: editSaving ? "not-allowed" : "pointer",
                  opacity: editSaving ? 0.7 : 1,
                }}
              >
                {editSaving ? "Salvando..." : "Salvar alterações"}
              </button>

              {/* Excluir */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    padding: "10px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)",
                    background: "rgba(248,113,113,0.06)", color: "#f87171",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Excluir funcionário
                </button>
              ) : (
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <div style={{ color: "#f87171", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                    Tem certeza que deseja excluir {editingEmployee.name}?<br />
                    <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>Esta ação pode ser revertida.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={deleteEmployee}
                      style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                    >
                      Sim, excluir
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--dash-text, #fff)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
