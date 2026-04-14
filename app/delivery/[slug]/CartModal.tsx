"use client";

import { useState } from "react";

export interface CartItem {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
  addons?: Array<{ id: string; name: string; price: number }>;
}

interface DeliveryFeeResult {
  available: boolean;
  distanceKm: number | null;
  fee: number;
  message: string;
}

interface CartModalProps {
  items: CartItem[];
  unitId: string;
  initialTable?: number | null;
  onClose: () => void;
  onSuccess: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  /** If true, show the delivery fee calculation section */
  deliveryEnabled?: boolean;
}

function moneyBR(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function CartModal({
  items,
  unitId,
  initialTable,
  onClose,
  onSuccess,
  onUpdateQty,
  deliveryEnabled = false,
}: CartModalProps) {
  const [tableNumber, setTableNumber] = useState<string>(
    initialTable ? String(initialTable) : ""
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Delivery fee state
  const [deliveryFee, setDeliveryFee] = useState<DeliveryFeeResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const itemsTotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const total = itemsTotal + (deliveryFee?.available ? deliveryFee.fee : 0);

  async function calculateDelivery() {
    if (!navigator.geolocation) {
      setCalcError("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setCalcLoading(true);
    setCalcError(null);
    setDeliveryFee(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/delivery/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              unit_id: unitId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data: DeliveryFeeResult = await res.json();
          setDeliveryFee(data);
        } catch {
          setCalcError("Erro ao calcular taxa de entrega.");
        } finally {
          setCalcLoading(false);
        }
      },
      () => {
        setCalcError("Não foi possível obter sua localização. Verifique as permissões.");
        setCalcLoading(false);
      }
    );
  }

  async function handleSubmit() {
    if (items.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          table_number: tableNumber ? parseInt(tableNumber) : null,
          notes: notes || null,
          delivery_fee: deliveryFee?.available ? deliveryFee.fee : null,
          items: items.map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            unit_price: i.unit_price,
            total: i.qty * i.unit_price,
            code_name: i.name,
            addons: i.addons ?? [],
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao enviar pedido");
      }

      setSent(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-zinc-950 overflow-hidden"
        style={{
          maxHeight: "92dvh",
          animation: "cart-modal-up 300ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <style>{`
          @keyframes cart-modal-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-zinc-800">
          <h2 className="text-white font-bold text-lg">Seu Pedido</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: "78dvh" }}>

          {sent ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <span className="text-5xl">✅</span>
              <p className="text-white font-bold text-xl">Pedido enviado!</p>
              <p className="text-zinc-400 text-sm text-center">
                O garçom recebeu seu pedido e logo virá confirmar.
              </p>
            </div>
          ) : (
            <>
              {/* Itens */}
              <div className="mt-4 flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between bg-zinc-900 rounded-2xl px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.name}</p>
                      <p className="text-zinc-400 text-xs">
                        {moneyBR(item.unit_price)} / un
                      </p>
                      {item.addons && item.addons.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {item.addons.map((a) => (
                            <p key={a.id} className="text-zinc-500 text-xs">
                              + {a.name} · {moneyBR(a.price)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => onUpdateQty(item.product_id, item.qty - 1)}
                        className="w-7 h-7 rounded-full bg-zinc-700 text-white text-lg flex items-center justify-center leading-none"
                      >
                        −
                      </button>
                      <span className="text-white font-bold w-5 text-center text-sm">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.product_id, item.qty + 1)}
                        className="w-7 h-7 rounded-full bg-zinc-700 text-white text-lg flex items-center justify-center leading-none"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-white font-bold text-sm ml-4 w-16 text-right">
                      {moneyBR(item.qty * item.unit_price)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Delivery fee section */}
              {deliveryEnabled && (
                <div className="mt-4 rounded-2xl bg-zinc-900 px-4 py-4">
                  <p className="text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-3">
                    Taxa de entrega
                  </p>

                  {!deliveryFee && !calcLoading && (
                    <button
                      onClick={calculateDelivery}
                      className="w-full py-3 rounded-xl text-sm font-bold border border-green-500/30 bg-green-500/10 text-green-400 flex items-center justify-center gap-2"
                    >
                      📍 Calcular taxa de entrega
                    </button>
                  )}

                  {calcLoading && (
                    <div className="text-zinc-400 text-sm text-center py-2 animate-pulse">
                      Obtendo localização...
                    </div>
                  )}

                  {calcError && (
                    <div className="text-red-400 text-xs py-2">{calcError}</div>
                  )}

                  {deliveryFee && (
                    <div className={`rounded-xl px-3 py-3 ${deliveryFee.available ? "bg-green-500/10 border border-green-500/25" : "bg-red-500/10 border border-red-500/25"}`}>
                      {deliveryFee.distanceKm != null && (
                        <p className="text-zinc-300 text-xs mb-1">
                          📏 Distância: <strong>{deliveryFee.distanceKm.toFixed(1)} km</strong>
                        </p>
                      )}
                      <p className={`text-sm font-bold ${deliveryFee.available ? "text-green-400" : "text-red-400"}`}>
                        {deliveryFee.available
                          ? `💰 Taxa: ${moneyBR(deliveryFee.fee / 100)}`
                          : `❌ ${deliveryFee.message}`}
                      </p>
                      {!deliveryFee.available && (
                        <p className="text-zinc-500 text-xs mt-1">
                          Você pode retirar no estabelecimento.
                        </p>
                      )}
                      <button
                        onClick={calculateDelivery}
                        className="text-zinc-500 text-xs mt-2 underline"
                      >
                        Recalcular
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Subtotal + taxa */}
              {deliveryEnabled && deliveryFee?.available && (
                <div className="flex justify-between items-center px-1 mt-3">
                  <span className="text-zinc-500 text-xs">Subtotal</span>
                  <span className="text-zinc-400 text-sm">{moneyBR(itemsTotal / 100)}</span>
                </div>
              )}
              {deliveryEnabled && deliveryFee?.available && (
                <div className="flex justify-between items-center px-1 mt-1">
                  <span className="text-zinc-500 text-xs">Taxa de entrega</span>
                  <span className="text-zinc-400 text-sm">{moneyBR(deliveryFee.fee / 100)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center px-1 mt-4 mb-5">
                <span className="text-zinc-400 text-sm">Total</span>
                <span className="text-white font-bold text-xl">{moneyBR(total / 100)}</span>
              </div>

              {/* Mesa */}
              <div className="mb-3">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1.5 block">
                  Mesa (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder="Ex: 3"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3
                    text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Observações */}
              <div className="mb-5">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1.5 block">
                  Observações
                </label>
                <textarea
                  placeholder="Alergias, sem sal, bem passado..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3
                    text-white placeholder-zinc-600 text-sm resize-none
                    focus:outline-none focus:border-orange-500"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center mb-4">{error}</p>
              )}

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={loading || items.length === 0}
                className="w-full py-4 rounded-2xl font-bold text-base
                  bg-[#FF6B00] text-white active:scale-95 transition-transform
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Enviando..." : "Enviar Pedido para Garçom"}
              </button>

              <button
                onClick={onClose}
                disabled={loading}
                className="w-full mt-3 py-3 rounded-2xl text-sm text-zinc-500
                  border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                Continuar adicionando
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
