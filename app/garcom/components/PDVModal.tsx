"use client";

import React from "react";
import { useState } from "react";
import { X, CreditCard, CheckCircle2 } from "lucide-react";
import type { WaiterOrder } from "../WaiterClient";

interface Props {
  order: WaiterOrder;
  onClose: () => void;
  onPaid: (method: string) => void;
}

const METHODS = [
  { id: "cash", label: "Dinheiro", color: "#16a34a" },
  { id: "card", label: "Cartão",   color: "#2563eb" },
  { id: "pix",  label: "PIX",      color: "#7c3aed" },
];

export default function PDVModal({ order, onClose, onPaid }: Props) {
  const [method, setMethod] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const tableLabel = order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa";

  async function handlePay() {
    if (!method) return;
    setConfirming(true);
    await onPaid(method);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-slate-900 rounded-t-3xl overflow-hidden"
        style={{ animation: "slide-up 280ms cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <style>{`@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-slate-700" /></div>

        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-700">
          <div>
            <h2 className="text-white font-bold" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CreditCard size={16} /> Pagamento
            </h2>
            <p className="text-slate-400 text-sm">{tableLabel}</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(220,38,38,0.12)", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
          }}><X size={14} /></button>
        </div>

        <div className="px-5 py-6">
          {/* Resumo */}
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.qty}× {item.code_name ?? `Item ${i + 1}`}</span>
                <span className="text-slate-400">R$ {((item.qty * item.unit_price) / 100).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-700">
              <span className="text-white font-bold">Total</span>
              <span className="text-green-400 font-bold text-lg">
                R$ {(order.total / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Forma de pagamento */}
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">
            Forma de Pagamento
          </p>
          <div className="flex flex-col gap-3 mb-6">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  borderColor: method === m.id ? m.color : undefined,
                  background: method === m.id ? `${m.color}22` : undefined,
                }}
                className={`w-full py-4 rounded-xl border-2 text-white font-bold text-base transition-all
                  ${method === m.id ? "" : "border-slate-700 bg-slate-800 hover:border-slate-600"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm">
              Cancelar
            </button>
            <button
              onClick={handlePay}
              disabled={!method || confirming}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? "Processando..." : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} /> Confirmar Pagamento</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
