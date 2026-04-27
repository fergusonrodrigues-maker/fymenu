"use client";
import { useState, useEffect, useCallback } from "react";
import type { Unit, Restaurant } from "../types";
import {
  createTaskTemplate, updateTaskTemplate, deleteTaskTemplate, toggleTaskTemplate,
  createManualTaskInstance, updateTaskInstance, deleteTaskInstance,
  listTaskInstances, listTaskTemplates, listTaskCompletions,
  type TaskTemplateInput, type ManualTaskInput,
  type TaskTemplateRow, type TaskInstanceRow, type CompletionRow,
} from "../tarefasActions";

const ROLES = [
  { value: "garcom",      label: "Garçom" },
  { value: "cozinha",     label: "Cozinha" },
  { value: "gerente",     label: "Gerente" },
  { value: "entregador",  label: "Entregador" },
  { value: "caixa",       label: "Caixa" },
  { value: "limpeza",     label: "Limpeza" },
  { value: "geral",       label: "Geral" },
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function todayStr() { return new Date().toISOString().split("T")[0]; }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function fmtDateLabel(dateStr: string): string {
  if (dateStr === todayStr()) return "Hoje";
  if (dateStr === tomorrowStr()) return "Amanhã";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function humanizeFreq(t: TaskTemplateRow): string {
  if (t.frequency === "daily") return "Todos os dias";
  if (t.frequency === "monthly") return `Todo dia ${t.monthly_day}`;
  const days = (t.weekdays ?? []).map((d: number) => DAY_NAMES[d]);
  return days.length ? `Toda ${days.join("/")}` : "Semanal";
}

function getInstanceStatus(task: TaskInstanceRow): "pendente" | "concluída" | "atrasada" {
  if (task.task_completions?.length > 0) return "concluída";
  if (task.due_date < todayStr()) return "atrasada";
  return "pendente";
}

function StatusBadge({ status }: { status: "pendente" | "concluída" | "atrasada" }) {
  const styles = {
    pendente:  { bg: "rgba(251,191,36,0.15)",  color: "#f59e0b", label: "Pendente" },
    concluída: { bg: "rgba(34,197,94,0.15)",   color: "#16a34a", label: "Concluída" },
    atrasada:  { bg: "rgba(239,68,68,0.15)",   color: "#ef4444", label: "Atrasada" },
  };
  const s = styles[status];
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-card)", color: "var(--dash-text)",
  fontSize: 14, outline: "none", fontFamily: "inherit",
};

const label: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--dash-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px",
};

