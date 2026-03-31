"use client";

import { useComandaCalculator } from "@/lib/hooks/useComandaCalculator";
import { Trash2 } from "lucide-react";

interface SimpleCalculatorProps {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export function SimpleCalculator({ items }: SimpleCalculatorProps) {
  const { calculator, updateQuantity, removeItem, applyDiscount } =
    useComandaCalculator(items);

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded border">
      <h4 className="font-semibold text-sm">Calculadora</h4>

      {/* Items */}
      <div className="space-y-1">
        {calculator.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded text-sm">
            <span>{item.name}</span>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                className="w-10 p-1 border rounded text-center text-xs"
              />
              <span className="w-16 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 p-2 bg-white rounded text-sm border-t">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>R$ {calculator.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Desconto:</span>
          <input
            type="number"
            step="0.01"
            value={calculator.discount}
            onChange={(e) => applyDiscount(parseFloat(e.target.value) || 0)}
            className="w-24 p-1 border rounded text-right text-xs"
            placeholder="0.00"
          />
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-1">
          <span>Total:</span>
          <span className="text-green-600">R$ {calculator.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
