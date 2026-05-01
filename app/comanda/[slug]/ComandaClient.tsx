"use client";
import React, { useState, useEffect } from "react";
import { UtensilsCrossed, CheckCircle2, CreditCard, Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCustomerCall } from "@/lib/tableCalls/createCustomerCall";
import { formatCents } from "@/lib/money";

type ComandaItem = {
  id: string;
  comanda_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  variation_name?: string | null;
  notes?: string | null;
  status: string;
};

type Comanda = {
  id: string;
  unit_id: string;
  mesa_id?: string | null;
  mesa_number?: number | null;
  table_number?: number | null;
  waiter_name?: string | null;
  opened_by_name?: string | null;
  customer_name?: string | null;
  guest_count?: number | null;
  short_code: string;
  status: string;
  mesas?: { number: number; label: string | null } | null;
  comanda_items?: ComandaItem[];
};

type Unit = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  whatsapp_number?: string | null;
} | null;

interface ComandaClientProps {
  comanda: Comanda;
  unit: Unit;
}

export default function ComandaClient({
  comanda: initialComanda,
  unit,
}: ComandaClientProps) {
  const supabase = createClient();
  const [comanda, setComanda] = useState<Comanda>(initialComanda);
  const [items, setItems] = useState<ComandaItem[]>(
    (initialComanda.comanda_items ?? []).filter((i) => i.status !== "canceled")
  );
  const [calling, setCalling] = useState(false);
  const [callSent, setCallSent] = useState(false);
  const [showReadyNotif, setShowReadyNotif] = useState(false);
  const [readyItemName, setReadyItemName] = useState("");

  // ── Realtime ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`comanda-view-${comanda.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comandas",
          filter: `id=eq.${comanda.id}`,
        },
        (payload) => {
          if (payload.new) setComanda((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comanda_items",
          filter: `comanda_id=eq.${comanda.id}`,
        },
        (payload) => {
          const item = payload.new as ComandaItem;
          if (item.status !== "canceled") {
            setItems((prev) => [...prev, item]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comanda_items",
          filter: `comanda_id=eq.${comanda.id}`,
        },
        (payload) => {
          const updated = payload.new as ComandaItem;
          if (updated.status === "ready") {
            setReadyItemName(updated.product_name || "Seu pedido");
            setShowReadyNotif(true);
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
            setTimeout(() => setShowReadyNotif(false), 8000);
          }
          if (updated.status === "canceled") {
            setItems((prev) => prev.filter((i) => i.id !== updated.id));
          } else {
            setItems((prev) =>
              prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comanda_items",
          filter: `comanda_id=eq.${comanda.id}`,
        },
        (payload) => {
          setItems((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [comanda.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────────
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const isClosed = comanda.status === "closed" || comanda.status === "canceled";
  const isPendingPayment = comanda.status === "pending_payment";

  const mesaLabel =
    comanda.mesas?.label ||
    (comanda.mesa_number ? `Mesa ${comanda.mesa_number}` : null) ||
    (comanda.table_number ? `Mesa ${comanda.table_number}` : "Mesa —");

  const waiterName = comanda.waiter_name || comanda.opened_by_name || "—";

  // ── Call waiter ───────────────────────────────────────────────────────────────
  async function handleCallWaiter() {
    setCalling(true);
    const result = await createCustomerCall({
      unit_id: comanda.unit_id,
      comanda_id: comanda.id,
      table_number: comanda.table_number ?? comanda.mesa_number ?? 0,
      type: "waiter",
    });
    setCalling(false);
    if (result.ok) {
      setCallSent(true);
      setTimeout(() => setCallSent(false), 30000);
    } else {
      alert(result.message || "Não foi possível chamar agora.");
    }
  }

  // ── Item status helpers ───────────────────────────────────────────────────────
  function itemDotColor(status: string) {
    if (status === "ready" || status === "delivered") return "#00ffae";
    if (status === "preparing" || status === "confirmed") return "#fbbf24";
    return "rgba(255,255,255,0.15)";
  }

  function itemDotGlow(status: string) {
    if (status === "ready") return "0 0 6px rgba(0,255,174,0.5)";
    if (status === "preparing") return "0 0 6px rgba(251,191,36,0.4)";
    return "none";
  }

  function itemStatusLabel(status: string) {
    if (status === "delivered") return "Entregue";
    if (status === "ready") return "Pronto";
    if (status === "preparing") return "Preparando";
    if (status === "confirmed") return "Confirmado";
    return "Aguardando";
  }

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusBadge = isClosed
    ? { bg: "rgba(248,113,113,0.08)", color: "#f87171", label: "Fechada" }
    : isPendingPayment
    ? { bg: "rgba(251,191,36,0.08)", color: "#fbbf24", label: "Aguardando pagamento" }
    : { bg: "rgba(0,255,174,0.08)", color: "#00ffae", label: "Aberta" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        paddingBottom: isClosed ? 0 : "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      {/* Ready notification */}
      {showReadyNotif && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2000,
            padding: "16px 20px",
            paddingTop: "calc(16px + env(safe-area-inset-top))",
            background:
              "linear-gradient(135deg, rgba(0,255,174,0.97), rgba(0,217,255,0.97))",
            color: "#000",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,255,174,0.3)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>Pedido pronto!</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>
            {readyItemName}
          </div>
          <button
            onClick={() => setShowReadyNotif(false)}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 26,
              height: 26,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "rgba(0,0,0,0.15)",
              color: "#000",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: "20px 16px 16px",
          background:
            "linear-gradient(180deg, rgba(0,255,174,0.04) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#00ffae",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {unit?.logo_url ? (
              <img
                src={unit.logo_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#000",
                  fontStyle: "italic",
                }}
              >
                fy
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {unit?.name || "Restaurante"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {mesaLabel}
              {comanda.mesas?.label ? ` · ${comanda.mesas.label}` : ""}
            </div>
          </div>

          {/* Status */}
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: statusBadge.bg,
              color: statusBadge.color,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 1,
              flexShrink: 0,
            }}
          >
            {statusBadge.label}
          </div>
        </div>

        {/* Info row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Cliente
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {comanda.customer_name || "—"}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Garçom
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {waiterName}
            </div>
          </div>
          {comanda.guest_count ? (
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Pessoas
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                {comanda.guest_count}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "16px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Pedidos ({items.length})
        </div>

        {items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "rgba(255,255,255,0.15)",
            }}
          >
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", color: "rgba(255,255,255,0.15)" }}><UtensilsCrossed size={32} /></div>
            <div style={{ fontSize: 13 }}>Nenhum pedido ainda</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Os pedidos aparecerão aqui em tempo real
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 14,
                  background:
                    item.status === "ready"
                      ? "rgba(0,255,174,0.04)"
                      : item.status === "preparing"
                      ? "rgba(251,191,36,0.04)"
                      : "rgba(255,255,255,0.02)",
                  border:
                    item.status === "ready"
                      ? "1px solid rgba(0,255,174,0.12)"
                      : item.status === "preparing"
                      ? "1px solid rgba(251,191,36,0.1)"
                      : "1px solid rgba(255,255,255,0.04)",
                  transition: "background 0.3s, border-color 0.3s",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    {item.quantity > 1 ? `${item.quantity}× ` : ""}
                    {item.product_name || "Item"}
                  </div>
                  {item.variation_name && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                      }}
                    >
                      {item.variation_name}
                    </div>
                  )}
                  {item.notes && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(251,191,36,0.6)",
                        marginTop: 2,
                      }}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: itemDotColor(item.status),
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {itemStatusLabel(item.status)}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#fff",
                      minWidth: 64,
                      textAlign: "right",
                    }}
                  >
                    {formatCents(item.unit_price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 0",
              marginTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Total
            </span>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#00ffae" }}>
              {formatCents(total)}
            </span>
          </div>
        )}
      </div>

      {/* Closed state */}
      {(isClosed || isPendingPayment) && (
        <div style={{ padding: "0 16px 32px" }}>
          <div
            style={{
              padding: 24,
              borderRadius: 18,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", color: isClosed ? "#00ffae" : "#fbbf24" }}>
              {isClosed ? <CheckCircle2 size={28} /> : <CreditCard size={28} />}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              {isClosed ? "Comanda fechada" : "Aguardando pagamento"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.3)",
                marginTop: 4,
              }}
            >
              {isClosed ? "Obrigado pela visita!" : "Solicite a maquininha ao garçom"}
            </div>

            <div
              style={{
                marginTop: 16,
                padding: "12px 0",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
              >
                Total da comanda
              </span>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#00ffae",
                  marginTop: 4,
                }}
              >
                {formatCents(total)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar — call waiter */}
      {!isClosed && !isPendingPayment && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            background: "rgba(5,5,5,0.95)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={handleCallWaiter}
            disabled={calling || callSent}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 14,
              border: `1px solid ${callSent ? "rgba(0,255,174,0.15)" : "rgba(255,255,255,0.06)"}`,
              cursor: calling || callSent ? "default" : "pointer",
              background: callSent
                ? "rgba(0,255,174,0.08)"
                : "rgba(255,255,255,0.04)",
              color: callSent ? "#00ffae" : "#fff",
              fontSize: 14,
              fontWeight: 800,
              opacity: calling ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {callSent
              ? "Garçom chamado!"
              : calling
              ? "Chamando..."
              : <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Bell size={14} /> Chamar garçom</span>}
          </button>
        </div>
      )}

      {/* Pending payment — show call waiter too */}
      {isPendingPayment && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            background: "rgba(5,5,5,0.95)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <button
            onClick={handleCallWaiter}
            disabled={calling || callSent}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 14,
              border: `1px solid ${callSent ? "rgba(0,255,174,0.15)" : "rgba(251,191,36,0.12)"}`,
              cursor: calling || callSent ? "default" : "pointer",
              background: callSent
                ? "rgba(0,255,174,0.08)"
                : "rgba(251,191,36,0.06)",
              color: callSent ? "#00ffae" : "#fbbf24",
              fontSize: 14,
              fontWeight: 800,
              opacity: calling ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {callSent ? "Garçom chamado!" : calling ? "Chamando..." : <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><CreditCard size={14} /> Chamar para pagar</span>}
          </button>
        </div>
      )}
    </div>
  );
}