export default function TarefasModal({ unit, restaurant }: { unit: Unit | null; restaurant: Restaurant }) {
  const [tab, setTab] = useState<"emandamento" | "templates" | "historico">("emandamento");
  type SubView = null | "template-form" | "manual-form" | "task-detail";
  const [subView, setSubView] = useState<SubView>(null);

  // Data
  const [instances, setInstances] = useState<TaskInstanceRow[]>([]);
  const [templates, setTemplates] = useState<TaskTemplateRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; role: string }[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [histLoading, setHistLoading] = useState(false);

  // Detail view
  const [detailTask, setDetailTask] = useState<TaskInstanceRow | null>(null);

  // History filters
  const [histEmployee, setHistEmployee] = useState("");
  const [histTaskName, setHistTaskName] = useState("");
  const [histFromDate, setHistFromDate] = useState("");

  // Template form
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplateRow | null>(null);
  const [tName, setTName] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tFreq, setTFreq] = useState<"daily" | "weekly" | "monthly">("daily");
  const [tWeekdays, setTWeekdays] = useState<number[]>([]);
  const [tMonthlyDay, setTMonthlyDay] = useState("1");
  const [tTime, setTTime] = useState("");
  const [tAssignType, setTAssignType] = useState<"role" | "employee">("role");
  const [tAssignRole, setTAssignRole] = useState("geral");
  const [tAssignEmployee, setTAssignEmployee] = useState("");
  const [tRequiresPhoto, setTRequiresPhoto] = useState(false);
  const [tNotifyOwner, setTNotifyOwner] = useState(true);

  // Manual task form
  const [editingInstance, setEditingInstance] = useState<TaskInstanceRow | null>(null);
  const [mName, setMName] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDate, setMDate] = useState(todayStr());
  const [mTime, setMTime] = useState("");
  const [mAssignType, setMAssignType] = useState<"role" | "employee">("role");
  const [mAssignRole, setMAssignRole] = useState("geral");
  const [mAssignEmployee, setMAssignEmployee] = useState("");
  const [mRequiresPhoto, setMRequiresPhoto] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!unit?.id) return;
    setLoading(true);
    try {
      const [inst, tmpl] = await Promise.all([
        listTaskInstances(unit.id, restaurant.id),
        listTaskTemplates(unit.id, restaurant.id),
      ]);
      setInstances(inst);
      setTemplates(tmpl);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [unit?.id, restaurant.id]);

  const loadCompletions = useCallback(async (filters?: { employeeId?: string; taskName?: string; fromDate?: string }) => {
    if (!unit?.id) return;
    setHistLoading(true);
    try {
      const data = await listTaskCompletions(unit.id, restaurant.id, filters);
      setCompletions(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setHistLoading(false);
    }
  }, [unit?.id, restaurant.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "historico" && completions.length === 0) {
      loadCompletions();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!unit?.id) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.from("employees").select("id, name, role").eq("unit_id", unit!.id).eq("is_active", true)
        .order("name").then(({ data }) => { if (data) setEmployees(data); });
    });
  }, [unit?.id]);

  // Photos are batch-signed server-side in listTaskCompletions; clients use
  // c.signed_photo_url directly.

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function openTemplateForm(template?: TaskTemplateRow) {
    setEditingTemplate(template ?? null);
    if (template) {
      setTName(template.name); setTDesc(template.description ?? "");
      setTFreq(template.frequency as any); setTWeekdays(template.weekdays ?? []);
      setTMonthlyDay(String(template.monthly_day ?? 1)); setTTime(template.suggested_time ?? "");
      setTAssignType(template.assignment_type as any); setTAssignRole(template.assigned_role ?? "geral");
      setTAssignEmployee(template.assigned_employee_id ?? "");
      setTRequiresPhoto(template.requires_photo); setTNotifyOwner(template.notify_owner_on_complete);
    } else {
      setTName(""); setTDesc(""); setTFreq("daily"); setTWeekdays([]); setTMonthlyDay("1");
      setTTime(""); setTAssignType("role"); setTAssignRole("geral"); setTAssignEmployee("");
      setTRequiresPhoto(false); setTNotifyOwner(true);
    }
    setErr(null);
    setSubView("template-form");
  }

  function openManualForm(instance?: TaskInstanceRow) {
    setEditingInstance(instance ?? null);
    if (instance) {
      setMName(instance.name); setMDesc(instance.description ?? "");
      setMDate(instance.due_date); setMTime(instance.due_time ?? "");
      setMAssignType(instance.assignment_type as any); setMAssignRole(instance.assigned_role ?? "geral");
      setMAssignEmployee(instance.assigned_employee_id ?? ""); setMRequiresPhoto(instance.requires_photo);
    } else {
      setMName(""); setMDesc(""); setMDate(todayStr()); setMTime("");
      setMAssignType("role"); setMAssignRole("geral"); setMAssignEmployee(""); setMRequiresPhoto(false);
    }
    setErr(null);
    setSubView("manual-form");
  }

  function openTaskDetail(task: TaskInstanceRow) {
    setDetailTask(task);
    setSubView("task-detail");
  }

  function backToList() {
    setSubView(null);
    setDetailTask(null);
    setErr(null);
  }

  // ── Save handlers ─────────────────────────────────────────────────────────────

  async function handleSaveTemplate() {
    if (!unit?.id || !tName.trim()) return;
    setSaving(true); setErr(null);
    try {
      const input: TaskTemplateInput = {
        restaurantId: restaurant.id, unitId: unit.id,
        name: tName, description: tDesc,
        frequency: tFreq,
        weekdays: tFreq === "weekly" ? tWeekdays : [],
        monthly_day: tFreq === "monthly" ? (parseInt(tMonthlyDay) || 1) : null,
        suggested_time: tTime,
        assignment_type: tAssignType,
        assigned_role: tAssignType === "role" ? tAssignRole : undefined,
        assigned_employee_id: tAssignType === "employee" ? tAssignEmployee : undefined,
        requires_photo: tRequiresPhoto,
        notify_owner_on_complete: tNotifyOwner,
      };
      if (editingTemplate) {
        await updateTaskTemplate(editingTemplate.id, input);
      } else {
        await createTaskTemplate(input);
      }
      setSubView(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveManual() {
    if (!unit?.id || !mName.trim() || !mDate) return;
    setSaving(true); setErr(null);
    try {
      const input: ManualTaskInput = {
        restaurantId: restaurant.id, unitId: unit.id,
        name: mName, description: mDesc,
        due_date: mDate, due_time: mTime,
        assignment_type: mAssignType,
        assigned_role: mAssignType === "role" ? mAssignRole : undefined,
        assigned_employee_id: mAssignType === "employee" ? mAssignEmployee : undefined,
        requires_photo: mRequiresPhoto,
      };
      if (editingInstance) {
        await updateTaskInstance(editingInstance.id, input);
      } else {
        await createManualTaskInstance(input);
      }
      setSubView(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!unit?.id || !confirm("Desativar este template? As tarefas já criadas continuam existindo.")) return;
    try {
      await deleteTaskTemplate(id, restaurant.id, unit.id);
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  async function handleToggleTemplate(id: string, isActive: boolean) {
    if (!unit?.id) return;
    try {
      await toggleTaskTemplate(id, isActive, restaurant.id, unit.id);
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, is_active: isActive } : t));
    } catch (e: any) { setErr(e.message); }
  }

  async function handleDeleteInstance(id: string) {
    if (!unit?.id || !confirm("Excluir esta tarefa?")) return;
    try {
      await deleteTaskInstance(id, restaurant.id, unit.id);
      backToList();
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  // ── Computed groups for Em Andamento tab ──────────────────────────────────────

  const today = todayStr();
  const tomorrow = tomorrowStr();
  const overdue  = instances.filter((t) => t.due_date < today && getInstanceStatus(t) !== "concluída");
  const todayTasks    = instances.filter((t) => t.due_date === today);
  const tomorrowTasks = instances.filter((t) => t.due_date === tomorrow);
  const futureTasks   = instances.filter((t) => t.due_date > tomorrow);
  const futureByDate  = futureTasks.reduce<Record<string, TaskInstanceRow[]>>((acc, t) => {
    (acc[t.due_date] = acc[t.due_date] ?? []).push(t);
    return acc;
  }, {});

  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? "Funcionário";
  const getRoleLabel = (v: string) => ROLES.find((r) => r.value === v)?.label ?? v;

  // ── Sub-components ────────────────────────────────────────────────────────────

  function TaskCard({ task }: { task: TaskInstanceRow }) {
    const status = getInstanceStatus(task);
    return (
      <div
        onClick={() => openTaskDetail(task)}
        style={{
          cursor: "pointer", padding: "12px 14px", borderRadius: 12, marginBottom: 8,
          background: "var(--dash-card)", border: "1px solid var(--dash-border)",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--dash-accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--dash-border)"; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>{task.name}</div>
            {task.description && (
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              {task.due_time && (
                <span style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
                  🕐 {task.due_time.slice(0, 5)}
                </span>
              )}
              <span style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>
                {task.assignment_type === "role"
                  ? `Cargo: ${getRoleLabel(task.assigned_role ?? "")}`
                  : `👤 ${getEmployeeName(task.assigned_employee_id ?? "")}`}
              </span>
              {task.requires_photo && (
                <span style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>📷 Foto obrigatória</span>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>
    );
  }

  function TaskGroup({ title, tasks, accent }: { title: string; tasks: TaskInstanceRow[]; accent?: string }) {
    if (tasks.length === 0) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: accent ?? "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
          {title} ({tasks.length})
        </div>
        {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
      </div>
    );
  }

  // ── Assignment field (shared by both forms) ───────────────────────────────────

  function AssignFields({
    assignType, setAssignType, assignRole, setAssignRole, assignEmployee, setAssignEmployee,
  }: {
    assignType: "role" | "employee"; setAssignType: (v: "role" | "employee") => void;
    assignRole: string; setAssignRole: (v: string) => void;
    assignEmployee: string; setAssignEmployee: (v: string) => void;
  }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={label}>Atribuir a *</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {(["role", "employee"] as const).map((v) => (
            <button key={v} onClick={() => setAssignType(v)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid",
              borderColor: assignType === v ? "var(--dash-accent)" : "var(--dash-border)",
              background: assignType === v ? "var(--dash-accent-soft)" : "var(--dash-card)",
              color: assignType === v ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              {v === "role" ? "Por Cargo" : "Funcionário"}
            </button>
          ))}
        </div>
        {assignType === "role" ? (
          <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)} style={inp}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        ) : (
          <select value={assignEmployee} onChange={(e) => setAssignEmployee(e.target.value)} style={inp}>
            <option value="">Selecione um funcionário...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({getRoleLabel(e.role ?? "")})</option>)}
          </select>
        )}
      </div>
    );
  }

  // ── Renders ───────────────────────────────────────────────────────────────────

  if (!unit) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--dash-text-muted)" }}>
        Nenhuma unidade selecionada.
      </div>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px 4px", border: "none", background: "transparent",
    color: active ? "var(--dash-accent)" : "var(--dash-text-muted)",
    borderBottom: active ? "2px solid var(--dash-accent)" : "2px solid transparent",
    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    transition: "color 0.2s",
  });

  const btnGreen: React.CSSProperties = {
    padding: "8px 14px", borderRadius: 10, border: "none",
    background: "#16a34a", color: "#fff",
    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 5,
    transition: "opacity 0.2s",
  };

  const btnGray: React.CSSProperties = {
    padding: "10px 18px", borderRadius: 10,
    border: "1px solid var(--dash-border)",
    background: "transparent", color: "var(--dash-text-muted)",
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };

  const btnSave: React.CSSProperties = {
    padding: "10px 22px", borderRadius: 10, border: "none",
    background: "#16a34a", color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    opacity: saving ? 0.7 : 1,
  };

  // ── Sub-view: Template form ─────────────────────────────────────────────────

  if (subView === "template-form") {
    return (
      <div>
        <button onClick={backToList} style={{ ...btnGray, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12 }}>
          ← Voltar
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)", marginBottom: 20 }}>
          {editingTemplate ? "Editar Template" : "Novo Template"}
        </div>

        {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{err}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Nome da tarefa *</label>
          <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Ex: Limpeza do banheiro" style={inp} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Descrição</label>
          <textarea value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="Instruções opcionais..." rows={2}
            style={{ ...inp, resize: "none", minHeight: 64 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Frequência *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["daily", "weekly", "monthly"] as const).map((f) => (
              <label key={f} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="radio" name="freq" checked={tFreq === f} onChange={() => setTFreq(f)} style={{ accentColor: "var(--dash-accent)" }} />
                <span style={{ color: "var(--dash-text)", fontSize: 13 }}>
                  {f === "daily" ? "Todos os dias" : f === "weekly" ? "Dias específicos da semana" : "Todo mês no dia X"}
                </span>
              </label>
            ))}
          </div>
          {tFreq === "weekly" && (
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {DAY_NAMES.map((name, i) => (
                <button key={i} onClick={() => setTWeekdays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i])}
                  style={{
                    padding: "5px 10px", borderRadius: 8, border: "1px solid",
                    borderColor: tWeekdays.includes(i) ? "var(--dash-accent)" : "var(--dash-border)",
                    background: tWeekdays.includes(i) ? "var(--dash-accent-soft)" : "var(--dash-card)",
                    color: tWeekdays.includes(i) ? "var(--dash-accent)" : "var(--dash-text-muted)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  {name}
                </button>
              ))}
            </div>
          )}
          {tFreq === "monthly" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>Todo dia</span>
              <input type="number" min={1} max={31} value={tMonthlyDay} onChange={(e) => setTMonthlyDay(e.target.value)}
                style={{ ...inp, width: 80 }} />
              <span style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>do mês</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Horário sugerido</label>
          <input type="time" value={tTime} onChange={(e) => setTTime(e.target.value)} style={{ ...inp, width: "auto" }} />
        </div>

        <AssignFields assignType={tAssignType} setAssignType={setTAssignType}
          assignRole={tAssignRole} setAssignRole={setTAssignRole}
          assignEmployee={tAssignEmployee} setAssignEmployee={setTAssignEmployee} />

        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={tRequiresPhoto} onChange={(e) => setTRequiresPhoto(e.target.checked)} style={{ accentColor: "var(--dash-accent)", width: 16, height: 16 }} />
            <span style={{ color: "var(--dash-text)", fontSize: 13 }}>📷 Exigir foto ao concluir</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={tNotifyOwner} onChange={(e) => setTNotifyOwner(e.target.checked)} style={{ accentColor: "var(--dash-accent)", width: 16, height: 16 }} />
            <span style={{ color: "var(--dash-text)", fontSize: 13 }}>🔔 Notificar dono no WhatsApp ao concluir</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={backToList} style={btnGray} disabled={saving}>Cancelar</button>
          <button onClick={handleSaveTemplate} style={btnSave} disabled={saving || !tName.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  // ── Sub-view: Manual task form ──────────────────────────────────────────────

  if (subView === "manual-form") {
    return (
      <div>
        <button onClick={backToList} style={{ ...btnGray, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12 }}>
          ← Voltar
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)", marginBottom: 20 }}>
          {editingInstance ? "Editar Tarefa" : "Nova Tarefa Avulsa"}
        </div>

        {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{err}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Nome da tarefa *</label>
          <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Ex: Conferir caixa" style={inp} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Descrição</label>
          <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="Instruções opcionais..." rows={2}
            style={{ ...inp, resize: "none", minHeight: 64 }} />
        </div>

        <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Data *</label>
            <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Horário</label>
            <input type="time" value={mTime} onChange={(e) => setMTime(e.target.value)} style={inp} />
          </div>
        </div>

        <AssignFields assignType={mAssignType} setAssignType={setMAssignType}
          assignRole={mAssignRole} setAssignRole={setMAssignRole}
          assignEmployee={mAssignEmployee} setAssignEmployee={setMAssignEmployee} />

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={mRequiresPhoto} onChange={(e) => setMRequiresPhoto(e.target.checked)} style={{ accentColor: "var(--dash-accent)", width: 16, height: 16 }} />
            <span style={{ color: "var(--dash-text)", fontSize: 13 }}>📷 Exigir foto ao concluir</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={backToList} style={btnGray} disabled={saving}>Cancelar</button>
          <button onClick={handleSaveManual} style={btnSave} disabled={saving || !mName.trim() || !mDate}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  // ── Sub-view: Task detail ───────────────────────────────────────────────────

  if (subView === "task-detail" && detailTask) {
    const status = getInstanceStatus(detailTask);
    const completion = detailTask.task_completions?.[0];
    return (
      <div>
        <button onClick={backToList} style={{ ...btnGray, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12 }}>
          ← Voltar
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-text)", marginBottom: 6 }}>{detailTask.name}</div>
            {detailTask.description && (
              <div style={{ fontSize: 13, color: "var(--dash-text-muted)", lineHeight: 1.5 }}>{detailTask.description}</div>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--dash-text-muted)" }}>
            <span>📅</span>
            <span>{fmtDateLabel(detailTask.due_date)}{detailTask.due_time ? ` às ${detailTask.due_time.slice(0, 5)}` : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--dash-text-muted)" }}>
            <span>👥</span>
            <span>
              {detailTask.assignment_type === "role"
                ? `Cargo: ${getRoleLabel(detailTask.assigned_role ?? "")}`
                : `Funcionário: ${getEmployeeName(detailTask.assigned_employee_id ?? "")}`}
            </span>
          </div>
          {detailTask.requires_photo && (
            <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>📷 Foto obrigatória</div>
          )}
        </div>

        {completion && (
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ✓ Concluída
            </div>
            <div style={{ fontSize: 13, color: "var(--dash-text-muted)", marginBottom: completion.notes ? 4 : 0 }}>
              {getEmployeeName(completion.employee_id)} • {fmtDateTime(completion.completed_at)}
            </div>
            {completion.notes && (
              <div style={{ fontSize: 13, color: "var(--dash-text)", marginTop: 6, fontStyle: "italic" }}>"{completion.notes}"</div>
            )}
          </div>
        )}

        {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => openManualForm(detailTask)}
            style={{ ...btnGreen, background: "var(--dash-accent-soft)", color: "var(--dash-accent)" }}
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => handleDeleteInstance(detailTask.id)}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Excluir
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--dash-border)", marginBottom: 20 }}>
        {(["emandamento", "templates", "historico"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === "emandamento" ? "Em andamento" : t === "templates" ? "Templates" : "Histórico"}
          </button>
        ))}
      </div>

      {err && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>
          {err}
        </div>
      )}

      {/* ── Em andamento ──────────────────────────────────────────────────────── */}
      {tab === "emandamento" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => openManualForm()} style={btnGreen}>
              + Nova tarefa avulsa
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Carregando...</div>
          ) : instances.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nenhuma tarefa nos próximos 7 dias</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Crie templates ou tarefas avulsas para sua equipe</div>
            </div>
          ) : (
            <>
              <TaskGroup title="Atrasadas" tasks={overdue} accent="#ef4444" />
              <TaskGroup title="Hoje" tasks={todayTasks} accent="var(--dash-accent)" />
              <TaskGroup title="Amanhã" tasks={tomorrowTasks} />
              {Object.entries(futureByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, tasks]) => (
                <TaskGroup key={date} title={fmtDateLabel(date)} tasks={tasks} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Templates ─────────────────────────────────────────────────────────── */}
      {tab === "templates" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => openTemplateForm()} style={btnGreen}>
              + Novo template
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Carregando...</div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nenhum template criado</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Templates geram tarefas automáticas para sua equipe</div>
            </div>
          ) : (
            templates.map((tmpl) => (
              <div key={tmpl.id} style={{
                padding: "14px 16px", borderRadius: 12, marginBottom: 10,
                background: "var(--dash-card)", border: "1px solid var(--dash-border)",
                opacity: tmpl.is_active ? 1 : 0.5,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{tmpl.name}</div>
                    <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 6 }}>
                      🔄 {humanizeFreq(tmpl)}
                      {tmpl.suggested_time ? ` • 🕐 ${tmpl.suggested_time.slice(0, 5)}` : ""}
                      {" • "}
                      {tmpl.assignment_type === "role"
                        ? getRoleLabel(tmpl.assigned_role ?? "")
                        : getEmployeeName(tmpl.assigned_employee_id ?? "")}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {tmpl.requires_photo && <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>📷 Foto</span>}
                      {tmpl.notify_owner_on_complete && <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>🔔 Notifica</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {/* Toggle */}
                    <label className="switch-toggle" onClick={(e) => { e.preventDefault(); handleToggleTemplate(tmpl.id, !tmpl.is_active); }}>
                      <input type="checkbox" checked={tmpl.is_active} readOnly />
                      <span className="sw-slider">
                        <span className="sw-circle">
                          <svg className="sw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                          <svg className="sw-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </span>
                        <span style={{ position: "absolute", width: 9, height: 3, left: 6, background: "#fff", borderRadius: 1 }} />
                      </span>
                    </label>
                    <button onClick={() => openTemplateForm(tmpl)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Editar
                    </button>
                    <button onClick={() => handleDeleteTemplate(tmpl.id)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Histórico ─────────────────────────────────────────────────────────── */}
      {tab === "historico" && (
        <div>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 16 }}>
            ℹ️ Fotos são automaticamente excluídas após 30 dias.
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <input
              placeholder="Buscar por tarefa..."
              value={histTaskName}
              onChange={(e) => setHistTaskName(e.target.value)}
              style={{ ...inp, flex: 1, minWidth: 160 }}
            />
            <select value={histEmployee} onChange={(e) => setHistEmployee(e.target.value)} style={{ ...inp, flex: 1, minWidth: 140 }}>
              <option value="">Todos funcionários</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input type="date" value={histFromDate} onChange={(e) => setHistFromDate(e.target.value)} style={{ ...inp, flex: "0 0 auto" }} />
            <button onClick={() => loadCompletions({ employeeId: histEmployee || undefined, taskName: histTaskName || undefined, fromDate: histFromDate || undefined })}
              style={btnGreen}>
              Filtrar
            </button>
          </div>

          {histLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Carregando...</div>
          ) : completions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nenhuma conclusão encontrada</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Quando funcionários concluírem tarefas, aparecerão aqui</div>
            </div>
          ) : (
            completions.map((c) => (
              <div key={c.id} style={{ padding: "14px 16px", borderRadius: 12, marginBottom: 10, background: "var(--dash-card)", border: "1px solid var(--dash-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                      {c.task_instances?.name ?? "Tarefa removida"}
                    </div>
                    <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: c.notes ? 4 : 0 }}>
                      👤 {c.employees?.name ?? "Funcionário"} • {fmtDateTime(c.completed_at)}
                    </div>
                    {c.notes && (
                      <div style={{ fontSize: 12, color: "var(--dash-text-muted)", fontStyle: "italic" }}>"{c.notes}"</div>
                    )}
                  </div>
                  {c.photo_path && (
                    <div
                      onClick={() => { if (c.signed_photo_url) window.open(c.signed_photo_url, "_blank"); }}
                      style={{ cursor: c.signed_photo_url ? "pointer" : "default", flexShrink: 0 }}
                    >
                      {c.signed_photo_url ? (
                        <img src={c.signed_photo_url} alt="Foto" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: "var(--dash-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📷</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
