"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X, Check, Plus, Banknote, CreditCard, Smartphone, Utensils } from "lucide-react";
import {
  closeComanda,
  type CloseSplit, type PaymentMethod, type CloseComandaInput,
} from "./actions";
import { formatCents as fmtBRL, parseToCents as parseBRLToCents } from "@/lib/money";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash",    label: "Dinheiro",         icon: <Banknote size={16} /> },
  { value: "credit",  label: "Cartão de crédito", icon: <CreditCard size={16} /> },
  { value: "debit",   label: "Cartão de débito",  icon: <CreditCard size={16} /> },
  { value: "pix",     label: "PIX",              icon: <Smartphone size={16} /> },
  { value: "voucher", label: "Voucher refeição",  icon: <Utensils size={16} /> },
];

type Mode = "single" | "equal" | "manual";

type SplitDraft = {
  tempId: string;
  customerName: string;
  customerPhone?: string;
  amount: number; // cents
  paymentMethod: PaymentMethod;
  cashChangeForInput?: string;
};

function newId() { return Math.random().toString(36).slice(2, 10); }

export type CloseComandaModalProps = {
  open: boolean;
  comandaId: string;
  shortCode: string | null;
  customerName: string | null;
  total: number; // cents
  onClose: () => void;
  onClosed: (splitsCreated: number, splits: CloseSplit[]) => void;
};

