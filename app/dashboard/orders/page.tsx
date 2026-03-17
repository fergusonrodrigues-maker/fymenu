import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { listOrdersByUnit } from "./actions";
import { formatPrice } from "@/lib/orders/validateOrder";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { restaurant, units } = await getTenantContext();

  if (!restaurant || !units.length) {
    redirect("/dashboard");
  }

  const activeUnit = units.find((u) => u.id === params.unit) ?? units[0];
  if (!activeUnit) redirect("/dashboard");

  let orders: any[] = [];
  try {
    orders = await listOrdersByUnit(activeUnit.id, {
      status: params.status || undefined,
      limit: 100,
    });
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
  }

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    sent: "Enviado",
    confirmed: "Confirmado",
    canceled: "Cancelado",
    expired: "Expirado",
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft:     { bg: "#f3f4f6", color: "#1f2937" },
    sent:      { bg: "#dbeafe", color: "#1e40af" },
    confirmed: { bg: "#dcfce7", color: "#166534" },
    canceled:  { bg: "#fee2e2", color: "#991b1b" },
    expired:   { bg: "#fef3c7", color: "#92400e" },
  };

  const countByStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main style={{ padding: "20px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 6px" }}>Pedidos</h1>
        <p style={{ fontSize: "14px", color: "rgba(0,0,0,0.55)", margin: 0 }}>
          Unidade: <strong>{activeUnit.name}</strong>
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[undefined, ...Object.keys(countByStatus)].map((status) => (
          <Link
            key={status ?? "all"}
            href={status ? `/dashboard/orders?status=${status}` : "/dashboard/orders"}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              background: params.status === status ? "#000" : "#fff",
              color: params.status === status ? "#fff" : "#000",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {status ? `${statusLabels[status] ?? status} (${countByStatus[status]})` : `Todos (${orders.length})`}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#f9fafb",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            Nenhum pedido encontrado
          </div>
          <div style={{ fontSize: "14px", color: "rgba(0,0,0,0.55)" }}>
            Comece criando seu primeiro pedido no cardápio público.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {orders.map((order) => {
            const sc = statusColors[order.status] ?? statusColors.draft;
            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                style={{
                  display: "block",
                  padding: "16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  background: "#fff",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#000", marginBottom: "6px" }}>
                      Pedido #{order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "rgba(0,0,0,0.55)" }}>
                      <span>{order.items?.length || 0} itens</span>
                      <span>
                        {new Date(order.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#000", marginBottom: "8px" }}>
                      {formatPrice(order.total)}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: sc.bg,
                        color: sc.color,
                      }}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
