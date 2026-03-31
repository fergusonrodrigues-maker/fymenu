"use client";

import { useState } from "react";

interface PaymentOptionsProps {
  totalAmount: number;
  onPaymentMethodChange?: (method: "cash" | "card" | "pix") => void;
}

type PaymentMethod = "cash" | "card" | "pix";

export function PaymentOptions({ totalAmount, onPaymentMethodChange }: PaymentOptionsProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [change, setChange] = useState(0);

  const handleMethodChange = (method: PaymentMethod) => {
    setSelectedMethod(method);
    onPaymentMethodChange?.(method);
  };

  const handleChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setChange(Math.max(0, amount - totalAmount));
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-semibold text-sm">Forma de Pagamento</h4>

      <div className="flex gap-2">
        {(["cash", "card", "pix"] as const).map((method) => (
          <button
            key={method}
            onClick={() => handleMethodChange(method)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
              selectedMethod === method
                ? "bg-blue-500 text-white"
                : "bg-white border border-gray-300 hover:border-blue-400"
            }`}
          >
            {method === "cash"
              ? "Dinheiro"
              : method === "card"
              ? "Cartão"
              : "PIX"}
          </button>
        ))}
      </div>

      {selectedMethod === "cash" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold">Valor Recebido</label>
          <input
            type="number"
            step="0.01"
            defaultValue={totalAmount}
            onChange={handleChangeAmount}
            className="w-full p-2 border rounded text-sm"
            placeholder="0.00"
          />
          {change > 0 && (
            <div className="p-2 bg-green-100 rounded text-sm">
              <p className="text-xs text-gray-700">Troco</p>
              <p className="font-bold text-green-700">R$ {change.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      <button className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded font-semibold transition">
        Finalizar Comanda
      </button>
    </div>
  );
}
