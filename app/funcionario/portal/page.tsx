"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  name: string;
  role: string;
  team: string | null;
  unit_id: string;
  current_status: string;
  category_name: string | null;
  salary: number | null;
  work_days: string[] | null;
  shift_start: string | null;
  shift_end: string | null;
  cpf_masked: string | null;
  unit_name: string;
  unit_logo: string | null;
  unit_slug: string | null;
}

interface PontoEntry {
  id: string;
  type: "clock_in" | "clock_out" | "break_start" | "break_end" | "lunch_start" | "lunch_end";
  timestamp: string;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

type Tab = "ponto" | "status" | "dados" | "avaliacoes";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  working:  { label: "Trabalhando",  color: "#00ffae", bg: "rgba(0,255,174,0.12)",   icon: "🟢" },
  break:    { label: "Descanso",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "🟡" },
  lunch:    { label: "Almoço",       color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  icon: "🔵" },
  off:      { label: "Folga",        color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)", icon: "⚪" },
  absent:   { label: "Ausente",      color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "🔴" },
  vacation: { label: "Férias",       color: "#a855f7", bg: "rgba(168,85,247,0.12)", icon: "🟣" },
};

const ROLES: Record<string, string> = {
  waiter: "Garçom", kitchen: "Cozinha", deliverer: "Entregador",
  cashier: "Caixa", manager: "Gerente", freelancer: "Freelancer",
  garcom: "Garçom", cozinha: "Cozinha", entregador: "Entregador",
  caixa: "Caixa", gerente: "Gerente",
};

const DAYS_PT: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function groupEntriesByDay(entries: PontoEntry[]) {
  const days: Record<string, PontoEntry[]> = {};
  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    if (!days[day]) days[day] = [];
    days[day].push(e);
  }
  return days;
}

