"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOrderById,
  generateOrderWhatsAppLink,
  markOrderAsSent,
  confirmOrder,
  cancelOrder,
} from "../actions";
import { formatPrice } from "@/lib/orders/validateOrder";

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await getOrderById(params.orderId);
        setOrder(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar pedido");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.orderId]);

  if (loading) {
    return <main style={{ padding: "20px", textAlign: "center" }}>Carregando pedido...</main>;
  }

  if (error || !order) {
    return (
      <main style={{ padding: "20px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ color: "red", marginBottom: "20px" }}>
          Erro: {error || "Pedido não encontrado"}
        </div>
        <Link href="/painel/orders" style={{ color: "blue", textDecoration: "underline" }}>
          ← Voltar para pedidos
        </Link>
      </main>
    );
  }

  const handleSendWhatsApp = async () => {
    setActionInProgress("send");
    try {
      let link = whatsappLink;
      if (!link) {
        const result = await generateOrderWhatsAppLink(order.id);
        link = result.link;
        setWhatsappLink(link);
      }
      await markOrderAsSent(order.id, link);
      setOrder({ ...order, status: "sent" });
      window.open(link, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirm = async () => {
    setActionInProgress("confirm");
    try {
      await confirmOrder(order.id);
      setOrder({ ...order, status: "confirmed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
    setActionInProgress("cancel");
    try {
      await cancelOrder(order.id);
      setOrder({ ...order, status: "canceled" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar");
    } finally {
      setActionInProgress(null);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho (não enviado)",
    sent: "Enviado via WhatsApp",
    confirmed: "Confirmado pelo cliente",
    canceled: "Cancelado",
    expired: "Expirado",
  };

  const canAction = order.status === "draft" || order.status === "sent";

  return (
    <main style={{ padding: "20px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/painel/orders" style={{ fontSize: "13px", color: "blue", textDecoration: "underline" }}>
          ← Voltar
        </Link>
        <h1 style={{ fontSize: "28px", fontWeight: 900, margin: "12px 0 6px" }}>
          Pedido #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.55)", margin: 0 }}>
          {new Date(order.created_at).toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "12px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            marginBottom: "20px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          padding: "16px",
          background: "#f9fafb",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.55)", marginBottom: "8px" }}>Status</div>
        <div style={{ fontSize: "16px", fontWeight: 700 }}>
          {statusLabels[order.status] ?? order.status}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Itens</h2>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          {order.items.map((item: any, idx: number) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: idx < order.items.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                  {item.code_name || `Item ${item.product_id.slice(0, 4)}`}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.55)" }}>
                  {item.qty}x @ {formatPrice(item.unit_price)}
                </div>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>{formatPrice(item.total)}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          background: "#f9fafb",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              fontSize: "14px",
              color: "rgba(0,0,0,0.55)",
            }}
          >
            <span>Desconto</span>
            <span>-{formatPrice(order.discount)}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "18px",
            fontWeight: 800,
            paddingTop: "8px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {canAction && (
        <div style={{ display: "grid", gap: "12px" }}>
          <button
            onClick={handleSendWhatsApp}
            disabled={actionInProgress === "send"}
            style={{
              padding: "14px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: actionInProgress ? "not-allowed" : "pointer",
              opacity: actionInProgress ? 0.6 : 1,
            }}
          >
            {actionInProgress === "send" ? "Preparando..." : "Enviar no WhatsApp"}
          </button>

          {order.status === "sent" && (
            <button
              onClick={handleConfirm}
              disabled={actionInProgress === "confirm"}
              style={{
                padding: "14px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: actionInProgress ? "not-allowed" : "pointer",
                opacity: actionInProgress ? 0.6 : 1,
              }}
            >
              {actionInProgress === "confirm" ? "Confirmando..." : "Marcar como Confirmado"}
            </button>
          )}

          <button
            onClick={handleCancel}
            disabled={actionInProgress === "cancel"}
            style={{
              padding: "14px",
              background: "transparent",
              color: "#ef4444",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: actionInProgress ? "not-allowed" : "pointer",
              opacity: actionInProgress ? 0.6 : 1,
            }}
          >
            {actionInProgress === "cancel" ? "Cancelando..." : "Cancelar Pedido"}
          </button>
        </div>
      )}

      {!canAction && (
        <div
          style={{
            padding: "16px",
            background: "#f3f4f6",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "13px",
            color: "rgba(0,0,0,0.55)",
          }}
        >
          Este pedido não pode mais ser modificado.
        </div>
      )}
    </main>
  );
}
