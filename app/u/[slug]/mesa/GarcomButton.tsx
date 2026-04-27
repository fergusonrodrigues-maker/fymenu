"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X, Utensils, HelpCircle, Receipt } from "lucide-react";
import { createTableCall } from "@/app/u/[slug]/actions";

const COOLDOWN_SEC = 30;

const REASONS = [
  { id: "order",      Icon: Utensils,    label: "Fazer pedido"  },
  { id: "question",   Icon: HelpCircle,  label: "Tirar dúvida"  },
  { id: "close_bill", Icon: Receipt,     label: "Fechar conta"  },
] as const;

interface Props {
  unitId: string;
}

export default function GarcomButton({ unitId }: Props) {
  const [modalOpen,   setModalOpen]   = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [reason,      setReason]      = useState<string | null>(null);
  const [calling,     setCalling]     = useState(false);
  const [cooldown,    setCooldown]    = useState(0);
  const [showBadge,   setShowBadge]   = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [btnHover,    setBtnHover]    = useState(false);
  const tableInputRef = useRef<HTMLInputElement>(null);

  // Restore sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("fy_mesa_numero");
      if (saved) setTableNumber(saved);

      const lastAt = sessionStorage.getItem("fy_mesa_last_call_at");
      if (lastAt) {
        const elapsed = Math.floor((Date.now() - parseInt(lastAt)) / 1000);
        const remaining = COOLDOWN_SEC - elapsed;
        if (remaining > 0) {
          setCooldown(remaining);
          setShowBadge(true);
        }
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);

  // Countdown tick
  useEffect(() => {
    if (cooldown <= 0) { setShowBadge(false); return; }
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-focus table input when modal opens
  useEffect(() => {
    if (modalOpen) setTimeout(() => tableInputRef.current?.focus(), 80);
  }, [modalOpen]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleCall() {
    const num = parseInt(tableNumber, 10);
    if (!tableNumber || isNaN(num) || num < 1 || num > 999 || !reason) return;

    setCalling(true);
    try {
      await createTableCall(unitId, num, reason);

      try {
        sessionStorage.setItem("fy_mesa_numero", String(num));
        sessionStorage.setItem("fy_mesa_last_call_at", String(Date.now()));
      } catch { /* */ }

      setCooldown(COOLDOWN_SEC);
      setShowBadge(true);
      showToast("Garçom chamado! Aguarde, ele já vem.", true);
      setTimeout(() => setModalOpen(false), 1000);
    } catch (err: any) {
      showToast(err.message ?? "Erro ao chamar garçom. Tente novamente.", false);
    } finally {
      setCalling(false);
    }
  }

  const canCall =
    tableNumber.trim() !== "" &&
    parseInt(tableNumber, 10) >= 1 &&
    parseInt(tableNumber, 10) <= 999 &&
    reason !== null &&
    cooldown === 0 &&
    !calling;

  const isDisabled = cooldown > 0;

  return (
    <>
      <style>{`
        @keyframes garcomPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
      `}</style>

      {/* ── Success badge (top-right) ───────────────────────────────── */}
      {showBadge && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 100,
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 999,
          background: "#16a34a", color: "#fff",
          fontSize: 12, fontWeight: 700,
          boxShadow: "0 4px 16px rgba(22,163,74,0.3)",
          animation: "garcomPulse 2s ease infinite",
          pointerEvents: "none",
        }}>
          <Check size={14} />
          Garçom a caminho...
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 14,
          background: toast.ok ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
          border: `1px solid ${toast.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
          color: toast.ok ? "#16a34a" : "#dc2626",
          fontSize: 13, fontWeight: 700,
          zIndex: 9999, pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Floating pill button ────────────────────────────────────────── */}
      <button
        onClick={() => { if (!isDisabled) setModalOpen(true); }}
        disabled={isDisabled}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 50,
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 24px", borderRadius: 999,
          border: "none",
          background: isDisabled
            ? "#9ca3af"
            : "linear-gradient(135deg, #d51659, #fe4a2c)",
          color: "#fff",
          fontSize: 14, fontWeight: 800,
          cursor: isDisabled ? "not-allowed" : "pointer",
          boxShadow: isDisabled
            ? "0 4px 12px rgba(0,0,0,0.12)"
            : btnHover
              ? "0 12px 32px rgba(213,22,89,0.45)"
              : "0 8px 24px rgba(213,22,89,0.3)",
          transform: btnHover && !isDisabled ? "scale(1.05)" : "scale(1)",
          transition: "all 0.25s",
        }}
      >
        <Bell size={18} />
        {isDisabled ? `Aguarde... (${cooldown}s)` : "Chamar garçom"}
      </button>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{
            background: "#fff", borderRadius: 20,
            padding: 28, maxWidth: 400, width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>
                  Chamar garçom
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Informe sua mesa e o que você precisa
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  background: "#f3f4f6", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#6b7280", flexShrink: 0, marginLeft: 12,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Table number */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 700, color: "#374151",
                textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8,
              }}>
                Número da mesa
              </label>
              <input
                ref={tableInputRef}
                type="number"
                min={1}
                max={999}
                placeholder="Ex: 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid #e5e7eb",
                  fontSize: 16, color: "#111827", outline: "none",
                  boxSizing: "border-box", fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Reason selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 700, color: "#374151",
                textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10,
              }}>
                O que você precisa?
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {REASONS.map(({ id, Icon, label }) => {
                  const sel = reason === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setReason(id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", borderRadius: 12,
                        border: `1.5px solid ${sel ? "#16a34a" : "#e5e7eb"}`,
                        background: sel ? "#f0fdf4" : "#fff",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={18} color={sel ? "#16a34a" : "#9ca3af"} />
                      <span style={{
                        fontSize: 14,
                        fontWeight: sel ? 700 : 500,
                        color: sel ? "#16a34a" : "#374151",
                      }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  flex: 1, padding: "13px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", background: "#fff",
                  color: "#374151", fontSize: 14, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCall}
                disabled={!canCall}
                style={{
                  flex: 2, padding: "13px", borderRadius: 10, border: "none",
                  background: canCall ? "#16a34a" : "#e5e7eb",
                  color: canCall ? "#fff" : "#9ca3af",
                  fontSize: 14, fontWeight: 700,
                  cursor: canCall ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                {calling ? "Chamando…" : "Chamar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
