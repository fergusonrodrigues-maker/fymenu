"use client";

import { useState, useEffect } from "react";
import { useSubComanda } from "@/lib/hooks/useSubComanda";
import { Trash2, Plus } from "lucide-react";

interface SubComandaCalculatorProps {
  orderIntentId: string;
  orderItems: Array<{
    id: string;
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
  }>;
}

export function SubComandaCalculator({
  orderIntentId,
  orderItems,
}: SubComandaCalculatorProps) {
  const {
    splits,
    splitItems,
    fetchSplits,
    createSplit,
    addItemToSplit,
    removeItemFromSplit,
    applyDiscountToSplit,
    deleteSplit,
  } = useSubComanda(orderIntentId);

  const [newSplitName, setNewSplitName] = useState("");
  const [newSplitPhone, setNewSplitPhone] = useState("");
  const [splitFormError, setSplitFormError] = useState<string | null>(null);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);

  useEffect(() => {
    fetchSplits(orderIntentId);
  }, [orderIntentId, fetchSplits]);

  const handleCreateSplit = async () => {
    setSplitFormError(null);
    if (newSplitName.trim().length < 2) {
      setSplitFormError("Informe o nome de quem vai pagar (mín. 2 caracteres).");
      return;
    }
    const split = await createSplit(newSplitName, newSplitPhone || undefined);
    if (split) {
      setNewSplitName("");
      setNewSplitPhone("");
      setSelectedSplitId(split.id);
    }
  };

  const handleAddItemToSplit = async (orderItemId: string) => {
    if (!selectedSplitId) return;
    const item = orderItems.find((oi) => oi.id === orderItemId);
    if (!item) return;

    await addItemToSplit(
      selectedSplitId,
      orderItemId,
      item.quantity,
      item.unit_price
    );
  };

  const handleApplyDiscount = async (splitId: string, discountAmount: number) => {
    await applyDiscountToSplit(splitId, discountAmount);
  };

  const totalAllSplits = splits.reduce((sum, split) => sum + split.total, 0);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Calculadora de Sub-Comandas</h3>

      {/* Criar nova split */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome de quem vai pagar *"
            value={newSplitName}
            onChange={(e) => { setNewSplitName(e.target.value); if (splitFormError) setSplitFormError(null); }}
            className="flex-1 p-2 border rounded text-sm"
          />
          <input
            type="tel"
            placeholder="Telefone (opcional)"
            value={newSplitPhone}
            onChange={(e) => setNewSplitPhone(e.target.value)}
            className="flex-1 p-2 border rounded text-sm"
            inputMode="tel"
          />
          <button
            onClick={handleCreateSplit}
            disabled={newSplitName.trim().length < 2}
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
            aria-label="Criar split"
          >
            <Plus size={16} />
          </button>
        </div>
        {splitFormError && (
          <p className="text-xs text-red-600">⚠ {splitFormError}</p>
        )}
      </div>

      {/* Lista de splits */}
      <div className="space-y-3">
        {splits.map((split) => (
          <div
            key={split.id}
            className={`p-3 border rounded cursor-pointer transition ${
              selectedSplitId === split.id
                ? "bg-blue-50 border-blue-400"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
            onClick={() => setSelectedSplitId(split.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-semibold text-sm truncate">{split.customer_name ?? split.name}</span>
                {split.customer_phone && (
                  <span className="text-xs text-gray-500">📞 {split.customer_phone}</span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSplit(split.id);
                }}
                className="text-red-500 hover:text-red-700 flex-shrink-0"
                aria-label="Remover split"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Itens desta split */}
            <div className="space-y-1 bg-white rounded p-2 mb-2">
              {(splitItems.get(split.id) || []).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-xs p-1 bg-gray-50 rounded"
                >
                  <span>
                    {orderItems.find((oi) => oi.id === item.order_item_id)?.product_name} x
                    {item.quantity}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItemFromSplit(split.id, item.id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {split.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto:</span>
                <input
                  type="number"
                  step="0.01"
                  value={split.discount}
                  onChange={(e) =>
                    handleApplyDiscount(split.id, parseFloat(e.target.value) || 0)
                  }
                  className="w-20 p-1 border rounded text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-1">
                <span>Total:</span>
                <span className="text-blue-600">R$ {split.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar itens à split selecionada */}
      {selectedSplitId && (
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs font-semibold mb-2">Itens disponíveis</p>
          <div className="space-y-1">
            {orderItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddItemToSplit(item.id)}
                className="w-full text-left p-2 text-xs bg-white border rounded hover:bg-blue-50"
              >
                {item.product_name} x{item.quantity} - R$ {(item.unit_price * item.quantity).toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Total geral */}
      <div className="p-3 bg-green-50 rounded border border-green-300">
        <div className="flex justify-between font-bold">
          <span>Total Geral:</span>
          <span className="text-lg text-green-600">R$ {totalAllSplits.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
