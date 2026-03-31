"use client";

interface ComandaHeaderProps {
  tableNumber?: number;
  totalAmount: number;
  itemsCount: number;
  status?: "open" | "closed";
}

export function ComandaHeader({
  tableNumber,
  totalAmount,
  itemsCount,
  status = "open",
}: ComandaHeaderProps) {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          {tableNumber && <p className="text-sm opacity-90">Mesa {tableNumber}</p>}
          <p className="text-xs opacity-75">{itemsCount} itens</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            status === "open" ? "bg-green-400" : "bg-red-400"
          }`}
        >
          {status === "open" ? "Aberta" : "Fechada"}
        </span>
      </div>

      <div className="border-t border-white/30 pt-3">
        <p className="text-xs opacity-90">Total</p>
        <p className="text-2xl font-bold">R$ {totalAmount.toFixed(2)}</p>
      </div>
    </div>
  );
}
