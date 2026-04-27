"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, ChevronRight, Clock, Timer, UtensilsCrossed, Receipt, Bell } from "lucide-react";
import { getRoleLabel } from "@/app/colaborador-app/roleUtils";
import { listMyTasks } from "@/app/colaborador-app/tarefasActions";
import { getEmployeeSchedule, type EmployeeSchedule } from "@/app/colaborador-app/actions";
import { getCurrentPointStatus, type PointStateResult } from "../ponto/actions";
import { getAtendimentoCounts, type AtendimentoCounts } from "@/app/colaborador-app/atendimentoActions";
import BottomNav from "../_components/BottomNav";

const WAITER_ROLES = new Set(["waiter", "manager"]);

const WORK_DAY_LABELS: Record<string, string> = {
  mon: "Seg", monday:    "Seg", "1": "Seg",
  tue: "Ter", tuesday:   "Ter", "2": "Ter",
  wed: "Qua", wednesday: "Qua", "3": "Qua",
  thu: "Qui", thursday:  "Qui", "4": "Qui",
  fri: "Sex", friday:    "Sex", "5": "Sex",
  sat: "Sáb", saturday:  "Sáb", "6": "Sáb",
  sun: "Dom", sunday:    "Dom", "0": "Dom", "7": "Dom",
};

function formatWorkDays(days: string[] | null | undefined): string {
  if (!days || days.length === 0) return "—";
  if (days.length === 7) return "Todos os dias";
  return days
    .map((d) => WORK_DAY_LABELS[String(d).toLowerCase()] ?? String(d))
    .join(", ");
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

function pointStatusLabel(state: PointStateResult | null): string {
  if (!state) return "Carregando…";
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
  switch (state.status) {
    case "off":      return "Bater ponto";
    case "working":  return `Trabalhando desde ${fmt(state.clockInAt)}`;
    case "on_break": return "Em pausa";
    case "on_lunch": return "Em almoço";
    case "ended":    return `Encerrou às ${fmt(state.clockOutAt)}`;
  }
}

interface Props {
  slug: string;
}

export default function ColaboradorHomeClient({ slug }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<EmployeeSchedule | null>(null);
  const [pointState, setPointState] = useState<PointStateResult | null>(null);
  const [atendimento, setAtendimento] = useState<AtendimentoCounts | null>(null);

  const isWaiter = roles.some((r) => WAITER_ROLES.has(r));

  useEffect(() => {
    try {
      setName(sessionStorage.getItem("fy_emp_name") ?? "");
      const raw = sessionStorage.getItem("fy_emp_roles");
      setRoles(raw ? JSON.parse(raw) : []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = sessionStorage.getItem("fy_emp_token") ?? "";
        if (!token) return;
        const [tasks, sched, point, atend] = await Promise.all([
          listMyTasks(token),
          getEmployeeSchedule(token),
          getCurrentPointStatus(token).catch(() => null),
          getAtendimentoCounts(token).catch(() => null),
        ]);
        if (cancelled) return;
        setPendingCount(tasks.hoje.length + tasks.atrasadas.length);
        setSchedule(sched);
        setPointState(point);
        setAtendimento(atend);
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const roleLabels = roles.map(getRoleLabel).join(", ") || "—";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
          Portal do Colaborador
        </span>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px" }}>
        {/* Minhas Tarefas card — destacado */}
        <button
          onClick={() => router.push("/colaborador/tarefas")}
          style={{
            width: "100%", textAlign: "left",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 18,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 1px 3px rgba(22,163,74,0.08)",
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#16a34a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <ListChecks size={26} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Minhas tarefas
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
              {pendingCount === null
                ? "Carregando…"
                : pendingCount === 0
                  ? "Tudo em dia! 🎉"
                  : `Você tem ${pendingCount} tarefa${pendingCount !== 1 ? "s" : ""} pendente${pendingCount !== 1 ? "s" : ""} hoje`}
            </div>
          </div>
          <ChevronRight size={20} color="#16a34a" style={{ flexShrink: 0 }} />
        </button>

        {/* Atendimento cards (waiter/manager only) */}
        {isWaiter && (
          <>
            {/* Mesas */}
            <button
              onClick={() => router.push("/colaborador/mesas")}
              style={atendimentoCardStyle}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "#f97316", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, position: "relative",
              }}>
                <UtensilsCrossed size={24} strokeWidth={2.2} />
                {atendimento && atendimento.callsPending > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#dc2626", color: "#fff",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(220,38,38,0.4)",
                  }}>{atendimento.callsPending}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  Mesas do Salão
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                  {atendimento === null
                    ? "Carregando…"
                    : `${atendimento.mesasOccupied} ocupada${atendimento.mesasOccupied !== 1 ? "s" : ""}`}
                </div>
                {atendimento && atendimento.callsPending > 0 && (
                  <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Bell size={11} /> {atendimento.callsPending} chamada{atendimento.callsPending !== 1 ? "s" : ""} pendente{atendimento.callsPending !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <ChevronRight size={20} color="#9ca3af" style={{ flexShrink: 0 }} />
            </button>

            {/* Comandas */}
            <button
              onClick={() => router.push("/colaborador/comandas")}
              style={atendimentoCardStyle}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "#16a34a", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Receipt size={24} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  Comandas Abertas
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                  {atendimento === null
                    ? "Carregando…"
                    : `${atendimento.comandasOpen} em aberto`}
                </div>
              </div>
              <ChevronRight size={20} color="#9ca3af" style={{ flexShrink: 0 }} />
            </button>
          </>
        )}

        {/* Ponto card */}
        <button
          onClick={() => router.push("/colaborador/ponto")}
          style={{
            width: "100%", textAlign: "left",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 18,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#111827", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Timer size={24} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Ponto
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
              {pointStatusLabel(pointState)}
            </div>
          </div>
          <ChevronRight size={20} color="#9ca3af" style={{ flexShrink: 0 }} />
        </button>

        {/* Welcome card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "24px 22px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>👋</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
            Bem-vindo{name ? `, ${name}` : ""}!
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Você está logado no portal do colaborador.
          </p>
        </div>

        {/* Meu Horário card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "20px 22px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Clock size={16} color="#6b7280" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Meu Horário
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <ScheduleCell label="Entrada" value={formatTime(schedule?.shift_start)} />
            <ScheduleCell label="Saída"   value={formatTime(schedule?.shift_end)} />
            <ScheduleCell
              label="Almoço"
              value={
                schedule?.lunch_start || schedule?.lunch_end
                  ? `${formatTime(schedule?.lunch_start)} – ${formatTime(schedule?.lunch_end)}`
                  : "—"
              }
            />
            <ScheduleCell label="Dias" value={formatWorkDays(schedule?.work_days)} />
          </div>
        </div>

        {/* Roles card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "20px 22px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Suas funções
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {roles.length > 0 ? roles.map((role) => (
              <span
                key={role}
                style={{
                  background: "#f0fdf4", color: "#16a34a",
                  border: "1px solid #bbf7d0",
                  borderRadius: 20, padding: "5px 12px",
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {getRoleLabel(role)}
              </span>
            )) : (
              <span style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma função atribuída</span>
            )}
          </div>
        </div>
      </main>

      <BottomNav active="home" pendingCount={pendingCount ?? 0} />
    </div>
  );
}

const atendimentoCardStyle: React.CSSProperties = {
  width: "100%", textAlign: "left",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: "16px 18px",
  marginBottom: 18,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex", alignItems: "center", gap: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

function ScheduleCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}
