"use client";

import { useMemo } from "react";
import type { Unit } from "./menuTypes";

type Props = { unit: Unit };

function normalizeWhatsapp(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function normalizeInstagram(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const handle = s.startsWith("@") ? s.slice(1) : s;
  if (/^https?:\/\//i.test(handle)) return handle;
  if (/instagram\.com/i.test(handle)) return `https://${handle.replace(/^\/\//, "")}`;
  return `https://instagram.com/${handle}`;
}

function mapsUrl(unit: Unit): string | null {
  if (unit.maps_url?.trim()) return unit.maps_url.trim();
  const q = [unit.name, unit.neighborhood, unit.city].filter(Boolean).join(" - ");
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function BottomGlassBar({ unit }: Props) {
  const wa = useMemo(() => normalizeWhatsapp(unit.whatsapp || ""), [unit.whatsapp]);
  const ig = useMemo(() => normalizeInstagram(unit.instagram || ""), [unit.instagram]);
  const maps = useMemo(() => mapsUrl(unit), [unit]);

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      padding: "0 12px 14px",
    }}>
      <div style={{
        maxWidth: 480, margin: "0 auto",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        padding: "10px 14px",
        gap: 10,
      }}>

        {/* Esquerda: Maps */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, color: "#fff", textDecoration: "none",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8, whiteSpace: "nowrap" }}>
                {unit.neighborhood || unit.city || "Maps"}
              </span>
            </a>
          )}
        </div>

        {/* Centro: Logo + nome */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {unit.logo_url ? (
            <img src={unit.logo_url} alt={unit.name}
              style={{
                width: 52, height: 52, borderRadius: 14,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>🍽️</div>
          )}
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 11, textAlign: "center", lineHeight: 1.1 }}>
            {unit.name}
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontWeight: 700, fontSize: 10, textAlign: "center" }}>
            {unit.city || ""}
          </div>
        </div>

        {/* Direita: WhatsApp + Instagram */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, color: "#fff", textDecoration: "none",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8 }}>WhatsApp</span>
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, color: "#fff", textDecoration: "none",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 20 }}>📷</span>
              <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8 }}>Instagram</span>
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
