"use client";

import { useState } from "react";
import { OrderPayload, UpsellItem, buildOrderPayload, buildWhatsAppMessage, formatPrice } from "./orderBuilder";
import { useTrack } from "./useTrack";

export interface UpsellSuggestion {
  id: string;
  name: string;
  price: number;
  image_path?: string;
}

interface UpsellModalProps {
  payload: OrderPayload | null;
  suggestions: UpsellSuggestion[];
  unit: {
    id: string;
    whatsapp?: string | null;
  };
  onClose: () => void;
}

export default function UpsellModal({
  payload,
  suggestions,
  unit,
  onClose,
}: UpsellModalProps) {
  const [selectedUpsells, setSelectedUpsells] = useState<UpsellItem[]>([]);
  const { track } = useTrack(unit.id);

  if (!payload) return null;

  function toggleUpsell(suggestion: UpsellSuggestion) {
    setSelectedUpsells((prev) => {
      const exists = prev.find((u) => u.id === suggestion.id);
      if (exists) return prev.filter((u) => u.id !== suggestion.id);
      return [...prev, { id: suggestion.id, name: suggestion.name, price: suggestion.price }];
    });
  }

  const finalPayload = buildOrderPayload(
    payload.product,
    payload.variation,
    selectedUpsells
  );

  function handleWhatsApp() {
    if (!unit.whatsapp) return;
    const url = buildWhatsAppMessage(finalPayload, unit.whatsapp);
    track({ event: "whatsapp_click", product_id: payload?.product.id });
    window.open(url, "_blank");
    onClose();
  }

  const hasUpsells = suggestions.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-zinc-950 overflow-hidden
          animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "90dvh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-white font-bold text-lg">Resumo do pedido</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center
              rounded-full bg-zinc-800 text-white text-lg"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "80dvh" }}>
          {/* Main product summary */}
          <div className="bg-zinc-900 rounded-2xl p-4 mb-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-semibold text-sm">
                  {payload.product.name}
                </p>
                {payload.variation && (
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {payload.variation.name}
                  </p>
                )}
              </div>
              <span className="text-white text-sm font-bold whitespace-nowrap">
                {formatPrice(
                  Number(payload.variation?.price ?? payload.product.base_price ?? 0)
                )}
              </span>
            </div>
          </div>

          {/* Upsell suggestions (only for WhatsApp flow) */}
          {hasUpsells && (
            <div className="mb-5">
              <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3 font-semibold">
                Adicionar ao pedido
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => {
                  const isSelected = selectedUpsells.some((u) => u.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleUpsell(s)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border
                        transition-all text-sm font-medium text-left
                        ${isSelected
                          ? "border-white bg-white text-black"
                          : "border-zinc-700 bg-zinc-900 text-white hover:border-zinc-500"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs
                            ${isSelected
                              ? "border-black bg-black text-white"
                              : "border-zinc-500"
                            }`}
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                        <span>{s.name}</span>
                      </div>
                      <span className={isSelected ? "text-black" : "text-zinc-300"}>
                        +{formatPrice(s.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live order summary */}
          {selectedUpsells.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 mb-5">
              <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3 font-semibold">
                Itens adicionados
              </p>
              {selectedUpsells.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-1">
                  <span className="text-white text-sm">+ {u.name}</span>
                  <span className="text-zinc-300 text-sm">{formatPrice(u.price)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-1 mb-6">
            <span className="text-zinc-400 text-sm font-medium">Total estimado</span>
            <span className="text-white font-bold text-xl">
              {formatPrice(finalPayload.total)}
            </span>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            {unit.whatsapp && (
              <button
                onClick={handleWhatsApp}
                className="w-full py-4 rounded-2xl font-bold text-base
                  bg-[#25D366] text-white active:scale-95 transition-transform
                  flex items-center justify-center gap-2"
              >
                <span>💬</span>
                Pedir pelo WhatsApp
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm text-zinc-500
                border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
