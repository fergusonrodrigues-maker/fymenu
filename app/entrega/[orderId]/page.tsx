"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface DeliveryInfo {
  id: string;
  status: "pending" | "in_transit" | "delivered" | "failed";
  picked_up_at: string | null;
  delivered_at: string | null;
  estimated_minutes: number | null;
  deliverer: { id: string; name: string; phone: string | null } | null;
  current_location: { lat: number; lng: number } | null;
  tracking_points: { lat: number; lng: number; recorded_at: string }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Aguardando coleta", color: "#fbbf24", icon: "⏳" },
  in_transit: { label: "A caminho!", color: "#00ffae", icon: "🚴" },
  delivered: { label: "Entregue!", color: "#00ffae", icon: "✅" },
  failed: { label: "Entrega falhou", color: "#f87171", icon: "❌" },
};

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function DeliveryTrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/deliveries/tracking?order_id=${orderId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Entrega não encontrada");
        return;
      }
      setDelivery(json.delivery);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Erro ao carregar rastreamento");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
    // Poll every 30 seconds while in transit
    const interval = setInterval(() => {
      if (delivery?.status === "in_transit" || delivery?.status === "pending") {
        fetchTracking();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTracking, delivery?.status]);

  const statusInfo = delivery ? (STATUS_LABELS[delivery.status] ?? STATUS_LABELS.pending) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a0a 0%, #111 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      padding: "env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0)",
      color: "#fff",
    }}>
      {/* Header */}
      <div style={{ padding: "56px 24px 24px" }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Rastreamento de pedido</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>Onde está meu pedido?</div>
      </div>

      <div style={{ padding: "0 16px 40px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div>Localizando seu pedido...</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 8 }}>{error}</div>
            <button
              onClick={fetchTracking}
              style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, cursor: "pointer", marginTop: 8 }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {delivery && statusInfo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status Card */}
            <div style={{
              borderRadius: 20, padding: "24px 20px",
              background: `linear-gradient(135deg, ${statusInfo.color}11, ${statusInfo.color}06)`,
              border: `1px solid ${statusInfo.color}33`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>{statusInfo.icon}</div>
              <div style={{ color: statusInfo.color, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{statusInfo.label}</div>
              {delivery.status === "in_transit" && delivery.estimated_minutes && (
                <div style={{ color: "#888", fontSize: 14 }}>
                  Previsão: ~{delivery.estimated_minutes} minutos
                </div>
              )}
              {delivery.status === "delivered" && delivery.delivered_at && (
                <div style={{ color: "#888", fontSize: 14 }}>
                  Entregue às {formatTime(delivery.delivered_at)}
                </div>
              )}
            </div>

            {/* Deliverer Info */}
            {delivery.deliverer && (
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Entregador</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,255,174,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🚴</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{delivery.deliverer.name}</div>
                    {delivery.deliverer.phone && (
                      <div style={{ color: "#888", fontSize: 13 }}>{delivery.deliverer.phone}</div>
                    )}
                  </div>
                  {delivery.deliverer.phone && (
                    <a
                      href={`https://wa.me/${delivery.deliverer.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(0,255,174,0.1)", border: "1px solid rgba(0,255,174,0.2)", color: "#00ffae", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                    >
                      Contatar
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Linha do tempo</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { key: "pending", label: "Pedido aceito", done: true, time: null },
                  { key: "in_transit", label: "Saiu para entrega", done: delivery.status === "in_transit" || delivery.status === "delivered", time: formatTime(delivery.picked_up_at) },
                  { key: "delivered", label: "Entregue", done: delivery.status === "delivered", time: formatTime(delivery.delivered_at) },
                ].map((step, i, arr) => (
                  <div key={step.key} style={{ display: "flex", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: step.done ? "#00ffae" : "rgba(255,255,255,0.1)",
                        border: step.done ? "none" : "2px solid rgba(255,255,255,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "#000", fontWeight: 900,
                      }}>
                        {step.done ? "✓" : ""}
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ width: 2, flex: 1, minHeight: 20, background: step.done ? "rgba(0,255,174,0.3)" : "rgba(255,255,255,0.07)", marginTop: 2 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                      <div style={{ color: step.done ? "#fff" : "#555", fontSize: 14, fontWeight: step.done ? 700 : 400 }}>{step.label}</div>
                      {step.time && <div style={{ color: "#888", fontSize: 12, marginTop: 1 }}>{step.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map link */}
            {delivery.current_location && (
              <a
                href={`https://maps.google.com/?q=${delivery.current_location.lat},${delivery.current_location.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px", borderRadius: 16,
                  background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                  color: "#60a5fa", fontSize: 15, fontWeight: 700, textDecoration: "none",
                }}
              >
                📍 Ver localização no mapa
              </a>
            )}

            {/* Last updated */}
            {lastUpdated && (
              <div style={{ textAlign: "center", color: "#555", fontSize: 11 }}>
                Atualizado às {formatTime(lastUpdated.toISOString())}
                {delivery.status === "in_transit" && " · atualiza a cada 30s"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