export default function CloseComandaModal({
  open, comandaId, shortCode, customerName, total,
  onClose, onClosed,
}: CloseComandaModalProps) {
  const [step, setStep] = useState<"mode" | "single" | "equal" | "manual">("mode");
  const [singleMethod, setSingleMethod] = useState<PaymentMethod>("pix");
  const [singleCashChange, setSingleCashChange] = useState("");

  const [equalCount, setEqualCount] = useState("2");
  const [equalSplits, setEqualSplits] = useState<SplitDraft[]>([]);

  const [manualSplits, setManualSplits] = useState<SplitDraft[]>([]);
  const [showAddSplit, setShowAddSplit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep("mode");
    setSingleMethod("pix");
    setSingleCashChange("");
    setEqualCount("2");
    setEqualSplits([]);
    setManualSplits([]);
    setShowAddSplit(false);
    setErr(null);
    setSubmitting(false);
  }, [open]);

  // Re-seed equalSplits whenever count changes in equal mode
  useEffect(() => {
    if (step !== "equal") return;
    const n = Math.max(2, Math.min(20, parseInt(equalCount) || 2));
    const each = Math.floor(total / n);
    const remainder = total - (each * n);
    setEqualSplits((prev) => {
      const next: SplitDraft[] = [];
      for (let i = 0; i < n; i++) {
        const amt = i === n - 1 ? each + remainder : each;
        const existing = prev[i];
        next.push({
          tempId: existing?.tempId ?? newId(),
          customerName: existing?.customerName ?? (i === 0 ? (customerName ?? "") : ""),
          customerPhone: existing?.customerPhone,
          amount: amt,
          paymentMethod: existing?.paymentMethod ?? "pix",
          cashChangeForInput: existing?.cashChangeForInput,
        });
      }
      return next;
    });
  }, [step, equalCount, total, customerName]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 110,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 560,
        height: "100vh", maxHeight: "100vh",
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        animation: "slideUpClose 0.22s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <style>{`@keyframes slideUpClose { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Header */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, zIndex: 5,
        }}>
          {step !== "mode" && (
            <button
              onClick={() => setStep("mode")}
              disabled={submitting}
              aria-label="Voltar"
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer" }}
            >
              <ArrowLeft size={18} color="#374151" />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
              Fechar comanda{shortCode ? ` #${shortCode}` : ""}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {customerName ?? "Sem nome"} · Total {fmtBRL(total)}
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} aria-label="Fechar"
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", display: "flex", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer" }}>
            <X size={16} strokeWidth={3} />
          </button>
        </header>

        <main style={{ flex: 1, padding: 16, background: "#fafafa", overflowY: "auto" }}>
          {err && (
            <div role="alert" style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: "#fee2e2", border: "1px solid #fca5a5",
              color: "#991b1b", fontSize: 13, fontWeight: 600,
            }}>⚠ {err}</div>
          )}

          {step === "mode" && (
            <ModeStep
              total={total}
              onPick={(mode) => { setErr(null); setStep(mode); }}
            />
          )}

          {step === "single" && (
            <SingleStep
              total={total}
              method={singleMethod} onMethodChange={setSingleMethod}
              cashChange={singleCashChange} onCashChange={setSingleCashChange}
            />
          )}

          {step === "equal" && (
            <EqualStep
              total={total}
              count={equalCount} onCountChange={setEqualCount}
              splits={equalSplits} onSplitsChange={setEqualSplits}
            />
          )}

          {step === "manual" && (
            <ManualStep
              total={total}
              splits={manualSplits}
              onAdd={() => setShowAddSplit(true)}
              onRemove={(id) => setManualSplits((prev) => prev.filter((s) => s.tempId !== id))}
              onUpdate={(id, patch) => setManualSplits((prev) => prev.map((s) => s.tempId === id ? { ...s, ...patch } : s))}
            />
          )}
        </main>

        {step !== "mode" && (
          <footer style={{
            background: "#fff", borderTop: "1px solid #e5e7eb",
            padding: "12px 16px",
            position: "sticky", bottom: 0,
          }}>
            <ConfirmButton
              step={step}
              total={total}
              singleMethod={singleMethod}
              singleCashChange={singleCashChange}
              equalSplits={equalSplits}
              manualSplits={manualSplits}
              submitting={submitting}
              setSubmitting={setSubmitting}
              setErr={setErr}
              comandaId={comandaId}
              customerName={customerName}
              onClosed={onClosed}
            />
          </footer>
        )}

        {showAddSplit && (
          <AddSplitDialog
            total={total}
            currentSum={manualSplits.reduce((s, x) => s + x.amount, 0)}
            onCancel={() => setShowAddSplit(false)}
            onAdd={(draft) => {
              setManualSplits((prev) => [...prev, draft]);
              setShowAddSplit(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Mode picker ─────────────────────────────────────────────────────────────

function ModeStep({ total, onPick }: { total: number; onPick: (m: Mode) => void }) {
  const opts: { mode: Mode; emoji: string; title: string; desc: string }[] = [
    { mode: "single", emoji: "🧾", title: "Não dividir",        desc: `1 pagamento de ${fmtBRL(total)}` },
    { mode: "equal",  emoji: "👥", title: "Dividir igualmente", desc: "Mesmo valor por pessoa" },
    { mode: "manual", emoji: "✂️", title: "Dividir manualmente", desc: "Valores diferentes por pagador" },
  ];
  return (
    <div>
      <div style={sectionTitle}>Como dividir o pagamento?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opts.map((o) => (
          <button
            key={o.mode}
            onClick={() => onPick(o.mode)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 18px", borderRadius: 14,
              border: "1px solid #e5e7eb", background: "#fff",
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}
            onTouchStart={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
            onTouchEnd={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{o.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{o.title}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{o.desc}</div>
            </div>
            <span style={{ fontSize: 18, color: "#9ca3af" }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Single payment ─────────────────────────────────────────────────────────

function SingleStep({
  total, method, onMethodChange, cashChange, onCashChange,
}: {
  total: number;
  method: PaymentMethod; onMethodChange: (m: PaymentMethod) => void;
  cashChange: string; onCashChange: (v: string) => void;
}) {
  return (
    <div>
      <TotalCard label="Total a pagar" amount={total} />
      <div style={sectionTitle}>Forma de pagamento</div>
      <PaymentPicker value={method} onChange={onMethodChange} />
      {method === "cash" && (
        <div style={{ marginTop: 14 }}>
          <label style={fieldLabel}>Troco para R$</label>
          <input
            type="text"
            inputMode="decimal"
            value={cashChange}
            onChange={(e) => onCashChange(e.target.value)}
            placeholder="Ex: 100,00 (opcional)"
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            Deixe em branco se o cliente vai pagar exato.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Equal split ────────────────────────────────────────────────────────────

function EqualStep({
  total, count, onCountChange, splits, onSplitsChange,
}: {
  total: number;
  count: string; onCountChange: (v: string) => void;
  splits: SplitDraft[]; onSplitsChange: (s: SplitDraft[]) => void;
}) {
  const each = splits.length > 0 ? splits[0].amount : 0;
  return (
    <div>
      <TotalCard label="Total a dividir" amount={total} />

      <div style={{ marginBottom: 16 }}>
        <label style={fieldLabel}>Dividir entre quantas pessoas?</label>
        <input
          type="number" min={2} max={20}
          value={count}
          onChange={(e) => onCountChange(e.target.value)}
          style={{ ...inputStyle, width: 110 }}
        />
        {splits.length > 0 && (
          <div style={{ fontSize: 13, color: "#15803d", fontWeight: 700, marginTop: 8 }}>
            {fmtBRL(each)} por pessoa{splits.length > 1 && splits[splits.length - 1].amount !== each ? ` (último: ${fmtBRL(splits[splits.length - 1].amount)})` : ""}
          </div>
        )}
      </div>

      <div style={sectionTitle}>Pagadores ({splits.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {splits.map((s, idx) => (
          <SplitEditor
            key={s.tempId}
            label={`Pessoa ${idx + 1}${idx === 0 ? " (titular)" : ""}`}
            split={s}
            amountLocked
            onChange={(patch) => onSplitsChange(splits.map((x) => x.tempId === s.tempId ? { ...x, ...patch } : x))}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Manual split ───────────────────────────────────────────────────────────

function ManualStep({
  total, splits, onAdd, onRemove, onUpdate,
}: {
  total: number;
  splits: SplitDraft[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SplitDraft>) => void;
}) {
  const sum = splits.reduce((s, x) => s + x.amount, 0);
  const remaining = total - sum;
  const tone = Math.abs(remaining) <= 1
    ? { bg: "#dcfce7", border: "#16a34a", color: "#15803d", label: "Tudo dividido ✓" }
    : remaining > 0
      ? { bg: "#fef3c7", border: "#f59e0b", color: "#92400e", label: `Faltam ${fmtBRL(remaining)}` }
      : { bg: "#fee2e2", border: "#dc2626", color: "#991b1b", label: `Excede em ${fmtBRL(-remaining)}` };

  return (
    <div>
      <TotalCard label="Total a dividir" amount={total} />

      <div style={{
        background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color,
        borderRadius: 12, padding: "12px 14px", marginBottom: 14,
        fontSize: 14, fontWeight: 800, textAlign: "center",
      }}>
        {tone.label}
      </div>

      {splits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#9ca3af", fontSize: 13 }}>
          Nenhum pagador ainda. Toque em <strong>+ Adicionar pessoa</strong> abaixo.
        </div>
      ) : (
        splits.map((s, idx) => (
          <SplitEditor
            key={s.tempId}
            label={`Pagador ${idx + 1}`}
            split={s}
            onChange={(patch) => onUpdate(s.tempId, patch)}
            onRemove={() => onRemove(s.tempId)}
          />
        ))
      )}

      <button
        onClick={onAdd}
        style={{
          marginTop: 12, width: "100%", padding: 12, borderRadius: 12,
          border: "1px dashed #16a34a", background: "#f0fdf4",
          color: "#15803d", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        <Plus size={15} strokeWidth={3} /> Adicionar pessoa
      </button>
    </div>
  );
}

// ─── Add split mini-dialog (manual mode) ────────────────────────────────────

function AddSplitDialog({
  total, currentSum, onCancel, onAdd,
}: {
  total: number; currentSum: number;
  onCancel: () => void;
  onAdd: (draft: SplitDraft) => void;
}) {
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [err, setErr] = useState<string | null>(null);

  const remaining = Math.max(0, total - currentSum);

  function handleAdd() {
    setErr(null);
    if (name.trim().length < 2) { setErr("Informe o nome do pagador (mín. 2 caracteres)."); return; }
    const cents = parseBRLToCents(amountInput);
    if (cents <= 0) { setErr("Informe um valor maior que zero."); return; }
    if (cents > remaining + 1) { setErr(`Valor excede o que falta dividir (${fmtBRL(remaining)}).`); return; }
    onAdd({
      tempId: newId(),
      customerName: name.trim(),
      customerPhone: phoneDigits || undefined,
      amount: cents,
      paymentMethod: method,
    });
  }

  function fmtPhone(d: string): string {
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 120,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        animation: "slideUpAdd 0.22s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <style>{`@keyframes slideUpAdd { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>
        <div style={{ padding: "8px 22px 22px" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
            Adicionar pagador
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
            Falta dividir: <strong style={{ color: "#111827" }}>{fmtBRL(remaining)}</strong>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Nome *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Telefone</label>
            <input
              style={inputStyle} type="tel" inputMode="numeric"
              value={fmtPhone(phoneDigits)}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="(62) 9XXXX-XXXX"
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>Valor *</label>
            <input
              style={inputStyle}
              type="text" inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder={`Ex: ${fmtBRL(remaining)}`}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabel}>Forma de pagamento</label>
            <PaymentPicker value={method} onChange={setMethod} />
          </div>

          {err && (
            <div role="alert" style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 12,
              background: "#fee2e2", border: "1px solid #fca5a5",
              color: "#991b1b", fontSize: 13, fontWeight: 600,
            }}>⚠ {err}</div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
            >Cancelar</button>
            <button onClick={handleAdd}
              style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 2px 6px rgba(22,163,74,0.25)" }}
            >Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm button (validates + calls server) ─────────────────────────────

function ConfirmButton({
  step, total, singleMethod, singleCashChange,
  equalSplits, manualSplits,
  submitting, setSubmitting, setErr,
  comandaId, customerName, onClosed,
}: {
  step: "single" | "equal" | "manual";
  total: number;
  singleMethod: PaymentMethod;
  singleCashChange: string;
  equalSplits: SplitDraft[];
  manualSplits: SplitDraft[];
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setErr: (v: string | null) => void;
  comandaId: string;
  customerName: string | null;
  onClosed: (splitsCreated: number, splits: CloseSplit[]) => void;
}) {
  let canConfirm = false;
  let payload: CloseComandaInput | null = null;
  let label = "Confirmar pagamento";

  if (step === "single") {
    canConfirm = true;
    label = "Confirmar pagamento";
    const cashChangeFor = singleMethod === "cash" && singleCashChange.trim()
      ? parseBRLToCents(singleCashChange) : undefined;
    payload = {
      mode: "single",
      splits: [{
        customerName: customerName?.trim() || "Cliente",
        amount: total,
        paymentMethod: singleMethod,
        cashChangeFor,
      }],
    };
  } else if (step === "equal") {
    label = "Confirmar todos os pagamentos";
    canConfirm = equalSplits.length >= 2 &&
      equalSplits.every((s) => s.customerName.trim().length >= 2);
    payload = canConfirm ? {
      mode: "equal",
      splits: equalSplits.map((s) => ({
        customerName: s.customerName.trim(),
        customerPhone: s.customerPhone,
        amount: s.amount,
        paymentMethod: s.paymentMethod,
        cashChangeFor: s.paymentMethod === "cash" && s.cashChangeForInput
          ? parseBRLToCents(s.cashChangeForInput) : undefined,
      })),
    } : null;
  } else {
    label = "Confirmar pagamentos";
    const sum = manualSplits.reduce((s, x) => s + x.amount, 0);
    canConfirm = manualSplits.length >= 1 &&
      Math.abs(sum - total) <= 1 &&
      manualSplits.every((s) => s.customerName.trim().length >= 2);
    payload = canConfirm ? {
      mode: "manual",
      splits: manualSplits.map((s) => ({
        customerName: s.customerName.trim(),
        customerPhone: s.customerPhone,
        amount: s.amount,
        paymentMethod: s.paymentMethod,
      })),
    } : null;
  }

  async function handleConfirm() {
    if (!payload || !canConfirm) return;
    setSubmitting(true);
    setErr(null);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const result = await closeComanda(token, comandaId, payload);
      if (!result.ok) {
        setErr(result.error);
        setSubmitting(false);
        return;
      }
      onClosed(result.splitsCreated, payload.splits);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao fechar comanda");
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={!canConfirm || submitting}
      style={{
        width: "100%", padding: 14, borderRadius: 12, border: "none",
        background: !canConfirm || submitting ? "#9ca3af" : "#16a34a",
        color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit",
        cursor: !canConfirm || submitting ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
      }}
    >
      <Check size={16} strokeWidth={3} />
      {submitting ? "Fechando…" : label}
    </button>
  );
}

// ─── Shared little components ───────────────────────────────────────────────

function TotalCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "14px 18px", marginBottom: 14,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>
        {fmtBRL(amount)}
      </div>
    </div>
  );
}

function PaymentPicker({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          style={{
            padding: "11px 12px", borderRadius: 12,
            border: value === m.value ? "2px solid #16a34a" : "1px solid #e5e7eb",
            background: value === m.value ? "#f0fdf4" : "#fff",
            color: value === m.value ? "#15803d" : "#374151",
            fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function SplitEditor({
  label, split, onChange, amountLocked, onRemove,
}: {
  label: string;
  split: SplitDraft;
  onChange: (patch: Partial<SplitDraft>) => void;
  amountLocked?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 14, padding: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>{fmtBRL(split.amount)}</span>
      </div>

      <input
        type="text"
        value={split.customerName}
        onChange={(e) => onChange({ customerName: e.target.value })}
        placeholder="Nome do pagador *"
        style={{ ...inputStyle, marginBottom: 8 }}
      />

      <PaymentPicker value={split.paymentMethod} onChange={(pm) => onChange({ paymentMethod: pm })} />

      {split.paymentMethod === "cash" && (
        <div style={{ marginTop: 8 }}>
          <input
            type="text"
            inputMode="decimal"
            value={split.cashChangeForInput ?? ""}
            onChange={(e) => onChange({ cashChangeForInput: e.target.value })}
            placeholder="Troco para R$ (opcional)"
            style={inputStyle}
          />
        </div>
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            marginTop: 10, padding: "7px 12px", borderRadius: 8,
            border: "1px solid #fecaca", background: "#fef2f2",
            color: "#b91c1c", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            cursor: "pointer",
          }}
        >Remover</button>
      )}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
};

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid #e5e7eb", background: "#fff",
  fontSize: 14, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};
