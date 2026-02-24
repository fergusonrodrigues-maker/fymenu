"use client";

// FILE: /app/u/[slug]/BottomGlassBar.tsx
// ACTION: REPLACE ENTIRE FILE

import React, { useMemo } from "react";
import type { Unit } from "./menuTypes";

type FooterLink = {
  key: "instagram" | "maps" | "whatsapp";
  label: string;
  href: string;
  icon: string;
};

function normalizeInstagram(raw: string) {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const handle = v.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

function normalizeWhatsappToWaMe(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // se vier sem DDI, assume BR
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

function mapsFromAddress(raw: string) {
  const q = String(raw ?? "").trim();
  if (!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function buildLinks(unit: Unit): FooterLink[] {
  const links: FooterLink[] = [];

  const ig = normalizeInstagram(unit.instagram || "");
  const maps = mapsFromAddress(unit.address || "");
  const wa = normalizeWhatsappToWaMe(unit.whatsapp || "");

  if (ig) links.push({ key: "instagram", label: "Instagram", href: ig, icon: "📷" });
  if (maps) links.push({ key: "maps", label: "Maps", href: maps, icon: "📍" });
  if (wa) links.push({ key: "whatsapp", label: "WhatsApp", href: wa, icon: "💬" });

  return links;
}

function miniGlassBtn(isWA: boolean) {
  return {
    display: "grid",
    placeItems: "center",
    width: 44,
    height: 44,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: isWA ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.10)",
    color: "#fff",
    textDecoration: "none",
    transform: "scale(1)",
    transition: "transform 140ms ease, background 140ms ease",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  } as React.CSSProperties;
}

export default function BottomGlassBar({ unit }: { unit: Unit }) {
  const links = useMemo(() => buildLinks(unit), [unit]);
  const hasLogo = Boolean(unit.logo_url && String(unit.logo_url).trim());

  if (!links.length && !hasLogo) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        padding: "10px 12px 18px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.55)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            padding: "12px 12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: hasLogo ? "1fr auto auto auto" : "auto auto auto",
              alignItems: "center",
              gap: 10,
            }}
          >
            {hasLogo && (
              <div style={{ display: "flex", alignItems: "center", minWidth: 0, paddingLeft: 6 }}>
                <img
                  src={unit.logo_url}
                  alt="Logo"
                  style={{
                    maxHeight: 48,
                    width: "auto",
                    maxWidth: 130,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            )}

            {links.map((l) => {
              const isWA = l.key === "whatsapp";
              return (
                <a
                  key={l.key}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={l.label}
                  title={l.label}
                  style={miniGlassBtn(isWA)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.05)";
                    (e.currentTarget as HTMLAnchorElement).style.background = isWA
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.16)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLAnchorElement).style.background = isWA
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(255,255,255,0.10)";
                  }}
                >
                  <span style={{ fontSize: 18 }}>{l.icon}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}