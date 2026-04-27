"use client";

import React, { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import {
  acknowledgeTableCall, resolveTableCall,
  type TableCallSummary,
} from "@/app/colaborador-app/atendimentoActions";

const REASON_LABELS: Record<string, string> = {
  order:      "Quer fazer pedido",
  question:   "Quer tirar dúvida",
  close_bill: "Quer fechar a conta",
  waiter:     "Chamou garçom",
  manager:    "Chamou gerente",
};

function fmtElapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  return `há ${hrs}h${mins % 60 ? ` ${mins % 60}min` : ""}`;
}

export type TableCallModalProps = {
  open: boolean;
  onClose: () => void;
  onResolved: (callId: string) => void;
  mesaNumber: number;
  call: TableCallSummary;
};

export default function TableCallModal({
  open, onClose, onResolved, mesaNumber, call,
}: TableCallModalProps) {
  const [submitting, setSubmitting] = useState<"acknowledge" | "resolve" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const reasonLabel = call.type ? (REASON_LABELS[call.type] ?? call.type) : "Chamada";
  const isAcknowledged = call.status === "acknowledged";

  async function handle(action: "acknowledge" | "resolve") {
    setSubmitting(action);
    setErr(null);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const result = action === "acknowledge"
        ? await acknowledgeTableCall(token, call.id)
        : await resolveTableCall(token, call.id);
      if (!result.ok) {
        setErr(result.error);
        setSubmitting(null);
        return;
      }
      onResolved(call.id);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao atualizar chamada.");
      setSubmitting(null);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        animation: "slideUp 0.22s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        <div style={{ padding: "8px 22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: isAcknowledged ? "#fed7aa" : "#fee2e2",
              color: isAcknowledged ? "#9a3412" : "#dc2626",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: isAcknowledged ? "none" : "callPulseModal 1.4s ease-in-out infinite",
            }}>
              <Bell size={22} strokeWidth={2.5} />
              <style>{`@keyframes callPulseModal { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Chamada da Mesa
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", lineHeight: 1 }}>
                Mesa {mesaNumber}
              </div>
            </div>
            <button onClick={onClose} disabled={!!submitting} aria-label="Fechar"
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer" }}>
              <X size={16} color="#6b7280" />
            </button>
          </div>

          <div style={{
            background: isAcknowledged ? "#fff7ed" : "#fef2f2",
            border: `1px solid ${isAcknowledged ? "#fed7aa" : "#fca5a5"}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: isAcknowledged ? "#9a3412" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              Motivo
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{reasonLabel}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              {isAcknowledged ? "Em atendimento · " : ""}{fmtElapsed(call.created_at)}
            </div>
          </div>

          {err && (
            <div role="alert" style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: "#fee2e2", border: "1px solid #fca5a5",
              color: "#991b1b", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span aria-hidden="true">⚠</span><span>{err}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            {!isAcknowledged && (
              <button
                onClick={() => handle("acknowledge")}
                disabled={!!submitting}
                style={{
                  flex: 1, padding: "13px", borderRadius: 12,
                  border: "1px solid #f97316", background: "#fff7ed",
                  color: "#9a3412", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {submitting === "acknowledge" ? "Atendendo…" : "Atender"}
              </button>
            )}
            <button
              onClick={() => handle("resolve")}
              disabled={!!submitting}
              style={{
                flex: isAcknowledged ? 1 : 1, padding: "13px", borderRadius: 12,
                border: "none",
                background: submitting ? "#9ca3af" : "#16a34a",
                color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
              }}
            >
              <Check size={16} strokeWidth={3} />
              {submitting === "resolve" ? "Resolvendo…" : "Resolver"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
