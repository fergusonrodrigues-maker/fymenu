"use client";

import { useState } from "react";
import type { WaiterOrder } from "../WaiterClient";
import { logComandaAction } from "@/app/hooks/useComandaAudit";

interface Props {
  order: WaiterOrder;
  unitId: string;
  operatorName: string;
  onClose: () => void;
  onSave: (updated: WaiterOrder) => void;
}

type Item = WaiterOrder["items"][number];

const REMOVAL_REASONS = [
  "Cliente cancelou",
  "Erro de lançamento",
  "Produto indisponível",
  "Outro",
];

export default function EditOrderModal({ order, unitId, operatorName, onClose, onSave }: Props) {
  const [items, setItems] = useState<Item[]>(JSON.parse(JSON.stringify(order.items ?? [])));
  const [notes, setNotes] = useState(order.notes ?? "");
  const [pendingRemoval, setPendingRemoval] = useState<{ idx: number; item: Item } | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);

  function updateQty(idx: number, qty: number) {
    if (qty <= 0) {
      setPendingRemoval({ idx, item: items[idx] });
      setSelectedReason(null);
      setCustomReason("");
    } else {
      setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, qty, total: qty * item.unit_price } : item)));
    }
  }

  function updateItemNote(idx: number, note: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, notes: note } : item)));
  }

  async function confirmRemoval() {
    if (!pendingRemoval || !selectedReason) return;
    const reason = selectedReason === "Outro" ? customReason.trim() || "Outro" : selectedReason;
    const { item } = pendingRemoval;

    await logComandaAction({
      comanda_id: order.id,
      order_id: order.id,
      unit_id: unitId,
      action: "item_removed",
      item_name: item.code_name ?? `Item`,
      item_id: item.product_id,
      old_value: { qty: item.qty, price: item.unit_price },
      performed_by_role: "garcom",
      performed_by_name: operatorName,
      reason,
    });

    setItems((prev) => prev.filter((_, i) => i !== pendingRemoval.idx));
    setPendingRemoval(null);
    setSelectedReason(null);
    setCustomReason("");
  }

  function handleSave() {
    onSave({ ...order, items, notes: notes || null, total });
  }

  const canConfirmRemoval =
    selectedReason !== null &&
    (selectedReason !== "Outro" || customReason.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-slate-900 rounded-t-3xl overflow-hidden"
        style={{ maxHeight: "90dvh", animation: "slide-up 280ms cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <style>{`@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle */}
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-slate-700" /></div>

        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-700">
          <h2 className="text-white font-bold">
            ✏️ Editar Pedido — {order.table_number != null ? `Mesa ${order.table_number}` : "S/ Mesa"}
          </h2>
          <button onClick={onClose} className="text-slate-400 w-8 h-8 rounded-full bg-slate-800 text-sm flex items-center justify-center">✕</button>
        </div>

        <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: "75dvh" }}>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-4 mb-3 font-semibold">Itens</p>

          {items.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">Nenhum item restante</p>
          )}

          {items.map((item, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium text-sm">{item.code_name ?? `Item ${idx + 1}`}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(idx, item.qty - 1)}
                    className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-base leading-none"
                  >−</button>
                  <span className="text-white font-bold w-5 text-center text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateQty(idx, item.qty + 1)}
                    className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-base leading-none"
                  >+</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Obs (sem sal, etc)"
                  value={item.notes ?? ""}
                  onChange={(e) => updateItemNote(idx, e.target.value)}
                  className="flex-1 bg-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none mr-3"
                />
                <span className="text-green-400 text-sm font-bold">
                  R$ {((item.qty * item.unit_price) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          <div className="mt-2 mb-4">
            <label className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-1.5 block">
              Obs gerais
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-orange-500"
              placeholder="Alergias, preferências..."
            />
          </div>

          <div className="flex justify-between items-center mb-5 px-1">
            <span className="text-slate-400 text-sm">Total</span>
            <span className="text-green-400 font-bold text-lg">R$ {(total / 100).toFixed(2)}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {/* Removal Reason Modal */}
      {pendingRemoval && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-bold text-base mb-1">Por que está removendo este item?</h3>
            <p className="text-slate-400 text-sm mb-5">
              <span className="text-orange-400 font-semibold">{pendingRemoval.item.code_name ?? "Item"}</span>
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {REMOVAL_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => { setSelectedReason(reason); setCustomReason(""); }}
                  className={`w-full py-3 px-4 rounded-xl border text-sm font-medium text-left transition-colors ${
                    selectedReason === reason
                      ? "border-orange-500 bg-orange-500/10 text-orange-400"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {selectedReason === "Outro" && (
              <input
                type="text"
                placeholder="Descreva o motivo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm mb-4 focus:outline-none focus:border-orange-500"
                autoFocus
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPendingRemoval(null); setSelectedReason(null); setCustomReason(""); }}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRemoval}
                disabled={!canConfirmRemoval}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
