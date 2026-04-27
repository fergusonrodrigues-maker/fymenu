"use client";

import React, { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import {
  createComanda, listAvailableMesas,
  type AvailableMesa,
} from "@/app/colaborador-app/atendimentoActions";

type Source = "mesa" | "balcao";

export type OpenComandaModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (comandaId: string) => void;
  unitRequiresPhone?: boolean;
  preselectedMesaId?: string;
  preselectedMesaNumber?: number;
};

function formatPhone(raw: string): string {
  const v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  return v;
}

export default function OpenComandaModal({
  open, onClose, onSuccess,
  unitRequiresPhone = false,
  preselectedMesaId,
  preselectedMesaNumber,
}: OpenComandaModalProps) {
  const [source, setSource] = useState<Source>(preselectedMesaId ? "mesa" : "mesa");
  const [mesaId, setMesaId] = useState<string>(preselectedMesaId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState("2");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mesas, setMesas] = useState<AvailableMesa[]>([]);
  const [loadingMesas, setLoadingMesas] = useState(false);

  // Load mesas when modal opens (only needed if no preselected mesa)
  useEffect(() => {
    if (!open) return;
    setSource(preselectedMesaId ? "mesa" : "mesa");
    setMesaId(preselectedMesaId ?? "");
    setName(""); setPhone(""); setGuestCount("2"); setNotes("");
    setErr(null);

    if (!preselectedMesaId) {
      setLoadingMesas(true);
      try {
        const token = sessionStorage.getItem("fy_emp_token") ?? "";
        listAvailableMesas(token)
          .then((data) => setMesas(data))
          .catch(() => setMesas([]))
          .finally(() => setLoadingMesas(false));
      } catch {
        setLoadingMesas(false);
      }
    }
  }, [open, preselectedMesaId]);

  if (!open) return null;

  const phoneRequired = source === "mesa" && unitRequiresPhone;

  async function handleSubmit() {
    setErr(null);
    if (name.trim().length < 2) {
      setErr("Informe o nome do cliente (mínimo 2 caracteres).");
      return;
    }
    if (source === "mesa" && !mesaId) {
      setErr("Selecione uma mesa.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneRequired && phoneDigits.length < 8) {
      setErr("Telefone obrigatório nesta unidade (mínimo 8 dígitos).");
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const result = await createComanda(token, {
        source,
        mesaId: source === "mesa" ? mesaId : undefined,
        customerName: name,
        customerPhone: phone,
        guestCount: source === "mesa" ? (parseInt(guestCount) || undefined) : undefined,
        notes,
      });
      if (!result.ok) {
        setErr(result.error);
        setSubmitting(false);
        return;
      }
      onSuccess(result.id);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao abrir comanda");
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        maxHeight: "92vh", overflowY: "auto",
        animation: "slideUp 0.22s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        <div style={{ padding: "8px 22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
              {preselectedMesaNumber ? `Abrir comanda — Mesa ${preselectedMesaNumber}` : "Nova comanda"}
            </div>
            <button onClick={onClose} disabled={submitting} style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid #e5e7eb", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: submitting ? "not-allowed" : "pointer",
            }}>
              <X size={16} color="#6b7280" />
            </button>
          </div>

          {/* Tipo */}
          {!preselectedMesaId && (
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Tipo</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSource("mesa")}
                  style={typeBtn(source === "mesa")}
                >
                  🍽️ Mesa
                </button>
                <button
                  type="button"
                  onClick={() => setSource("balcao")}
                  style={typeBtn(source === "balcao")}
                >
                  🪑 Balcão
                </button>
              </div>
            </div>
          )}

          {/* Mesa dropdown */}
          {source === "mesa" && !preselectedMesaId && (
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Mesa *</label>
              <select
                value={mesaId}
                onChange={(e) => setMesaId(e.target.value)}
                style={input}
                disabled={loadingMesas}
              >
                <option value="">{loadingMesas ? "Carregando..." : "Selecione uma mesa livre"}</option>
                {mesas.map((m) => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.number}{m.label ? ` — ${m.label}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nome */}
          <div style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>Nome do cliente *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (err) setErr(null); }}
              placeholder="Ex: João Silva"
              style={input}
              autoFocus
            />
          </div>

          {/* Telefone */}
          <div style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>
              Telefone {phoneRequired ? "*" : <span style={{ color: "#9ca3af", fontWeight: 500 }}>(opcional)</span>}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(62) 9XXXX-XXXX"
              inputMode="tel"
              style={input}
            />
          </div>

          {/* Pessoas */}
          {source === "mesa" && (
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Quantidade de pessoas</label>
              <input
                type="number"
                min={1}
                max={20}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                style={input}
              />
            </div>
          )}

          {/* Observações */}
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              placeholder="Algum detalhe que o garçom/cozinha precisa saber?"
              rows={2}
              style={{ ...input, resize: "none" }}
            />
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
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1, padding: "13px", borderRadius: 12,
                border: "1px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || name.trim().length < 2}
              style={{
                flex: 2, padding: "13px", borderRadius: 12,
                border: "none",
                background: submitting || name.trim().length < 2 ? "#9ca3af" : "#16a34a",
                color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                cursor: submitting || name.trim().length < 2 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
              }}
            >
              <Check size={16} strokeWidth={3} />
              {submitting ? "Abrindo..." : "Abrir comanda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "#6b7280", marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: 10,
  border: "1px solid #e5e7eb", background: "#fff",
  color: "#111827", fontSize: 14, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box",
};

function typeBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: "12px", borderRadius: 12,
    border: active ? "2px solid #16a34a" : "1px solid #e5e7eb",
    background: active ? "#f0fdf4" : "#fff",
    color: active ? "#15803d" : "#374151",
    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
    cursor: "pointer",
  };
}
