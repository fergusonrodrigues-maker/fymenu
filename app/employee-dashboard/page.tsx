"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import FyLoader from "@/components/FyLoader";

interface Employee {
  id: string;
  name: string;
  role: string;
  unit_id: string;
  units?: { name: string; slug: string };
  employee_categories?: { name: string; color_badge: string };
}

interface TimeLog {
  id: string;
  log_date: string;
  entry_time: string | null;
  break_start: string | null;
  break_end: string | null;
  exit_time: string | null;
  total_minutes: number;
  status: string;
}

type ClockState = "not_started" | "working" | "on_break" | "done";

const ROLE_LABELS: Record<string, string> = {
  waiter: "Garçom",
  kitchen: "Cozinha",
  deliverer: "Entregador",
  cashier: "Caixa",
  manager: "Gerente",
};

function formatTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(mins: number) {
  if (!mins) return "0h 0min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

const STATE_CONFIG: Record<ClockState, { label: string; color: string; next: string; nextAction: string }> = {
  not_started: { label: "Fora do turno", color: "#888", next: "Registrar entrada", nextAction: "entry" },
  working: { label: "Trabalhando", color: "#00ffae", next: "Iniciar pausa", nextAction: "break_start" },
  on_break: { label: "Em pausa", color: "#fbbf24", next: "Retornar da pausa", nextAction: "break_end" },
  done: { label: "Turno encerrado", color: "#888", next: "", nextAction: "" },
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayLog, setTodayLog] = useState<TimeLog | null>(null);
  const [clockState, setClockState] = useState<ClockState>("not_started");
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tab, setTab] = useState<"ponto" | "historico">("ponto");
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("employee_session");
    if (!session) {
      router.replace("/employee-login");
      return;
    }
    try {
      setEmployee(JSON.parse(session));
    } catch {
      localStorage.removeItem("employee_session");
      router.replace("/employee-login");
    }
  }, [router]);

  const loadTodayStatus = useCallback(async (emp: Employee) => {
    const res = await fetch(`/api/employees/timeclock?employee_id=${emp.id}`);
    const json = await res.json();
    setTodayLog(json.log);
    setClockState(json.current_state as ClockState);
  }, []);

  const loadHistory = useCallback(async (emp: Employee) => {
    const res = await fetch(`/api/employees/history?employee_id=${emp.id}&days=30`);
    const json = await res.json();
    setLogs(json.logs ?? []);
    setAnalytics(json.analytics);
  }, []);

  useEffect(() => {
    if (!employee) return;
    setLoading(true);
    Promise.all([loadTodayStatus(employee), loadHistory(employee)]).finally(() => setLoading(false));
  }, [employee, loadTodayStatus, loadHistory]);

  async function handleClock(action: string) {
    if (!employee || !action) return;
    setClocking(true);
    setClockError(null);

    const res = await fetch("/api/employees/timeclock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employee.id, action }),
    });
    const json = await res.json();

    if (!res.ok) {
      setClockError(json.error);
    } else {
      await loadTodayStatus(employee);
      await loadHistory(employee);
    }
    setClocking(false);
  }

  function handleLogout() {
    localStorage.removeItem("employee_session");
    router.replace("/employee-login");
  }

  const stateConfig = STATE_CONFIG[clockState];

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", borderRadius: 10, border: "none",
    background: active ? "rgba(0,255,174,0.12)" : "transparent",
    color: active ? "#00ffae" : "#666",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
  });

  if (loading || !employee) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FyLoader size="md" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #080808 0%, #111 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      color: "#fff",
      padding: "env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0)",
    }}>
      {/* Header */}
      <div style={{ padding: "56px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#888", fontSize: 12 }}>{employee.units?.name ?? "Unidade"}</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>{employee.name}</div>
          <div style={{ color: "#00ffae", fontSize: 12, fontWeight: 600 }}>{ROLE_LABELS[employee.role] ?? employee.role}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#888", fontSize: 13, cursor: "pointer" }}
        >
          Sair
        </button>
      </div>

      <div style={{ padding: "0 16px 80px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
          <button style={tabStyle(tab === "ponto")} onClick={() => setTab("ponto")}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={14} /> Ponto de Hoje</span></button>
          <button style={tabStyle(tab === "historico")} onClick={() => setTab("historico")}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarDays size={14} /> Histórico</span></button>
        </div>

        {/* ── Ponto ── */}
        {tab === "ponto" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status card */}
            <div style={{
              borderRadius: 20, padding: "28px 20px",
              background: `linear-gradient(135deg, ${stateConfig.color}11, ${stateConfig.color}06)`,
              border: `1px solid ${stateConfig.color}33`,
              textAlign: "center",
            }}>
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><div style={{ width: 48, height: 48, borderRadius: "50%", background: stateConfig.color, opacity: clockState === "not_started" || clockState === "done" ? 0.25 : 1 }} /></div>
              <div style={{ color: stateConfig.color, fontSize: 20, fontWeight: 800 }}>{stateConfig.label}</div>
              {todayLog?.entry_time && (
                <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
                  Entrada: {formatTime(todayLog.entry_time)}
                </div>
              )}
            </div>

            {/* Today's timeline */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Hoje</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Entrada", value: formatTime(todayLog?.entry_time ?? null), done: !!todayLog?.entry_time },
                  { label: "Início pausa", value: formatTime(todayLog?.break_start ?? null), done: !!todayLog?.break_start },
                  { label: "Retorno pausa", value: formatTime(todayLog?.break_end ?? null), done: !!todayLog?.break_end },
                  { label: "Saída", value: formatTime(todayLog?.exit_time ?? null), done: !!todayLog?.exit_time },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: item.done ? "#fff" : "#444", fontSize: 14 }}>{item.label}</div>
                    <div style={{ color: item.done ? "#00ffae" : "#333", fontSize: 14, fontWeight: 700 }}>{item.value}</div>
                  </div>
                ))}
                {(todayLog?.total_minutes ?? 0) > 0 && (
                  <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between" }}>
                    <div style={{ color: "#888", fontSize: 14 }}>Total trabalhado</div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{formatMinutes(todayLog!.total_minutes)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Action button */}
            {clockState !== "done" && stateConfig.nextAction && (
              <div>
                {clockError && (
                  <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
                    {clockError}
                  </div>
                )}
                <button
                  onClick={() => handleClock(stateConfig.nextAction)}
                  disabled={clocking}
                  style={{
                    width: "100%", padding: "16px", borderRadius: 16, border: "none",
                    background: "var(--dash-accent-soft)",
                    color: "var(--dash-accent)",
                    fontSize: 16, fontWeight: 900, cursor: clocking ? "not-allowed" : "pointer",
                    letterSpacing: "-0.3px",
                    boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "all 0.2s",
                  }}
                >
                  {clocking ? "Registrando..." : stateConfig.next}
                </button>

                {/* Exit button when working or on break */}
                {(clockState === "working" || clockState === "on_break") && (
                  <button
                    onClick={() => handleClock("exit")}
                    disabled={clocking}
                    style={{
                      width: "100%", marginTop: 10, padding: "14px", borderRadius: 16,
                      border: "1px solid rgba(248,113,113,0.3)",
                      background: "rgba(248,113,113,0.06)",
                      color: "#f87171",
                      fontSize: 14, fontWeight: 700, cursor: clocking ? "not-allowed" : "pointer",
                    }}
                  >
                    Registrar saída
                  </button>
                )}
              </div>
            )}

            {clockState === "done" && (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#888", fontSize: 14 }}>
                Turno encerrado. Até amanhã!
              </div>
            )}
          </div>
        )}

        {/* ── Histórico ── */}
        {tab === "historico" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Analytics summary */}
            {analytics && (
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Resumo de Horas</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
                  {[
                    { label: "30 dias", hours: analytics.hours_30d, days: analytics.days_worked_30d },
                    { label: "60 dias", hours: analytics.hours_60d, days: analytics.days_worked_60d },
                    { label: "90 dias", hours: analytics.hours_90d, days: analytics.days_worked_90d },
                  ].map((a) => (
                    <div key={a.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 6px" }}>
                      <div style={{ color: "#00ffae", fontSize: 18, fontWeight: 900 }}>{a.hours}h</div>
                      <div style={{ color: "#888", fontSize: 10, marginTop: 2 }}>{a.label}</div>
                      <div style={{ color: "#555", fontSize: 10 }}>{a.days} dias</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log list */}
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>
                Nenhum registro encontrado
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{formatDate(log.log_date)}</div>
                        <div style={{ color: log.status === "complete" ? "#00ffae" : "#fbbf24", fontSize: 11, marginTop: 1 }}>
                          {log.status === "complete" ? "Completo" : "Em andamento"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>{formatMinutes(log.total_minutes)}</div>
                        <div style={{ color: "#666", fontSize: 11 }}>trabalhado</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#666" }}>
                      <span>Entrada: <span style={{ color: "#aaa" }}>{formatTime(log.entry_time)}</span></span>
                      <span>Saída: <span style={{ color: "#aaa" }}>{formatTime(log.exit_time)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
