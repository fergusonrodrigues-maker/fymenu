type Order = {
  id: string;
  table_number: number | null;
  items: Array<{ product_id: string; qty: number; unit_price: number; total: number; code_name?: string }>;
  total: number;
  status: string;
  waiter_status: string | null;
  notes: string | null;
  created_at: string;
};

interface TableCardProps {
  tableKey: string;
  orders: Order[];
  onStatusChange: (orderId: string, waiterStatus: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-orange-500/20 border-orange-500/40 text-orange-300",
  preparing: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  ready: "bg-green-500/20 border-green-500/40 text-green-300",
};

export default function TableCard({ tableKey, orders, onStatusChange }: TableCardProps) {
  const hasReady = orders.some((o) => o.waiter_status === "ready");
  const hasPending = orders.some((o) => !o.waiter_status || o.waiter_status === "pending");

  const borderColor = hasReady
    ? "border-green-500"
    : hasPending
    ? "border-orange-500"
    : "border-blue-500";

  const totalCents = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const tableLabel = tableKey === "s/n" ? "S/ Mesa" : `Mesa ${tableKey}`;

  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-slate-800/60 backdrop-blur p-5 flex flex-col gap-4`}>
      {/* Header da mesa */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-white">{tableLabel}</span>
        <span className="text-green-400 font-semibold text-sm">
          R$ {(totalCents / 100).toFixed(2)}
        </span>
      </div>

      {/* Lista de pedidos */}
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const ws = order.waiter_status ?? "pending";
          const colorClass = STATUS_COLOR[ws] ?? STATUS_COLOR.pending;
          const itemCount = order.items?.length ?? 0;

          return (
            <div
              key={order.id}
              className={`rounded-lg border p-3 ${colorClass} flex flex-col gap-2`}
            >
              {/* Status badge + horário */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{STATUS_LABEL[ws] ?? ws}</span>
                <span className="opacity-60">
                  {new Date(order.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Itens resumidos */}
              <div className="text-xs opacity-80">
                {order.items?.map((item, i) => (
                  <span key={i}>
                    {item.qty}x {item.code_name ?? "Item"}
                    {i < order.items.length - 1 ? ", " : ""}
                  </span>
                )) ?? `${itemCount} iten(s)`}
              </div>

              {/* Notas */}
              {order.notes && (
                <div className="text-xs opacity-70 italic border-t border-current/20 pt-1">
                  {order.notes}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 mt-1">
                {ws === "pending" && (
                  <button
                    onClick={() => onStatusChange(order.id, "preparing")}
                    className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                  >
                    🍳 Preparar
                  </button>
                )}
                {ws === "preparing" && (
                  <button
                    onClick={() => onStatusChange(order.id, "ready")}
                    className="flex-1 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
                  >
                    ✅ Pronto
                  </button>
                )}
                {ws === "ready" && (
                  <button
                    onClick={() => onStatusChange(order.id, "delivered")}
                    className="flex-1 py-1.5 rounded-md bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium transition-colors"
                  >
                    🚀 Entregar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