function calcWorkedMs(dayEntries: PontoEntry[]): number {
  const sorted = [...dayEntries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let ms = 0;
  let lastIn: Date | null = null;
  for (const e of sorted) {
    if (e.type === "clock_in") { lastIn = new Date(e.timestamp); }
    else if (e.type === "clock_out" && lastIn) {
      ms += new Date(e.timestamp).getTime() - lastIn.getTime();
      lastIn = null;
    }
  }
  if (lastIn) ms += Date.now() - lastIn.getTime();
  return ms;
}

function msToHM(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

function StarRating({ value }: { value: number }) {
  const stars = Math.round(value);
  return (
    <span style={{ color: "#fbbf24", fontSize: 14 }}>
      {"★".repeat(stars)}
      <span style={{ opacity: 0.3 }}>{"★".repeat(5 - stars)}</span>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FuncionarioPortal() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<PontoEntry[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("ponto");
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [punchFeedback, setPunchFeedback] = useState<"in" | "out" | null>(null);

  // ── Auth + initial load ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [meRes, pontoRes] = await Promise.all([
      fetch("/api/funcionario/me"),
      fetch("/api/funcionario/ponto?period=7d"),
    ]);

    if (!meRes.ok) { router.replace("/funcionario"); return; }
    const { employee: emp } = await meRes.json();
    setEmployee(emp);

    if (pontoRes.ok) {
      const { entries: e } = await pontoRes.json();
      setEntries(e ?? []);
    }

    // Load ratings silently
    fetch("/api/funcionario/avaliacoes")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setRatings(data.ratings ?? []); setAvgRating(data.avg ?? null); }
      })
      .catch(() => {});

    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Status change ─────────────────────────────────────────────────────────
  async function changeStatus(newStatus: string) {
    if (!employee || statusLoading) return;
    setStatusLoading(true);
    setEmployee(prev => prev ? { ...prev, current_status: newStatus } : prev);
    try {
      await fetch("/api/funcionario/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
    setStatusLoading(false);
  }

  // ── Punch in/out ──────────────────────────────────────────────────────────
  async function handlePunch() {
    if (punchLoading) return;
    setPunchLoading(true);
    try {
      const res = await fetch("/api/funcionario/ponto", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPunchFeedback(data.type === "clock_in" ? "in" : "out");
        setTimeout(() => setPunchFeedback(null), 2000);
        setEmployee(prev => prev ? { ...prev, current_status: data.status } : prev);
        // Refresh entries
        fetch("/api/funcionario/ponto?period=7d")
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setEntries(d.entries ?? []); })
          .catch(() => {});
      }
    } catch {}
    setPunchLoading(false);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await fetch("/api/funcionario/logout", { method: "POST" });
    localStorage.removeItem("fy_employee_id");
    localStorage.removeItem("fy_employee_name");
    localStorage.removeItem("fy_employee_role");
    localStorage.removeItem("fy_employee_unit_id");
    router.replace("/funcionario");
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG[employee?.current_status ?? "off"] ?? STATUS_CONFIG.off;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter(e => e.timestamp.startsWith(todayStr))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const lastEntry = todayEntries.at(-1);
  const isOpen = lastEntry?.type === "clock_in";

  const weekEntries = entries.filter(e => {
    const d = new Date(e.timestamp);
    const mon = new Date(); mon.setDate(mon.getDate() - mon.getDay() + 1); mon.setHours(0, 0, 0, 0);
    return d >= mon;
  });
  const weekDays = groupEntriesByDay(weekEntries);
  const weekMs = Object.values(weekDays).reduce((s, es) => s + calcWorkedMs(es), 0);

  const dayHistory = groupEntriesByDay(entries);
  const dayKeys = Object.keys(dayHistory).sort((a, b) => b.localeCompare(a)).slice(0, 7);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(0,255,174,0.15)", borderTop: "3px solid #00ffae", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } body { margin: 0; background: #060606; }`}</style>
      </div>
    );
  }

  if (!employee) return null;

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: "18px 16px",
    marginBottom: 12,
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 4px", border: "none", background: "transparent", cursor: "pointer",
    color: active ? "#00ffae" : "rgba(255,255,255,0.35)",
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    transition: "color 0.15s",
    position: "relative",
  });

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #060606; font-family: 'Montserrat', system-ui, sans-serif; }
        select { color-scheme: dark; }
        .punch-btn { transition: transform 0.1s, box-shadow 0.1s; }
        .punch-btn:not(:disabled):active { transform: scale(0.95) !important; }
        .status-pill { transition: background 0.2s, color 0.2s; }
        @keyframes fadePop { 0% { opacity: 0; transform: scale(0.9); } 60% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
        .fade-pop { animation: fadePop 0.3s ease both; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {employee.unit_logo && (
              <img src={employee.unit_logo} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {employee.unit_name}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {employee.name}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                {ROLES[employee.role] ?? employee.role}
                {employee.category_name ? ` · ${employee.category_name}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <div style={{ padding: "4px 10px", borderRadius: 8, background: statusCfg.bg, color: statusCfg.color, fontSize: 10, fontWeight: 700 }}>
                {statusCfg.icon} {statusCfg.label}
              </div>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", padding: 0 }}>
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT ───────────────────────────────────────────────────── */}
        <div style={{ padding: "16px 16px 0" }}>

          {/* ── TAB: PONTO ─────────────────────────────────────────────── */}
          {tab === "ponto" && (
            <div>
              {/* Big punch button */}
              <div style={{ ...cardStyle, textAlign: "center", padding: "28px 16px" }}>
                {punchFeedback && (
                  <div className="fade-pop" style={{ fontSize: 13, fontWeight: 700, color: punchFeedback === "in" ? "#00ffae" : "#f87171", marginBottom: 12 }}>
                    {punchFeedback === "in" ? "✅ Entrada registrada!" : "🏁 Saída registrada!"}
                  </div>
                )}
                <button
                  className="punch-btn"
                  onClick={handlePunch}
                  disabled={punchLoading}
                  style={{
                    width: 140, height: 140, borderRadius: "50%",
                    border: `3px solid ${isOpen ? "#f87171" : "#00ffae"}`,
                    background: isOpen ? "rgba(248,113,113,0.1)" : "rgba(0,255,174,0.1)",
                    color: isOpen ? "#f87171" : "#00ffae",
                    fontSize: 15, fontWeight: 900, cursor: punchLoading ? "not-allowed" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    margin: "0 auto",
                    opacity: punchLoading ? 0.6 : 1,
                    boxShadow: isOpen
                      ? "0 0 30px rgba(248,113,113,0.15), 0 0 0 8px rgba(248,113,113,0.05)"
                      : "0 0 30px rgba(0,255,174,0.15), 0 0 0 8px rgba(0,255,174,0.05)",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{isOpen ? "⏹" : "▶"}</span>
                  <span>{punchLoading ? "..." : isOpen ? "SAÍDA" : "ENTRADA"}</span>
                </button>
                <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  {isOpen && lastEntry
                    ? `Entrada às ${formatTime(lastEntry.timestamp)}`
                    : "Toque para registrar entrada"}
                </div>
              </div>

              {/* Weekly summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ ...cardStyle, marginBottom: 0, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#00ffae" }}>{msToHM(weekMs)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Esta semana</div>
                </div>
                <div style={{ ...cardStyle, marginBottom: 0, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{msToHM(calcWorkedMs(todayEntries))}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Hoje</div>
                </div>
              </div>

              {/* Day history */}
              {dayKeys.length > 0 && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Últimos 7 dias
                  </div>
                  {dayKeys.map(day => {
                    const dayEs = dayHistory[day].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                    const clockIn = dayEs.find(e => e.type === "clock_in");
                    const clockOut = [...dayEs].reverse().find(e => e.type === "clock_out");
                    const worked = calcWorkedMs(dayEs);
                    const isToday = day === todayStr;
                    return (
                      <div key={day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#00ffae" : "#fff" }}>
                            {isToday ? "Hoje" : formatDate(day + "T12:00:00")}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {clockIn ? formatTime(clockIn.timestamp) : "—"}
                            {" → "}
                            {clockOut ? formatTime(clockOut.timestamp) : (isToday && clockIn ? "agora" : "—")}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: worked > 0 ? "#60a5fa" : "rgba(255,255,255,0.2)" }}>
                          {worked > 0 ? msToHM(worked) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: STATUS ────────────────────────────────────────────── */}
          {tab === "status" && (
            <div>
              {/* Current status display */}
              <div style={{ ...cardStyle, textAlign: "center", padding: "28px 16px" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{statusCfg.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: statusCfg.color, marginBottom: 4 }}>
                  {statusCfg.label}
                </div>
              </div>

              {/* Quick change buttons */}
              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Alterar status
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const isActive = (employee.current_status ?? "off") === key;
                    return (
                      <button
                        key={key}
                        className="status-pill"
                        onClick={() => changeStatus(key)}
                        disabled={statusLoading}
                        style={{
                          padding: "12px 10px", borderRadius: 12, border: `1px solid ${isActive ? cfg.color + "40" : "rgba(255,255,255,0.06)"}`,
                          background: isActive ? cfg.bg : "rgba(255,255,255,0.02)",
                          color: isActive ? cfg.color : "rgba(255,255,255,0.5)",
                          fontSize: 13, fontWeight: 700, cursor: statusLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                          opacity: statusLoading && !isActive ? 0.5 : 1,
                        }}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                        {isActive && <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.7 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: DADOS ─────────────────────────────────────────────── */}
          {tab === "dados" && (
            <div>
              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Meus dados
                </div>
                {[
                  { label: "Nome",           value: employee.name },
                  { label: "Cargo",          value: ROLES[employee.role] ?? employee.role },
                  { label: "Categoria",      value: employee.category_name },
                  { label: "Equipe",         value: employee.team },
                  { label: "CPF",            value: employee.cpf_masked },
                  { label: "Empresa",        value: employee.unit_name },
                ].filter(row => row.value).map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: "#fff", fontWeight: 700, textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {(employee.work_days?.length || employee.shift_start) && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Escala
                  </div>
                  {employee.work_days && employee.work_days.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Dias de trabalho</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map(d => {
                          const active = employee.work_days!.includes(d);
                          return (
                            <div key={d} style={{
                              padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: active ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.03)",
                              color: active ? "#00ffae" : "rgba(255,255,255,0.2)",
                            }}>{DAYS_PT[d]}</div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {employee.shift_start && employee.shift_end && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Entrada</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#00ffae" }}>{employee.shift_start.slice(0, 5)}</div>
                      </div>
                      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.15)", alignSelf: "center" }}>→</div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Saída</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#f87171" }}>{employee.shift_end.slice(0, 5)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: AVALIAÇÕES ────────────────────────────────────────── */}
          {tab === "avaliacoes" && (
            <div>
              {ratings.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "48px 16px" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Nenhuma avaliação ainda</div>
                </div>
              ) : (
                <>
                  <div style={{ ...cardStyle, textAlign: "center" }}>
                    <div style={{ fontSize: 40, fontWeight: 900, color: "#fbbf24" }}>
                      {avgRating?.toFixed(1) ?? "—"}
                    </div>
                    {avgRating && <StarRating value={avgRating} />}
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
                      {ratings.length} avaliação{ratings.length !== 1 ? "ões" : ""}
                    </div>
                  </div>
                  <div style={cardStyle}>
                    {ratings.map(r => (
                      <div key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <StarRating value={r.rating} />
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                        {r.comment && (
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                            "{r.comment}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "rgba(10,10,10,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        display: "flex", zIndex: 100,
      }}>
        {([
          { key: "ponto",      icon: "⏱",  label: "Ponto" },
          { key: "status",     icon: "🔵",  label: "Status" },
          { key: "dados",      icon: "👤",  label: "Dados" },
          { key: "avaliacoes", icon: "⭐",  label: "Avaliações" },
        ] as { key: Tab; icon: string; label: string }[]).map(({ key, icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={tabBtnStyle(tab === key)}>
            <span style={{ fontSize: 20 }}>{key === "status" ? statusCfg.icon : icon}</span>
            <span>{label}</span>
            {tab === key && (
              <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: 2, background: "#00ffae" }} />
            )}
          </button>
        ))}
      </div>
    </>
  );
}
