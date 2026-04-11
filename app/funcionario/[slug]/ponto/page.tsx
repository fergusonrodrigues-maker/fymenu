"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function PontoFuncionarioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [status, setStatus] = useState<string>("off");
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [workedToday, setWorkedToday] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animatingBtn, setAnimatingBtn] = useState<string | null>(null);

  // Relógio ao vivo
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer de horas trabalhadas (atualiza a cada 10s)
  useEffect(() => {
    if (status !== "working") return;
    const interval = setInterval(() => recalcWorked(), 10000);
    return () => clearInterval(interval);
  }, [status, todayEntries]);

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    if (!empId) { router.push("/funcionario/login"); return; }

    async function load() {
      const { data: emp } = await supabase.from("employees")
        .select("id, name, role, team, current_status, last_clock_in, shift_start, shift_end, unit_id")
        .eq("id", empId!)
        .single();

      if (!emp) { router.push("/funcionario/login"); return; }
      setEmployee(emp);
      setStatus(emp.current_status || "off");
      if (emp.last_clock_in) setClockInTime(emp.last_clock_in);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: entries } = await supabase.from("time_entries")
        .select("*")
        .eq("employee_id", empId)
        .gte("timestamp", todayStart.toISOString())
        .order("timestamp", { ascending: true });

      if (entries) setTodayEntries(entries);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => { recalcWorked(); }, [todayEntries]);

  function recalcWorked() {
    let totalMs = 0;
    let lastClockIn: Date | null = null;

    for (const e of todayEntries) {
      const ts = new Date(e.timestamp);
      if (e.type === "clock_in") { lastClockIn = ts; }
      else if (e.type === "break_start" || e.type === "lunch_start") {
        if (lastClockIn) { totalMs += ts.getTime() - lastClockIn.getTime(); lastClockIn = null; }
      }
      else if (e.type === "break_end" || e.type === "lunch_end") { lastClockIn = ts; }
      else if (e.type === "clock_out") {
        if (lastClockIn) { totalMs += ts.getTime() - lastClockIn.getTime(); lastClockIn = null; }
      }
    }
    if (lastClockIn && status === "working") { totalMs += Date.now() - lastClockIn.getTime(); }
    setWorkedToday(totalMs);
  }

  async function handlePonto(type: string, nextStatus: string) {
    if (!employee) return;
    setAnimatingBtn(type);

    if (navigator.vibrate) navigator.vibrate(100);

    const prevStatus = status;
    setStatus(nextStatus);

    const now = new Date().toISOString();
    const entry = { employee_id: employee.id, unit_id: employee.unit_id, type, timestamp: now };

    const { error } = await supabase.from("time_entries").insert(entry);
    if (error) { console.error(error); setStatus(prevStatus); setAnimatingBtn(null); return; }

    const updatePayload: any = { current_status: nextStatus };
    if (type === "clock_in") updatePayload.last_clock_in = now;
    await supabase.from("employees").update(updatePayload).eq("id", employee.id);

    setTodayEntries(prev => [...prev, { ...entry, id: crypto.randomUUID(), created_at: now }]);
    if (type === "clock_in") setClockInTime(now);

    setTimeout(() => setAnimatingBtn(null), 600);
  }

  function formatHours(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  const STATUS_MAP: Record<string, {
    label: string; color: string; glow: string;
    actions: { type: string; label: string; icon: string; next: string; color: string }[];
  }> = {
    off: {
      label: "Fora", color: "rgba(255,255,255,0.2)", glow: "transparent",
      actions: [{ type: "clock_in", label: "Iniciar turno", icon: "▶", next: "working", color: "#00ffae" }],
    },
    working: {
      label: "Trabalhando", color: "#00ffae", glow: "rgba(0,255,174,0.15)",
      actions: [
        { type: "break_start", label: "Descanso", icon: "☕", next: "break", color: "#fbbf24" },
        { type: "lunch_start", label: "Almoço", icon: "🍽️", next: "lunch", color: "#60a5fa" },
        { type: "clock_out", label: "Encerrar turno", icon: "⏹", next: "off", color: "#f87171" },
      ],
    },
    break: {
      label: "Descanso", color: "#fbbf24", glow: "rgba(251,191,36,0.12)",
      actions: [{ type: "break_end", label: "Retornar", icon: "▶", next: "working", color: "#00ffae" }],
    },
    lunch: {
      label: "Almoço", color: "#60a5fa", glow: "rgba(96,165,250,0.12)",
      actions: [{ type: "lunch_end", label: "Retornar", icon: "▶", next: "working", color: "#00ffae" }],
    },
  };

  const currentConfig = STATUS_MAP[status] || STATUS_MAP.off;

  let targetMs = 8 * 3600000;
  if (employee?.shift_start && employee?.shift_end) {
    const [sh, sm] = employee.shift_start.split(":").map(Number);
    const [eh, em] = employee.shift_end.split(":").map(Number);
    targetMs = ((eh * 60 + em) - (sh * 60 + sm) - 60) * 60000;
    if (targetMs <= 0) targetMs = 8 * 3600000;
  }
  const progressPct = Math.min((workedToday / targetMs) * 100, 100);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 32 }}>⏱️</div>
    </div>
  );

  if (!employee) return null;

  const TYPE_LABEL: Record<string, { label: string; icon: string; color: string }> = {
    clock_in:    { label: "Entrada",  icon: "▶️", color: "#00ffae" },
    clock_out:   { label: "Saída",    icon: "⏹",  color: "#f87171" },
    break_start: { label: "Descanso", icon: "☕", color: "#fbbf24" },
    break_end:   { label: "Retorno",  icon: "▶️", color: "#00ffae" },
    lunch_start: { label: "Almoço",   icon: "🍽️", color: "#60a5fa" },
    lunch_end:   { label: "Retorno",  icon: "▶️", color: "#00ffae" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", padding: "20px 16px", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <style>{`
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px var(--glow-color, transparent); } 50% { box-shadow: 0 0 40px var(--glow-color, transparent); } }
        @keyframes slideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes btnPress { 0% { transform: scale(1); } 50% { transform: scale(0.94); } 100% { transform: scale(1); } }
        @keyframes fadeInEntry { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .ponto-btn { transition: opacity 0.2s ease, background 0.2s ease; }
        .ponto-btn:active { transform: scale(0.96); }
      `}</style>

      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.3)",
            fontSize: 13, cursor: "pointer", padding: 0,
          }}>← Voltar</button>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{employee.role} · {employee.team || "geral"}</div>
        </div>

        {/* Relógio grande */}
        <div style={{ textAlign: "center", marginBottom: 8, animation: "slideUp 0.4s ease" }}>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2, color: "#fff" }}>
            {formatTime(currentTime)}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            {currentTime.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "scaleIn 0.3s ease" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 20px", borderRadius: 20,
            background: `${currentConfig.color}12`,
            border: `1px solid ${currentConfig.color}30`,
            ...(status === "working" ? {
              animation: "pulseGlow 2s infinite",
              ["--glow-color" as any]: currentConfig.glow,
            } : {}),
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: currentConfig.color,
              boxShadow: `0 0 8px ${currentConfig.color}`,
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: currentConfig.color }}>{currentConfig.label}</span>
          </div>
        </div>

        {/* Horas trabalhadas + barra */}
        <div style={{
          padding: "20px 24px", borderRadius: 20,
          background: "rgba(255,255,255,0.03)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
          marginBottom: 20, animation: "slideUp 0.5s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{formatHours(workedToday)}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>trabalhadas hoje</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{formatHours(targetMs)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>meta</div>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${progressPct}%`,
              background: progressPct >= 100
                ? "#00ffae"
                : progressPct > 75
                  ? "linear-gradient(90deg, #00ffae, #00d9ff)"
                  : "rgba(255,255,255,0.15)",
              transition: "width 1s ease",
              boxShadow: progressPct >= 100 ? "0 0 12px rgba(0,255,174,0.4)" : "none",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6, textAlign: "right" }}>
            {progressPct.toFixed(0)}%
          </div>
        </div>

        {/* Botões de ação */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, animation: "slideUp 0.6s ease" }}>
          {currentConfig.actions.map(action => (
            <button
              key={action.type}
              className="ponto-btn"
              onClick={() => handlePonto(action.type, action.next)}
              disabled={animatingBtn !== null}
              style={{
                width: "100%", padding: "18px 20px", borderRadius: 16,
                border: "none", cursor: animatingBtn !== null ? "not-allowed" : "pointer",
                background: action.type === "clock_in"
                  ? "linear-gradient(135deg, rgba(0,255,174,0.12), rgba(0,217,255,0.08))"
                  : action.type === "clock_out"
                    ? "rgba(248,113,113,0.08)"
                    : `${action.color}10`,
                color: action.color,
                fontSize: action.type === "clock_in" || action.type === "clock_out" ? 16 : 14,
                fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: action.type === "clock_in"
                  ? "0 1px 0 rgba(0,255,174,0.1) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 4px 20px rgba(0,255,174,0.1)"
                  : "0 1px 0 rgba(255,255,255,0.03) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                animation: animatingBtn === action.type ? "btnPress 0.3s ease" : "none",
                opacity: animatingBtn !== null && animatingBtn !== action.type ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: action.type === "clock_in" || action.type === "clock_out" ? 20 : 16 }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Timeline do dia */}
        <div style={{ animation: "slideUp 0.7s ease" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Hoje</div>

          {todayEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.15)", fontSize: 12 }}>
              Nenhum registro hoje
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 20 }}>
              <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 1, background: "rgba(255,255,255,0.06)" }} />

              {todayEntries.map((entry, i) => {
                const tc = TYPE_LABEL[entry.type] || { label: entry.type, icon: "📌", color: "rgba(255,255,255,0.3)" };
                return (
                  <div key={entry.id || i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    marginBottom: 12, position: "relative",
                    animation: `fadeInEntry 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{
                      position: "absolute", left: -17, width: 10, height: 10,
                      borderRadius: "50%", background: tc.color,
                      boxShadow: `0 0 6px ${tc.color}50`,
                    }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ fontSize: 14 }}>{tc.icon}</span>
                      <span style={{ color: tc.color, fontSize: 12, fontWeight: 700 }}>{tc.label}</span>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {new Date(entry.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
