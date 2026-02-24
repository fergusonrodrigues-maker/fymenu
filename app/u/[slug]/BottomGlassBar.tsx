"use client";

import React, { useMemo } from "react";

type Unit = {
  name: string;
  address: string;
  instagram: string;
  whatsapp: string;
  logo_url: string;
  city?: string;
  neighborhood?: string;
};

function normalizeInstagram(v: string) {
  const raw = (v ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const handle = raw.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

function mapsFromAddress(addr: string) {
  const a = (addr ?? "").trim();
  if (!a) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

function normalizeWhatsappToWaMe(v: string) {
  const raw = (v ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // se já vier com 55 ok; se não, tenta prefixar (Brasil)
  const final = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${final}`;
}

export default function BottomGlassBar({ unit }: { unit: Unit }) {
  const infoText = useMemo(() => {
    const city = (unit.city ?? "").trim();
    const neigh = (unit.neighborhood ?? "").trim();
    if (city && neigh) return `${city} - Unidade: ${neigh}`;
    if (city) return city;
    if (neigh) return `Unidade: ${neigh}`;
    return unit.name || "Unidade";
  }, [unit.city, unit.neighborhood, unit.name]);

  const instagramUrl = useMemo(() => normalizeInstagram(unit.instagram), [unit.instagram]);
  const mapsUrl = useMemo(() => mapsFromAddress(unit.address), [unit.address]);
  const whatsappUrl = useMemo(() => normalizeWhatsappToWaMe(unit.whatsapp), [unit.whatsapp]);

  const buttons = [
    { key: "ig", label: "Instagram", url: instagramUrl },
    { key: "maps", label: "Maps", url: mapsUrl },
    { key: "wa", label: "WhatsApp", url: whatsappUrl },
  ].filter((b) => !!b.url);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 14,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {/* Barra superior pequena */}
      <div
        style={{
          pointerEvents: "none",
          padding: "8px 14px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.30)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "rgba(255,255,255,0.90)",
          fontSize: 12,
          fontWeight: 900,
          textAlign: "center",
          maxWidth: "92%",
        }}
      >
        {infoText}
      </div>

      {/* Barra principal */}
      <div
        style={{
          width: "92%",
          maxWidth: 480,
          borderRadius: 28,
          padding: "12px 14px",
          background: "rgba(0,0,0,0.40)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          pointerEvents: "auto",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", minWidth: 92 }}>
          {!!unit.logo_url ? (
            <img
              src={unit.logo_url}
              alt={unit.name}
              style={{
                maxHeight: 44,
                maxWidth: 120,
                objectFit: "contain",
                filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))",
              }}
            />
          ) : (
            <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 950, fontSize: 12 }}>
              {unit.name}
            </div>
          )}
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {buttons.map((b) => (
            <a
              key={b.key}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
                color: "#fff",
                fontWeight: 950,
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
                transform: "translateZ(0)",
              }}
            >
              {b.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}