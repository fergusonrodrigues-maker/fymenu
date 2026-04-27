"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Coffee, UtensilsCrossed, Pause, Square, Check, X } from "lucide-react";
import {
  getCurrentPointStatus, registerTimeEntry,
  type PointType, type PointStatus, type PointStateResult,
} from "./actions";
import BottomNav from "../_components/BottomNav";

const ACTION_LABELS: Record<PointType, string> = {
  clock_in:    "Bater Ponto (Entrada)",
  lunch_start: "Iniciar Almoço",
  lunch_end:   "Encerrar Almoço",
  break_start: "Iniciar Pausa",
  break_end:   "Encerrar Pausa",
  clock_out:   "Encerrar Dia",
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function statusInfo(state: PointStateResult): { label: string; tone: "neutral" | "working" | "paused" | "ended" } {
  switch (state.status) {
    case "off":      return { label: "Não bateu ponto",           tone: "neutral" };
    case "working":  return { label: `Trabalhando desde ${fmtTime(state.clockInAt)}`, tone: "working" };
    case "on_break": return { label: `Em pausa desde ${fmtTime(state.lastEntry?.timestamp ?? null)}`, tone: "paused" };
    case "on_lunch": return { label: `Em almoço desde ${fmtTime(state.lastEntry?.timestamp ?? null)}`, tone: "paused" };
    case "ended":    return { label: `Encerrou às ${fmtTime(state.clockOutAt)}`, tone: "ended" };
  }
}

export default function PontoClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<PointStateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PointType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  const tokenRef = useRef<string>("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      let token = "";
      try { token = sessionStorage.getItem("fy_emp_token") ?? ""; } catch { /* */ }
      tokenRef.current = token;
      if (!token) { router.replace("/colaborador"); return; }
      const result = await getCurrentPointStatus(token);
      setState(result);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar ponto");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { reload(); }, [reload]);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleConfirm() {
    if (!confirm || submitting) return;
    setSubmitting(true);
    try {
      await registerTimeEntry(tokenRef.current, confirm);
      setConfirm(null);
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao registrar ponto");
      setConfirm(null);
    } finally {
      setSubmitting(false);
    }
  }

  const info = state ? statusInfo(state) : null;
  const toneBg = info ? ({
    neutral: "#f3f4f6", working: "#f0fdf4", paused: "#fefce8", ended: "#f3f4f6",
  })[info.tone] : "#f3f4f6";
  const toneFg = info ? ({
    neutral: "#6b7280", working: "#16a34a", paused: "#ca8a04", ended: "#6b7280",
  })[info.tone] : "#6b7280";

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <button
          onClick={() => router.push("/colaborador/home")}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: "1px solid #e5e7eb", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <ArrowLeft size={18} color="#374151" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Bater Ponto</span>
      </header>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px" }}>
        {err && (
          <div role="alert" style={{
            padding: "10px 14px", borderRadius: 8,
            background: "#fee2e2", border: "1px solid #fca5a5",
            color: "#991b1b", fontSize: 13, fontWeight: 600, marginBottom: 14,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <span aria-hidden="true">⚠</span><span>{err}</span>
          </div>
        )}

        {/* Live clock */}
        <div style={{
          background: "#111827", color: "#fff",
          borderRadius: 18, padding: "26px 20px",
          marginBottom: 14, textAlign: "center",
          boxShadow: "0 4px 20px rgba(17,24,39,0.15)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Hora atual
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1, fontVariantNumeric: "tabular-nums" }}>
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        {/* Status card */}
        <div style={{
          background: toneBg, color: toneFg,
          borderRadius: 14, padding: "16px 18px",
          marginBottom: 18, fontSize: 14, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: toneFg,
            animation: info?.tone === "working" ? "pulse 2s infinite" : "none",
          }} />
          <span>{loading ? "Carregando…" : info?.label}</span>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity: 0.4 } }`}</style>
        </div>

        {/* Action buttons */}
        {!loading && state && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {state.status === "off" && (
              <ActionButton type="clock_in" tone="green"  icon={<Play size={22} />} onClick={() => setConfirm("clock_in")} />
            )}
            {state.status === "working" && (
              <>
                <ActionButton type="lunch_start" tone="yellow" icon={<UtensilsCrossed size={22} />} onClick={() => setConfirm("lunch_start")} />
                <ActionButton type="break_start" tone="gray"   icon={<Coffee size={22} />}          onClick={() => setConfirm("break_start")} />
                <ActionButton type="clock_out"   tone="red"    icon={<Square size={22} />}          onClick={() => setConfirm("clock_out")} />
              </>
            )}
            {state.status === "on_lunch" && (
              <ActionButton type="lunch_end" tone="green" icon={<Play size={22} />} onClick={() => setConfirm("lunch_end")} />
            )}
            {state.status === "on_break" && (
              <ActionButton type="break_end" tone="green" icon={<Play size={22} />} onClick={() => setConfirm("break_end")} />
            )}
            {state.status === "ended" && (
              <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                Você já encerrou o expediente de hoje.
              </div>
            )}
          </div>
        )}

        {/* Today's entries log */}
        {!loading && state && state.entries.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "16px 18px",
            marginTop: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Registros de hoje
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {state.entries.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#374151", fontWeight: 600 }}>{TYPE_DISPLAY[e.type]}</span>
                  <span style={{ color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{fmtTime(e.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {confirm && (
        <ConfirmModal
          type={confirm}
          submitting={submitting}
          onCancel={() => !submitting && setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}

      <BottomNav active="home" />
    </div>
  );
}

const TYPE_DISPLAY: Record<PointType, string> = {
  clock_in:    "Entrada",
  lunch_start: "Início do almoço",
  lunch_end:   "Fim do almoço",
  break_start: "Início da pausa",
  break_end:   "Fim da pausa",
  clock_out:   "Saída",
};

// ── Sub-components ──────────────────────────────────────────────────────────

function ActionButton({
  type, tone, icon, onClick,
}: {
  type: PointType;
  tone: "green" | "yellow" | "gray" | "red";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const palette = {
    green:  { bg: "#16a34a", color: "#fff", shadow: "0 2px 6px rgba(22,163,74,0.25)" },
    yellow: { bg: "#eab308", color: "#fff", shadow: "0 2px 6px rgba(234,179,8,0.25)" },
    gray:   { bg: "#6b7280", color: "#fff", shadow: "0 2px 6px rgba(107,114,128,0.2)" },
    red:    { bg: "#dc2626", color: "#fff", shadow: "0 2px 6px rgba(220,38,38,0.25)" },
  }[tone];
  return (
    <button
      onClick={onClick}
      style={{
        height: 60, borderRadius: 14, border: "none",
        background: palette.bg, color: palette.color,
        fontSize: 16, fontWeight: 800, fontFamily: "inherit",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        boxShadow: palette.shadow,
        transition: "transform 0.1s",
      }}
      onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {icon}
      {ACTION_LABELS[type]}
    </button>
  );
}

function ConfirmModal({
  type, submitting, onCancel, onConfirm,
}: {
  type: PointType; submitting: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        animation: "slideUp 0.22s ease",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>
        <div style={{ padding: "8px 22px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Confirmar
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            {ACTION_LABELS[type]}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
            O horário será registrado como agora ({new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}).
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              disabled={submitting}
              style={{
                flex: 1, padding: "13px", borderRadius: 12,
                border: "1px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting}
              style={{
                flex: 2, padding: "13px", borderRadius: 12,
                border: "none", background: submitting ? "#9ca3af" : "#16a34a",
                color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
              }}
            >
              <Check size={16} strokeWidth={3} />
              {submitting ? "Registrando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
