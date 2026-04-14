"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Tracking = {
  id: string;
  order_intent_id: string;
  unit_id: string;
  driver_name: string | null;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  heading: number | null;
  tracking_status: string;
  tracking_code: string;
  updated_at: string | null;
};

interface Props {
  tracking: Tracking;
  order: { id: string; total: number; customer_name: string | null; items: unknown[] } | null;
  unit: { id: string; name: string; logo_url: string | null } | null;
}

export default function RastreioClient({ tracking: initialTracking, order, unit }: Props) {
  const supabase = createClient();
  const [tracking, setTracking] = useState<Tracking>(initialTracking);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletLoadedRef = useRef(false);

  const isActive = tracking.tracking_status === "active";

  // ── Realtime — posição do motoqueiro ────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`rastreio-${tracking.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_tracking",
          filter: `id=eq.${tracking.id}`,
        },
        (payload) => {
          if (payload.new) {
            setTracking((prev) => ({ ...prev, ...(payload.new as Partial<Tracking>) }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tracking.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar Leaflet e inicializar mapa ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletLoadedRef.current) return;

    function loadLeaflet(): Promise<void> {
      return new Promise((resolve) => {
        if ((window as any).L) { resolve(); return; }
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    loadLeaflet().then(() => {
      const L = (window as any).L;
      if (!L || !mapRef.current || mapInstanceRef.current) return;

      const lat = tracking.lat ?? -23.5505;
      const lng = tracking.lng ?? -46.6333;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const driverIcon = L.divIcon({
        html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));line-height:1">🛵</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: "",
      });

      if (tracking.lat && tracking.lng) {
        const marker = L.marker([tracking.lat, tracking.lng], { icon: driverIcon }).addTo(map);
        markerRef.current = marker;
      }

      mapInstanceRef.current = map;
      leafletLoadedRef.current = true;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Atualizar posição do marcador em realtime ───────────────────────────────
  useEffect(() => {
    if (!tracking.lat || !tracking.lng) return;
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([tracking.lat, tracking.lng]);
    } else {
      const driverIcon = L.divIcon({
        html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));line-height:1">🛵</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: "",
      });
      markerRef.current = L.marker([tracking.lat, tracking.lng], { icon: driverIcon }).addTo(mapInstanceRef.current);
    }

    mapInstanceRef.current.panTo([tracking.lat, tracking.lng], { animate: true, duration: 0.8 });
  }, [tracking.lat, tracking.lng]);

  const totalFormatted = `R$ ${Number(order?.total || 0).toFixed(2).replace(".", ",")}`;
  const lastUpdate = tracking.updated_at
    ? new Date(tracking.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(5,5,5,0.95)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#00ffae",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
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
            <span style={{ fontSize: 14, fontWeight: 900, color: "#000", fontStyle: "italic" }}>
              fy
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {unit?.name || "Restaurante"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {isActive ? "🛵 Entrega em andamento" : "✅ Entrega concluída"}
          </div>
        </div>

        {/* Status badge */}
        <div
          style={{
            padding: "5px 10px",
            borderRadius: 8,
            background: isActive ? "rgba(0,255,174,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${isActive ? "rgba(0,255,174,0.15)" : "rgba(248,113,113,0.15)"}`,
            color: isActive ? "#00ffae" : "#f87171",
            fontSize: 10,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          {isActive && (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00ffae",
                animation: "pulse 1.5s ease infinite",
              }}
            />
          )}
          {isActive ? "AO VIVO" : "FINALIZADO"}
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        style={{
          flex: 1,
          minHeight: "calc(100vh - 200px)",
          background: "#111",
          position: "relative",
        }}
      >
        {(!tracking.lat || !tracking.lng) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "rgba(255,255,255,0.2)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 40 }}>📍</div>
            <div style={{ fontSize: 13 }}>
              {isActive
                ? "Aguardando localização do entregador..."
                : "Entrega concluída"}
            </div>
          </div>
        )}
      </div>

      {/* Bottom info panel */}
      <div
        style={{
          padding: "14px 16px",
          background: "rgba(5,5,5,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Order summary */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            {order?.customer_name ? `Pedido de ${order.customer_name}` : "Seu pedido"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#00ffae" }}>
            {totalFormatted}
          </div>
        </div>

        {/* Driver info */}
        {tracking.driver_name && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.04)",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>🛵</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                {tracking.driver_name}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                Entregador
              </div>
            </div>
            {tracking.speed != null && tracking.speed > 0 && (
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
                  {Math.round(tracking.speed * 3.6)} km/h
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>velocidade</div>
              </div>
            )}
          </div>
        )}

        {/* Last update */}
        {lastUpdate && isActive && (
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.15)",
              textAlign: "center",
            }}
          >
            Última atualização: {lastUpdate}
          </div>
        )}

        {!isActive && (
          <div
            style={{
              textAlign: "center",
              padding: "10px",
              borderRadius: 12,
              background: "rgba(0,255,174,0.06)",
              border: "1px solid rgba(0,255,174,0.1)",
              fontSize: 13,
              fontWeight: 700,
              color: "#00ffae",
            }}
          >
            🎉 Entrega concluída! Bom apetite!
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .leaflet-container { background: #111 !important; }
      `}</style>
    </div>
  );
}
